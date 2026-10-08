// Autentificarea cetățeanului cu Google (amendamentul Google, versiunea finală din 08.10.2026).
//
//   POST /citizen/auth/google/start     → 200 { authorizationUrl } + cookie `__Host-civic_oauth` (§11.1, §11.2)
//   GET  /citizen/auth/google/callback  → 303 spre `/#sesizari` (reușită) sau `/#sesizari?google=<motiv>` (refuz)
//
// Fără GOOGLE_OAUTH_CLIENT_ID / _SECRET, ambele rute răspund 404 (G-T7).
// Rezultatul este aceeași sesiune de cetățean ca după cod; același cont, după e-mailul verificat (G-3, D30).
// Nu se salvează nimic primit de la Google în afară de adresa de e-mail a unui cont nou (G-2, §8 C).

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { CITIZEN_POLICY_VERSION, citizenGoogleStartRequest, emailSchema, normalizeEmail } from '@tmc/shared';
import { LIMITS, type AppContext } from '../context.ts';
import { apiError } from '../errors.ts';
import { newId } from '../ids.ts';
import { randomTokenB64url, sha256Hex } from '../auth/crypto.ts';
import { requestIpHash } from '../auth/guards.ts';
import { googleProvider, pkceChallenge, verifyIdToken, type OidcProvider } from '../auth/googleOAuth.ts';
import { hitRateLimit, recordRejected } from '../auth/rateLimit.ts';
import { createSession, setSessionCookie } from '../auth/sessions.ts';
import { parseBody } from '../validation.ts';
import { activeBlock, emailHash } from './citizens.ts';

export const GOOGLE_CALLBACK_PATH = '/api/v1/citizen/auth/google/callback';

/** `__Host-` cere HTTPS; pe dezvoltare (HTTP) numele simplu, ca la cookie-ul de sesiune. */
export function oauthCookieName(ctx: AppContext): string {
  return ctx.config.appEnv === 'development' ? 'civic_oauth' : '__Host-civic_oauth';
}

/** §11.2: Secure, HttpOnly, SameSite=Lax, Path=/, fără Domain. */
function oauthCookieOptions(ctx: AppContext, maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    secure: ctx.config.appEnv !== 'development',
    sameSite: 'lax' as const,
    maxAge,
  };
}

/** Motivele afișate de interfață (fără detalii tehnice și fără a dezvălui ce adrese au cont). */
type FailCode = 'eroare' | 'anulat' | 'blocat' | 'limita';

export function registerCitizenGoogleRoutes(api: FastifyInstance, ctx: AppContext): void {
  let provider: OidcProvider | undefined;
  const oidc = () => (provider ??= ctx.oidc ?? googleProvider());
  const redirectUri = `${ctx.config.publicBaseUrl}${GOOGLE_CALLBACK_PATH}`;
  const notFound = (reply: FastifyReply) => reply.code(404).send(apiError('NOT_FOUND', 'Resursa nu există.'));

  api.post('/citizen/auth/google/start', async (request, reply) => {
    const google = ctx.config.googleOAuth;
    if (!google) return notFound(reply);
    const body = parseBody(citizenGoogleStartRequest, request, reply);
    if (!body) return reply;
    // §8 A: bifa politicii, verificată pe server, la fiecare pornire; fără ea: nicio încercare, niciun cookie
    if (body.policyAccepted !== true || body.policyVersion !== CITIZEN_POLICY_VERSION) {
      return reply.code(422).send(apiError('POLICY_REQUIRED', 'Pentru a continua trebuie acceptată politica de utilizare.', {
        fields: { policyAccepted: 'obligatoriu' },
      }));
    }
    const ipH = requestIpHash(ctx, request);
    if ((await hitRateLimit(ctx, `citizen:google:start:ip:${ipH}`, 60)) > LIMITS.citizenGooglePerIpPerHour) {
      await recordRejected(ctx, 'citizen_code', 'rate_limited', ipH, 'google');
      reply.header('Retry-After', '3600');
      return reply.code(429).send(apiError('RATE_LIMITED', 'Prea multe cereri. Reveniți mai târziu.'));
    }
    // §8 D: valori aleatoare criptografic (32 de octeți); pe server numai hash-ul lui `state`
    const state = randomTokenB64url(32);
    const nonce = randomTokenB64url(32);
    const codeVerifier = randomTokenB64url(32);
    const now = ctx.now();
    await ctx.pool.query(
      `INSERT INTO citizen_oauth_attempts (id, nonce, code_verifier, policy_version, created_at, expires_at, consumed_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
      [sha256Hex(state), nonce, codeVerifier, CITIZEN_POLICY_VERSION, now,
        new Date(now.getTime() + LIMITS.citizenOauthAttemptMinutes * 60_000)],
    );
    reply.setCookie(oauthCookieName(ctx), state, oauthCookieOptions(ctx, LIMITS.citizenOauthAttemptMinutes * 60));
    const url = new URL(oidc().authorizationEndpoint);
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: google.clientId,
      redirect_uri: redirectUri,
      scope: 'openid email', // G-2 / G-T3: fără `profile`
      state,
      nonce,
      code_challenge: pkceChallenge(codeVerifier),
      code_challenge_method: 'S256',
    }).toString();
    return { authorizationUrl: url.toString() };
  });

  api.get('/citizen/auth/google/callback', async (request: FastifyRequest, reply) => {
    const google = ctx.config.googleOAuth;
    if (!google) return notFound(reply);
    const ipH = requestIpHash(ctx, request);
    const cookieState = request.cookies?.[oauthCookieName(ctx)];
    // §8 D / §11.2: cookie-ul se șterge la întoarcere, indiferent de rezultat, cu aceleași atribute
    reply.setCookie(oauthCookieName(ctx), '', oauthCookieOptions(ctx, 0));
    const fail = async (code: FailCode, reason: 'invalid' | 'blocked' | 'rate_limited' = 'invalid') => {
      await recordRejected(ctx, 'citizen_code', reason, ipH, 'google');
      return reply.redirect(`/#sesizari?google=${code}`, 303);
    };

    if ((await hitRateLimit(ctx, `citizen:google:callback:ip:${ipH}`, 60)) > LIMITS.citizenGooglePerIpPerHour) {
      return fail('limita', 'rate_limited');
    }
    const q = (request.query ?? {}) as Record<string, unknown>;
    const str = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 && v.length <= max ? v : undefined);
    const state = str(q.state, 128);

    // (1) `state`: prezent în URL și în cookie, identic, existent pe server, nefolosit, neexpirat; marcat folosit atomic
    if (!state || typeof cookieState !== 'string' || sha256Hex(state) !== sha256Hex(cookieState)) return fail('eroare');
    const now = ctx.now();
    const [upd] = await ctx.pool.query(
      'UPDATE citizen_oauth_attempts SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ?',
      [now, sha256Hex(state), now],
    );
    if ((upd as { affectedRows: number }).affectedRows !== 1) return fail('eroare');
    const [rows] = await ctx.pool.query(
      'SELECT nonce, code_verifier, policy_version FROM citizen_oauth_attempts WHERE id = ?',
      [sha256Hex(state)],
    );
    const attempt = (rows as Array<{ nonce: string; code_verifier: string; policy_version: string }>)[0];
    if (!attempt) return fail('eroare');
    // §8 A: încercarea poartă versiunea acceptată la pornire; URL-ul nu o poate adăuga
    if (attempt.policy_version !== CITIZEN_POLICY_VERSION) return fail('eroare');
    if (q.error !== undefined) return fail(q.error === 'access_denied' ? 'anulat' : 'eroare');
    const code = str(q.code, 2048);
    if (!code) return fail('eroare');

    // (2)–(4) codul → jetonul (PKCE) → verificarea completă → `email_verified === true` (§8 B)
    let email: string;
    try {
      const idToken = await oidc().exchangeCode({
        code,
        codeVerifier: attempt.code_verifier,
        redirectUri,
        clientId: google.clientId,
        clientSecret: google.clientSecret,
      });
      ({ email } = await verifyIdToken(idToken, { provider: oidc(), clientId: google.clientId, nonce: attempt.nonce, now }));
    } catch {
      return fail('eroare');
    }
    if (!emailSchema.safeParse(email).success) return fail('eroare');
    const normalized = normalizeEmail(email);
    // G-T8 / G3-c5: pe staging (`allowlist`), numai adresele din listă
    if (ctx.config.email.mode === 'allowlist' && !ctx.config.email.allowlist.includes(normalized)) return fail('eroare');

    // (5) abia acum: contul, după e-mailul normalizat (G-3, D30: un e-mail = un cont)
    const find = async () => {
      const [r] = await ctx.pool.query('SELECT id, status FROM citizen_accounts WHERE email_normalized = ?', [normalized]);
      return (r as Array<{ id: string; status: 'pending' | 'active' }>)[0];
    };
    let account = await find();
    if (!account) {
      // T-C7 / §9.5: o blocare definitivă fără cont nu permite un cont nou
      const block = await activeBlock(ctx, ctx.pool, null, emailHash(ctx, normalized));
      if (block?.kind === 'permanent') return fail('blocat', 'blocked');
      const id = newId(now);
      try {
        await ctx.pool.query(
          `INSERT INTO citizen_accounts (id, email, email_normalized, status, policy_version, policy_accepted_at,
             confirmed_at, last_login_at, created_at)
           VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
          [id, email, normalized, attempt.policy_version, now, now, now, now],
        );
      } catch {
        // creare concurentă (UNIQUE email_normalized): se intră în contul creat între timp
      }
      account = await find();
      if (!account) return fail('eroare');
    }
    // §9.2: la un cont existent nu se schimbă versiunea politicii; Google confirmă adresa, ca primul cod (D31)
    await ctx.pool.query(
      `UPDATE citizen_accounts SET status = 'active', confirmed_at = COALESCE(confirmed_at, ?), last_login_at = ? WHERE id = ?`,
      [now, now, account.id],
    );
    const token = await createSession(ctx, ctx.pool, { type: 'citizen', accountId: account.id }, request);
    setSessionCookie(ctx, reply, token, true);
    return reply.redirect('/#sesizari', 303);
  });
}

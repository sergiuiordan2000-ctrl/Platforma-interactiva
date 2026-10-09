// Autentificarea cetățeanului cu Google (amendamentul Google: G-T1…G-T4, §8 B–D, §11).
// OpenID Connect, „authorization code” + PKCE (S256), prin redirecționare pe server. Numai `openid email` (G-2).
// Verificarea jetonului se face local, cu node:crypto (fără dependențe noi): semnătura RS256 cu cheile publice
// ale furnizorului, emitentul, destinatarul, expirarea, `nonce`, apoi `email_verified === true`.
// `sub` nu se citește în afara verificării și nu se întoarce: identitatea contului este e-mailul verificat (§8 C).

import { createHash, createPublicKey, timingSafeEqual, verify as cryptoVerify, type JsonWebKey } from 'node:crypto';
import { isLoopbackHttpUrl } from '../config.ts';

export const GOOGLE_PROVIDER = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  issuers: ['https://accounts.google.com', 'accounts.google.com'],
} as const;

/** Toleranța de ceas pentru `exp` / `iat` (secunde). */
const CLOCK_SKEW_SECONDS = 60;
const HTTP_TIMEOUT_MS = 10_000;

export type ExchangeParams = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
};

/** Furnizorul OpenID Connect; în teste se înlocuiește cu unul fals, local (G-T10: fără apeluri reale la Google). */
export type OidcProvider = {
  authorizationEndpoint: string;
  issuers: readonly string[];
  /** Schimbă codul pe `id_token`. */
  exchangeCode(p: ExchangeParams): Promise<string>;
  /** Cheile publice; `refresh` = ignoră memoria (cheie necunoscută). */
  jwks(refresh?: boolean): Promise<JsonWebKey[]>;
};

export class OidcError extends Error {
  constructor(public readonly reason: string) {
    super(`OIDC: ${reason}`);
    this.name = 'OidcError';
  }
}

export type OidcEndpoints = {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwksUri: string;
  issuers: readonly string[];
};

/** Un furnizor OpenID Connect apelat prin HTTP, cu cheile publice ținute în memorie o oră. */
export function httpOidcProvider(endpoints: OidcEndpoints, fetchImpl: typeof fetch = fetch): OidcProvider {
  let cache: { keys: JsonWebKey[]; at: number } | null = null;
  return {
    authorizationEndpoint: endpoints.authorizationEndpoint,
    issuers: endpoints.issuers,
    async exchangeCode(p) {
      const res = await fetchImpl(endpoints.tokenEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: p.code,
          code_verifier: p.codeVerifier,
          redirect_uri: p.redirectUri,
          client_id: p.clientId,
          client_secret: p.clientSecret,
        }).toString(),
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      if (!res.ok) throw new OidcError(`token_http_${res.status}`);
      const data = (await res.json()) as { id_token?: unknown };
      if (typeof data.id_token !== 'string') throw new OidcError('token_missing');
      return data.id_token;
    },
    async jwks(refresh = false) {
      if (!refresh && cache && Date.now() - cache.at < 3_600_000) return cache.keys;
      const res = await fetchImpl(endpoints.jwksUri, { signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
      if (!res.ok) throw new OidcError(`jwks_http_${res.status}`);
      const data = (await res.json()) as { keys?: unknown };
      if (!Array.isArray(data.keys)) throw new OidcError('jwks_invalid');
      cache = { keys: data.keys as JsonWebKey[], at: Date.now() };
      return cache.keys;
    },
  };
}

/** Furnizorul real (Google). */
export const googleProvider = (fetchImpl: typeof fetch = fetch): OidcProvider => httpOidcProvider(GOOGLE_PROVIDER, fetchImpl);

/**
 * G-T10: furnizorul fals al testelor E2E (`tests/lib/fake_oidc.mjs`), numai în dezvoltare.
 * A doua verificare, pe lângă cea din `config.ts`: în afara dezvoltării, sau dacă furnizorul ori aplicația nu sunt
 * pe calculatorul local, întoarce `undefined` (se folosește Google), chiar dacă adresa ar ajunge în configurare pe altă cale.
 */
export function devOidcProviderFor(
  config: { appEnv: string; publicBaseUrl: string; devOidcProviderUrl?: string },
  fetchImpl: typeof fetch = fetch,
): OidcProvider | undefined {
  if (config.appEnv !== 'development' || !config.devOidcProviderUrl) return undefined;
  // corecția de după audit (09.10.2026): furnizorul fals și aplicația trebuie să fie amândouă pe calculatorul local
  if (!isLoopbackHttpUrl(config.devOidcProviderUrl) || !isLoopbackHttpUrl(config.publicBaseUrl)) return undefined;
  const base = config.devOidcProviderUrl;
  return httpOidcProvider(
    { authorizationEndpoint: `${base}/authorize`, tokenEndpoint: `${base}/token`, jwksUri: `${base}/jwks`, issuers: [base] },
    fetchImpl,
  );
}

/** PKCE S256: BASE64URL(SHA256(verifier)). */
export const pkceChallenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

function decodePart(part: string | undefined): Record<string, unknown> {
  if (!part || !/^[A-Za-z0-9_-]+$/.test(part)) throw new OidcError('format');
  try {
    const value = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as unknown;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new OidcError('format');
  }
}

function sameString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Verifică `id_token` și întoarce numai adresa de e-mail (G-T3, G-T4, §8 B). Orice abatere → OidcError.
 * Ordinea: formatul → algoritmul → cheia → semnătura → emitentul → destinatarul → expirarea → `nonce` → `email_verified`.
 */
export async function verifyIdToken(
  idToken: string,
  opts: { provider: OidcProvider; clientId: string; nonce: string; now: Date },
): Promise<{ email: string }> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new OidcError('format');
  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  if (header.alg !== 'RS256') throw new OidcError('alg');
  if (typeof header.kid !== 'string' || header.kid === '') throw new OidcError('kid');
  const signature = Buffer.from(parts[2] ?? '', 'base64url');
  if (signature.length === 0) throw new OidcError('signature');

  const findKey = (keys: JsonWebKey[]) => keys.find((k) => k.kid === header.kid && k.kty === 'RSA');
  let jwk = findKey(await opts.provider.jwks());
  if (!jwk) jwk = findKey(await opts.provider.jwks(true)); // cheile se rotesc: o singură reîncărcare
  if (!jwk) throw new OidcError('kid_unknown');
  let ok = false;
  try {
    ok = cryptoVerify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key: jwk, format: 'jwk' }), signature);
  } catch {
    ok = false;
  }
  if (!ok) throw new OidcError('signature');

  if (typeof payload.iss !== 'string' || !opts.provider.issuers.includes(payload.iss)) throw new OidcError('iss');
  const aud = payload.aud;
  const audOk = typeof aud === 'string' ? aud === opts.clientId : Array.isArray(aud) && aud.includes(opts.clientId) && payload.azp === opts.clientId;
  if (!audOk) throw new OidcError('aud');
  const nowSec = Math.floor(opts.now.getTime() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SECONDS <= nowSec) throw new OidcError('exp');
  if (typeof payload.iat === 'number' && payload.iat - CLOCK_SKEW_SECONDS > nowSec) throw new OidcError('iat');
  if (typeof payload.nonce !== 'string' || !sameString(payload.nonce, opts.nonce)) throw new OidcError('nonce');
  // §8 B: exact boolean `true`; nu șirul "true", nu lipsă
  if (payload.email_verified !== true) throw new OidcError('email_unverified');
  if (typeof payload.email !== 'string' || payload.email.trim() === '' || payload.email.length > 254) throw new OidcError('email');
  return { email: payload.email.trim() };
}

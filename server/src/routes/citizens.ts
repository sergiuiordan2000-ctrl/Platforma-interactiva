// Conturile cetățenilor (B2 §4.1, B3 §8) și blocările (B2 §6.5, drept exclusiv super_admin).
// Cod de 6 cifre pe e-mail (T-A2), fără parolă; răspuns identic indiferent dacă adresa există (fără enumerare).

import type { FastifyInstance } from 'fastify';
import type mysql from 'mysql2/promise';
import { newId } from '../ids.ts';
import { deleteCitizenAccountRows } from '../db/accountDeletion.ts';
import { promoteAccountDeletionIntent } from '../db/markers.ts';
import {
  CITIZEN_POLICY_VERSION,
  blockRequest,
  citizenStartRequest,
  citizenVerifyRequest,
  normalizeEmail,
} from '@tmc/shared';
import { writeAudit } from '../audit.ts';
import { LIMITS, type AppContext } from '../context.ts';
import { apiError } from '../errors.ts';
import { deriveKey, hmacHex, safeEqualHex, sixDigitCode } from '../auth/crypto.ts';
import { anonymousProbe, loadCitizen, requestIpHash, requireAdmin, requireCitizen } from '../auth/guards.ts';
import { hitRateLimit, ipLimitExceeded, peekRateLimit, recordRejected } from '../auth/rateLimit.ts';
import { clearSessionCookie, createSession, revokeSession, setSessionCookie } from '../auth/sessions.ts';
import { parseBody } from '../validation.ts';
import { kickOutbox } from '../reports/outbox.ts';
import { createPowChallenge, verifyPow } from '../reports/antiabuse.ts';

const DAY_MIN = 24 * 60;

export const emailHash = (ctx: AppContext, normalized: string) =>
  hmacHex(deriveKey(ctx.config.secrets.totpEncKey, 'email-hash'), normalized);
const codeHash = (ctx: AppContext, accountId: string, code: string) =>
  hmacHex(deriveKey(ctx.config.secrets.totpEncKey, 'citizen-codes'), `${accountId}:${code}`);

type ActiveBlock = { id: string; kind: 'temporary' | 'permanent'; ends_at: Date | null };

/** Blocarea activă a unui cont / e-mail (K-A02-4): definitivă sau temporară neexpirată. */
export async function activeBlock(
  ctx: AppContext,
  conn: mysql.Pool | mysql.PoolConnection,
  accountId: string | null,
  hash: string,
): Promise<ActiveBlock | null> {
  const [rows] = await conn.query(
    `SELECT id, kind, ends_at FROM citizen_blocks
     WHERE (email_hash = ? ${accountId ? 'OR account_id = ?' : ''}) AND (kind = 'permanent' OR ends_at > ?)
     ORDER BY kind = 'permanent' DESC, ends_at DESC LIMIT 1`,
    accountId ? [hash, accountId, ctx.now()] : [hash, ctx.now()],
  );
  return (rows as ActiveBlock[])[0] ?? null;
}

/**
 * Pune e-mailul în coadă: în modul `simulated` rândul este `simulated` (niciodată `sent`); altfel `queued`,
 * cu încercare imediată (5.5a: codurile de cont sunt prioritare, B6 §3), iar cron-ul rămâne garanția.
 */
async function enqueueAccountEmail(
  ctx: AppContext,
  kind: 'citizen_login_code' | 'citizen_account_blocked',
  recipient: string,
  subject: string,
  body: string,
): Promise<void> {
  const mode = ctx.config.email.mode;
  if (mode === 'allowlist' && !ctx.config.email.allowlist.includes(recipient)) return; // G3-c5: nimic în afara listei
  const simulated = mode === 'simulated';
  const id = newId(ctx.now());
  await ctx.pool.query(
    `INSERT INTO email_outbox (id, kind, report_id, dedupe_key, recipient, subject, body_text, status, attempts,
       mode_at_send, transport, created_at)
     VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [id, kind, recipient, subject, body, simulated ? 'simulated' : 'queued', mode,
      simulated ? 'simulated' : 'smtp', ctx.now()],
  );
  if (!simulated) kickOutbox(ctx, [id]);
}

const ACCEPTED = { accepted: true, message: 'Dacă adresa poate fi folosită, veți primi un cod pe e-mail.' };

export function registerCitizenRoutes(api: FastifyInstance, ctx: AppContext): void {
  /** D-B3: provocarea ALTCHA pentru cererea de cod (publică; fiecare provocare se folosește o singură dată). */
  api.get('/citizen/auth/pow-challenge', async () => createPowChallenge(ctx));

  api.post('/citizen/auth/start', async (request, reply) => {
    const body = parseBody(citizenStartRequest, request, reply);
    if (!body) return reply;
    const email = normalizeEmail(body.email);
    const ipH = requestIpHash(ctx, request);
    if (await ipLimitExceeded(ctx, `citizen:start:ip:${ipH}`, 60, LIMITS.citizenStartPerIpPerHour)) {
      await recordRejected(ctx, 'citizen_code', 'rate_limited', ipH);
      reply.header('Retry-After', '3600');
      return reply.code(429).send(apiError('RATE_LIMITED', 'Prea multe cereri. Reveniți mai târziu.'));
    }
    // RA-2 (reaudit, decizia proprietarului din 13.10.2026, varianta A): bifa politicii se cere la FIECARE cerere,
    // înainte de orice citire a contului; răspunsul nu mai arată dacă adresa are cont (ca la Google, §8 A)
    if (body.policyAccepted !== true || body.policyVersion !== CITIZEN_POLICY_VERSION) {
      return reply.code(422).send(apiError('POLICY_REQUIRED', 'Pentru a continua trebuie acceptată politica de utilizare.', {
        fields: { policyAccepted: 'obligatoriu' },
      }));
    }
    // D-B3 (13.10.2026): ALTCHA obligatoriu la cererea de cod, înainte de orice citire a contului (fără enumerare)
    if (!(await verifyPow(ctx, body.pow))) {
      await recordRejected(ctx, 'citizen_code', 'pow_invalid', ipH);
      return reply.code(400).send(apiError('POW_INVALID', 'Verificarea anti-robot nu a reușit. Încercați din nou.'));
    }
    const hash = emailHash(ctx, email);
    const [rows] = await ctx.pool.query('SELECT id, status FROM citizen_accounts WHERE email_normalized = ?', [email]);
    const account = (rows as Array<{ id: string; status: 'pending' | 'active' }>)[0];

    if (!account) {
      // blocare definitivă: contul nu se recreează (T-C7); mesaj către titular, cel mult unul pe zi (A06-6)
      const block = await activeBlock(ctx, ctx.pool, null, hash);
      if (block?.kind === 'permanent') {
        if ((await hitRateLimit(ctx, `citizen:blocked-notice:${hash}`, DAY_MIN)) <= LIMITS.citizenBlockedNoticePerDay) {
          await enqueueAccountEmail(ctx, 'citizen_account_blocked', email, 'Turnu Măgurele Civic',
            'Această adresă nu mai poate fi folosită pentru un cont nou.');
        }
        return reply.code(202).send(ACCEPTED);
      }
    }
    // plafoane pe adresă: fără enumerare (același 202), dar fără e-mail nou
    const perHour = await hitRateLimit(ctx, `citizen:start:addr:${hash}`, 60);
    const perDay = await peekRateLimit(ctx, `citizen:mail:addr:${hash}`, DAY_MIN);
    if (perHour > LIMITS.citizenStartPerAddressPerHour || perDay >= LIMITS.citizenAccountEmailsPerDay) {
      await recordRejected(ctx, 'citizen_code', 'rate_limited', ipH);
      return reply.code(202).send(ACCEPTED);
    }

    const now = ctx.now();
    let accountId = account?.id;
    if (!accountId) {
      accountId = newId(now);
      try {
        await ctx.pool.query(
          `INSERT INTO citizen_accounts (id, email, email_normalized, status, policy_version, policy_accepted_at, created_at)
           VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
          [accountId, body.email.trim(), email, CITIZEN_POLICY_VERSION, now, now],
        );
      } catch {
        return reply.code(202).send(ACCEPTED); // creare concurentă: un e-mail = un cont (D30)
      }
    }
    const code = sixDigitCode();
    // un cod nou îl invalidează pe cel anterior
    await ctx.pool.query('UPDATE citizen_login_codes SET consumed_at = ? WHERE account_id = ? AND consumed_at IS NULL', [now, accountId]);
    await ctx.pool.query(
      `INSERT INTO citizen_login_codes (id, account_id, code_hash, purpose, expires_at, attempts, consumed_at, created_at)
       VALUES (?, ?, ?, ?, ?, 0, NULL, ?)`,
      [newId(now), accountId, codeHash(ctx, accountId, code), account?.status === 'active' ? 'login' : 'confirm',
        new Date(now.getTime() + LIMITS.citizenCodeMinutes * 60_000), now],
    );
    await hitRateLimit(ctx, `citizen:mail:addr:${hash}`, DAY_MIN);
    await enqueueAccountEmail(ctx, 'citizen_login_code', email, 'Codul de autentificare — Turnu Măgurele Civic',
      `Codul dumneavoastră este: ${code}\nEste valabil ${LIMITS.citizenCodeMinutes} minute. Dacă nu ați cerut acest cod, ignorați mesajul.`);
    return reply.code(202).send(ACCEPTED);
  });

  api.post('/citizen/auth/verify', async (request, reply) => {
    const body = parseBody(citizenVerifyRequest, request, reply);
    if (!body) return reply;
    const ipH = requestIpHash(ctx, request);
    const fail = async () => {
      await recordRejected(ctx, 'citizen_code', 'invalid', ipH);
      return reply.code(401).send(apiError('INVALID_CODE', 'Cod incorect sau expirat.'));
    };
    if (await ipLimitExceeded(ctx, `citizen:verify:ip:${ipH}`, 60, LIMITS.citizenStartPerIpPerHour * 2)) {
      return reply.code(429).send(apiError('RATE_LIMITED', 'Prea multe încercări. Reveniți mai târziu.'));
    }
    const email = normalizeEmail(body.email);
    const [rows] = await ctx.pool.query('SELECT id, status FROM citizen_accounts WHERE email_normalized = ?', [email]);
    const account = (rows as Array<{ id: string; status: string }>)[0];
    if (!account) return fail();
    const now = ctx.now();
    const [codes] = await ctx.pool.query(
      `SELECT id, code_hash, attempts FROM citizen_login_codes
       WHERE account_id = ? AND consumed_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1`,
      [account.id, now],
    );
    const row = (codes as Array<{ id: string; code_hash: string; attempts: number }>)[0];
    if (!row) return fail();
    // RA-1 (reaudit): încercarea se rezervă atomic ÎNAINTE de comparare; cererile simultane nu pot depăși
    // limita (o citire urmată de o scriere lăsa să treacă oricâte comparații în paralel)
    const [claimed] = await ctx.pool.query(
      'UPDATE citizen_login_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < ? AND consumed_at IS NULL',
      [row.id, LIMITS.citizenCodeMaxAttempts],
    );
    if ((claimed as { affectedRows: number }).affectedRows !== 1) return fail();
    if (!safeEqualHex(row.code_hash, codeHash(ctx, account.id, body.code))) return fail();
    const [consumed] = await ctx.pool.query(
      'UPDATE citizen_login_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL',
      [now, row.id],
    );
    if ((consumed as { affectedRows: number }).affectedRows !== 1) return fail();
    await ctx.pool.query(
      `UPDATE citizen_accounts SET status = 'active', confirmed_at = COALESCE(confirmed_at, ?), last_login_at = ? WHERE id = ?`,
      [now, now, account.id],
    );
    const token = await createSession(ctx, ctx.pool, { type: 'citizen', accountId: account.id }, request);
    setSessionCookie(ctx, reply, token, true); // cetățean: cookie persistent (varianta B)
    return { ok: true };
  });

  api.post('/citizen/auth/logout', { preHandler: requireCitizen(ctx) }, async (request, reply) => {
    await revokeSession(ctx, request.citizen!.session.id, 'logout');
    clearSessionCookie(ctx, reply);
    return reply.code(204).send();
  });

  api.get('/citizen/me', { preHandler: anonymousProbe(loadCitizen, ctx, requireCitizen(ctx)) }, async (request) => {
    const { account } = request.citizen!;
    const block = await activeBlock(ctx, ctx.pool, account.id, emailHash(ctx, account.email_normalized));
    return {
      email: account.email,
      blocked: block ? { active: true, kind: block.kind, endsAt: block.kind === 'temporary' ? block.ends_at : undefined } : { active: false },
    };
  });

  /**
   * 2.7: ștergerea contului; sesizările rămân fără autor; blocarea definitivă se reduce la datele minime (T-C6).
   * R18: intenția de ștergere (ID intern + data) se scrie înainte de COMMIT; dacă nu poate fi scrisă → 500,
   * contul rămâne. După COMMIT devine marcaj definitiv. Aceeași funcție este aplicată de restaurare.
   */
  api.delete('/citizen/account', { preHandler: requireCitizen(ctx) }, async (request, reply) => {
    const { account } = request.citizen!;
    const marker = ctx.config.backupDir ? { backupDir: ctx.config.backupDir, now: ctx.now() } : undefined;
    const conn = await ctx.pool.getConnection();
    try {
      await conn.beginTransaction();
      await deleteCitizenAccountRows(conn, account.id, { marker });
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    // abia după COMMIT: intenția devine marcaj definitiv. Ștergerea este deja confirmată: o mutare eșuată
    // nu schimbă răspunsul; intenția rămasă este confirmată de reconciliere (pornire, backup).
    if (marker) {
      try {
        promoteAccountDeletionIntent(marker.backupDir, account.id);
      } catch (err) {
        // fără ID-ul contului (decizia B): numai codul erorii, nu mesajul / cauza (care conțin calea fișierului)
        const code = (err as { cause?: { code?: string } }).cause?.code ?? 'eroare';
        request.log.error({ code }, 'marcajul de ștergere a unui cont: rămâne intenție, se reconciliază la pornire sau la următorul backup');
      }
    }
    clearSessionCookie(ctx, reply);
    return reply.code(204).send();
  });

  // ---- Admin: cetățenii și blocările (drept exclusiv super_admin, B4 §2.4) ----
  const superOnly = requireAdmin(ctx, { superAdminOnly: true });

  api.get<{ Querystring: { q?: string; blocked?: string; cursor?: string; limit?: string } }>(
    '/admin/citizens',
    { preHandler: superOnly },
    async (request) => {
      const q = request.query;
      const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 100);
      const now = ctx.now();
      const where: string[] = [];
      const params: unknown[] = [now];
      if (q.q) { where.push('a.email_normalized LIKE ?'); params.push(`%${q.q.toLowerCase().replace(/[%_]/g, '')}%`); }
      if (q.cursor) { where.push('a.id < ?'); params.push(q.cursor); }
      const [rows] = await ctx.pool.query(
        `SELECT a.id, a.email, a.status, a.created_at AS createdAt,
           (SELECT COUNT(*) FROM reports r WHERE r.author_account_id = a.id) AS reportCount,
           (SELECT JSON_OBJECT('id', b.id, 'kind', b.kind, 'endsAt', b.ends_at) FROM citizen_blocks b
             WHERE b.account_id = a.id AND (b.kind = 'permanent' OR b.ends_at > ?) LIMIT 1) AS activeBlock
         FROM citizen_accounts a ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY a.id DESC LIMIT ?`,
        [...params, limit + 1],
      );
      let items = rows as Array<{ id: string; activeBlock: unknown }>;
      if (q.blocked === 'true') items = items.filter((i) => i.activeBlock);
      if (q.blocked === 'false') items = items.filter((i) => !i.activeBlock);
      const nextCursor = items.length > limit ? items[limit - 1]!.id : null;
      return { items: items.slice(0, limit), nextCursor };
    },
  );

  api.post<{ Params: { id: string } }>('/admin/citizens/:id/blocks', { preHandler: superOnly }, async (request, reply) => {
    const body = parseBody(blockRequest, request, reply);
    if (!body) return reply;
    const actor = request.admin!.user;
    const [rows] = await ctx.pool.query('SELECT id, email_normalized FROM citizen_accounts WHERE id = ?', [request.params.id]);
    const account = (rows as Array<{ id: string; email_normalized: string }>)[0];
    if (!account) return reply.code(404).send(apiError('NOT_FOUND', 'Contul nu există.'));
    const hash = emailHash(ctx, account.email_normalized);
    if (await activeBlock(ctx, ctx.pool, account.id, hash)) {
      return reply.code(409).send(apiError('CONFLICT', 'Contul are deja o blocare activă.'));
    }
    const now = ctx.now();
    const id = newId(now);
    const endsAt = body.kind === 'temporary' ? new Date(now.getTime() + LIMITS.temporaryBlockDays * 86_400_000) : null;
    await ctx.pool.query(
      `INSERT INTO citizen_blocks (id, account_id, kind, starts_at, ends_at, created_by, note, email_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, account.id, body.kind, now, endsAt, actor.id, body.note ?? null, hash],
    );
    await writeAudit(ctx.pool, now, {
      actorType: 'admin', actorUserId: actor.id, action: 'citizen.block', targetType: 'citizen', targetId: account.id,
      details: { kind: body.kind, blockId: id }, ipHash: requestIpHash(ctx, request),
    });
    return reply.code(201).send({ id, kind: body.kind, endsAt });
  });

  /** 2.6, A06-4: ridicarea oricărei blocări; rândul se șterge, informația rămâne în audit (A05-3, T-E1). */
  api.post<{ Params: { id: string; blockId: string } }>(
    '/admin/citizens/:id/blocks/:blockId/lift',
    { preHandler: superOnly },
    async (request, reply) => {
      const actor = request.admin!.user;
      const [rows] = await ctx.pool.query('SELECT id, kind FROM citizen_blocks WHERE id = ? AND account_id = ?', [
        request.params.blockId,
        request.params.id,
      ]);
      const block = (rows as Array<{ id: string; kind: string }>)[0];
      if (!block) return reply.code(404).send(apiError('NOT_FOUND', 'Blocarea nu există.'));
      await ctx.pool.query('DELETE FROM citizen_blocks WHERE id = ?', [block.id]);
      await writeAudit(ctx.pool, ctx.now(), {
        actorType: 'admin', actorUserId: actor.id, action: 'citizen.block.lift', targetType: 'citizen',
        targetId: request.params.id, details: { kind: block.kind, blockId: block.id }, ipHash: requestIpHash(ctx, request),
      });
      return reply.code(204).send();
    },
  );
}

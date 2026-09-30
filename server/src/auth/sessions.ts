// Sesiunile pe server (B3 §3): jeton aleator în cookie, SHA-256 în DB; inactivitate + absolut; rotație; revocare.
// Cetățeni (decizia din 30.09.2026, varianta B): sesiunea nu expiră pe server (termene la CITIZEN_NO_EXPIRY);
// se încheie numai prin ieșire, ștergerea contului (ON DELETE CASCADE) sau revocare. Cookie persistent (400 de zile,
// limita browserelor), reînnoit la fiecare folosire. Admin: neschimbat.

import type { FastifyReply, FastifyRequest } from 'fastify';
import type mysql from 'mysql2/promise';
import { LIMITS, type AppContext } from '../context.ts';
import { ipHash, randomTokenB64url, sha256Hex } from './crypto.ts';

export type MfaState = 'pending' | 'verified' | 'not_required';

export type SessionRow = {
  id: string;
  principal_type: 'admin' | 'citizen';
  user_id: string | null;
  citizen_account_id: string | null;
  mfa_state: MfaState | null;
  created_at: Date;
  last_seen_at: Date;
  idle_expires_at: Date;
  absolute_expires_at: Date;
  revoked_at: Date | null;
};

/** `__Host-` cere HTTPS; pe dezvoltare (HTTP, inclusiv telefonul prin Wi-Fi) cookie-ul simplu. */
export function cookieName(ctx: AppContext): string {
  return ctx.config.appEnv === 'development' ? 'civic_sid' : '__Host-civic_sid';
}

const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
/** Termen „fără expirare” pentru sesiunile de cetățean (în intervalul DATETIME MySQL, departe de limita 9999). */
export const CITIZEN_NO_EXPIRY = new Date('9000-01-01T00:00:00.000Z');

export async function createSession(
  ctx: AppContext,
  conn: mysql.Pool | mysql.PoolConnection,
  principal: { type: 'admin'; userId: string; mfaState: MfaState } | { type: 'citizen'; accountId: string },
  request: FastifyRequest,
): Promise<string> {
  const token = randomTokenB64url(32);
  const now = ctx.now();
  const citizen = principal.type === 'citizen';
  const idleMinutes = principal.type === 'admin' && principal.mfaState === 'pending' ? LIMITS.preMfaMinutes : LIMITS.sessionIdleMinutes;
  await conn.query(
    `INSERT INTO sessions (id, principal_type, user_id, citizen_account_id, created_at, last_seen_at,
       idle_expires_at, absolute_expires_at, mfa_state, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sha256Hex(token),
      principal.type,
      principal.type === 'admin' ? principal.userId : null,
      principal.type === 'citizen' ? principal.accountId : null,
      now,
      now,
      citizen ? CITIZEN_NO_EXPIRY : addMinutes(now, idleMinutes),
      citizen ? CITIZEN_NO_EXPIRY : addMinutes(now, LIMITS.sessionAbsoluteHours * 60),
      principal.type === 'admin' ? principal.mfaState : null,
      ipHash(ctx.config.secrets.ipHash, request.ip ?? '', now),
      (request.headers['user-agent'] ?? '').slice(0, 160),
    ],
  );
  return token;
}

/** Admin: cookie de sesiune (dispare la închiderea browserului). Cetățean: persistent, 400 de zile, reînnoit la folosire. */
export function setSessionCookie(ctx: AppContext, reply: FastifyReply, token: string, persistent = false): void {
  reply.setCookie(cookieName(ctx), token, {
    path: '/',
    httpOnly: true,
    secure: ctx.config.appEnv !== 'development',
    sameSite: 'strict',
    ...(persistent ? { maxAge: LIMITS.citizenCookieMaxAgeDays * 86_400 } : {}),
  });
}

export function clearSessionCookie(ctx: AppContext, reply: FastifyReply): void {
  reply.clearCookie(cookieName(ctx), { path: '/' });
}

export function tokenFromRequest(ctx: AppContext, request: FastifyRequest): string | undefined {
  const value = request.cookies?.[cookieName(ctx)];
  return typeof value === 'string' && value.length >= 20 && value.length <= 100 ? value : undefined;
}

/** Sesiunea validă a cererii (nerevocată, neexpirată); prelungește inactivitatea. */
export async function loadSession(ctx: AppContext, request: FastifyRequest): Promise<SessionRow | null> {
  const token = tokenFromRequest(ctx, request);
  if (!token) return null;
  const id = sha256Hex(token);
  const [rows] = await ctx.pool.query('SELECT * FROM sessions WHERE id = ?', [id]);
  const s = (rows as SessionRow[])[0];
  const now = ctx.now();
  if (!s || s.revoked_at || s.idle_expires_at <= now || s.absolute_expires_at <= now) return null;
  if (s.principal_type === 'citizen') {
    // fără expirare; se notează numai ultima folosire, cel mult o dată pe minut
    if (now.getTime() - s.last_seen_at.getTime() > 60_000) {
      await ctx.pool.query('UPDATE sessions SET last_seen_at = ? WHERE id = ?', [now, id]);
    }
    return s;
  }
  const idle = s.mfa_state === 'pending' ? LIMITS.preMfaMinutes : LIMITS.sessionIdleMinutes;
  const nextIdle = addMinutes(now, idle);
  // o scriere cel mult o dată pe minut
  if (nextIdle.getTime() - s.idle_expires_at.getTime() > 60_000) {
    await ctx.pool.query('UPDATE sessions SET last_seen_at = ?, idle_expires_at = ? WHERE id = ?', [now, nextIdle, id]);
  }
  return s;
}

export async function revokeSession(ctx: AppContext, sessionId: string, reason: string): Promise<void> {
  await ctx.pool.query('UPDATE sessions SET revoked_at = ?, revoke_reason = ? WHERE id = ? AND revoked_at IS NULL', [
    ctx.now(),
    reason,
    sessionId,
  ]);
}

/** Revocă toate sesiunile unui cont Admin (opțional, cu excepția uneia). */
export async function revokeUserSessions(
  ctx: AppContext,
  conn: mysql.Pool | mysql.PoolConnection,
  userId: string,
  reason: string,
  exceptSessionId?: string,
): Promise<void> {
  await conn.query(
    `UPDATE sessions SET revoked_at = ?, revoke_reason = ?
     WHERE user_id = ? AND revoked_at IS NULL ${exceptSessionId ? 'AND id <> ?' : ''}`,
    exceptSessionId ? [ctx.now(), reason, userId, exceptSessionId] : [ctx.now(), reason, userId],
  );
}

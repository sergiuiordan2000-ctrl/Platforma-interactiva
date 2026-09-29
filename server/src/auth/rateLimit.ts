// Limitele de rată și respingerile agregate, în DB (aplicație fără stare în memorie, B-8).

import type mysql from 'mysql2/promise';
import type { AppContext } from '../context.ts';

/** Incrementează găleata ferestrei curente; întoarce numărul de încercări din fereastră. */
export async function hitRateLimit(
  ctx: AppContext,
  bucketKey: string,
  windowMinutes: number,
): Promise<number> {
  const now = ctx.now();
  const windowMs = windowMinutes * 60_000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
  const expiresAt = new Date(windowStart.getTime() + windowMs);
  await ctx.pool.query(
    `INSERT INTO rate_limits (bucket_key, window_start, count, expires_at) VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE count = count + 1`,
    [bucketKey, windowStart, expiresAt],
  );
  const [rows] = await ctx.pool.query('SELECT count FROM rate_limits WHERE bucket_key = ? AND window_start = ?', [
    bucketKey,
    windowStart,
  ]);
  return Number((rows as Array<{ count: number }>)[0]?.count ?? 0);
}

/** Numărul fără incrementare (pentru plafoane verificate înainte de o acțiune). */
export async function peekRateLimit(ctx: AppContext, bucketKey: string, windowMinutes: number): Promise<number> {
  const windowMs = windowMinutes * 60_000;
  const windowStart = new Date(Math.floor(ctx.now().getTime() / windowMs) * windowMs);
  const [rows] = await ctx.pool.query('SELECT count FROM rate_limits WHERE bucket_key = ? AND window_start = ?', [
    bucketKey,
    windowStart,
  ]);
  return Number((rows as Array<{ count: number }>)[0]?.count ?? 0);
}

export async function recordRejected(
  ctx: AppContext,
  area: 'vote' | 'report' | 'login' | 'citizen_code',
  reason: 'duplicate' | 'rate_limited' | 'closed' | 'honeypot' | 'too_fast' | 'pow_invalid' | 'invalid' | 'blocked',
  ipHashValue: string,
  targetId = '',
  conn: mysql.Pool = ctx.pool,
): Promise<void> {
  const hour = new Date(Math.floor(ctx.now().getTime() / 3_600_000) * 3_600_000);
  await conn.query(
    `INSERT INTO rejected_attempts (hour, area, target_id, reason, ip_hash, count) VALUES (?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE count = count + 1`,
    [hour, area, targetId, reason, ipHashValue],
  );
}

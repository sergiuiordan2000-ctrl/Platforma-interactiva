// B1 §3.6: anti-abuz (B7, N-4). Numai hash-uri, fără IP în clar.

import {
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  varchar,
} from 'drizzle-orm/mysql-core';
import { hash64, ts } from './_common.ts';

/** Păstrare ≤ 48 h (N4-4). */
export const rateLimits = mysqlTable(
  'rate_limits',
  {
    bucketKey: varchar('bucket_key', { length: 255 }).notNull(),
    windowStart: ts('window_start').notNull(),
    count: int('count', { unsigned: true }).notNull().default(0),
    expiresAt: ts('expires_at').notNull(),
  },
  (t) => [
    primaryKey({ name: 'pk_rate_limits', columns: [t.bucketKey, t.windowStart] }),
    index('idx_rate_limits_expires').on(t.expiresAt),
  ],
);

/** Agregat pe oră; păstrare 30 de zile (N4-8). `target_id` = '' când nu există o țintă. */
export const rejectedAttempts = mysqlTable(
  'rejected_attempts',
  {
    hour: datetime('hour', { mode: 'date' }).notNull(),
    area: mysqlEnum('area', ['vote', 'report', 'login', 'citizen_code']).notNull(),
    targetId: varchar('target_id', { length: 64 }).notNull().default(''),
    reason: mysqlEnum('reason', [
      'duplicate',
      'rate_limited',
      'closed',
      'honeypot',
      'too_fast',
      'pow_invalid',
      'invalid',
      'blocked',
    ]).notNull(),
    ipHash: hash64('ip_hash').notNull(),
    count: int('count', { unsigned: true }).notNull().default(0),
  },
  (t) => [
    primaryKey({
      name: 'pk_rejected_attempts',
      columns: [t.hour, t.area, t.targetId, t.reason, t.ipHash],
    }),
  ],
);

/** Anti-reluarea provocărilor proof-of-work, până la expirare. */
export const usedPowChallenges = mysqlTable(
  'used_pow_challenges',
  {
    challengeHash: hash64('challenge_hash').primaryKey(),
    expiresAt: ts('expires_at').notNull(),
  },
  (t) => [index('idx_used_pow_challenges_expires').on(t.expiresAt)],
);

// B1 §3.1 + §3.7: sesiunile (Admin și cetățeni), identificate prin SHA-256 al jetonului.

import { index, mysqlEnum, mysqlTable, varchar } from 'drizzle-orm/mysql-core';
import { adminUsers } from './admin.ts';
import { citizenAccounts } from './citizens.ts';
import { hash64, ts, ulidRef } from './_common.ts';

export const sessions = mysqlTable(
  'sessions',
  {
    id: hash64('id').primaryKey(),
    principalType: mysqlEnum('principal_type', ['admin', 'citizen']).notNull(),
    userId: ulidRef('user_id').references(() => adminUsers.id),
    citizenAccountId: ulidRef('citizen_account_id').references(() => citizenAccounts.id, {
      onDelete: 'cascade',
    }),
    createdAt: ts('created_at').notNull(),
    lastSeenAt: ts('last_seen_at').notNull(),
    idleExpiresAt: ts('idle_expires_at').notNull(),
    absoluteExpiresAt: ts('absolute_expires_at').notNull(),
    // NULL pentru sesiunile cetățenilor (fără MFA)
    mfaState: mysqlEnum('mfa_state', ['pending', 'verified', 'not_required']),
    revokedAt: ts('revoked_at'),
    revokeReason: varchar('revoke_reason', { length: 32 }),
    ipHash: hash64('ip_hash'),
    userAgent: varchar('user_agent', { length: 160 }),
  },
  (t) => [
    index('idx_sessions_user').on(t.userId),
    index('idx_sessions_citizen').on(t.citizenAccountId),
    index('idx_sessions_absolute_expires').on(t.absoluteExpiresAt),
  ],
);

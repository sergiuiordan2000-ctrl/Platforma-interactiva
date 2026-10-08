// B1 §3.7: conturile cetățenilor, codurile de autentificare, blocările.

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  mysqlEnum,
  mysqlTable,
  tinyint,
  varchar,
} from 'drizzle-orm/mysql-core';
import { adminUsers } from './admin.ts';
import { hash64, isDemo, ts, ulidId, ulidRef } from './_common.ts';

export const citizenAccounts = mysqlTable('citizen_accounts', {
  id: ulidId().primaryKey(),
  email: varchar('email', { length: 254 }).notNull(),
  emailNormalized: varchar('email_normalized', { length: 254 })
    .notNull()
    .unique('uq_citizen_accounts_email_normalized'),
  status: mysqlEnum('status', ['pending', 'active']).notNull().default('pending'),
  policyVersion: varchar('policy_version', { length: 32 }).notNull(),
  policyAcceptedAt: ts('policy_accepted_at').notNull(),
  confirmedAt: ts('confirmed_at'),
  createdAt: ts('created_at').notNull(),
  lastLoginAt: ts('last_login_at'),
  isDemo: isDemo(),
});

export const citizenLoginCodes = mysqlTable(
  'citizen_login_codes',
  {
    id: ulidId().primaryKey(),
    accountId: ulidRef('account_id')
      .notNull()
      .references(() => citizenAccounts.id, { onDelete: 'cascade' }),
    codeHash: hash64('code_hash').notNull(),
    purpose: mysqlEnum('purpose', ['confirm', 'login']).notNull(),
    expiresAt: ts('expires_at').notNull(),
    attempts: tinyint('attempts', { unsigned: true }).notNull().default(0),
    consumedAt: ts('consumed_at'),
    createdAt: ts('created_at').notNull(),
  },
  (t) => [
    index('idx_citizen_login_codes_account').on(t.accountId),
    index('idx_citizen_login_codes_expires').on(t.expiresAt),
  ],
);

export const citizenBlocks = mysqlTable(
  'citizen_blocks',
  {
    id: ulidId().primaryKey(),
    // NULL după ștergerea contului (2.7) sau la reducerea la datele minime (T-C6)
    accountId: ulidRef('account_id').references(() => citizenAccounts.id, {
      onDelete: 'set null',
    }),
    kind: mysqlEnum('kind', ['temporary', 'permanent']).notNull(),
    startsAt: ts('starts_at'),
    endsAt: ts('ends_at'),
    createdBy: ulidRef('created_by').references(() => adminUsers.id),
    note: varchar('note', { length: 500 }),
    liftedAt: ts('lifted_at'),
    liftedBy: ulidRef('lifted_by').references(() => adminUsers.id),
    emailHash: hash64('email_hash').notNull(),
  },
  (t) => [
    index('idx_citizen_blocks_email_hash').on(t.emailHash),
    index('idx_citizen_blocks_account').on(t.accountId),
    // K-A02-4: temporară ⇒ ends_at obligatoriu; definitivă ⇒ fără expirare
    check(
      'chk_citizen_blocks_kind_ends',
      sql`(${t.kind} = 'temporary' AND ${t.endsAt} IS NOT NULL) OR (${t.kind} = 'permanent' AND ${t.endsAt} IS NULL)`,
    ),
  ],
);

/**
 * Amendamentul Google (§8 D, §11.3; adăugare la B1, decizia proprietarului din 08.10.2026; migrația 0002):
 * încercările de autentificare cu Google. `id` = SHA-256(state). Folosire unică: `consumed_at` setat atomic.
 * Numai date generate de aplicație, temporare (10 minute); fără date Google.
 */
export const citizenOauthAttempts = mysqlTable(
  'citizen_oauth_attempts',
  {
    id: hash64('id').primaryKey(),
    nonce: varchar('nonce', { length: 64 }).notNull(),
    codeVerifier: varchar('code_verifier', { length: 128 }).notNull(),
    policyVersion: varchar('policy_version', { length: 32 }).notNull(),
    createdAt: ts('created_at').notNull(),
    expiresAt: ts('expires_at').notNull(),
    consumedAt: ts('consumed_at'),
  },
  (t) => [index('idx_citizen_oauth_attempts_expires').on(t.expiresAt)],
);

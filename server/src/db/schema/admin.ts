// B1 §3.1: conturile Admin, codurile de recuperare TOTP, auditul, setările.

import {
  type AnyMySqlColumn,
  bigint,
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  varbinary,
  varchar,
} from 'drizzle-orm/mysql-core';
import { hash64, ts, ulidId, ulidRef } from './_common.ts';

export const adminUsers = mysqlTable('admin_users', {
  id: ulidId().primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique('uq_admin_users_email'),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  role: mysqlEnum('role', ['super_admin', 'primarie_operator']).notNull(),
  status: mysqlEnum('status', ['active', 'disabled']).notNull().default('active'),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  mustChangePassword: boolean('must_change_password').notNull().default(false),
  failedLoginCount: int('failed_login_count', { unsigned: true }).notNull().default(0),
  lockedUntil: ts('locked_until'),
  totpSecretEnc: varbinary('totp_secret_enc', { length: 255 }),
  totpEnabledAt: ts('totp_enabled_at'),
  totpLastStep: bigint('totp_last_step', { mode: 'number' }),
  createdAt: ts('created_at').notNull(),
  createdBy: ulidRef('created_by').references((): AnyMySqlColumn => adminUsers.id),
  updatedAt: ts('updated_at').notNull(),
  lastLoginAt: ts('last_login_at'),
  disabledAt: ts('disabled_at'),
  disabledBy: ulidRef('disabled_by').references((): AnyMySqlColumn => adminUsers.id),
});

export const adminRecoveryCodes = mysqlTable(
  'admin_recovery_codes',
  {
    id: ulidId().primaryKey(),
    userId: ulidRef('user_id')
      .notNull()
      .references(() => adminUsers.id),
    codeHash: hash64('code_hash').notNull(),
    usedAt: ts('used_at'),
    createdAt: ts('created_at').notNull(),
  },
  (t) => [index('idx_admin_recovery_codes_user').on(t.userId)],
);

export const auditLog = mysqlTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    occurredAt: ts('occurred_at').notNull(),
    actorType: mysqlEnum('actor_type', ['admin', 'system']).notNull(),
    actorUserId: ulidRef('actor_user_id').references(() => adminUsers.id),
    action: varchar('action', { length: 64 }).notNull(),
    targetType: varchar('target_type', { length: 32 }),
    targetId: varchar('target_id', { length: 64 }),
    details: json('details'),
    ipHash: hash64('ip_hash'),
  },
  (t) => [
    index('idx_audit_log_occurred').on(t.occurredAt),
    index('idx_audit_log_actor').on(t.actorUserId, t.occurredAt),
    index('idx_audit_log_target').on(t.targetType, t.targetId),
  ],
);

export const settings = mysqlTable('settings', {
  key: varchar('key', { length: 64 }).primaryKey(),
  value: json('value').notNull(),
  updatedAt: ts('updated_at').notNull(),
  updatedBy: ulidRef('updated_by').references(() => adminUsers.id),
});

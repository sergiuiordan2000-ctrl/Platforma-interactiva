// B1 §3.5: coada și jurnalul e-mailurilor (B6, N-3, D9, A-17).

import {
  index,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  varchar,
} from 'drizzle-orm/mysql-core';
import { reports } from './reports.ts';
import { ts, ulidId, ulidRef } from './_common.ts';

export const emailOutbox = mysqlTable(
  'email_outbox',
  {
    id: ulidId().primaryKey(),
    kind: mysqlEnum('kind', [
      'registry_notification',
      'citizen_status_update',
      'citizen_login_code',
      'citizen_account_blocked',
    ]).notNull(),
    // A05-4: jurnalul e-mail al unei sesizări se șterge odată cu sesizarea
    reportId: ulidRef('report_id').references(() => reports.id, { onDelete: 'cascade' }),
    dedupeKey: varchar('dedupe_key', { length: 128 }).unique('uq_email_outbox_dedupe_key'),
    recipient: varchar('recipient', { length: 254 }).notNull(),
    subject: varchar('subject', { length: 200 }).notNull(),
    bodyText: mediumtext('body_text'),
    attachmentPhotoIds: json('attachment_photo_ids'),
    status: mysqlEnum('status', [
      'queued',
      'sending',
      'sent',
      'failed',
      'blocked',
      'simulated',
      'cancelled',
      'on_hold',
    ]).notNull(),
    attempts: int('attempts', { unsigned: true }).notNull().default(0),
    nextAttemptAt: ts('next_attempt_at'),
    lockedUntil: ts('locked_until'),
    lastError: varchar('last_error', { length: 500 }),
    modeAtSend: mysqlEnum('mode_at_send', ['simulated', 'allowlist', 'live']),
    transport: mysqlEnum('transport', ['simulated', 'smtp']),
    providerMessageId: varchar('provider_message_id', { length: 200 }),
    createdAt: ts('created_at').notNull(),
    sentAt: ts('sent_at'),
    bodyPurgedAt: ts('body_purged_at'),
  },
  (t) => [
    index('idx_email_outbox_status_next').on(t.status, t.nextAttemptAt),
    index('idx_email_outbox_created').on(t.createdAt),
    index('idx_email_outbox_report').on(t.reportId),
  ],
);

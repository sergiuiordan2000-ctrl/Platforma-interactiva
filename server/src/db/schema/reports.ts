// B1 §3.2: sesizările și datele lor.

import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  smallint,
  text,
  tinyint,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core';
import { adminUsers } from './admin.ts';
import { citizenAccounts } from './citizens.ts';
import { hash64, isDemo, ts, ulidId, ulidRef } from './_common.ts';

/** Configurare: seed în toate mediile (seed:config). */
export const reportCategories = mysqlTable('report_categories', {
  id: varchar('id', { length: 32 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  iconName: varchar('icon_name', { length: 64 }),
  sortOrder: int('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

/** Un singur rând (id = 1); folosit numai cu SELECT … FOR UPDATE (B5 §1). */
export const reportCounter = mysqlTable(
  'report_counter',
  {
    id: tinyint('id', { unsigned: true }).primaryKey(),
    lastValue: int('last_value', { unsigned: true }).notNull().default(0),
  },
  (t) => [check('chk_report_counter_single_row', sql`${t.id} = 1`)],
);

export const reports = mysqlTable(
  'reports',
  {
    id: ulidId().primaryKey(),
    authorAccountId: ulidRef('author_account_id').references(() => citizenAccounts.id, {
      onDelete: 'set null',
    }),
    referenceNumber: varchar('reference_number', { length: 16 })
      .notNull()
      .unique('uq_reports_reference_number'),
    categoryId: varchar('category_id', { length: 32 })
      .notNull()
      .references(() => reportCategories.id),
    description: text('description').notNull(),
    locationText: varchar('location_text', { length: 300 }).notNull(),
    lat: decimal('lat', { precision: 9, scale: 6 }),
    lng: decimal('lng', { precision: 9, scale: 6 }),
    locationSource: mysqlEnum('location_source', [
      'text',
      'pin',
      'gps_pin',
      'geocoded',
      'admin_corrected',
    ]).notNull(),
    gpsAccuracyM: decimal('gps_accuracy_m', { precision: 7, scale: 1 }),
    locationApproximate: boolean('location_approximate').notNull().default(false),
    resolutionStatus: mysqlEnum('resolution_status', ['new', 'in_analysis', 'resolved'])
      .notNull()
      .default('new'),
    cityHallTakenOver: boolean('city_hall_taken_over').notNull().default(false),
    cityHallTakenOverAt: ts('city_hall_taken_over_at'),
    cityHallTakenOverBy: ulidRef('city_hall_taken_over_by').references(() => adminUsers.id),
    cityHallTransmissionRequested: boolean('city_hall_transmission_requested')
      .notNull()
      .default(false),
    cityHallTransmissionRequestedAt: ts('city_hall_transmission_requested_at'),
    locationCorrectedAt: ts('location_corrected_at'),
    locationCorrectedBy: ulidRef('location_corrected_by').references(() => adminUsers.id),
    notifyOptIn: boolean('notify_opt_in').notNull().default(false),
    notifyOptInAt: ts('notify_opt_in_at'),
    unsubscribeTokenHash: hash64('unsubscribe_token_hash').unique(
      'uq_reports_unsubscribe_token_hash',
    ),
    notifyUnsubscribedAt: ts('notify_unsubscribed_at'),
    idempotencyKey: char('idempotency_key', { length: 36 }).unique('uq_reports_idempotency_key'),
    isDemo: isDemo(),
    createdAt: ts('created_at').notNull(),
    updatedAt: ts('updated_at').notNull(),
  },
  (t) => [
    index('idx_reports_author_created').on(t.authorAccountId, t.createdAt),
    index('idx_reports_created').on(t.createdAt),
    index('idx_reports_status_created').on(t.resolutionStatus, t.createdAt),
    index('idx_reports_category').on(t.categoryId),
    index('idx_reports_taken_over').on(t.cityHallTakenOver),
    index('idx_reports_is_demo').on(t.isDemo),
    // coordonatele: ambele sau niciuna
    check('chk_reports_lat_lng_pair', sql`(${t.lat} IS NULL) = (${t.lng} IS NULL)`),
  ],
);

/** Starea curentă a asumărilor (6.6); fără istoric. */
export const reportAssignees = mysqlTable(
  'report_assignees',
  {
    reportId: ulidRef('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    userId: ulidRef('user_id')
      .notNull()
      .references(() => adminUsers.id),
    assignedAt: ts('assigned_at').notNull(),
  },
  (t) => [
    primaryKey({ name: 'pk_report_assignees', columns: [t.reportId, t.userId] }),
    index('idx_report_assignees_user').on(t.userId),
  ],
);

export const reportPhotos = mysqlTable(
  'report_photos',
  {
    id: ulidId().primaryKey(),
    reportId: ulidRef('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    ordinal: tinyint('ordinal', { unsigned: true }).notNull(),
    storageKey: varchar('storage_key', { length: 200 }).notNull().unique('uq_report_photos_storage_key'),
    mime: mysqlEnum('mime', ['image/webp', 'image/jpeg']).notNull(),
    sizeBytes: int('size_bytes', { unsigned: true }).notNull(),
    width: smallint('width', { unsigned: true }).notNull(),
    height: smallint('height', { unsigned: true }).notNull(),
    sha256: hash64('sha256').notNull(),
    createdAt: ts('created_at').notNull(),
  },
  (t) => [
    unique('uq_report_photos_report_ordinal').on(t.reportId, t.ordinal),
    check('chk_report_photos_ordinal', sql`${t.ordinal} BETWEEN 1 AND 4`),
  ],
);

/** Numai note interne (A06-3). */
export const reportResponses = mysqlTable(
  'report_responses',
  {
    id: ulidId().primaryKey(),
    reportId: ulidRef('report_id')
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    message: text('message').notNull(),
    authorUserId: ulidRef('author_user_id')
      .notNull()
      .references(() => adminUsers.id),
    createdAt: ts('created_at').notNull(),
  },
  (t) => [index('idx_report_responses_report_created').on(t.reportId, t.createdAt)],
);

// B1 §3.3: comunicatele, Ghidul (instituția, direcțiile, serviciile, linkurile), Apelul rapid.
// „Câmpurile actuale” vin din src/types/announcement.ts, directory.ts și quickDial.ts.

import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  time,
  tinyint,
  varchar,
} from 'drizzle-orm/mysql-core';
import { adminUsers } from './admin.ts';
import { isDemo, ts, ulidId, ulidRef } from './_common.ts';

/** Câmpurile de verificare a datelor de referință (D10-6). */
const verification = () => ({
  verifiedAt: ts('verified_at'),
  verifiedSource: varchar('verified_source', { length: 300 }),
});

export const announcements = mysqlTable(
  'announcements',
  {
    id: ulidId().primaryKey(),
    type: mysqlEnum('type', ['notification', 'announcement', 'news', 'event']).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    summary: varchar('summary', { length: 500 }).notNull(),
    content: text('content').notNull(),
    publishedAt: ts('published_at').notNull(),
    author: varchar('author', { length: 100 }).notNull(),
    category: varchar('category', { length: 64 }).notNull(),
    // DN-19 / A04-5: numai calea relativă a unei imagini din build
    imageUrl: varchar('image_url', { length: 255 }),
    isUrgent: boolean('is_urgent').notNull().default(false),
    expiresAt: ts('expires_at'),
    status: mysqlEnum('status', ['published', 'draft']).notNull(),
    eventDate: date('event_date', { mode: 'string' }),
    eventTime: time('event_time'),
    eventLocation: varchar('event_location', { length: 200 }),
    eventOrganizer: varchar('event_organizer', { length: 200 }),
    isDemo: isDemo(),
    createdAt: ts('created_at').notNull(),
    createdBy: ulidRef('created_by').references(() => adminUsers.id),
    updatedAt: ts('updated_at').notNull(),
    updatedBy: ulidRef('updated_by').references(() => adminUsers.id),
  },
  (t) => [
    index('idx_announcements_status_published').on(t.status, t.publishedAt),
    index('idx_announcements_type_event').on(t.type, t.eventDate),
    index('idx_announcements_expires').on(t.expiresAt),
  ],
);

/** Un singur rând (id = 1). */
export const directoryInstitution = mysqlTable(
  'directory_institution',
  {
    id: tinyint('id', { unsigned: true }).primaryKey(),
    institutionName: varchar('institution_name', { length: 200 }).notNull(),
    shortName: varchar('short_name', { length: 100 }).notNull(),
    county: varchar('county', { length: 64 }).notNull(),
    address: varchar('address', { length: 300 }).notNull(),
    postalCode: varchar('postal_code', { length: 16 }).notNull(),
    primaryPhone: varchar('primary_phone', { length: 32 }).notNull(),
    secondaryPhone: varchar('secondary_phone', { length: 32 }),
    fax: varchar('fax', { length: 32 }),
    primaryEmail: varchar('primary_email', { length: 254 }).notNull(),
    // numai informativ (D10-6); destinatarul real este settings.registry.recipient_email
    registryEmail: varchar('registry_email', { length: 254 }),
    websiteUrl: varchar('website_url', { length: 255 }).notNull(),
    schedule: json('schedule').notNull(),
    audienceSchedule: json('audience_schedule').notNull(),
    isDemo: isDemo(),
    ...verification(),
    updatedAt: ts('updated_at').notNull(),
    updatedBy: ulidRef('updated_by').references(() => adminUsers.id),
  },
  (t) => [check('chk_directory_institution_single_row', sql`${t.id} = 1`)],
);

export const directoryDepartments = mysqlTable('directory_departments', {
  id: ulidId().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  description: varchar('description', { length: 1000 }).notNull(),
  location: varchar('location', { length: 200 }),
  phone: varchar('phone', { length: 32 }),
  email: varchar('email', { length: 254 }),
  schedule: varchar('schedule', { length: 200 }),
  headOfDepartment: varchar('head_of_department', { length: 200 }),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: int('sort_order').notNull().default(0),
  isDemo: isDemo(),
  ...verification(),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const directoryServices = mysqlTable(
  'directory_services',
  {
    id: ulidId().primaryKey(),
    departmentId: ulidRef('department_id')
      .notNull()
      .references(() => directoryDepartments.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: varchar('description', { length: 1000 }).notNull(),
    documentsRequired: json('documents_required'),
    processingTime: varchar('processing_time', { length: 100 }),
    fee: varchar('fee', { length: 100 }),
    onlineLink: varchar('online_link', { length: 500 }),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: int('sort_order').notNull().default(0),
    isDemo: isDemo(),
    ...verification(),
    createdAt: ts('created_at').notNull(),
    updatedAt: ts('updated_at').notNull(),
  },
  (t) => [index('idx_directory_services_department').on(t.departmentId)],
);

export const directoryLinks = mysqlTable('directory_links', {
  id: ulidId().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  category: mysqlEnum('category', [
    'Plăți & Taxe',
    'Transparență Decizională',
    'Servicii Digitale',
    'Instituții Partenere',
  ]).notNull(),
  isExternal: boolean('is_external').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: int('sort_order').notNull().default(0),
  isDemo: isDemo(),
  ...verification(),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const quickdialCategories = mysqlTable('quickdial_categories', {
  id: ulidId().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  sortOrder: int('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  isDemo: isDemo(),
  ...verification(),
  createdAt: ts('created_at').notNull(),
  updatedAt: ts('updated_at').notNull(),
});

export const quickdialContacts = mysqlTable(
  'quickdial_contacts',
  {
    id: ulidId().primaryKey(),
    // „categoria cu contacte nu se șterge” → RESTRICT
    categoryId: ulidRef('category_id')
      .notNull()
      .references(() => quickdialCategories.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    formattedPhone: varchar('formatted_phone', { length: 40 }).notNull(),
    shortDescription: varchar('short_description', { length: 300 }),
    availability: varchar('availability', { length: 100 }).notNull(),
    isEmergency: boolean('is_emergency').notNull().default(false),
    address: varchar('address', { length: 300 }),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: int('sort_order').notNull().default(0),
    isDemo: isDemo(),
    ...verification(),
    createdAt: ts('created_at').notNull(),
    updatedAt: ts('updated_at').notNull(),
  },
  (t) => [index('idx_quickdial_contacts_category').on(t.categoryId)],
);

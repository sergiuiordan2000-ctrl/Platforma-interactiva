// Conținutul public (Faza 5.3): citirea din DB și transformarea rândurilor în modelul API (B2 §3, §6.2, §6.3).
// Aceleași funcții servesc zona publică (numai elementele publicate / active) și Admin (toate).

import type mysql from 'mysql2/promise';
import type {
  AdminAnnouncement,
  AnnouncementCounts,
  AnnouncementSort,
  AnnouncementStatus,
  AnnouncementType,
  Department,
  DirectoryResponse,
  Institution,
  Page,
  PublicAnnouncement,
  QuickDialCategory,
  QuickDialContact,
  QuickDialResponse,
  Service,
  UsefulLink,
} from '@tmc/shared';

type Row = Record<string, unknown>;
type Q = mysql.Pool | mysql.PoolConnection;

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : null);
const str = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
const day = (v: unknown): string | null => (v instanceof Date ? v.toISOString().slice(0, 10) : str(v));
const hhmm = (v: unknown): string | null => (v === null || v === undefined ? null : String(v).slice(0, 5));
const json = <T>(v: unknown, fallback: T): T => {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
};
const verification = (r: Row) => ({ verifiedAt: iso(r.verified_at), verifiedSource: str(r.verified_source) });

// ——— comunicate ———

export function toPublicAnnouncement(r: Row): PublicAnnouncement {
  return {
    id: String(r.id),
    type: r.type as AnnouncementType,
    title: String(r.title),
    summary: String(r.summary),
    content: String(r.content),
    publishedAt: iso(r.published_at)!,
    author: String(r.author),
    category: String(r.category),
    imageUrl: str(r.image_url),
    isUrgent: Boolean(r.is_urgent),
    expiresAt: iso(r.expires_at),
    eventDate: day(r.event_date),
    eventTime: hhmm(r.event_time),
    eventLocation: str(r.event_location),
    eventOrganizer: str(r.event_organizer),
    isDemo: Boolean(r.is_demo),
  };
}

export function toAdminAnnouncement(r: Row): AdminAnnouncement {
  return {
    ...toPublicAnnouncement(r),
    status: r.status as AnnouncementStatus,
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at)!,
  };
}

/** Regula publică (5B, 6.5 P5): `published` și neexpirat. */
const PUBLIC_WHERE = "status = 'published' AND (expires_at IS NULL OR expires_at > ?)";

/** Cursorul listelor de comunicate: opac (base64url), poziția ultimului element după cheia de sortare + ID. */
type Cursor = { k: string; id: string };
export const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
export function decodeCursor(s: string | undefined): Cursor | null | 'invalid' {
  if (!s) return null;
  try {
    const c = JSON.parse(Buffer.from(s, 'base64url').toString('utf8')) as Cursor;
    return typeof c.k === 'string' && typeof c.id === 'string' ? c : 'invalid';
  } catch {
    return 'invalid';
  }
}

export async function listAnnouncements(
  q: Q,
  opts: {
    now: Date;
    publicOnly: boolean;
    type?: AnnouncementType;
    status?: AnnouncementStatus;
    sort?: AnnouncementSort;
    limit?: number;
    cursor: Cursor | null;
  },
): Promise<Page<Row>> {
  const limit = opts.limit ?? 50;
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.publicOnly) {
    where.push(PUBLIC_WHERE);
    params.push(opts.now);
  }
  if (opts.type) {
    where.push('type = ?');
    params.push(opts.type);
  }
  if (opts.status) {
    where.push('status = ?');
    params.push(opts.status);
  }
  // event_date_asc: fără dată = la început (ca în frontend-ul actual); altfel cele mai noi publicate primele
  const byEvent = opts.sort === 'event_date_asc';
  const keyExpr = byEvent ? "COALESCE(event_date, '1000-01-01')" : 'published_at';
  if (opts.cursor) {
    where.push(byEvent ? `(${keyExpr} > ? OR (${keyExpr} = ? AND id > ?))` : `(${keyExpr} < ? OR (${keyExpr} = ? AND id < ?))`);
    const k = byEvent ? opts.cursor.k : new Date(opts.cursor.k);
    params.push(k, k, opts.cursor.id);
  }
  const order = byEvent ? `${keyExpr} ASC, id ASC` : `${keyExpr} DESC, id DESC`;
  const [rows] = await q.query(
    `SELECT * FROM announcements ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order} LIMIT ?`,
    [...params, limit + 1],
  );
  const list = rows as Row[];
  const items = list.slice(0, limit);
  let nextCursor: string | null = null;
  if (list.length > limit) {
    const last = items[items.length - 1]!;
    const k = byEvent ? (day(last.event_date) ?? '1000-01-01') : iso(last.published_at)!;
    nextCursor = encodeCursor({ k, id: String(last.id) });
  }
  return { items, nextCursor };
}

export async function getAnnouncementRow(q: Q, id: string): Promise<Row | null> {
  const [rows] = await q.query('SELECT * FROM announcements WHERE id = ?', [id]);
  return (rows as Row[])[0] ?? null;
}

export function isPubliclyVisible(r: Row, now: Date): boolean {
  const exp = r.expires_at instanceof Date ? r.expires_at : null;
  return r.status === 'published' && (!exp || exp > now);
}

export async function announcementHighlights(q: Q, now: Date) {
  const one = async (extra: string) => {
    const [rows] = await q.query(
      `SELECT * FROM announcements WHERE ${PUBLIC_WHERE} ${extra} ORDER BY published_at DESC, id DESC LIMIT 1`,
      [now],
    );
    const r = (rows as Row[])[0];
    return r ? toPublicAnnouncement(r) : null;
  };
  const [countRows] = await q.query(`SELECT type, COUNT(*) AS n FROM announcements WHERE ${PUBLIC_WHERE} GROUP BY type`, [now]);
  const counts: AnnouncementCounts = { all: 0, notification: 0, announcement: 0, news: 0, event: 0 };
  for (const c of countRows as Array<{ type: AnnouncementType; n: number }>) {
    counts[c.type] = Number(c.n);
    counts.all += Number(c.n);
  }
  return {
    latest: await one(''),
    latestEvent: await one("AND type = 'event'"),
    urgentAlert: await one("AND type = 'notification' AND is_urgent = true"),
    counts,
  };
}

// ——— Ghidul Primăriei ———

function toInstitution(r: Row): Institution {
  return {
    institutionName: String(r.institution_name),
    shortName: String(r.short_name),
    county: String(r.county),
    address: String(r.address),
    postalCode: String(r.postal_code),
    primaryPhone: String(r.primary_phone),
    secondaryPhone: str(r.secondary_phone),
    fax: str(r.fax),
    primaryEmail: String(r.primary_email),
    registryEmail: str(r.registry_email),
    websiteUrl: String(r.website_url),
    schedule: json(r.schedule, []),
    audienceSchedule: json(r.audience_schedule, []),
    isDemo: Boolean(r.is_demo),
    ...verification(r),
  };
}

const toDepartment = (r: Row): Department => ({
  id: String(r.id),
  name: String(r.name),
  description: String(r.description),
  location: str(r.location),
  phone: str(r.phone),
  email: str(r.email),
  schedule: str(r.schedule),
  headOfDepartment: str(r.head_of_department),
  isActive: Boolean(r.is_active),
  order: Number(r.sort_order),
  ...verification(r),
});

const toService = (r: Row): Service => ({
  id: String(r.id),
  departmentId: String(r.department_id),
  departmentName: str(r.department_name) ?? '',
  title: String(r.title),
  description: String(r.description),
  documentsRequired: json<string[]>(r.documents_required, []),
  processingTime: str(r.processing_time),
  fee: str(r.fee),
  onlineLink: str(r.online_link),
  isActive: Boolean(r.is_active),
  order: Number(r.sort_order),
  ...verification(r),
});

const toLink = (r: Row): UsefulLink => ({
  id: String(r.id),
  title: String(r.title),
  description: String(r.description),
  url: String(r.url),
  category: r.category as UsefulLink['category'],
  isExternal: Boolean(r.is_external),
  isActive: Boolean(r.is_active),
  order: Number(r.sort_order),
  ...verification(r),
});

/** Public: fiecare element numai dacă este activ (aceeași regulă ca frontend-ul actual). */
export async function loadDirectory(q: Q, activeOnly: boolean): Promise<DirectoryResponse> {
  const act = activeOnly ? 'WHERE is_active = true' : '';
  const [inst] = await q.query('SELECT * FROM directory_institution WHERE id = 1');
  const [deps] = await q.query(`SELECT * FROM directory_departments ${act} ORDER BY sort_order, name, id`);
  const [srvs] = await q.query(
    `SELECT s.*, d.name AS department_name FROM directory_services s
     LEFT JOIN directory_departments d ON d.id = s.department_id
     ${activeOnly ? 'WHERE s.is_active = true' : ''} ORDER BY s.sort_order, s.title, s.id`,
  );
  const [links] = await q.query(`SELECT * FROM directory_links ${act} ORDER BY sort_order, title, id`);
  const i = (inst as Row[])[0];
  return {
    institution: i ? toInstitution(i) : null,
    departments: (deps as Row[]).map(toDepartment),
    services: (srvs as Row[]).map(toService),
    links: (links as Row[]).map(toLink),
  };
}

// ——— Apel rapid ———

const toCategory = (r: Row): QuickDialCategory => ({
  id: String(r.id),
  name: String(r.name),
  description: String(r.description),
  isActive: Boolean(r.is_active),
  order: Number(r.sort_order),
  ...verification(r),
});

const toContact = (r: Row): QuickDialContact => ({
  id: String(r.id),
  categoryId: String(r.category_id),
  categoryName: str(r.category_name) ?? '',
  name: String(r.name),
  phone: String(r.phone),
  formattedPhone: String(r.formatted_phone),
  shortDescription: str(r.short_description),
  availability: String(r.availability),
  isEmergency: Boolean(r.is_emergency),
  address: str(r.address),
  isActive: Boolean(r.is_active),
  order: Number(r.sort_order),
  isDemo: Boolean(r.is_demo),
  ...verification(r),
});

/** E-7: `countsByCategory` = numărul contactelor (active, în zona publică) pe categorie. */
export async function loadQuickDial(q: Q, activeOnly: boolean): Promise<QuickDialResponse> {
  const [cats] = await q.query(
    `SELECT * FROM quickdial_categories ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY sort_order, name, id`,
  );
  const [contacts] = await q.query(
    `SELECT c.*, k.name AS category_name FROM quickdial_contacts c
     LEFT JOIN quickdial_categories k ON k.id = c.category_id
     ${activeOnly ? 'WHERE c.is_active = true' : ''} ORDER BY c.sort_order, c.name, c.id`,
  );
  const list = (contacts as Row[]).map(toContact);
  const countsByCategory: Record<string, number> = {};
  for (const c of list) countsByCategory[c.categoryId] = (countsByCategory[c.categoryId] ?? 0) + 1;
  return { categories: (cats as Row[]).map(toCategory), contacts: list, countsByCategory };
}

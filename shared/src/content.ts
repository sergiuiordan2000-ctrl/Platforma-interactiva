// Schemele Zod pentru conținutul public și administrarea lui (Faza 5.3):
// comunicate (B2 §3, §6.2), Ghidul Primăriei și Apelul rapid (B2 §3, §6.3).
// Corpurile cererilor sunt `strict` (câmpurile necunoscute sunt respinse, B2 §1).
// Aceleași scheme sunt folosite de server (validare) și de frontend (tipuri, T4).

import { z } from 'zod';

// ——— comune ———

/** ULID (B1 §1). */
export const idSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'ID invalid');

const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) => z.string().trim().max(max).nullable().optional();
const isoDateTime = z.iso.datetime({ offset: true });
const httpUrl = (max: number) =>
  z.string().trim().max(max).refine((v) => /^https?:\/\/[^\s]+$/i.test(v), { message: 'adresă http(s) invalidă' });

/** D10-6: data și sursa ultimei verificări a datelor de referință (opționale la orice modificare). */
const verificationFields = {
  verifiedAt: isoDateTime.nullable().optional(),
  verifiedSource: optText(300),
};

/** Reordonarea unei colecții: lista completă a ID-urilor, în ordinea nouă. */
export const orderRequest = z.strictObject({ ids: z.array(idSchema).min(1).max(500) });
/** Activare / dezactivare explicită (idempotentă). */
export const toggleRequest = z.strictObject({ isActive: z.boolean() });

const nonEmptyPatch = <T extends z.ZodObject>(schema: T) =>
  schema.refine((v) => Object.keys(v).length > 0, { message: 'nimic de modificat' });

// ——— comunicate ———

export const ANNOUNCEMENT_TYPES = ['notification', 'announcement', 'news', 'event'] as const;
export const ANNOUNCEMENT_STATUSES = ['published', 'draft'] as const;
export const ANNOUNCEMENT_SORTS = ['published_desc', 'event_date_asc'] as const;

export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];
export type AnnouncementSort = (typeof ANNOUNCEMENT_SORTS)[number];

const eventDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'format AAAA-LL-ZZ');
const eventTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'format HH:mm');
/** DN-19 / T-C9: numai calea unei imagini publicate cu aplicația; lista se verifică pe server. */
const imagePath = z.string().trim().max(255).regex(/^\/[A-Za-z0-9._/-]+$/, 'cale de imagine invalidă');

const announcementFields = {
  type: z.enum(ANNOUNCEMENT_TYPES),
  title: text(200),
  summary: text(500),
  content: text(20000),
  author: text(100),
  category: text(64),
  imageUrl: imagePath.nullable().optional(),
  isUrgent: z.boolean().optional(),
  expiresAt: isoDateTime.nullable().optional(),
  eventDate: eventDate.nullable().optional(),
  eventTime: eventTime.nullable().optional(),
  eventLocation: optText(200),
  eventOrganizer: optText(200),
};

/** Un eveniment cere data desfășurării (regula din formularul actual, 5B). */
const eventNeedsDate = (v: { type?: AnnouncementType; eventDate?: string | null }) =>
  v.type !== 'event' || Boolean(v.eventDate);

const announcementBase = z.strictObject({ ...announcementFields, status: z.enum(ANNOUNCEMENT_STATUSES).optional() });

export const announcementCreateRequest = announcementBase.refine(eventNeedsDate, {
  message: 'data evenimentului este obligatorie',
  path: ['eventDate'],
});

/** PATCH: câmpurile trimise se modifică; un `event` fără dată rezultată este respins de server. */
export const announcementUpdateRequest = nonEmptyPatch(announcementBase.partial());

export const announcementStatusRequest = z.strictObject({ status: z.enum(ANNOUNCEMENT_STATUSES) });

export const publicAnnouncementsQuery = z.strictObject({
  type: z.enum(ANNOUNCEMENT_TYPES).optional(),
  sort: z.enum(ANNOUNCEMENT_SORTS).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().max(200).optional(),
});

export const adminAnnouncementsQuery = z.strictObject({
  type: z.enum(ANNOUNCEMENT_TYPES).optional(),
  status: z.enum(ANNOUNCEMENT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().max(200).optional(),
});

export interface PublicAnnouncement {
  id: string;
  type: AnnouncementType;
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
  author: string;
  category: string;
  imageUrl: string | null;
  isUrgent: boolean;
  expiresAt: string | null;
  eventDate: string | null;
  eventTime: string | null;
  eventLocation: string | null;
  eventOrganizer: string | null;
  isDemo: boolean;
}

export interface AdminAnnouncement extends PublicAnnouncement {
  status: AnnouncementStatus;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementCounts = Record<'all' | AnnouncementType, number>;

export interface AnnouncementHighlights {
  latest: PublicAnnouncement | null;
  latestEvent: PublicAnnouncement | null;
  urgentAlert: PublicAnnouncement | null;
  counts: AnnouncementCounts;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

// ——— Ghidul Primăriei ———

export const LINK_CATEGORIES = [
  'Plăți & Taxe',
  'Transparență Decizională',
  'Servicii Digitale',
  'Instituții Partenere',
] as const;
export type LinkCategory = (typeof LINK_CATEGORIES)[number];

export const scheduleEntrySchema = z.strictObject({
  day: text(64),
  hours: text(100),
  note: z.string().trim().max(200).optional(),
});
export const audienceEntrySchema = z.strictObject({
  role: text(100),
  schedule: text(200),
  registrationNote: z.string().trim().max(300),
});

export const scheduleRequest = z.strictObject({ items: z.array(scheduleEntrySchema).max(14) });
export const audienceRequest = z.strictObject({ items: z.array(audienceEntrySchema).max(20) });

const phone = z.string().trim().max(32).regex(/^[0-9+ ()./-]*$/, 'număr de telefon invalid');
const email = z.string().trim().max(254).email();

/** Câmpurile scalare ale instituției (B2 §6.3). `registryEmail` este numai informativ (D10-6, A17-2). */
export const institutionUpdateRequest = nonEmptyPatch(
  z.strictObject({
    institutionName: text(200).optional(),
    shortName: text(100).optional(),
    county: text(64).optional(),
    address: text(300).optional(),
    postalCode: text(16).optional(),
    primaryPhone: phone.min(1).optional(),
    secondaryPhone: phone.nullable().optional(),
    fax: phone.nullable().optional(),
    primaryEmail: email.optional(),
    registryEmail: email.nullable().optional(),
    websiteUrl: httpUrl(255).optional(),
    ...verificationFields,
  }),
);

const departmentFields = {
  name: text(200),
  description: text(1000),
  location: optText(200),
  phone: phone.nullable().optional(),
  email: email.nullable().optional(),
  schedule: optText(200),
  headOfDepartment: optText(200),
  isActive: z.boolean().optional(),
  ...verificationFields,
};
export const departmentCreateRequest = z.strictObject(departmentFields);
export const departmentUpdateRequest = nonEmptyPatch(departmentCreateRequest.partial());

const serviceFields = {
  departmentId: idSchema,
  title: text(200),
  description: text(1000),
  documentsRequired: z.array(text(300)).max(40).nullable().optional(),
  processingTime: optText(100),
  fee: optText(100),
  onlineLink: httpUrl(500).nullable().optional(),
  isActive: z.boolean().optional(),
  ...verificationFields,
};
export const serviceCreateRequest = z.strictObject(serviceFields);
export const serviceUpdateRequest = nonEmptyPatch(serviceCreateRequest.partial());

const linkFields = {
  title: text(200),
  description: text(500),
  url: httpUrl(500),
  category: z.enum(LINK_CATEGORIES),
  isExternal: z.boolean().optional(),
  isActive: z.boolean().optional(),
  ...verificationFields,
};
export const linkCreateRequest = z.strictObject(linkFields);
export const linkUpdateRequest = nonEmptyPatch(linkCreateRequest.partial());

export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;
export type AudienceEntry = z.infer<typeof audienceEntrySchema>;

interface Verification {
  verifiedAt: string | null;
  verifiedSource: string | null;
}

export interface Institution extends Verification {
  institutionName: string;
  shortName: string;
  county: string;
  address: string;
  postalCode: string;
  primaryPhone: string;
  secondaryPhone: string | null;
  fax: string | null;
  primaryEmail: string;
  registryEmail: string | null;
  websiteUrl: string;
  schedule: ScheduleEntry[];
  audienceSchedule: AudienceEntry[];
  isDemo: boolean;
}

export interface Department extends Verification {
  id: string;
  name: string;
  description: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  schedule: string | null;
  headOfDepartment: string | null;
  isActive: boolean;
  order: number;
}

export interface Service extends Verification {
  id: string;
  departmentId: string;
  departmentName: string;
  title: string;
  description: string;
  documentsRequired: string[];
  processingTime: string | null;
  fee: string | null;
  onlineLink: string | null;
  isActive: boolean;
  order: number;
}

export interface UsefulLink extends Verification {
  id: string;
  title: string;
  description: string;
  url: string;
  category: LinkCategory;
  isExternal: boolean;
  isActive: boolean;
  order: number;
}

/** `GET /public/directory` (numai elementele active) și `GET /admin/directory` (toate). */
export interface DirectoryResponse {
  institution: Institution | null;
  departments: Department[];
  services: Service[];
  links: UsefulLink[];
}

// ——— Apel rapid ———

const categoryFields = {
  name: text(100),
  description: z.string().trim().max(500),
  isActive: z.boolean().optional(),
  ...verificationFields,
};
export const quickDialCategoryCreateRequest = z.strictObject(categoryFields);
export const quickDialCategoryUpdateRequest = nonEmptyPatch(quickDialCategoryCreateRequest.partial());

const contactFields = {
  categoryId: idSchema,
  name: text(200),
  phone: phone.min(1),
  formattedPhone: text(40),
  shortDescription: optText(300),
  availability: text(100),
  isEmergency: z.boolean().optional(),
  address: optText(300),
  isActive: z.boolean().optional(),
  ...verificationFields,
};
export const quickDialContactCreateRequest = z.strictObject(contactFields);
export const quickDialContactUpdateRequest = nonEmptyPatch(quickDialContactCreateRequest.partial());

export interface QuickDialCategory extends Verification {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  order: number;
}

export interface QuickDialContact extends Verification {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  phone: string;
  formattedPhone: string;
  shortDescription: string | null;
  availability: string;
  isEmergency: boolean;
  address: string | null;
  isActive: boolean;
  order: number;
  isDemo: boolean;
}

/** `GET /public/quickdial` (active) și `GET /admin/quickdial` (toate); E-7: `countsByCategory`. */
export interface QuickDialResponse {
  categories: QuickDialCategory[];
  contacts: QuickDialContact[];
  countsByCategory: Record<string, number>;
}

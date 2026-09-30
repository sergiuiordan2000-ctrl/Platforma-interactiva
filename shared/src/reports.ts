// Schemele Zod pentru sesizări (Faza 5.4): depunerea (B5 §1, B2 §4.2), proiecția publică
// (B5 §3, B2 §3), lista proprie (D28), Admin (B2 §6.1) și geocodarea (2.4).
// Corpurile cererilor sunt `strict` (câmpurile necunoscute sunt respinse, B2 §1; 2.8:
// `publicationPreference` → 400). Aceleași scheme la server (validare) și în frontend (tipuri).
// Fără moderare (2.3): nu există stări sau câmpuri de aprobare / respingere.

import { z } from 'zod';
import type { Page } from './content.ts';

// ——— valori comune ———

/** Stadiile (DN-09, C-2); publice (A-7). */
export const REPORT_STATUSES = ['new', 'in_analysis', 'resolved'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Sursele de locație pe care le poate trimite cetățeanul (2.4). `admin_corrected` se setează numai pe server. */
export const CITIZEN_LOCATION_SOURCES = ['pin', 'gps_pin', 'geocoded', 'text'] as const;
export type CitizenLocationSource = (typeof CITIZEN_LOCATION_SOURCES)[number];
export type LocationSource = CitizenLocationSource | 'admin_corrected';

/** B5 §1, pasul 2: descrierea 15–1000 de caractere. */
export const REPORT_DESCRIPTION_MIN = 15;
export const REPORT_DESCRIPTION_MAX = 1000;
/** B1: `reports.location_text` varchar(300). */
export const LOCATION_TEXT_MAX = 300;
/** B5 §2 (propunere): ≤ 4 fotografii, ≤ 3 MB fiecare, ≤ 4096 × 4096 px. */
export const REPORT_PHOTOS_MAX = 4;
export const REPORT_PHOTO_BYTES_MAX = 3 * 1024 * 1024;
export const REPORT_PHOTO_PX_MAX = 4096;
export const REPORT_PHOTO_MIMES = ['image/jpeg', 'image/webp'] as const;

/** Numărul civic: `TM-` + minimum 3 cifre (B5 §1). */
export const referenceNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^TM-\d{3,}$/, 'număr de sesizare invalid');

/** B1: `report_categories.id` varchar(32), identificator textual (ex.: `iluminat`). */
export const reportCategoryIdSchema = z.string().regex(/^[a-z0-9_-]{1,32}$/, 'categorie invalidă');

/** B1: decimal(9,6). Limita UAT se verifică pe server (2.12). */
const latitude = z.number().finite().min(-90).max(90);
const longitude = z.number().finite().min(-180).max(180);

// ——— depunerea (POST /citizen/reports, multipart) ———

/**
 * Locația (2.4). Reguli:
 * - coordonatele: ambele sau niciuna (D6-4, B1 `chk_reports_lat_lng_pair`);
 * - `text` = fără coordonate; `pin` / `gps_pin` / `geocoded` = cu coordonate;
 * - `geocoded` este întotdeauna aproximativă; `pin` / `gps_pin` nu sunt aproximative.
 */
export const reportLocationSchema = z
  .strictObject({
    text: z.string().trim().min(3).max(LOCATION_TEXT_MAX),
    lat: latitude.optional(),
    lng: longitude.optional(),
    source: z.enum(CITIZEN_LOCATION_SOURCES),
    approximate: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const hasLat = v.lat !== undefined;
    const hasLng = v.lng !== undefined;
    if (hasLat !== hasLng) {
      ctx.addIssue({ code: 'custom', message: 'coordonatele se trimit împreună', path: ['lat'] });
      return;
    }
    const hasCoords = hasLat && hasLng;
    if (v.source === 'text' && hasCoords) {
      ctx.addIssue({ code: 'custom', message: 'sursa `text` nu are coordonate', path: ['source'] });
    }
    if (v.source !== 'text' && !hasCoords) {
      ctx.addIssue({ code: 'custom', message: 'poziția lipsește', path: ['lat'] });
    }
    if (v.source === 'geocoded' && v.approximate === false) {
      ctx.addIssue({ code: 'custom', message: 'adresa geocodată este aproximativă', path: ['approximate'] });
    }
    if ((v.source === 'pin' || v.source === 'gps_pin') && v.approximate === true) {
      ctx.addIssue({ code: 'custom', message: 'pinul nu este aproximativ', path: ['approximate'] });
    }
  });

/**
 * Câmpurile text ale depunerii. În multipart, ele sosesc într-o singură parte JSON numită `data`
 * (decizie tehnică, 5.4); fotografiile sosesc ca părți `photos`. Fără câmpul `email` (A-9) și
 * fără `publicationPreference` (2.8). `hp` = capcana (B7), `formStartedAt` = jeton semnat de server,
 * `pow` = soluția ALTCHA, numai când este pornit (decizia din 30.09.2026).
 */
export const reportSubmissionSchema = z.strictObject({
  categoryId: reportCategoryIdSchema,
  description: z.string().trim().min(REPORT_DESCRIPTION_MIN).max(REPORT_DESCRIPTION_MAX),
  location: reportLocationSchema,
  notifyOptIn: z.boolean(),
  transmitToCityHall: z.boolean(),
  hp: z.string().max(200),
  formStartedAt: z.string().min(1).max(300),
  pow: z.string().min(1).max(4000).optional(),
});
export type ReportSubmission = z.infer<typeof reportSubmissionSchema>;

/** Antetul `Idempotency-Key` (B2 §1): UUID. */
export const idempotencyKeySchema = z.uuid();

export interface ReportCreated {
  referenceNumber: string;
  createdAt: string;
}

/** Jetonul de început al formularului (B7: timp minim, semnat de server). */
export interface FormStartToken {
  formStartedAt: string;
}

/**
 * Provocarea ALTCHA v2 (`GET /citizen/reports/pow-challenge`, numai când este pornit).
 * Câmpul `pow` al depunerii = base64(JSON `{ challenge, solution: { counter, derivedKey } }`).
 */
export interface PowChallenge {
  parameters: {
    algorithm: string;
    nonce: string;
    salt: string;
    cost: number;
    keyLength: number;
    keyPrefix: string;
    expiresAt?: number;
  };
  signature?: string;
}

// ——— geocodarea (POST /citizen/geocode, 2.4) ———

export const geocodeRequest = z.strictObject({
  address: z.string().trim().min(3).max(LOCATION_TEXT_MAX),
});
export interface GeocodeResult {
  lat: number;
  lng: number;
  approximate: true;
}

// ——— public ———

export interface ReportCategory {
  id: string;
  name: string;
  description: string;
  iconName: string | null;
}

/** Proiecția publică (B5 §3): fără ID intern, contact, asumare, preluare, autor (D9, A-8). */
export interface PublicMapReport {
  referenceNumber: string;
  categoryId: string;
  categoryName: string;
  publicDescription: string;
  /** Coordonatele sunt rotunjite la 4 zecimale (D6-3). */
  publicLocation: { text: string; lat: number; lng: number };
  photoUrl: string | null;
  createdAt: string;
  locationApproximate: boolean;
  status: ReportStatus;
}

/**
 * Lista proprie (D28): aceeași proiecție + starea, fără starea transmiterii.
 * O sesizare proprie fără poziție validă apare în listă, cu `publicLocation.lat/lng = null`.
 */
export interface CitizenReport extends Omit<PublicMapReport, 'publicLocation'> {
  publicLocation: { text: string; lat: number | null; lng: number | null };
}

// ——— Admin (B2 §6.1) ———

/**
 * Starea derivată a transmiterii către Primărie (A17-7, corectura 3, B2 §6.1), fără destinatari.
 * Derivată din rândul `registry_notification` (B1 §157), nestocată:
 * `not_requested` = nesolicitat (P-12) · `on_hold` = în așteptare (flux oprit, 2.13) ·
 * `queued` = în coadă (`queued` / `sending`) · `sent` = trimis · `failed` = eșuat ·
 * `stopped` = oprit (`simulated` / `blocked` / `cancelled`: nu pleacă niciun mesaj).
 */
export const TRANSMISSION_STATES = ['not_requested', 'on_hold', 'queued', 'sent', 'failed', 'stopped'] as const;
export type TransmissionState = (typeof TRANSMISSION_STATES)[number];

const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const adminReportsQuery = z.strictObject({
  resolution: z.enum(REPORT_STATUSES).optional(),
  category: reportCategoryIdSchema.optional(),
  takenOver: boolQuery.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().max(200).optional(),
});

/** DN-09 / 2.1: endpoint-ul acceptă numai `resolved`; celelalte valori → 409 (verificat pe server). */
export const resolutionRequest = z.strictObject({ status: z.enum(REPORT_STATUSES) });

/** Note interne (A06-3). */
export const reportResponseRequest = z.strictObject({ message: z.string().trim().min(1).max(2000) });

/** Corectarea poziției (2.11, D6-5): drept exclusiv `super_admin`; motivul este obligatoriu. */
export const locationCorrectionRequest = z.strictObject({
  lat: latitude,
  lng: longitude,
  text: z.string().trim().min(3).max(LOCATION_TEXT_MAX).optional(),
  reason: z.string().trim().min(3).max(500),
});

export interface AdminReportListItem {
  id: string;
  referenceNumber: string;
  categoryId: string;
  categoryName: string;
  description: string;
  locationText: string;
  hasPosition: boolean;
  locationApproximate: boolean;
  locationSource: LocationSource;
  status: ReportStatus;
  photoCount: number;
  cityHallTakenOver: boolean;
  transmitToCityHall: boolean;
  transmission: TransmissionState;
  assignees: { id: string; displayName: string }[];
  isDemo: boolean;
  createdAt: string;
}

export interface AdminReportPhoto {
  id: string;
  ordinal: number;
  url: string;
  mime: (typeof REPORT_PHOTO_MIMES)[number];
  width: number;
  height: number;
}

export interface AdminReportResponse {
  id: string;
  message: string;
  authorDisplayName: string;
  createdAt: string;
}

/** Jurnalul e-mail al sesizării: numai în răspunsul pentru `super_admin` (2.11). */
export interface AdminReportEmail {
  id: string;
  type: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface AdminReportDetail extends AdminReportListItem {
  lat: number | null;
  lng: number | null;
  notifyOptIn: boolean;
  cityHallTakenOverAt: string | null;
  cityHallTakenOverBy: string | null;
  locationCorrectedAt: string | null;
  photos: AdminReportPhoto[];
  responses: AdminReportResponse[];
  updatedAt: string;
  /** Numai pentru `super_admin` (A-8); `null` dacă autorul și-a șters contul (2.7). */
  authorEmail?: string | null;
  /** Numai pentru `super_admin` (2.11). */
  emails?: AdminReportEmail[];
}

export type AdminReportsPage = Page<AdminReportListItem>;

export interface AdminReportStats {
  byStatus: Record<ReportStatus, number>;
  withoutPosition: number;
  total: number;
  /** Numai pentru `super_admin` (A17-9). */
  emailFailures?: number;
}


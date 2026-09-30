// Proiecțiile sesizărilor (B5 §3, B8 §2): publică (PublicMapReport), lista proprie (D28) și Admin.
// Proiecția publică se calculează la cerere și nu conține niciodată: ID-ul intern, contactul, asumarea,
// preluarea, responsabilii, răspunsurile, contul sau e-mailul autorului.

import type { CitizenReport, PublicMapReport, ReportStatus } from '@tmc/shared';

/** Coloanele citite pentru proiecția publică / proprie. */
export const PUBLIC_COLUMNS = `
  r.id, r.reference_number, r.category_id, c.name AS category_name, r.description, r.location_text,
  r.lat, r.lng, r.location_approximate, r.resolution_status, r.created_at,
  (SELECT p.id FROM report_photos p WHERE p.report_id = r.id AND p.ordinal = 1) AS photo_id`;

export type PublicRow = {
  id: string;
  reference_number: string;
  category_id: string;
  category_name: string;
  description: string;
  location_text: string;
  lat: string | number | null;
  lng: string | number | null;
  location_approximate: number | boolean;
  resolution_status: ReportStatus;
  created_at: Date;
  photo_id: string | null;
};

/** D6-3: 4 zecimale (≈ 11 m). */
export const round4 = (v: number) => Math.round(v * 1e4) / 1e4;

const num = (v: string | number | null): number | null => (v === null ? null : Number(v));

export const publicPhotoUrl = (photoId: string) => `/api/v1/public/photos/${photoId}`;

/** `null` dacă sesizarea nu are poziție (nu apare pe hartă, 2.4). */
export function toPublic(row: PublicRow): PublicMapReport | null {
  const lat = num(row.lat);
  const lng = num(row.lng);
  if (lat === null || lng === null) return null;
  return {
    referenceNumber: row.reference_number,
    categoryId: row.category_id,
    categoryName: row.category_name,
    publicDescription: row.description,
    publicLocation: { text: row.location_text, lat: round4(lat), lng: round4(lng) },
    photoUrl: row.photo_id ? publicPhotoUrl(row.photo_id) : null,
    createdAt: row.created_at.toISOString(),
    locationApproximate: Boolean(row.location_approximate),
    status: row.resolution_status,
  };
}

/** Lista proprie (D28): aceeași proiecție + starea; include și sesizările fără poziție. */
export function toCitizen(row: PublicRow): CitizenReport {
  const lat = num(row.lat);
  const lng = num(row.lng);
  return {
    referenceNumber: row.reference_number,
    categoryId: row.category_id,
    categoryName: row.category_name,
    publicDescription: row.description,
    publicLocation: {
      text: row.location_text,
      lat: lat === null ? null : round4(lat),
      lng: lng === null ? null : round4(lng),
    },
    photoUrl: row.photo_id && lat !== null ? publicPhotoUrl(row.photo_id) : null,
    createdAt: row.created_at.toISOString(),
    locationApproximate: Boolean(row.location_approximate),
    status: row.resolution_status,
  };
}


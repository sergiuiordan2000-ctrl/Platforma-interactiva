/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sesizările (Faza 5.4): client al API-ului (B2 §3, §4.2, §6.1). Sursa datelor este serverul;
 * nimic în `localStorage` (B8 §2.4). Fără moderare (2.3): sesizarea este publică imediat, dacă are
 * poziție în UAT. Regulile (UAT, limite, permisiuni) se aplică pe server; interfața doar le afișează.
 */

import {
  type AdminReportDetail,
  type AdminReportStats,
  type AdminReportsPage,
  type CitizenReport,
  type CitizenLocationSource,
  type GeocodeResult,
  type PowChallenge,
  type PublicMapReport,
  type ReportCategory,
  type ReportCreated,
  type ReportStatus,
} from '@tmc/shared';
import { api, ApiError } from './apiClient';
import { solvePow } from './powSolver';

export type { AdminReportDetail, AdminReportListItem, CitizenReport, PublicMapReport, ReportCategory, ReportStatus } from '@tmc/shared';

/** Centrul municipiului (nodul OSM „Turnu Măgurele”), folosit la centrarea hărților. */
export const TURNU_MAGURELE_CENTER = { lat: 43.7518, lng: 24.8692 };
/** Raza zonei afișate pentru o adresă geocodată (propunere tehnică din planul 5.4; 2.4). */
export const APPROX_ZONE_RADIUS_M = 150;

export const STATUS_LABELS: Record<ReportStatus, string> = {
  new: 'Nouă',
  in_analysis: 'În analiză',
  resolved: 'Rezolvată',
};

/** Datele formularului, fără câmpurile anti-abuz (adăugate de serviciu). */
export interface ReportInput {
  categoryId: string;
  description: string;
  location: { text: string; lat?: number; lng?: number; source: CitizenLocationSource; approximate?: boolean };
  notifyOptIn: boolean;
  transmitToCityHall: boolean;
}

/** Contextul unei completări de formular: jetonul „timp minim” și cheia de retrimitere (B7). */
export interface FormSession {
  formStartedAt: string;
  idempotencyKey: string;
}

export type SubmitResult =
  | { success: true; created: ReportCreated }
  | { success: false; error: string; status: number; fields?: Record<string, string> };

const newKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

function submitErrorMessage(err: ApiError): string {
  switch (err.status) {
    case 401:
      return 'Sesiunea contului a expirat. Autentificați-vă din nou; datele din formular au fost păstrate.';
    case 403:
      return 'Contul dumneavoastră nu poate depune sesizări în acest moment.';
    case 413:
      return 'Fotografiile sunt prea mari sau prea multe (maximum 4, fiecare sub 3 MB).';
    case 415:
      return 'Una dintre fotografii nu este o imagine acceptată (JPEG sau WebP).';
    case 429:
      return err.message;
    case 0:
      return err.message;
    default:
      return err.message || 'Sesizarea nu a putut fi trimisă. Încercați din nou.';
  }
}

class ReportService {
  // ——— public ———

  getCategories(): Promise<ReportCategory[]> {
    return api.get<ReportCategory[]>('/public/report-categories');
  }

  getPublicMapReports(): Promise<PublicMapReport[]> {
    return api.get<PublicMapReport[]>('/public/map-reports');
  }

  async unsubscribe(token: string): Promise<'ok' | 'invalid' | 'error'> {
    try {
      await api.post('/public/notifications/unsubscribe', { token });
      return 'ok';
    } catch (err) {
      return err instanceof ApiError && err.status === 404 ? 'invalid' : 'error';
    }
  }

  // ——— cetățean ———

  /** Începutul unei completări: jeton semnat de server + cheie nouă de retrimitere. */
  async startForm(): Promise<FormSession> {
    const { formStartedAt } = await api.get<{ formStartedAt: string }>('/citizen/reports/form-token');
    return { formStartedAt, idempotencyKey: newKey() };
  }

  async geocode(address: string): Promise<{ ok: true; result: GeocodeResult } | { ok: false; error: string }> {
    try {
      return { ok: true, result: await api.post<GeocodeResult>('/citizen/geocode', { address }) };
    } catch (err) {
      return { ok: false, error: err instanceof ApiError ? err.message : 'Căutarea adresei nu a reușit.' };
    }
  }

  /**
   * Depunerea (B5 §1). `photos` = fișierele deja comprimate în browser (JPEG / WebP).
   * Aceeași `FormSession` la o retrimitere (de ex. după o eroare de rețea) → aceeași sesizare pe server.
   */
  async submit(input: ReportInput, photos: Blob[], session: FormSession, hp = ''): Promise<SubmitResult> {
    try {
      let pow: string | undefined;
      try {
        const challenge = await api.get<PowChallenge>('/citizen/reports/pow-challenge');
        pow = await solvePow(challenge);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err; // 404 = ALTCHA oprit
      }
      const form = new FormData();
      form.append(
        'data',
        JSON.stringify({ ...input, hp, formStartedAt: session.formStartedAt, ...(pow ? { pow } : {}) }),
      );
      photos.forEach((p, i) => form.append('photos', p, `foto-${i + 1}.${p.type === 'image/webp' ? 'webp' : 'jpg'}`));
      const created = await api.postForm<ReportCreated>('/citizen/reports', form, { 'Idempotency-Key': session.idempotencyKey });
      return { success: true, created };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, status: err.status, error: submitErrorMessage(err), fields: err.fields };
      }
      return { success: false, status: 0, error: 'Sesizarea nu a putut fi trimisă. Încercați din nou.' };
    }
  }

  getMyReports(): Promise<CitizenReport[]> {
    return api.get<CitizenReport[]>('/citizen/reports');
  }

  deleteMyReport(referenceNumber: string): Promise<void> {
    return api.del<void>(`/citizen/reports/${encodeURIComponent(referenceNumber)}`);
  }

  // ——— Admin (B2 §6.1) ———

  adminList(query: { resolution?: ReportStatus; category?: string; takenOver?: boolean; q?: string; cursor?: string } = {}) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') p.set(k, String(v));
    const qs = p.toString();
    return api.get<AdminReportsPage>(`/admin/reports${qs ? `?${qs}` : ''}`);
  }

  adminStats(): Promise<AdminReportStats> {
    return api.get<AdminReportStats>('/admin/reports/stats');
  }

  adminDetail(id: string): Promise<AdminReportDetail> {
    return api.get<AdminReportDetail>(`/admin/reports/${id}`);
  }

  markResolved(id: string) {
    return api.patch<{ status: ReportStatus }>(`/admin/reports/${id}/resolution`, { status: 'resolved' });
  }

  assume(id: string) {
    return api.post<{ changed: boolean }>(`/admin/reports/${id}/assume`);
  }

  withdrawAssumption(id: string) {
    return api.del<void>(`/admin/reports/${id}/assume`);
  }

  takeOver(id: string) {
    return api.post<{ changed: boolean }>(`/admin/reports/${id}/takeover`);
  }

  addNote(id: string, message: string) {
    return api.post<{ id: string }>(`/admin/reports/${id}/responses`, { message });
  }

  correctLocation(id: string, body: { lat: number; lng: number; text?: string; reason: string }) {
    return api.patch<void>(`/admin/reports/${id}/location`, body);
  }

  retryEmail(id: string, emailId: string) {
    return api.post<{ status: string }>(`/admin/reports/${id}/emails/${emailId}/retry`);
  }

  deleteReport(id: string) {
    return api.del<void>(`/admin/reports/${id}`);
  }
}

export const reportService = new ReportService();

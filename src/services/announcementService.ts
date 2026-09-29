/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Comunicatele (Faza 5.3): client al API-ului (B2 §3, §6.2). Sursa datelor este serverul; nimic în
 * `localStorage`. Regulile de vizibilitate (publicat + neexpirat) și permisiunile se aplică pe server;
 * interfața folosește permisiunile doar pentru a afișa sau ascunde butoanele.
 */

import {
  announcementCreateRequest,
  announcementUpdateRequest,
  type AdminAnnouncement,
  type AnnouncementHighlights,
  type Page,
  type PublicAnnouncement,
} from '@tmc/shared';
import { Announcement, AnnouncementFilterType, AnnouncementSortOption, AnnouncementStatus } from '../types/announcement';
import { api, ApiError } from './apiClient';

export type AnnouncementCounts = Record<AnnouncementFilterType, number>;

export interface Highlights {
  latest?: Announcement;
  latestEvent?: Announcement;
  urgentAlert?: Announcement;
  counts: AnnouncementCounts;
}

/** Rezultatul unei operații Admin: succes sau mesajul de eroare (+ câmpurile invalide). */
export type MutationResult = { success: true; id?: string } | { success: false; error: string; fields?: Record<string, string> };

/** Datele formularului Admin (fără câmpurile stabilite de server: id, data publicării, isDemo). */
export type AnnouncementInput = Omit<Announcement, 'id' | 'publishedAt' | 'isDemo'>;

const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

function fromApi(a: PublicAnnouncement | AdminAnnouncement): Announcement {
  return {
    id: a.id,
    type: a.type,
    title: a.title,
    summary: a.summary,
    content: a.content,
    publishedAt: a.publishedAt,
    author: a.author,
    category: a.category,
    imageUrl: u(a.imageUrl),
    isUrgent: a.isUrgent,
    expiresAt: u(a.expiresAt),
    status: 'status' in a ? a.status : 'published',
    isDemo: a.isDemo,
    eventDate: u(a.eventDate),
    eventTime: u(a.eventTime),
    eventLocation: u(a.eventLocation),
    eventOrganizer: u(a.eventOrganizer),
  };
}

/** Câmpurile formularului → corpul cererii (golurile devin `null`). */
function toApi(data: Partial<AnnouncementInput>) {
  const n = <T>(v: T | undefined) => (v === undefined || v === '' ? null : v);
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) out[k] = v;
  };
  set('type', data.type);
  set('title', data.title);
  set('summary', data.summary);
  set('content', data.content);
  set('author', data.author);
  set('category', data.category);
  set('status', data.status);
  set('isUrgent', data.isUrgent);
  if ('imageUrl' in data) out.imageUrl = n(data.imageUrl);
  if ('expiresAt' in data) out.expiresAt = n(data.expiresAt);
  if ('eventDate' in data) out.eventDate = n(data.eventDate);
  if ('eventTime' in data) out.eventTime = n(data.eventTime);
  if ('eventLocation' in data) out.eventLocation = n(data.eventLocation);
  if ('eventOrganizer' in data) out.eventOrganizer = n(data.eventOrganizer);
  return out;
}

function failure(err: unknown): MutationResult {
  if (err instanceof ApiError) return { success: false, error: err.message, fields: err.fields };
  return { success: false, error: 'Operația a eșuat. Încercați din nou.' };
}

/** Toate paginile unei liste (listele sunt mici; paginarea serverului rămâne în vigoare). */
async function allPages<T>(path: string): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?';
  const items: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const page: Page<T> = await api.get<Page<T>>(`${path}${sep}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    items.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return items;
}

class AnnouncementService {
  // ——— zona publică ———

  /** Comunicatele publicate și neexpirate, filtrate și sortate de server. */
  public async getAll(filter: AnnouncementFilterType = 'all', sort: AnnouncementSortOption = 'published_desc'): Promise<Announcement[]> {
    const params = new URLSearchParams({ sort });
    if (filter !== 'all') params.set('type', filter);
    return (await allPages<PublicAnnouncement>(`/public/announcements?${params}`)).map(fromApi);
  }

  /** ETAPA 6.5 (P5): numai un comunicat public; altfel `undefined` (404). */
  public async getPublicById(id: string): Promise<Announcement | undefined> {
    try {
      return fromApi(await api.get<PublicAnnouncement>(`/public/announcements/${encodeURIComponent(id)}`));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return undefined;
      throw err;
    }
  }

  /** Acasă: ultimul comunicat, ultimul eveniment, alerta urgentă și contoarele pe tip. */
  public async getHighlights(): Promise<Highlights> {
    const h = await api.get<AnnouncementHighlights>('/public/announcements/highlights');
    return {
      latest: h.latest ? fromApi(h.latest) : undefined,
      latestEvent: h.latestEvent ? fromApi(h.latestEvent) : undefined,
      urgentAlert: h.urgentAlert ? fromApi(h.urgentAlert) : undefined,
      counts: h.counts,
    };
  }

  // ——— Admin ———

  /** Toate comunicatele (inclusiv ciornele și cele expirate), cele mai noi primele. */
  public async getAllForAdmin(): Promise<Announcement[]> {
    return (await allPages<AdminAnnouncement>('/admin/announcements')).map(fromApi);
  }

  /** Imaginile publicate cu aplicația (DN-19, T-C9). */
  public async getPublishedImages(): Promise<string[]> {
    return (await api.get<{ items: string[] }>('/admin/announcements/images')).items;
  }

  public async create(data: AnnouncementInput): Promise<MutationResult> {
    const body = toApi(data);
    const check = announcementCreateRequest.safeParse(body);
    if (!check.success) return { success: false, error: 'Datele trimise nu sunt valide.', fields: fieldsOf(check.error.issues) };
    try {
      const res = await api.post<{ id: string }>('/admin/announcements', body);
      return { success: true, id: res.id };
    } catch (err) {
      return failure(err);
    }
  }

  public async update(id: string, patch: Partial<AnnouncementInput>): Promise<MutationResult> {
    const body = toApi(patch);
    const check = announcementUpdateRequest.safeParse(body);
    if (!check.success) return { success: false, error: 'Datele trimise nu sunt valide.', fields: fieldsOf(check.error.issues) };
    try {
      await api.patch(`/admin/announcements/${encodeURIComponent(id)}`, body);
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  }

  /** Publicare / dezactivare (fără ștergere, 5B / D4). */
  public async setStatus(id: string, status: AnnouncementStatus): Promise<MutationResult> {
    try {
      await api.patch(`/admin/announcements/${encodeURIComponent(id)}/status`, { status });
      return { success: true };
    } catch (err) {
      return failure(err);
    }
  }
}

function fieldsOf(issues: Array<{ path: PropertyKey[] }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) out[i.path.map(String).join('.') || '_'] ??= 'valoare invalidă';
  return out;
}

export const announcementService = new AnnouncementService();

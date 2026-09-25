/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Announcement, AnnouncementFilterType, AnnouncementSortOption, AnnouncementStatus } from '../types/announcement';
import { INITIAL_DEMO_ANNOUNCEMENTS } from '../data/mockAnnouncements';

const STORAGE_KEY = 'turnu_civic_announcements';

class AnnouncementService {
  private announcements: Announcement[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Announcement[] = JSON.parse(stored);
        // Ne asigurăm că elementele demonstrative noi sunt integrate fără a suprascrie modificările
        const existingIds = new Set(parsed.map(a => a.id));
        const missingInitial = INITIAL_DEMO_ANNOUNCEMENTS.filter(item => !existingIds.has(item.id));
        this.announcements = [...parsed, ...missingInitial];
        if (missingInitial.length > 0) {
          this.save();
        }
      } else {
        this.announcements = [...INITIAL_DEMO_ANNOUNCEMENTS];
        this.save();
      }
    } catch {
      this.announcements = [...INITIAL_DEMO_ANNOUNCEMENTS];
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.announcements));
    } catch {
      // Ignorare erori de quota în spații restrânse
    }
  }

  /**
   * Un comunicat fără câmpul `status` (toate articolele existente/demo dinainte
   * de Etapa 5B) este tratat implicit ca 'published', prin fallback — nu a fost
   * nevoie să se rescrie datele demo existente.
   */
  private isPublished(a: Announcement): boolean {
    return (a.status ?? 'published') === 'published';
  }

  /**
   * Un comunicat este expirat dacă `expiresAt` există și este în trecut.
   * Fără `expiresAt`, comunicatul nu expiră niciodată.
   */
  private isExpired(a: Announcement): boolean {
    if (!a.expiresAt) return false;
    const ts = new Date(a.expiresAt).getTime();
    return !isNaN(ts) && ts < Date.now();
  }

  /**
   * Un comunicat este vizibil în zona publică doar dacă este 'published'
   * (nu 'draft'/dezactivat) ȘI nu este expirat.
   */
  private isVisiblePublicly(a: Announcement): boolean {
    return this.isPublished(a) && !this.isExpired(a);
  }

  /**
   * Returnează comunicatele filtrate și sortate conform opțiunii solicitate.
   * Pentru evenimente, permite sortarea atât după data publicării, cât și după data de desfășurare.
   *
   * `includeAll` (implicit false): când este true, sunt returnate TOATE comunicatele,
   * indiferent de stare (draft/dezactivat) sau expirare — folosit exclusiv de panoul Admin.
   * Zona publică (implicit) vede doar comunicatele 'published' și neexpirate.
   */
  public getAll(
    filter: AnnouncementFilterType = 'all',
    sort: AnnouncementSortOption = 'published_desc',
    includeAll: boolean = false
  ): Announcement[] {
    let items = [...this.announcements];

    if (!includeAll) {
      items = items.filter(a => this.isVisiblePublicly(a));
    }

    if (filter !== 'all') {
      items = items.filter(a => a.type === filter);
    }

    if (sort === 'event_date_asc') {
      return items.sort((a, b) => {
        const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
        const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
        return dateA - dateB;
      });
    }

    // Implicit: cele mai noi publicate primele
    return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  /**
   * Returnează un comunicat după identificatorul unic (indiferent de stare — folosit și de Admin).
   */
  public getById(id: string): Announcement | undefined {
    return this.announcements.find(a => a.id === id);
  }

  /**
   * Returnează cel mai recent comunicat publicat și vizibil public.
   */
  public getLatest(): Announcement | undefined {
    const sorted = this.getAll('all', 'published_desc');
    return sorted[0];
  }

  /**
   * Returnează cel mai recent eveniment publicat și vizibil public (Etapa 1C).
   */
  public getLatestEvent(): Announcement | undefined {
    const events = this.announcements.filter(a => a.type === 'event' && this.isVisiblePublicly(a));
    return events.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];
  }

  /**
   * Returnează cea mai recentă notificare urgentă activă și vizibilă public (dacă există).
   */
  public getUrgentAlert(): Announcement | undefined {
    const alerts = this.announcements.filter(a => a.type === 'notification' && a.isUrgent && this.isVisiblePublicly(a));
    return alerts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];
  }

  /**
   * Returnează numărul de comunicate vizibile public pe fiecare categorie.
   */
  public getCounts(): Record<AnnouncementFilterType, number> {
    const visible = this.announcements.filter(a => this.isVisiblePublicly(a));
    const all = visible.length;
    const notification = visible.filter(a => a.type === 'notification').length;
    const announcement = visible.filter(a => a.type === 'announcement').length;
    const news = visible.filter(a => a.type === 'news').length;
    const event = visible.filter(a => a.type === 'event').length;

    return {
      all,
      notification,
      announcement,
      news,
      event,
    };
  }

  /**
   * Creează un comunicat nou (Etapa 5B). `status` implicit 'published' dacă nu este specificat.
   */
  public create(data: Omit<Announcement, 'id'>): Announcement {
    const newAnnouncement: Announcement = {
      ...data,
      id: `ann-${Date.now()}`,
      status: data.status ?? 'published',
    };
    this.announcements = [...this.announcements, newAnnouncement];
    this.save();
    return newAnnouncement;
  }

  /**
   * Actualizează un comunicat existent (editare — Etapa 5B).
   */
  public update(id: string, patch: Partial<Omit<Announcement, 'id'>>): void {
    this.announcements = this.announcements.map(a => (a.id === id ? { ...a, ...patch } : a));
    this.save();
  }

  /**
   * Schimbă starea de publicare a unui comunicat (publicare / dezactivare — Etapa 5B).
   * Nu șterge fizic comunicatul.
   */
  public setStatus(id: string, status: AnnouncementStatus): void {
    this.announcements = this.announcements.map(a => (a.id === id ? { ...a, status } : a));
    this.save();
  }

  /**
   * Resetare la setul inițial demo (util pentru testare și audit).
   */
  public resetToDemo(): void {
    this.announcements = [...INITIAL_DEMO_ANNOUNCEMENTS];
    this.save();
  }
}

export const announcementService = new AnnouncementService();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Announcement, AnnouncementFilterType, AnnouncementSortOption } from '../types/announcement';
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
   * Returnează comunicatele filtrate și sortate conform opțiunii solicitate.
   * Pentru evenimente, permite sortarea atât după data publicării, cât și după data de desfășurare.
   */
  public getAll(
    filter: AnnouncementFilterType = 'all', 
    sort: AnnouncementSortOption = 'published_desc'
  ): Announcement[] {
    let items = [...this.announcements];

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
   * Returnează un comunicat după identificatorul unic.
   */
  public getById(id: string): Announcement | undefined {
    return this.announcements.find(a => a.id === id);
  }

  /**
   * Returnează cel mai recent comunicat publicat.
   */
  public getLatest(): Announcement | undefined {
    const sorted = this.getAll('all', 'published_desc');
    return sorted[0];
  }

  /**
   * Returnează cel mai recent eveniment publicat (Etapa 1C).
   */
  public getLatestEvent(): Announcement | undefined {
    const events = this.announcements.filter(a => a.type === 'event');
    return events.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];
  }

  /**
   * Returnează cea mai recentă notificare urgentă activă (dacă există).
   */
  public getUrgentAlert(): Announcement | undefined {
    const alerts = this.announcements.filter(a => a.type === 'notification' && a.isUrgent);
    return alerts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];
  }

  /**
   * Returnează numărul de comunicate pe fiecare categorie.
   */
  public getCounts(): Record<AnnouncementFilterType, number> {
    const all = this.announcements.length;
    const notification = this.announcements.filter(a => a.type === 'notification').length;
    const announcement = this.announcements.filter(a => a.type === 'announcement').length;
    const news = this.announcements.filter(a => a.type === 'news').length;
    const event = this.announcements.filter(a => a.type === 'event').length;

    return {
      all,
      notification,
      announcement,
      news,
      event,
    };
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

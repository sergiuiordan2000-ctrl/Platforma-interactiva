/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AnnouncementType = 'notification' | 'announcement' | 'news' | 'event';

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  summary: string;
  content: string;
  publishedAt: string; // Format ISO: 'YYYY-MM-DDTHH:mm:ssZ'
  author: string;
  category: string;
  imageUrl?: string;
  isUrgent?: boolean;
  expiresAt?: string;
  isDemo: boolean; // Marcat explicit ca date demonstrative pentru Etapa 1B

  // Câmpuri specifice pentru tipul 'event' (Eveniment)
  eventDate?: string;      // Format: 'YYYY-MM-DD'
  eventTime?: string;      // Format: 'HH:mm' (ex: '17:30')
  eventLocation?: string;  // Locație fizică (ex: 'Casa de Cultură Turnu Măgurele')
  eventOrganizer?: string; // Organizator (ex: 'Centrul Cultural Local')
}

export type AnnouncementFilterType = 'all' | AnnouncementType;

export type AnnouncementSortOption = 'published_desc' | 'event_date_asc';

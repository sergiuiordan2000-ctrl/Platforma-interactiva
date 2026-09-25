/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bell, Megaphone, Newspaper, Calendar, AlertTriangle } from 'lucide-react';
import { AnnouncementType } from '../../types/announcement';

interface AnnouncementBadgeProps {
  type: AnnouncementType;
  isUrgent?: boolean;
}

export const AnnouncementBadge: React.FC<AnnouncementBadgeProps> = ({ type, isUrgent }) => {
  switch (type) {
    case 'notification':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
          isUrgent 
            ? 'bg-rose-100 text-rose-800 border border-rose-300' 
            : 'bg-amber-100 text-amber-800 border border-amber-300'
        }`}>
          {isUrgent ? <AlertTriangle className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          <span>{isUrgent ? 'Alertă Urgentă' : 'Notificare'}</span>
        </span>
      );

    case 'announcement':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
          <Megaphone className="w-3.5 h-3.5" />
          <span>Anunț Public</span>
        </span>
      );

    case 'news':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
          <Newspaper className="w-3.5 h-3.5" />
          <span>Știre Locală</span>
        </span>
      );

    case 'event':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>Eveniment</span>
        </span>
      );

    default:
      return null;
  }
};

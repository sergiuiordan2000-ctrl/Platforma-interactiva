/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Megaphone, Bell, Newspaper, Calendar, Layers } from 'lucide-react';
import { AnnouncementFilterType } from '../../types/announcement';

interface AnnouncementFilterProps {
  activeFilter: AnnouncementFilterType;
  counts: Record<AnnouncementFilterType, number>;
  onFilterChange: (filter: AnnouncementFilterType) => void;
}

export const AnnouncementFilter: React.FC<AnnouncementFilterProps> = ({
  activeFilter,
  counts,
  onFilterChange,
}) => {
  const filterButtons: Array<{
    id: AnnouncementFilterType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'all', label: 'Toate', icon: Layers },
    { id: 'notification', label: 'Notificări & Alerte', icon: Bell },
    { id: 'announcement', label: 'Anunțuri', icon: Megaphone },
    { id: 'news', label: 'Știri', icon: Newspaper },
    { id: 'event', label: 'Evenimente', icon: Calendar },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Filtrare comunicate">
      {filterButtons.map(({ id, label, icon: Icon }) => {
        const isActive = activeFilter === id;
        const count = counts[id] ?? 0;

        return (
          <button
            key={id}
            onClick={() => onFilterChange(id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
              isActive
                ? 'bg-blue-600 text-white shadow-blue-600/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
            <span>{label}</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isActive
                  ? 'bg-blue-700/60 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

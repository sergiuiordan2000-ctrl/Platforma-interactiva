/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, Clock, MapPin, ArrowRight, UserCheck, Building2 } from 'lucide-react';
import { Announcement } from '../../types/announcement';
import { AnnouncementBadge } from './AnnouncementBadge';
import { formatDateRo } from '../../utils/dateFormatter';

interface AnnouncementCardProps {
  announcement: Announcement;
  onSelect: (announcement: Announcement) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onSelect,
}) => {
  const isEvent = announcement.type === 'event';

  return (
    <article
      onClick={() => onSelect(announcement)}
      className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer flex flex-col justify-between ${
        isEvent 
          ? 'border-purple-200 hover:border-purple-400 hover:shadow-lg' 
          : 'border-slate-200 hover:border-blue-400 hover:shadow-lg'
      }`}
    >
      <div>
        {/* Imagine de copertă (dacă există) */}
        {announcement.imageUrl && (
          <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-100">
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent"></div>
            
            {/* Badges deasupra imaginii */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
              <AnnouncementBadge type={announcement.type} isUrgent={announcement.isUrgent} />
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-sm">
                {announcement.category}
              </span>
            </div>

            {/* Badge DEMO pe imagine */}
            {announcement.isDemo && (
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-500 shadow-sm">
                  DEMO
                </span>
              </div>
            )}
          </div>
        )}

        {/* Corp Card */}
        <div className="p-5 sm:p-6 space-y-3">
          
          {/* Cazul fără imagine: afișare badges sus */}
          {!announcement.imageUrl && (
            <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <AnnouncementBadge type={announcement.type} isUrgent={announcement.isUrgent} />
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {announcement.category}
                </span>
              </div>
              {announcement.isDemo && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                  DEMO
                </span>
              )}
            </div>
          )}

          {/* Data publicării */}
          <div className="text-xs text-slate-500 font-medium">
            Publicat pe {formatDateRo(announcement.publishedAt)}
          </div>

          {/* Titlu */}
          <h2 className={`text-base sm:text-lg font-bold transition-colors leading-snug ${
            isEvent ? 'text-slate-900 group-hover:text-purple-700' : 'text-slate-900 group-hover:text-blue-700'
          }`}>
            {announcement.title}
          </h2>

          {/* Rezumat */}
          <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {announcement.summary}
          </p>

          {/* CÂMPURI SUPLIMENTARE PENTRU EVENIMENT (Etapa 1C) */}
          {isEvent && (
            <div className="mt-3 p-3.5 rounded-xl bg-purple-50/80 border border-purple-100 space-y-2 text-xs text-purple-900">
              {announcement.eventDate && (
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>
                    Data desfășurării: <strong>{formatDateRo(announcement.eventDate)}</strong>
                  </span>
                </div>
              )}
              {announcement.eventTime && (
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>
                    Ora: <strong>{announcement.eventTime}</strong>
                  </span>
                </div>
              )}
              {announcement.eventLocation && (
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span className="truncate">
                    Locație: <strong>{announcement.eventLocation}</strong>
                  </span>
                </div>
              )}
              {announcement.eventOrganizer && (
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span className="truncate">
                    Organizator: <strong>{announcement.eventOrganizer}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Subsol Card */}
      <div className={`px-5 py-3 sm:px-6 sm:py-3.5 border-t flex items-center justify-between text-xs ${
        isEvent ? 'bg-purple-50/30 border-purple-100/60' : 'bg-slate-50 border-slate-100'
      }`}>
        <span className="text-slate-500 truncate max-w-[60%] flex items-center gap-1 font-medium">
          <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{announcement.author}</span>
        </span>

        <span className={`font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-all ${
          isEvent ? 'text-purple-700 group-hover:text-purple-900' : 'text-blue-700 group-hover:text-blue-900'
        }`}>
          <span>{isEvent ? 'Detalii Eveniment' : 'Citește'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </article>
  );
};

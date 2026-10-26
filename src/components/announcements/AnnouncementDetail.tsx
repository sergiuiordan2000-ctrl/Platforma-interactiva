/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  UserCheck, 
  AlertTriangle, 
  Building2,
} from 'lucide-react';
import { Announcement } from '../../types/announcement';
import { AnnouncementBadge } from './AnnouncementBadge';
import { formatDateRo, formatDateTimeRo } from '../../utils/dateFormatter';

interface AnnouncementDetailProps {
  announcement: Announcement;
  onBack: () => void;
}

export const AnnouncementDetail: React.FC<AnnouncementDetailProps> = ({
  announcement,
  onBack,
}) => {
  const isEvent = announcement.type === 'event';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Buton Înapoi */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Înapoi la Comunicate</span>
        </button>
      </div>

      {/* Articol Principal */}
      <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Banner de Alertă Urgentă (dacă este cazul) */}
        {announcement.isUrgent && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 flex items-center gap-3 text-rose-900 text-xs sm:text-sm font-semibold">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Atenție: Această notificare conține informații de interes public urgent!</span>
          </div>
        )}

        {/* Notă DEMO clară */}
        {announcement.isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 font-medium">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-extrabold uppercase bg-amber-200 text-amber-950 border border-amber-300">
                DEMO • ETAPA 1B
              </span>
              <span>Conținut demonstrativ de test pentru municipiul Turnu Măgurele.</span>
            </div>
          </div>
        )}

        {/* Header Articol */}
        <div className="p-6 sm:p-8 space-y-4">
          
          <div className="flex items-center gap-2 flex-wrap">
            <AnnouncementBadge type={announcement.type} isUrgent={announcement.isUrgent} />
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              {announcement.category}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            {announcement.title}
          </h1>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 pt-1 border-b border-slate-100 pb-4">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Publicat: {formatDateTimeRo(announcement.publishedAt)}</span>
            </span>
            <span className="flex items-center gap-1 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Sursă: {announcement.author}</span>
            </span>
          </div>

          {/* Rezumat evidențiat */}
          <div className="text-sm sm:text-base text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
            „{announcement.summary}”
          </div>

          {/* Imagine principală (dacă există) */}
          {announcement.imageUrl && (
            <div className="rounded-xl overflow-hidden my-4 border border-slate-200 shadow-sm max-h-96">
              <img
                src={announcement.imageUrl}
                alt={announcement.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* CASETA SPECIALĂ PENTRU EVENIMENT (Câmpuri: Dată, Oră, Locație, Organizator) */}
          {isEvent && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-purple-50/50 to-indigo-50 border border-purple-200 space-y-3 shadow-sm my-6">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm uppercase tracking-wider border-b border-purple-200 pb-2">
                <Calendar className="w-4 h-4 text-purple-700" />
                <span>Date de desfășurare a evenimentului</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                {announcement.eventDate && (
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-purple-600 font-semibold uppercase">Data</div>
                      <div className="font-bold text-slate-900">{formatDateRo(announcement.eventDate)}</div>
                    </div>
                  </div>
                )}

                {announcement.eventTime && (
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-purple-600 font-semibold uppercase">Ora de începere</div>
                      <div className="font-bold text-slate-900">{announcement.eventTime}</div>
                    </div>
                  </div>
                )}

                {announcement.eventLocation && (
                  <div className="flex items-start gap-2.5 sm:col-span-2">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-purple-600 font-semibold uppercase">Locație</div>
                      <div className="font-bold text-slate-900">{announcement.eventLocation}</div>
                    </div>
                  </div>
                )}

                {announcement.eventOrganizer && (
                  <div className="flex items-start gap-2.5 sm:col-span-2">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-purple-600 font-semibold uppercase">Organizator</div>
                      <div className="font-medium text-slate-800">{announcement.eventOrganizer}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conținut complet al comunicatului */}
          <div className="pt-2 text-slate-800 text-sm sm:text-base leading-relaxed space-y-4">
            {announcement.content.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

        </div>

        {/* Subsol articol cu acțiuni */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-colors"
          >
            ← Înapoi la toate comunicatele
          </button>

          <span className="text-xs text-slate-500 font-medium">
            Urbis Activ • Modul Comunicate
          </span>
        </div>

      </article>

    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  Building2, 
  AlertCircle, 
  Megaphone, 
  Map, 
  Vote, 
  PhoneCall, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  Info,
  Calendar,
  MapPin,
  Bell
} from 'lucide-react';
import { AppView } from '../types/navigation';
import { announcementService } from '../services/announcementService';
import { AnnouncementBadge } from '../components/announcements/AnnouncementBadge';
import { formatDateRo } from '../utils/dateFormatter';

interface HomeViewProps {
  onNavigate: (view: AppView) => void;
  onOpenAnnouncement?: (id: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenAnnouncement }) => {
  // Preluare cel mai recent comunicat și cea mai recentă alertă urgentă (Etapa 1B)
  const latestAnnouncement = useMemo(() => announcementService.getLatest(), []);
  const urgentAlert = useMemo(() => announcementService.getUrgentAlert(), []);

  const handleOpenAnnouncement = (id: string) => {
    if (onOpenAnnouncement) {
      onOpenAnnouncement(id);
    } else {
      onNavigate('announcements');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Civic Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-6 sm:p-8 shadow-xl shadow-blue-950/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Municipiul Turnu Măgurele • Teleorman</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Platforma civică a orașului tău
          </h1>

          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Fii informat despre lucrări și decizii locale, semnalează problemele din cartierul tău și participă la consultările publice pentru Turnu Măgurele.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('issues')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md shadow-amber-900/30 transition-all active:scale-95 cursor-pointer"
            >
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Semnalează o Problemă</span>
            </button>

            <button
              onClick={() => onNavigate('announcements')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-blue-200" />
              <span>Vezi Comunicate</span>
            </button>
          </div>
        </div>

        {/* Element decorativ fundal */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <Building2 className="w-80 h-80 text-white" />
        </div>
      </section>

      {/* 2. Banner de Alertă Urgentă (Dinamizat în Etapa 1B) */}
      {urgentAlert && (
        <section 
          onClick={() => handleOpenAnnouncement(urgentAlert.id)}
          className="bg-amber-50/90 border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shrink-0 mt-0.5 shadow-sm">
            <Bell className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                Alertă Activă
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                DEMO • Utilități
              </span>
              <span className="text-xs text-amber-900 font-medium">
                {formatDateRo(urgentAlert.publishedAt)}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-800 transition-colors">
              {urgentAlert.title}
            </h3>
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {urgentAlert.summary}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-900 group-hover:translate-x-1 transition-transform shrink-0 self-center pl-2">
            <span>Citește</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </section>
      )}

      {/* 3. Secțiune: Cel mai recent comunicat (Solicitat specific în Etapa 1B) */}
      {latestAnnouncement && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-600" />
              <span>Cel mai recent comunicat publicat</span>
            </h2>
            <button
              onClick={() => onNavigate('announcements')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <span>Toate comunicatele</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            onClick={() => handleOpenAnnouncement(latestAnnouncement.id)}
            className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-400 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row gap-5 items-start justify-between"
          >
            <div className="space-y-2.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <AnnouncementBadge type={latestAnnouncement.type} isUrgent={latestAnnouncement.isUrgent} />
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  {latestAnnouncement.category}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                  DEMO
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {formatDateRo(latestAnnouncement.publishedAt)}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                {latestAnnouncement.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                {latestAnnouncement.summary}
              </p>

              {/* Informații suplimentare dacă este Eveniment */}
              {latestAnnouncement.type === 'event' && latestAnnouncement.eventDate && (
                <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-100 text-xs text-purple-900 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-700" />
                    <span>{formatDateRo(latestAnnouncement.eventDate)}</span>
                  </span>
                  {latestAnnouncement.eventTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-purple-700" />
                      <span>{latestAnnouncement.eventTime}</span>
                    </span>
                  )}
                  {latestAnnouncement.eventLocation && (
                    <span className="flex items-center gap-1 truncate max-w-xs">
                      <MapPin className="w-3.5 h-3.5 text-purple-700" />
                      <span className="truncate">{latestAnnouncement.eventLocation}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <span>Citește</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 4. Carduri de Acces Rapid (Main Functionalities Grid - 5 Module) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Acces Rapid la Serviciile Civice</span>
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              5 Module
            </span>
          </h2>
          <span className="text-xs text-slate-500">Etapa 1B</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card Sesizări (ACTIV ÎN ETAPA 3E) */}
          <div 
            onClick={() => onNavigate('issues')}
            className="group p-5 rounded-2xl bg-amber-50/40 border-2 border-amber-300 hover:border-amber-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-600 text-white">
                Activ (3E)
              </span>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                  Sesizări Cetățenești
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Semnalează probleme urbane. Formular complet cu foto optimizate (max 1920px), GPS, cod TM-XXX, alegere publicare și confirmare.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-amber-700 group-hover:translate-x-1 transition-transform">
              <span>Trimite sesizare</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Card Comunicate & Evenimente (MODUL ACTIV ÎN ETAPA 1B) */}
          <div 
            onClick={() => onNavigate('announcements')}
            className="group p-5 rounded-2xl bg-blue-50/40 border-2 border-blue-300 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                Activ (1B)
              </span>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Comunicate & Evenimente
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Alerte oficiale, anunțuri de utilitate publică, știri locale și evenimente culturale într-un singur flux unificat.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-blue-700 group-hover:translate-x-1 transition-transform">
              <span>Explorează comunicatele</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Card Harta Orașului (MODUL ACTIV ÎN ETAPA 3D) */}
          <div 
            onClick={() => onNavigate('map')}
            className="group p-5 rounded-2xl bg-emerald-50/40 border-2 border-emerald-300 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                Activ (3D)
              </span>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Harta Sesizărilor
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Localizarea interactivă pe harta municipiului Turnu Măgurele a sesizărilor cetățenești, cu filtrare pe categorii și foto optimizate.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
              <span>Explorează harta</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Card Sondaje Civice */}
          <div 
            onClick={() => onNavigate('surveys')}
            className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Sondaje & Consultări
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Participă la deciziile orașului prin vot la chestionare create dinamic de administrator.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
              <span>Participă la sondaje</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* Card Ghid Primărie & Quick Dial (ACTIV ÎN ETAPA 2A/2B) */}
          <div 
            onClick={() => onNavigate('directory')}
            className="group p-5 rounded-2xl bg-cyan-50/40 border-2 border-cyan-300 hover:border-cyan-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-2 right-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-cyan-700 text-white">
                Activ (2A / 2B)
              </span>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-700 text-white flex items-center justify-center shadow-sm">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-cyan-800 transition-colors">
                  Ghid Primărie & Quick Dial
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Informații primărie, program, audiențe, ghid acte și dispecerate de intervenție cu apelare directă 1-Click.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-xs font-bold text-cyan-800 group-hover:translate-x-1 transition-transform">
              <span>Deschide ghidul & numerele</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>

          {/* D11-B (post-audit): cardul public către Admin a fost eliminat. */}
        </div>
      </section>

      {/* 5. Notă privind Etapa Curentă de Dezvoltare (Transparență Metodologică) */}
      <section className="bg-slate-100 border border-slate-200 rounded-xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-slate-600">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
           <p className="font-semibold text-slate-900">
            Status Dezvoltare: Etapa 3E (Moderarea și Publicarea Sesizărilor Cetățenești ACTIVĂ)
          </p>
          <p className="leading-relaxed">
            Modulele Comunicate (1B), Evenimente (1C), Ghidul Primăriei (2A), Quick Dial (2B), Panoul CMS (2C), Formularul de Sesizare (3A), Alocarea Identificatorului Intern TM-XXX (3B), Compresia/Optimizarea Fotografiilor (3C), Harta Geospațială (3D) și Moderarea/Controlul Publicării (3E) sunt complet operaționale. Administratorul evaluează și aprobă sesizările înainte ca acestea să apară pe hartă, iar identitatea și datele de contact ale autorilor nu sunt afișate public.
          </p>
        </div>
      </section>

    </div>
  );
};

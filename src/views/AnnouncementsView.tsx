/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Megaphone, 
  Info, 
  Layers, 
  ArrowUpDown
} from 'lucide-react';
import { AppView } from '../types/navigation';
import { Announcement, AnnouncementFilterType, AnnouncementSortOption } from '../types/announcement';
import { announcementService } from '../services/announcementService';
import { AnnouncementFilter } from '../components/announcements/AnnouncementFilter';
import { AnnouncementCard } from '../components/announcements/AnnouncementCard';
import { AnnouncementDetail } from '../components/announcements/AnnouncementDetail';
import { ErrorBlock, LoadingBlock } from '../components/common/LoadState';
import { useAsync } from '../hooks/useAsync';

interface AnnouncementsViewProps {
  onNavigate: (view: AppView) => void;
  selectedAnnouncementId?: string | null;
  onClearSelected?: () => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ 
  onNavigate,
  selectedAnnouncementId,
  onClearSelected
}) => {
  const [activeFilter, setActiveFilter] = useState<AnnouncementFilterType>('all');
  const [sortBy, setSortBy] = useState<AnnouncementSortOption>('published_desc');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Comunicatul cerut din exterior (Acasă): ETAPA 6.5 (P5) — numai dacă este public (serverul întoarce 404 altfel)
  React.useEffect(() => {
    if (!selectedAnnouncementId) return;
    let active = true;
    announcementService
      .getPublicById(selectedAnnouncementId)
      .then((found) => {
        if (active && found) setSelectedAnnouncement(found);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [selectedAnnouncementId]);

  // Schimbare automată a sortării implicite la comutarea pe Evenimente
  const handleFilterChange = (filter: AnnouncementFilterType) => {
    setActiveFilter(filter);
    if (filter === 'event') {
      setSortBy('event_date_asc'); // Pentru evenimente, afișare implicită după data desfășurării
    } else {
      setSortBy('published_desc');
    }
  };

  // Lista filtrată și ordonată de server conform selecției (Faza 5.3)
  const list = useAsync(() => announcementService.getAll(activeFilter, sortBy), [activeFilter, sortBy]);
  const highlights = useAsync(() => announcementService.getHighlights(), []);
  const announcements = list.data ?? [];
  const counts = highlights.data?.counts ?? { all: 0, notification: 0, announcement: 0, news: 0, event: 0 };

  const handleSelectAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
    setSelectedAnnouncement(null);
    if (onClearSelected) {
      onClearSelected();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dacă este selectat un comunicat, afișăm vederea de detaliu
  if (selectedAnnouncement) {
    return (
      <AnnouncementDetail
        announcement={selectedAnnouncement}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      
      {/* Antet Modul */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <Megaphone className="w-4 h-4" />
            <span>Modul Funcțional</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Comunicate & Evenimente Locale
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Flux unificat de informare publică pentru Turnu Măgurele: notificări de avarii, anunțuri de utilitate publică, știri locale și evenimente culturale.
          </p>
        </div>

        {/* Ecuson de informare demo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-700" />
            <span>Date demonstrative (DEMO)</span>
          </span>
        </div>
      </div>

      {/* Bară de filtrare după tip și opțiuni de sortare */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Filtrare după tip conținut:
          </div>

          {/* Opțiune de sortare dedicată (activă mai ales la Evenimente) */}
          {activeFilter === 'event' && (
            <div className="flex items-center gap-2 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-700" />
              <span className="text-slate-600 font-medium">Sortare:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as AnnouncementSortOption)}
                className="px-2.5 py-1 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm cursor-pointer"
              >
                <option value="event_date_asc">Data desfășurării (cele mai apropiate)</option>
                <option value="published_desc">Data publicării (cele mai recente)</option>
              </select>
            </div>
          )}
        </div>

        <AnnouncementFilter
          activeFilter={activeFilter}
          counts={counts}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Grilă de carduri de comunicate (Ordonate conform selecției) */}
      {list.loading && !list.data ? (
        <LoadingBlock label="Se încarcă comunicatele…" />
      ) : list.error ? (
        <ErrorBlock message={list.error} onRetry={list.reload} />
      ) : announcements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 pt-2">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onSelect={handleSelectAnnouncement}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Layers className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">
            Niciun comunicat în această categorie
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Nu au fost găsite articole pentru filtrul selectat. Puteți comuta pe categoria „Toate” pentru a vedea fluxul general.
          </p>
          <button
            onClick={() => handleFilterChange('all')}
            className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-semibold text-xs hover:bg-blue-100 transition-colors"
          >
            Afișează toate comunicatele
          </button>
        </div>
      )}

    </div>
  );
};

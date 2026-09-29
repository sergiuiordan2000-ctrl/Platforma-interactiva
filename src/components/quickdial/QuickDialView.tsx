/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  PhoneCall, 
  Search, 
  ShieldAlert, 
  Info, 
  X,
  Phone,
  Flame,
  HeartPulse,
  Droplets,
  AlertCircle
} from 'lucide-react';
import { filterContacts, quickDialService } from '../../services/quickDialService';
import { ErrorBlock, LoadingBlock } from '../common/LoadState';
import { useAsync } from '../../hooks/useAsync';
import { QuickDialCard } from './QuickDialCard';
import { QuickDialCategoryPills } from './QuickDialCategoryPills';

export const QuickDialView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Faza 5.3: datele vin de la server (numai active); filtrarea și căutarea sunt locale
  const data = useAsync(() => quickDialService.getPublic(), []);
  const categories = data.data?.categories ?? [];
  const counts = data.data?.counts ?? {};

  const contacts = useMemo(
    () => filterContacts(data.data?.contacts ?? [], activeCategory, searchQuery),
    [data.data, activeCategory, searchQuery],
  );

  const emergencyContacts = useMemo(() => (data.data?.contacts ?? []).filter((c) => c.isEmergency), [data.data]);

  if (data.loading && !data.data) return <LoadingBlock label="Se încarcă numerele utile…" />;
  if (data.error && !data.data) return <ErrorBlock message={data.error} onRetry={data.reload} />;

  return (
    <div className="space-y-6">
      
      {/* 1. Bară de Apelare Rapidă de Urgență (Top Emergency Speed Dial) */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 rounded-2xl p-4 sm:p-5 text-white shadow-md space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                Dispecerate de Urgență & Avarii Non-Stop
              </h2>
              <p className="text-[11px] text-red-100">
                Atinge butonul pentru apelare imediată în caz de pericol sau incidente grave
              </p>
            </div>
          </div>
        </div>

        {/* Butoane mari de apelare imediată pentru urgențe */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          
          {/* 112 */}
          <a
            href="tel:112"
            className="flex items-center justify-between p-3 rounded-xl bg-white text-red-700 hover:bg-red-50 transition-all shadow-sm active:scale-95 select-none"
          >
            <div>
              <div className="text-[11px] font-bold text-slate-600 uppercase">Urgențe Generale</div>
              <div className="text-lg font-black tracking-tight text-red-700">112</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-red-700 fill-red-700" />
            </div>
          </a>

          {/* Poliția Locală */}
          <a
            href="tel:0247416450"
            className="flex items-center justify-between p-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all shadow-sm active:scale-95 select-none"
          >
            <div>
              <div className="text-[11px] font-bold text-red-100 uppercase">Poliția Locală</div>
              <div className="text-sm font-black tracking-tight">0247 416 450</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-white fill-white" />
            </div>
          </a>

          {/* Spital / Urgențe */}
          <a
            href="tel:0247416350"
            className="flex items-center justify-between p-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all shadow-sm active:scale-95 select-none"
          >
            <div>
              <div className="text-[11px] font-bold text-red-100 uppercase">Spital Municipal</div>
              <div className="text-sm font-black tracking-tight">0247 416 350</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <HeartPulse className="w-4 h-4 text-white" />
            </div>
          </a>

          {/* Avarii Apă */}
          <a
            href="tel:0247416990"
            className="flex items-center justify-between p-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all shadow-sm active:scale-95 select-none"
          >
            <div>
              <div className="text-[11px] font-bold text-red-100 uppercase">Avarii Apă-Canal</div>
              <div className="text-sm font-black tracking-tight">0247 416 990</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Droplets className="w-4 h-4 text-white" />
            </div>
          </a>

        </div>
      </div>

      {/* 2. Căutare Rapidă */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Caută număr, dispecerat, spital, avarie apă, primărie..."
          className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 bg-slate-100"
            aria-label="Șterge căutarea"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3. Bară de Categorii (Pill-uri) */}
      <QuickDialCategoryPills
        categories={categories}
        activeCategory={activeCategory}
        counts={counts}
        onSelectCategory={setActiveCategory}
      />

      {/* 4. Grilă de Contacte Quick Dial */}
      {contacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {contacts.map((contact) => (
            <QuickDialCard key={contact.id} contact={contact} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            Niciun contact găsit
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Nu a fost găsit niciun număr util pentru termenul „{searchQuery}”. Puteți reinițializa căutarea sau selecta o altă categorie.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors"
          >
            Afișează toate numerele utile
          </button>
        </div>
      )}

    </div>
  );
};

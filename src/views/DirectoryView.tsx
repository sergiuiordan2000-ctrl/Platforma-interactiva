/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  PhoneCall, 
  Clock, 
  MapPin, 
  FileText, 
  Globe, 
  Info, 
  Zap,
  PhoneForwarded,
  ArrowRight
} from 'lucide-react';
import { AppView } from '../types/navigation';
import { directoryService } from '../services/directoryService';
import { ContactCard } from '../components/directory/ContactCard';
import { DepartmentsList } from '../components/directory/DepartmentsList';
import { ServicesList } from '../components/directory/ServicesList';
import { UsefulLinksList } from '../components/directory/UsefulLinksList';
import { QuickDialView } from '../components/quickdial/QuickDialView';

interface DirectoryViewProps {
  onNavigate: (view: AppView) => void;
  initialMode?: 'ghid' | 'quickdial';
}

type DirectorySection = 'contact' | 'departments' | 'services' | 'links';

export const DirectoryView: React.FC<DirectoryViewProps> = ({ 
  onNavigate,
  initialMode = 'ghid'
}) => {
  const [activeMode, setActiveMode] = useState<'ghid' | 'quickdial'>(initialMode);
  const [activeSection, setActiveSection] = useState<DirectorySection>('contact');
  const [version, setVersion] = useState<number>(0);

  useEffect(() => {
    return directoryService.subscribe(() => {
      setVersion((v) => v + 1);
    });
  }, []);

  const cityHallInfo = useMemo(() => directoryService.getCityHallInfo(), [version]);
  const departments = useMemo(() => directoryService.getDepartments(false), [version]);
  const services = useMemo(() => directoryService.getServices(false), [version]);
  const usefulLinks = useMemo(() => directoryService.getUsefulLinks(false), [version]);

  const navTabs: Array<{
    id: DirectorySection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'contact', label: 'Contact & Program', icon: PhoneCall },
    { id: 'departments', label: 'Direcții & Servicii', icon: Building2 },
    { id: 'services', label: 'Ghid Acte Cetățeni', icon: FileText },
    { id: 'links', label: 'Link-uri Utile', icon: Globe },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. Antet Modul cu Comutator Principal de Mod (Ghid vs. Quick Dial) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-cyan-700 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Modul Funcțional • Etapa 2B</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Ghid Primărie & Quick Dial
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Informații administrative detaliate și acces direct la numere utile locale cu apelare dintr-un singur click.
          </p>
        </div>

        {/* Ecuson de informare DEMO */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-700" />
            <span>Date demonstrative (DEMO)</span>
          </span>
        </div>
      </div>

      {/* 2. Comutator Principal între Ghid Primărie și Quick Dial */}
      <div className="p-1.5 bg-slate-100/90 rounded-2xl flex items-center gap-1.5 border border-slate-200 shadow-inner">
        <button
          onClick={() => setActiveMode('ghid')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none ${
            activeMode === 'ghid'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeMode === 'ghid' ? 'text-cyan-700' : 'text-slate-400'}`} />
          <span>Ghidul Primăriei (Instituțional)</span>
        </button>

        <button
          onClick={() => setActiveMode('quickdial')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none ${
            activeMode === 'quickdial'
              ? 'bg-white text-emerald-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className={`w-4 h-4 ${activeMode === 'quickdial' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>Quick Dial / Numere Utile</span>
          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
            Apel 1-Click
          </span>
        </button>
      </div>

      {/* 3. Conținut specific modului selectat */}

      {/* MODUL A: GHIDUL PRIMĂRIEI (ETAPA 2A) */}
      {activeMode === 'ghid' && (
        <div className="space-y-6">
          
          {/* Banneraș de trecere rapidă la Quick Dial */}
          <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-cyan-900 font-semibold">
              <PhoneForwarded className="w-4 h-4 text-cyan-700 shrink-0" />
              <span>Cauți un număr de urgență, dispeceratul de apă sau poliția locală?</span>
            </div>
            <button
              onClick={() => setActiveMode('quickdial')}
              className="inline-flex items-center gap-1 font-bold text-cyan-800 hover:text-cyan-950 underline shrink-0"
            >
              <span>Deschide Quick Dial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bare de Navigare Secțiuni (Comutator Rapid) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Secțiuni Ghid">
            {navTabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                    isActive
                      ? 'bg-cyan-700 text-white shadow-cyan-700/20'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Conținutul Secțiunii Active */}
          <div className="space-y-8 pt-2">
            {activeSection === 'contact' && (
              <ContactCard info={cityHallInfo} />
            )}

            {activeSection === 'departments' && (
              <DepartmentsList departments={departments} />
            )}

            {activeSection === 'services' && (
              <ServicesList services={services} />
            )}

            {activeSection === 'links' && (
              <UsefulLinksList links={usefulLinks} />
            )}
          </div>
        </div>
      )}

      {/* MODUL B: QUICK DIAL / NUMERE UTILE (ETAPA 2B) */}
      {activeMode === 'quickdial' && (
        <div className="space-y-6">
          <QuickDialView />
        </div>
      )}

      {/* 4. Notă Metodologică privind Etapa 2B */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start justify-between gap-4 text-xs text-slate-600">
        <div className="space-y-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-cyan-600" />
            <span>Status Modul: Etapa 2B (Ghidul Primăriei & Quick Dial sunt ACTIVE)</span>
          </div>
          <p className="leading-relaxed">
            Informațiile instituționale ale Primăriei (Etapa 2A) și sistemul de apelare rapidă pe categorii (Etapa 2B) sunt complet funcționale. Administrarea dinamică din zona de Admin aparține <strong>Etapei 2C</strong> și nu a fost implementată.
          </p>
        </div>

        <button
          onClick={() => onNavigate('home')}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs whitespace-nowrap transition-colors self-start sm:self-center"
        >
          ← Înapoi la Acasă
        </button>
      </div>

    </div>
  );
};

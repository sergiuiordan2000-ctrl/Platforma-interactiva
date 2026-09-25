/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { 
  Map as MapIcon, 
  MapPin, 
  Filter, 
  Layers, 
  Info, 
  ShieldCheck, 
  Calendar, 
  Sparkles, 
  PlusCircle, 
  RotateCcw,
  Camera,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { AppView } from '../types/navigation';
import { PublicMapReport, ReportCategory } from '../types/report';
import { reportService, TURNU_MAGURELE_CENTER } from '../services/reportService';

interface MapViewProps {
  onNavigate: (view: AppView) => void;
}

// Mapare de culori vibrante pentru fiecare categorie de sesizare
const CATEGORY_COLORS: Record<string, { bg: string; text: string; hex: string; ring: string }> = {
  iluminat: { bg: 'bg-amber-500', text: 'text-amber-900', hex: '#f59e0b', ring: 'ring-amber-200' },
  drumuri: { bg: 'bg-rose-500', text: 'text-rose-900', hex: '#f43f5e', ring: 'ring-rose-200' },
  salubritate: { bg: 'bg-emerald-500', text: 'text-emerald-900', hex: '#10b981', ring: 'ring-emerald-200' },
  'spatii-verzi': { bg: 'bg-green-600', text: 'text-green-900', hex: '#16a34a', ring: 'ring-green-200' },
  apa: { bg: 'bg-sky-500', text: 'text-sky-900', hex: '#0284c7', ring: 'ring-sky-200' },
  constructii: { bg: 'bg-orange-500', text: 'text-orange-900', hex: '#ea580c', ring: 'ring-orange-200' },
  'caini-comunitari': { bg: 'bg-purple-500', text: 'text-purple-900', hex: '#a855f7', ring: 'ring-purple-200' },
  'mobilier-urban': { bg: 'bg-indigo-500', text: 'text-indigo-900', hex: '#6366f1', ring: 'ring-indigo-200' },
  altele: { bg: 'bg-slate-600', text: 'text-slate-900', hex: '#475569', ring: 'ring-slate-200' },
};

const DEFAULT_CATEGORY_COLOR = {
  bg: 'bg-blue-600',
  text: 'text-blue-900',
  hex: '#2563eb',
  ring: 'ring-blue-200',
};

export const MapView: React.FC<MapViewProps> = ({ onNavigate }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [publicReports, setPublicReports] = useState<PublicMapReport[]>(() => 
    reportService.getPublicMapReports()
  );
  const [categories] = useState<ReportCategory[]>(() => reportService.getCategories());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [tileError, setTileError] = useState<boolean>(false);

  // Ascultare modificări din reportService pentru sincronizare automată
  useEffect(() => {
    return reportService.subscribe(() => {
      setPublicReports(reportService.getPublicMapReports());
    });
  }, []);

  // Filtrare sesizări publice
  const filteredReports = useMemo(() => {
    if (selectedCategory === 'all') return publicReports;
    return publicReports.filter((r) => r.categoryId === selectedCategory);
  }, [publicReports, selectedCategory]);

  // 1. Inițializare hartă Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Evităm re-crearea hărții dacă există deja
    if (mapInstanceRef.current) return;

    try {
      // Centrat pe Turnu Măgurele (43.7486° N, 24.8722° E) cu nivel de zoom 14 (vedere optimă municipiu)
      const map = L.map(mapContainerRef.current, {
        center: [TURNU_MAGURELE_CENTER.lat, TURNU_MAGURELE_CENTER.lng],
        zoom: 14,
        minZoom: 12,
        maxZoom: 18,
        zoomControl: true,
        attributionControl: true,
      });

      // Strat tile OpenStreetMap oficial
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributori',
      });

      tileLayer.on('tileerror', () => {
        setTileError(true);
      });

      tileLayer.addTo(map);

      // Grup de straturi pentru markeri
      const markersLayer = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      markersLayerRef.current = markersLayer;
      setMapLoaded(true);

      // Timeout mic pentru a forța Leaflet să recalculeze dimensiunile containerului
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } catch (err) {
      console.error('Eroare la inițializarea hărții Leaflet:', err);
      setTileError(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // 2. Randare markeri la schimbarea listei de sesizări sau a filtrului
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    filteredReports.forEach((report) => {
      const lat = report.publicLocation.latitude;
      const lng = report.publicLocation.longitude;

      if (!lat || !lng) return;

      const color = CATEGORY_COLORS[report.categoryId] || DEFAULT_CATEGORY_COLOR;

      // Creare pin HTML personalizat cu iconiță și identificator civic
      const markerHtml = `
        <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-full">
          <div class="w-8 h-8 rounded-full ${color.bg} text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-slate-900/10 transition-transform group-hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-slate-800 rotate-45"></div>
          <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            ${report.referenceNumber}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-civic-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const formattedDate = new Date(report.createdAt).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      // Construim conținutul popup-ului PUBLIC (FĂRĂ DATE PERSONALE!)
      const popupHtml = `
        <div class="w-72 max-w-[85vw] font-sans text-slate-800 text-left">
          ${
            report.photo
              ? `
              <div class="relative h-32 w-full overflow-hidden bg-slate-900">
                <img 
                  src="${report.photo.dataUrl}" 
                  alt="${report.referenceNumber}" 
                  class="w-full h-full object-cover"
                />
                <div class="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                  Foto optimizată (3C)
                </div>
              </div>
            `
              : ''
          }
          <div class="p-3.5 space-y-2">
            <div class="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span class="font-mono text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                ${report.referenceNumber}
              </span>
              <span class="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                ${report.categoryName}
              </span>
            </div>

            <p class="text-xs text-slate-700 leading-snug line-clamp-3">
              ${report.publicDescription}
            </p>

            <div class="pt-1 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
              <div class="flex items-center gap-1.5 truncate">
                <span class="font-semibold text-slate-600">Loc:</span>
                <span class="truncate">${report.publicLocation.addressOrDetails}</span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-slate-400">
                <span>Data: ${formattedDate}</span>
                <span class="font-mono">${report.publicLocation.latitude.toFixed(4)}, ${report.publicLocation.longitude.toFixed(4)}</span>
              </div>
            </div>

            <div class="bg-amber-50 rounded-lg p-2 text-[9px] text-amber-900 border border-amber-200/60 leading-tight">
              <strong>${report.referenceNumber}</strong> este codul intern al platformei civice (nu reprezintă nr. oficial de primărie).
            </div>
          </div>
        </div>
      `;

      const marker = L.marker([lat, lng], { icon: customIcon });
      marker.bindPopup(popupHtml, { maxWidth: 300, minWidth: 260 });
      marker.addTo(markersLayer);
    });
  }, [filteredReports]);

  // Recentrare hartă pe Turnu Măgurele
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([TURNU_MAGURELE_CENTER.lat, TURNU_MAGURELE_CENTER.lng], 14, {
        animate: true,
      });
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. Antet Modul Harta */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <MapIcon className="w-4 h-4" />
            <span>Modul Funcțional • Etapa 3D (Harta Sesizărilor Civice)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('issues')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Trimite sesizare nouă</span>
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Harta Sesizărilor Turnu Măgurele
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Vizualizează problemele urbane semnalate de cetățeni pe harta municipiului. Harta este publică și protejează strict confidențialitatea datelor petiționarului.
        </p>
      </div>

      {/* 2. Bandă Informativă de Confidențialitate (Cerință Strictă 3D) */}
      <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <span className="leading-relaxed">
            <strong>Garanție de confidențialitate:</strong> Harta afișează exclusiv categoria, descrierea problemei și fotografiile optimizate. Numele, telefonul și datele de contact ale cetățenilor <strong>nu sunt afișate public</strong>.
          </span>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300 shrink-0 shadow-2xs">
          <span>{filteredReports.length} {filteredReports.length === 1 ? 'sesizare' : 'sesizări'} pe hartă</span>
        </span>
      </div>

      {/* 3. Filtre de Categorie */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs">
        <span className="text-slate-400 font-bold flex items-center gap-1 shrink-0 pl-1 text-[11px] uppercase tracking-wider">
          <Filter className="w-3 h-3 text-slate-400" />
          <span>Filtrează:</span>
        </span>

        {/* Buton Toate */}
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Toate categoriile ({publicReports.length})
        </button>

        {/* Butoane pe Categorii */}
        {categories.map((cat) => {
          const count = publicReports.filter((r) => r.categoryId === cat.id).length;
          const isSelected = selectedCategory === cat.id;
          const color = CATEGORY_COLORS[cat.id] || DEFAULT_CATEGORY_COLOR;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${color.bg}`}></span>
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Containerul Interactiv al Hărții Leaflet */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 shadow-md bg-slate-100">
        
        {/* Harta efectivă */}
        <div 
          ref={mapContainerRef} 
          className="h-[480px] sm:h-[560px] w-full z-10"
          style={{ minHeight: '400px' }}
        />

        {/* Eroare încărcare tile-uri (dacă nu e conexiune la internet) */}
        {tileError && (
          <div className="absolute top-4 left-4 right-4 z-30 p-3 rounded-2xl bg-amber-50/95 border border-amber-300 text-xs text-amber-900 flex items-center gap-2 shadow-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Tile-urile OpenStreetMap nu au putut fi încărcate în acest moment (verificați conexiunea). Harta și markerii rămân funcționali în fundal.
            </span>
          </div>
        )}

        {/* Buton Recentează pe Turnu Măgurele */}
        <button
          onClick={handleRecenter}
          className="absolute bottom-6 right-4 z-20 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-300 text-slate-800 hover:text-blue-700 text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all active:scale-95"
          title="Recentrare pe centrul municipiului Turnu Măgurele"
        >
          <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
          <span>Centru Turnu Măgurele</span>
        </button>

        {/* Legendă discretă în colțul stânga-jos */}
        <div className="absolute bottom-6 left-4 z-20 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 text-[11px] text-slate-600 shadow-md">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Iluminat</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Drumuri</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Salubritate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600"></span>
            <span>Spații verzi</span>
          </div>
        </div>
      </div>

      {/* 5. Notă de Subsol Metodologică */}
      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start justify-between gap-4 text-xs text-slate-600">
        <div className="space-y-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Delimitare Modul Hartă & Moderare (Etapele 3D & 3E)</span>
          </div>
          <p className="leading-relaxed">
            Harta afișează exclusiv sesizările pentru care cetățeanul a bifat opțiunea de publicare și care au fost aprobate de moderatorul platformei (3E). Sesizările private sau respinse sunt excluse. Trimiterea automată de e-mailuri către Primărie și backend-ul centralizat aparțin etapelor ulterioare.
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

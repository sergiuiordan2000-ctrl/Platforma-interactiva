/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Alegerea poziției în formularul de sesizare (Faza 5.4; D6-2, D6-6, 2.4):
 * - „Pin pe hartă”: atingerea hărții pune pinul; pinul se poate trage → `pin` (exact);
 * - „Poziția mea”: GPS-ul centrează harta și pune pinul, care se poate ajusta → `gps_pin`;
 *   precizia GPS brută nu se trimite (D6-6);
 * - „Caută pe hartă”: serverul întreabă Nominatim → pin propus, aproximativ (`geocoded`, zonă pe hartă);
 *   dacă cetățeanul îl mută, poziția devine exactă (`pin`) — decizia proprietarului din 30.09.2026;
 * - fără pin: sesizarea se salvează, dar nu apare pe hartă până la corectare (2.4).
 *
 * Decizia proprietarului din 06.10.2026 (AMENDAMENT_LOCATIE_FORMULAR.md): un singur câmp de adresă.
 * Căutarea folosește textul din câmpul „Locația” al formularului; câmpul separat de căutare nu mai există.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import L from 'leaflet';
import { Check, Loader2, MapPin, Navigation, Search, Trash2 } from 'lucide-react';
import type { CitizenLocationSource } from '@tmc/shared';
import { APPROX_ZONE_RADIUS_M, TURNU_MAGURELE_CENTER, reportService } from '../../services/reportService';

export interface PickedPosition {
  lat: number;
  lng: number;
  source: Exclude<CitizenLocationSource, 'text'>;
  approximate: boolean;
}

interface LocationPickerProps {
  value: PickedPosition | null;
  onChange: (value: PickedPosition | null) => void;
  /** Textul din câmpul „Locația” al formularului: singurul text căutat pe hartă. */
  addressText: string;
}

/** Ce poate cere formularul din afară (întrebarea „fără poziție pe hartă” de la trimitere). */
export interface LocationPickerHandle {
  /** Caută pe hartă textul din câmpul „Locația” și aduce harta în vizor. */
  searchAddress: () => void;
  /** Aduce harta în vizor, pentru punerea pinului. */
  showMap: () => void;
}

const PIN_HTML = `
  <div style="transform: translate(-50%, -100%);" class="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`;

export const LocationPicker = forwardRef<LocationPickerHandle, LocationPickerProps>(({ value, onChange, addressText }, ref) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const valueRef = useRef<PickedPosition | null>(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const addressRef = useRef(addressText);
  addressRef.current = addressText;
  const [busy, setBusy] = useState<'gps' | 'geo' | null>(null);
  const [message, setMessage] = useState<{ kind: 'info' | 'warn'; text: string } | null>(null);

  // hartă
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [TURNU_MAGURELE_CENTER.lat, TURNU_MAGURELE_CENTER.lng],
      zoom: 14,
      minZoom: 12,
      maxZoom: 19,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributori',
    }).addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      onChangeRef.current({ lat: e.latlng.lat, lng: e.latlng.lng, source: 'pin', approximate: false });
      setMessage(null);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 250);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, []);

  // pinul și zona urmează valoarea
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      circleRef.current?.remove();
      circleRef.current = null;
      return;
    }
    const ll = L.latLng(value.lat, value.lng);
    if (!markerRef.current) {
      const marker = L.marker(ll, {
        draggable: true,
        icon: L.divIcon({ className: 'civic-picker-pin', html: PIN_HTML, iconSize: [32, 32], iconAnchor: [0, 0] }),
        keyboard: true,
        title: 'Poziția sesizării (se poate trage)',
      }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        const prev = valueRef.current;
        // GPS ajustat rămâne `gps_pin` (fără precizia brută, D6-6); adresa mutată devine poziție exactă
        const source = prev?.source === 'gps_pin' ? 'gps_pin' : 'pin';
        onChangeRef.current({ lat: p.lat, lng: p.lng, source, approximate: false });
        if (prev?.source === 'geocoded') {
          setMessage({ kind: 'info', text: 'Ați mutat pinul: poziția este acum exactă (nu mai apare ca zonă).' });
        }
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(ll);
    }
    if (value.approximate) {
      if (!circleRef.current) {
        circleRef.current = L.circle(ll, {
          radius: APPROX_ZONE_RADIUS_M,
          color: '#d97706',
          weight: 2,
          fillColor: '#f59e0b',
          fillOpacity: 0.15,
          interactive: false,
        }).addTo(map);
      } else {
        circleRef.current.setLatLng(ll);
      }
    } else {
      circleRef.current?.remove();
      circleRef.current = null;
    }
  }, [value]);

  const focus = (lat: number, lng: number) => mapRef.current?.setView([lat, lng], 17, { animate: true });

  const handleGps = () => {
    if (!navigator.geolocation) {
      setMessage({ kind: 'warn', text: 'Browserul nu permite localizarea. Atingeți harta pentru a pune pinul.' });
      return;
    }
    setBusy('gps');
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps_pin', approximate: false });
        focus(pos.coords.latitude, pos.coords.longitude);
        setMessage({ kind: 'info', text: 'Pinul a fost pus la poziția dumneavoastră. Îl puteți trage exact la locul problemei.' });
      },
      (err) => {
        setBusy(null);
        setMessage({
          kind: 'warn',
          text:
            err.code === err.PERMISSION_DENIED
              ? 'Accesul la locație a fost refuzat. Atingeți harta sau apăsați „Caută pe hartă”.'
              : 'Poziția nu a putut fi determinată. Atingeți harta sau apăsați „Caută pe hartă”.',
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const handleGeocode = async () => {
    const q = addressRef.current.trim();
    if (q.length < 3) {
      setMessage({ kind: 'warn', text: 'Scrieți întâi locul în câmpul de mai sus (de exemplu „Strada 1 Mai 10”), apoi apăsați „Caută pe hartă”.' });
      return;
    }
    setBusy('geo');
    setMessage(null);
    const res = await reportService.geocode(/turnu/i.test(q) ? q : `${q}, Turnu Măgurele`);
    setBusy(null);
    if (!res.ok) {
      setMessage({ kind: 'warn', text: res.error });
      return;
    }
    onChange({ lat: res.result.lat, lng: res.result.lng, source: 'geocoded', approximate: true });
    focus(res.result.lat, res.result.lng);
    setMessage({
      kind: 'info',
      text: 'Pin propus după adresă: pe harta publică apare ca zonă aproximativă. Verificați-l; dacă îl mutați la locul exact, devine punct exact.',
    });
  };

  const showMap = () => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  useImperativeHandle(ref, () => ({
    searchAddress: () => {
      showMap();
      void handleGeocode();
    },
    showMap,
  }));

  return (
    <div className="space-y-3" ref={rootRef}>
      {/* căutarea textului din „Locația” și poziția dispozitivului */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => void handleGeocode()}
          disabled={busy !== null}
          data-testid="location-search"
          title="Caută pe hartă textul scris la „Locația”"
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors disabled:opacity-50 select-none"
        >
          {busy === 'geo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Caută pe hartă</span>
        </button>
        <button
          type="button"
          onClick={handleGps}
          disabled={busy !== null}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition-colors border border-blue-200 disabled:opacity-50 select-none"
        >
          {busy === 'gps' ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Navigation className="w-4 h-4 text-blue-600" />}
          <span>Poziția mea</span>
        </button>
      </div>

      {/* harta */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
        {/* înălțimea direct pe element: `.leaflet-container { height: 100% }` din index.css ar anula clasa (ca în MapView) */}
        <div ref={containerRef} className="w-full z-10" style={{ height: 280 }} data-testid="location-picker-map" />
        {!value && (
          <div className="absolute top-2 left-2 right-2 z-20 pointer-events-none flex justify-center">
            <span className="px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200 shadow text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-600" />
              Atingeți harta la locul problemei
            </span>
          </div>
        )}
      </div>

      {/* starea poziției */}
      {value ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${
              value.approximate ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
            data-testid="location-picker-status"
          >
            <Check className="w-3.5 h-3.5" />
            <span>
              {value.approximate ? 'Zonă aproximativă (după adresă)' : value.source === 'gps_pin' ? 'Poziție GPS, ajustabilă' : 'Punct pe hartă'} ·{' '}
              <span className="font-mono">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setMessage(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[11px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Șterge pinul</span>
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Pinul este opțional. Fără pin, sesizarea se salvează, dar <strong>nu apare pe hartă</strong> până când administratorul îi stabilește poziția.
        </p>
      )}

      {message && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
            message.kind === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
});
LocationPicker.displayName = 'LocationPicker';

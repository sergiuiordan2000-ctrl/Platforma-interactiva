/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formularul de sesizare (Faza 5.4; B5 §1, B2 §7): trimis serverului, din contul confirmat al cetățeanului (A-9).
 * - fără date de contact: singura dată este e-mailul contului (A-9, D29);
 * - fără alegerea „Public / Public anonim” (2.8): sesizarea este publică imediat, fără moderare (2.3, D9);
 * - locația: text obligatoriu + pin pe hartă / poziția mea / adresă (2.4, D6-2); numai în UAT (2.12);
 *   un singur câmp de adresă, iar la trimiterea fără pin formularul întreabă întâi (decizia proprietarului
 *   din 06.10.2026, AMENDAMENT_LOCATIE_FORMULAR.md); pinul rămâne opțional;
 * - „Transmite către Primărie” (pct. 7) și notificările pe e-mail (D9), la alegerea cetățeanului;
 * - confirmarea apare numai după salvarea efectivă pe server (6.2).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Lightbulb,
  Car,
  Footprints,
  Droplets,
  Trash2,
  Trees,
  Signpost,
  HelpCircle,
  Camera,
  MapPin,
  Send,
  AlertCircle,
  Check,
  X,
  ShieldAlert,
  Loader2,
  Sparkles,
  Eye,
  Bell,
  Building2,
} from 'lucide-react';
import type { ReportCategory } from '@tmc/shared';
import { ReportPhoto } from '../../types/report';
import { reportService, type FormSession } from '../../services/reportService';
import { imageCompressionService, PhotoProcessingError } from '../../services/imageCompressionService';
import { userMessage } from '../../services/apiClient';
import { LocationPicker, type LocationPickerHandle, type PickedPosition } from './LocationPicker';

/** Ce afișează confirmarea (datele trimise + răspunsul serverului). */
export interface SubmittedReport {
  referenceNumber: string;
  createdAt: string;
  categoryName: string;
  description: string;
  locationText: string;
  position: PickedPosition | null;
  photos: ReportPhoto[];
  transmitToCityHall: boolean;
  notifyOptIn: boolean;
}

interface ReportFormProps {
  accountEmail: string;
  onSuccess: (report: SubmittedReport) => void;
  /** Sesiunea a expirat (401): se cere o nouă autentificare, fără a pierde formularul. */
  onSessionExpired: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  iluminat: Lightbulb,
  drumuri: Car,
  trotuare: Footprints,
  apa_canal: Droplets,
  salubritate: Trash2,
  spatii_verzi: Trees,
  semnalizare: Signpost,
  altele: HelpCircle,
};

const MAX_PHOTOS = 4;
const MAX_PHOTO_SIZE_MB = 15;
const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_DESCRIPTION_LENGTH = 15;

/**
 * Imaginea comprimată (data URL base64) → fișier pentru multipart. Fără `fetch('data:…')`:
 * CSP-ul aplicației (`connect-src 'self'`, B2 §1) blochează, corect, cererile către `data:`.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? 'application/octet-stream';
  const bin = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const ReportForm: React.FC<ReportFormProps> = ({ accountEmail, onSuccess, onSessionExpired }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<ReportCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [session, setSession] = useState<FormSession | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [locationText, setLocationText] = useState<string>('');
  const [position, setPosition] = useState<PickedPosition | null>(null);
  const [notifyOptIn, setNotifyOptIn] = useState(false);
  const [transmitToCityHall, setTransmitToCityHall] = useState(false);
  const [hp, setHp] = useState(''); // capcana anti-robot (B7): câmp invizibil, rămâne gol

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitErrorRef = useRef<HTMLDivElement | null>(null);
  // întrebarea „fără poziție pe hartă”: apare la trimiterea fără pin și dispare când există pin
  const [noPinPrompt, setNoPinPrompt] = useState(false);
  // „Trimit fără hartă” a fost ales: o reîncercare (de ex. după o eroare de server) nu mai întreabă a doua oară
  const [withoutPinConfirmed, setWithoutPinConfirmed] = useState(false);
  const pickerRef = useRef<LocationPickerHandle | null>(null);
  const noPinPromptRef = useRef<HTMLDivElement | null>(null);
  const showNoPinPrompt = noPinPrompt && !position;

  useEffect(() => {
    if (!showNoPinPrompt) return;
    noPinPromptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    noPinPromptRef.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [showNoPinPrompt]);

  const loadCategories = () => {
    setCategoriesError(null);
    reportService
      .getCategories()
      .then(setCategories)
      .catch((err: unknown) => setCategoriesError(userMessage(err, 'A apărut o eroare. Încercați din nou.')));
  };

  useEffect(() => {
    loadCategories();
    reportService
      .startForm()
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });

  // Fotografiile: compresie în browser (3C) → JPEG / WebP (singurele formate acceptate de server, B5 §2)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPhotoError(null);
    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setPhotoError(`Puteți atașa maximum ${MAX_PHOTOS} fotografii.`);
      return;
    }
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsProcessingPhotos(true);
    try {
      const compressed = await imageCompressionService.compressPhotos(
        filesToProcess,
        (current, total) => setProcessingProgress({ current, total }),
        { maxDimension: 1920, quality: 0.82, maxOriginalSizeMB: MAX_PHOTO_SIZE_MB },
      );
      const newPhotos: ReportPhoto[] = compressed.map((res) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        dataUrl: res.dataUrl,
        name: res.name,
        size: res.compressedSize,
        type: res.type,
        originalSize: res.originalSize,
        width: res.width,
        height: res.height,
        originalWidth: res.originalWidth,
        originalHeight: res.originalHeight,
        compressionRatio: res.reductionPercent,
      }));
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
    } catch (err: unknown) {
      setPhotoError(
        // 7B.2 (E2): numai erorile cunoscute ale procesării (format, mărime, decodare, Canvas) își afișează textul
        err instanceof PhotoProcessingError && err.message
          ? err.message
          : 'Una dintre fotografii nu a putut fi procesată. Încercați o altă imagine (JPEG, PNG sau WebP).',
      );
    } finally {
      setIsProcessingPhotos(false);
      setProcessingProgress(null);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedCategoryId) errs.category = 'Vă rugăm să selectați o categorie pentru problema semnalată.';
    const d = description.trim();
    if (!d) errs.description = 'Descrierea problemei este obligatorie.';
    else if (d.length < MIN_DESCRIPTION_LENGTH) errs.description = `Vă rugăm să oferiți mai multe detalii (minim ${MIN_DESCRIPTION_LENGTH} caractere).`;
    else if (d.length > MAX_DESCRIPTION_LENGTH) errs.description = `Descrierea depășește limita de ${MAX_DESCRIPTION_LENGTH} de caractere.`;
    if (locationText.trim().length < 3) errs.location = 'Vă rugăm să introduceți strada, numărul sau un reper al problemei.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingPhotos || isSubmitting) return; // A-13
    setSubmitError(null);
    if (!validate()) {
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }
    // fără pin, sesizarea nu apare pe hartă: întâi întrebarea; trimiterea fără pin cere alegerea explicită
    if (!position && !withoutPinConfirmed) {
      setNoPinPrompt(true);
      return;
    }
    void submitReport();
  };

  const submitReport = async () => {
    if (isProcessingPhotos || isSubmitting) return; // A-13
    setNoPinPrompt(false);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const form = session ?? (await reportService.startForm());
      if (!session) setSession(form);
      const blobs = photos.map((p) => dataUrlToBlob(p.dataUrl));
      const result = await reportService.submit(
        {
          categoryId: selectedCategoryId,
          description: description.trim(),
          location: position
            ? { text: locationText.trim(), lat: position.lat, lng: position.lng, source: position.source, approximate: position.approximate }
            : { text: locationText.trim(), source: 'text' },
          notifyOptIn,
          transmitToCityHall,
        },
        blobs,
        form,
        hp,
      );
      if (!result.success) {
        if (result.status === 401) {
          onSessionExpired();
          return;
        }
        // 422 generic (timp minim / jeton expirat): un jeton nou pentru următoarea încercare
        if (result.status === 422 && !result.fields) {
          reportService.startForm().then(setSession).catch(() => undefined);
        }
        if (result.fields?.location) setErrors((prev) => ({ ...prev, location: result.error }));
        setSubmitError(`Sesizarea NU a fost înregistrată. ${result.error} Datele completate au fost păstrate.`);
        setTimeout(() => submitErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
        return;
      }
      const category = categories?.find((c) => c.id === selectedCategoryId);
      onSuccess({
        referenceNumber: result.created.referenceNumber,
        createdAt: result.created.createdAt,
        categoryName: category?.name ?? '',
        description: description.trim(),
        locationText: locationText.trim(),
        position,
        photos,
        transmitToCityHall,
        notifyOptIn,
      });
    } catch {
      setSubmitError('Sesizarea NU a fost înregistrată: serverul nu a răspuns. Datele completate au fost păstrate; încercați din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* capcana anti-robot (B7): invizibilă pentru oameni și pentru cititoarele de ecran */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          Site web
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
      </div>

      {/* 1. CATEGORIE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-extrabold text-slate-900">1. Selectează categoria problemei *</label>
          <p className="text-xs text-slate-500 mt-0.5">Alege domeniul cel mai apropiat de incidentul observat în oraș</p>
        </div>

        {errors.category && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errors.category}</span>
          </div>
        )}

        {categoriesError ? (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
            <span>Categoriile nu au putut fi încărcate: {categoriesError}</span>
            <button type="button" onClick={loadCategories} className="font-bold underline">
              Reîncearcă
            </button>
          </div>
        ) : !categories ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Se încarcă categoriile...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const Icon = CATEGORY_ICONS[cat.id] || HelpCircle;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    clearError('category');
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between min-h-[92px] transition-all select-none active:scale-[0.98] ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>{cat.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. DESCRIERE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="report-desc" className="block text-sm font-extrabold text-slate-900">
              2. Descrierea problemei *
            </label>
            <p className="text-xs text-slate-500 mt-0.5">Descrie problema cât mai clar: ce s-a întâmplat, unde și ce ai observat</p>
          </div>
          <div className="text-[11px] font-mono font-semibold text-slate-400">
            <span className={description.length > MAX_DESCRIPTION_LENGTH ? 'text-red-600 font-bold' : ''}>{description.length}</span>/{MAX_DESCRIPTION_LENGTH}
          </div>
        </div>
        <div className="space-y-1">
          <textarea
            id="report-desc"
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearError('description');
            }}
            placeholder="Descrie problema cât mai clar: ce s-a întâmplat, unde și ce ai observat."
            className={`w-full p-3.5 bg-slate-50 border rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
              errors.description ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
            }`}
          />
          {errors.description && <p className="text-xs text-red-600 font-medium pt-0.5">{errors.description}</p>}
          <p className="text-[11px] text-slate-500">Descrierea apare public pe hartă. Nu includeți date personale (nume, telefoane).</p>
        </div>
      </div>

      {/* 3. FOTOGRAFII */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <label className="block text-sm font-extrabold text-slate-900">3. Fotografii de la fața locului (Opțional, max {MAX_PHOTOS})</label>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Optimizare automată</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Formate acceptate: JPG, PNG, WebP (max {MAX_PHOTO_SIZE_MB}MB per fișier). Imaginile sunt redimensionate automat (max 1920px) și comprimate în browser. <strong>Prima fotografie apare public pe hartă</strong>, imediat; evitați persoane sau numere de înmatriculare.
          </p>
        </div>

        {photoError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-950">{photoError}</p>
              <p className="text-[11px] text-amber-800 mt-0.5">Formularul rămâne complet utilizabil. Puteți încerca cu o altă fotografie.</p>
            </div>
            <button type="button" onClick={() => setPhotoError(null)} className="text-amber-700 hover:text-amber-950 p-1" aria-label="Închide mesajul">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoSelect}
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={isProcessingPhotos}
          className="hidden"
          id="photo-upload-input"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <div key={photo.id} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group shadow-sm flex flex-col justify-end">
              <img src={photo.dataUrl} alt={photo.name} className="w-full h-full object-cover absolute inset-0" />
              {i === 0 && (
                <span className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Publică
                </span>
              )}
              <div className="relative z-10 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent p-2 pt-4 text-white text-[10px] space-y-0.5">
                <div className="font-mono font-bold truncate text-[10px] text-slate-100">
                  {photo.width && photo.height ? `${photo.width}×${photo.height}` : 'Optimizat'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-300">
                  <span>{(photo.size / 1024).toFixed(0)} KB</span>
                  {photo.compressionRatio !== undefined && <span className="font-bold text-emerald-400">-{photo.compressionRatio}%</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id))}
                className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-slate-900/80 hover:bg-red-600 text-white transition-colors shadow-md active:scale-95"
                title="Elimină fotografia"
                aria-label="Elimină fotografia"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {isProcessingPhotos && (
            <div className="aspect-square rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/80 flex flex-col items-center justify-center p-3 text-center space-y-2 animate-pulse">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <div className="text-[11px] font-bold text-blue-900 leading-tight">Se optimizează...</div>
              {processingProgress && (
                <div className="text-[9px] text-blue-700 font-medium">
                  {processingProgress.current} din {processingProgress.total}
                </div>
              )}
            </div>
          )}

          {photos.length < MAX_PHOTOS && !isProcessingPhotos && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/40 transition-all flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-blue-700 min-h-[100px] select-none active:scale-[0.98]"
            >
              <div className="p-2.5 rounded-full bg-white shadow-sm border border-slate-200">
                <Camera className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-[11px] font-bold">{photos.length === 0 ? 'Încarcă foto' : 'Mai adaugă'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. LOCAȚIE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="report-location" className="block text-sm font-extrabold text-slate-900">
            4. Locația incidentului *
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Descrie locul (stradă, număr, reper), apoi pune pinul: „Caută pe hartă” folosește textul scris aici; poți și atinge harta. Sunt acceptate numai locuri din municipiul Turnu Măgurele.
          </p>
        </div>

        <div className="space-y-1">
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="report-location"
              type="text"
              value={locationText}
              maxLength={300}
              onChange={(e) => {
                setLocationText(e.target.value);
                clearError('location');
              }}
              placeholder="ex: Str. 1 Mai, în dreptul blocului F25"
              className={`w-full pl-10 pr-3.5 py-3 bg-slate-50 border rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.location ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
              }`}
            />
          </div>
          {errors.location && <p className="text-xs text-red-600 font-medium pt-0.5">{errors.location}</p>}
          <p className="text-[11px] text-slate-500">Textul locației apare public, ca descrierea.</p>
        </div>

        <LocationPicker ref={pickerRef} value={position} onChange={(p) => { setPosition(p); setWithoutPinConfirmed(false); clearError('location'); }} addressText={locationText} />
      </div>

      {/* 5. NOTIFICĂRI ȘI TRANSMITERE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-extrabold text-slate-900">5. Notificări și transmitere către Primărie</label>
          <p className="text-xs text-slate-500 mt-0.5">
            Sesizarea se trimite din contul <strong className="text-slate-700">{accountEmail}</strong>. Adresa nu apare public.
          </p>
        </div>

        <label
          className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
            transmitToCityHall ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <input
            type="checkbox"
            checked={transmitToCityHall}
            onChange={(e) => setTransmitToCityHall(e.target.checked)}
            className="mt-1 text-blue-600 focus:ring-blue-500"
          />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Transmite sesizarea către Primărie</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Platforma trimite pe e-mail sesizarea către Primărie: descrierea, locul, coordonatele, fotografiile și <strong>adresa de e-mail a contului</strong> (pentru eventuale clarificări). Maximum 3 transmiteri în 24 de ore.
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
            notifyOptIn ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <input type="checkbox" checked={notifyOptIn} onChange={(e) => setNotifyOptIn(e.target.checked)} className="mt-1 text-emerald-600 focus:ring-emerald-500" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
              <Bell className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Anunță-mă pe e-mail când se schimbă stadiul</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Primiți un mesaj când sesizarea devine „în analiză” (transmisă Primăriei) și când devine „rezolvată”. Vă puteți dezabona din orice mesaj.
            </p>
          </div>
        </label>
      </div>

      {/* 6. INFORMARE */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-5 text-xs text-amber-900 space-y-2 shadow-sm">
        <div className="font-bold flex items-center gap-2 text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Informare esențială înainte de trimitere</span>
        </div>
        <p className="leading-relaxed text-[11px] text-amber-900">
          Platforma este un demers civic independent și <strong>nu reprezintă registrul oficial al Primăriei Municipiului Turnu Măgurele</strong>. Sesizarea apare <strong>imediat</strong> pe harta publică (categoria, descrierea, locul, prima fotografie și stadiul), fără verificare prealabilă; responsabilitatea conținutului vă aparține. Numărul <code>TM-XXX</code> este intern, nu un număr oficial de înregistrare. Sesizarea se păstrează 45 de zile; o puteți șterge oricând din „Contul meu”.
        </p>
      </div>

      {/* 7. TRIMITERE */}
      <div className="pt-2 space-y-3">
        {submitError && (
          <div
            ref={submitErrorRef}
            role="alert"
            aria-live="assertive"
            className="p-4 rounded-2xl bg-red-50 border border-red-300 text-xs sm:text-sm text-red-800 flex items-start gap-2.5 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{submitError}</span>
          </div>
        )}
        {showNoPinPrompt && (
          <div
            ref={noPinPromptRef}
            role="group"
            aria-labelledby="no-pin-prompt-title"
            data-testid="no-pin-prompt"
            className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <MapPin className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p id="no-pin-prompt-title" className="text-sm font-extrabold">
                  Sesizarea nu are poziție pe hartă
                </p>
                <p className="text-xs leading-relaxed text-amber-900">
                  Fără pin, sesizarea se salvează, dar <strong>nu apare pe harta publică</strong> până când administratorul îi stabilește poziția. Ce doriți să faceți?
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setNoPinPrompt(false);
                  pickerRef.current?.searchAddress();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs select-none"
              >
                Caută adresa scrisă
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoPinPrompt(false);
                  pickerRef.current?.showMap();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs select-none"
              >
                Pun pinul pe hartă
              </button>
              <button
                type="button"
                onClick={() => {
                  setWithoutPinConfirmed(true);
                  void submitReport();
                }}
                disabled={isSubmitting || isProcessingPhotos}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs select-none disabled:opacity-50"
              >
                Trimit fără hartă
              </button>
            </div>
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting || isProcessingPhotos || !categories}
          className="w-full py-4 px-6 min-h-[52px] rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-blue-700/25 transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 select-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Se transmite sesizarea...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Trimite sesizarea</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
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
  Navigation, 
  User, 
  Phone, 
  Mail, 
  Send, 
  AlertCircle, 
  Check, 
  X, 
  Info, 
  ShieldAlert,
  Loader2,
  Sparkles,
  Eye,
  UserCheck
} from 'lucide-react';
import { CivicReport, ReportCategory, ReportPhoto, PublicationPreference } from '../../types/report';
import { reportService, ReportSaveFailureReason } from '../../services/reportService';
import { imageCompressionService } from '../../services/imageCompressionService';

interface ReportFormProps {
  onSuccess: (report: CivicReport) => void;
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

export const ReportForm: React.FC<ReportFormProps> = ({ onSuccess }) => {
  const categories = reportService.getCategories();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stare formular
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  
  // Stare procesare și compresie foto (Etapa 3C)
  const [isProcessingPhotos, setIsProcessingPhotos] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [addressOrDetails, setAddressOrDetails] = useState<string>('');
  
  // Stare GPS
  const [gpsCoordinates, setGpsCoordinates] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Date de contact opționale
  const [contactName, setContactName] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');

  // Preferința de afișare (Etapa 6.6: fără opțiune de ascundere de pe hartă). Implicit
  // 'public_anonymous' — varianta cea mai protectoare dintre cele rămase (N1 rămâne deschis).
  const [publicationPreference, setPublicationPreference] = useState<PublicationPreference>('public_anonymous');

  // Validare și trimitere
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ETAPA 6.2 (C1): eroare la salvarea efectivă a sesizării (ex. spațiu de stocare plin).
  // Când este setată, sesizarea NU a fost înregistrată, iar datele din formular rămân neschimbate.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitErrorRef = useRef<HTMLDivElement | null>(null);

  const buildSubmitErrorMessage = (reason: ReportSaveFailureReason, photoCount: number): string => {
    if (reason === 'quota_exceeded') {
      return photoCount > 0
        ? `Sesizarea NU a fost înregistrată: spațiul de stocare al acestui browser este plin. Fotografiile atașate (${photoCount}) ocupă mult spațiu — eliminați una sau mai multe fotografii și trimiteți din nou. Datele completate au fost păstrate.`
        : 'Sesizarea NU a fost înregistrată: spațiul de stocare al acestui browser este plin. Datele completate au fost păstrate; vă rugăm să încercați din nou mai târziu.';
    }
    return 'Sesizarea NU a fost înregistrată din cauza unei erori de salvare în browser. Datele completate au fost păstrate; vă rugăm să încercați din nou.';
  };

  // 1. Gestiune Fotografii cu Compresie și Redimensionare Automată (Etapa 3C)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setPhotoError(null);

    const currentCount = photos.length;
    const remainingSlots = MAX_PHOTOS - currentCount;

    if (remainingSlots <= 0) {
      setPhotoError(`Puteți atașa maximum ${MAX_PHOTOS} fotografii.`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    // Resetare valoare input pentru a permite reselectarea aceluiași fișier dacă e necesar
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setIsProcessingPhotos(true);

    try {
      const compressedResults = await imageCompressionService.compressPhotos(
        filesToProcess,
        (current, total, fileName) => {
          setProcessingProgress({ current, total, fileName });
        },
        {
          maxDimension: 1920,
          quality: 0.82,
          maxOriginalSizeMB: MAX_PHOTO_SIZE_MB,
        }
      );

      const newPhotos: ReportPhoto[] = compressedResults.map((res) => ({
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
    } catch (err: any) {
      console.error('Eroare la optimizarea fotografiilor:', err);
      setPhotoError(
        err?.message || 'Una dintre fotografii nu a putut fi procesată. Vă rugăm să încercați o altă imagine (JPEG, PNG sau WebP).'
      );
    } finally {
      setIsProcessingPhotos(false);
      setProcessingProgress(null);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // 2. Gestiune GPS la Cererea Utilizatorului (Opțional)
  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocalizarea nu este suportată de acest browser.');
      return;
    }

    setIsGettingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoordinates({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsGettingGps(false);
        // Dacă adresa manuală este goală, putem adăuga un text orientativ
        if (!addressOrDetails.trim()) {
          setAddressOrDetails('Locație determinată prin GPS');
        }
      },
      (err) => {
        setIsGettingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Accesul la locația GPS a fost refuzat. Vă rugăm să introduceți adresa manual.');
        } else {
          setGpsError('Nu s-a putut prelua poziția GPS. Introduceți adresa manual.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // 3. Validare Riguroasă a Formularului
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    // Categorie
    if (!selectedCategoryId) {
      errs.category = 'Vă rugăm să selectați o categorie pentru problema semnalată.';
    }

    // Descriere
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errs.description = 'Descrierea problemei este obligatorie.';
    } else if (trimmedDesc.length < MIN_DESCRIPTION_LENGTH) {
      errs.description = `Vă rugăm să oferiți mai multe detalii (minim ${MIN_DESCRIPTION_LENGTH} caractere).`;
    } else if (trimmedDesc.length > MAX_DESCRIPTION_LENGTH) {
      errs.description = `Descrierea depășește limita de ${MAX_DESCRIPTION_LENGTH} de caractere.`;
    }

    // Locație
    if (!addressOrDetails.trim()) {
      errs.location = 'Vă rugăm să introduceți strada, numărul sau un reper al problemei.';
    }

    // Date de contact (Opționale, dar validate dacă sunt completate)
    if (contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail.trim())) {
        errs.contactEmail = 'Formatul adresei de e-mail nu este valid (ex: nume@domeniu.ro).';
      }
    }

    if (contactPhone.trim()) {
      const phoneDigits = contactPhone.replace(/\D/g, '');
      if (phoneDigits.length < 7) {
        errs.contactPhone = 'Introduceți un număr de telefon valid (minim 7 cifre).';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 4. Trimitere Sesizare
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // A-13: nu se trimite cât timp fotografiile se comprimă (altfel ar lipsi din sesizare), nici prin Enter.
    if (isProcessingPhotos) return;
    setSubmitError(null);

    if (!validate()) {
      // Scroll lin la prima eroare
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

    const hasContact = contactName.trim() || contactPhone.trim() || contactEmail.trim();

    setTimeout(() => {
      const result = reportService.submitReport({
        categoryId: selectedCategoryId,
        categoryName: selectedCategory ? selectedCategory.name : 'Sesizare Generală',
        description: description.trim(),
        photos,
        location: {
          addressOrDetails: addressOrDetails.trim(),
          latitude: gpsCoordinates?.latitude,
          longitude: gpsCoordinates?.longitude,
          accuracy: gpsCoordinates?.accuracy,
          source: gpsCoordinates ? 'both' : 'manual',
        },
        contact: hasContact
          ? {
              name: contactName.trim() || undefined,
              phone: contactPhone.trim() || undefined,
              email: contactEmail.trim() || undefined,
            }
          : undefined,
        publicationPreference,
      });

      setIsSubmitting(false);

      // ETAPA 6.2 (C1): confirmarea se afișează DOAR dacă sesizarea a fost salvată efectiv.
      if (!result.success) {
        setSubmitError(buildSubmitErrorMessage(result.reason, photos.length));
        setTimeout(() => {
          submitErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
        return;
      }

      onSuccess(result.report);
    }, 250);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* 1. SECȚIUNEA CATEGORIE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-extrabold text-slate-900">
            1. Selectează categoria problemei *
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Alege domeniul cel mai apropiat de incidentul observat în oraș
          </p>
        </div>

        {errors.category && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errors.category}</span>
          </div>
        )}

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
                  if (errors.category) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.category;
                      return copy;
                    });
                  }
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
                  <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                    {cat.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SECȚIUNEA DESCRIERE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="report-desc" className="block text-sm font-extrabold text-slate-900">
              2. Descrierea problemei *
            </label>
            <p className="text-xs text-slate-500 mt-0.5">
              Descrie problema cât mai clar: ce s-a întâmplat, unde și ce ai observat
            </p>
          </div>

          {/* Contor de caractere */}
          <div className="text-[11px] font-mono font-semibold text-slate-400">
            <span className={description.length > MAX_DESCRIPTION_LENGTH ? 'text-red-600 font-bold' : ''}>
              {description.length}
            </span>
            /{MAX_DESCRIPTION_LENGTH}
          </div>
        </div>

        <div className="space-y-1">
          <textarea
            id="report-desc"
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.description;
                  return copy;
                });
              }
            }}
            placeholder="Descrie problema cât mai clar: ce s-a întâmplat, unde și ce ai observat."
            className={`w-full p-3.5 bg-slate-50 border rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
              errors.description
                ? 'border-red-400 focus:ring-red-200'
                : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
            }`}
          />
          {errors.description && (
            <p className="text-xs text-red-600 font-medium pt-0.5">{errors.description}</p>
          )}
        </div>
      </div>

      {/* 3. SECȚIUNEA FOTOGRAFII (COMPRESIE ȘI REDIMENSIONARE AUTOMATĂ - ETAPA 3C) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <label className="block text-sm font-extrabold text-slate-900">
              3. Fotografii de la fața locului (Opțional, max {MAX_PHOTOS})
            </label>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Optimizare automată</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Formate acceptate: JPG, PNG, WebP (max {MAX_PHOTO_SIZE_MB}MB per fișier). Imaginile sunt redimensionate automat (max 1920px) și comprimate eficient în browser înainte de salvare.
          </p>
        </div>

        {/* Mesaj de eroare procesare dacă e cazul */}
        {photoError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-amber-950">{photoError}</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Formularul rămâne complet utilizabil. Puteți încerca cu o altă fotografie.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPhotoError(null)}
              className="text-amber-700 hover:text-amber-950 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input ascuns */}
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

        {/* Grilă poze atașate + Stare procesare + Buton adăugare */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group shadow-sm flex flex-col justify-end"
            >
              <img
                src={photo.dataUrl}
                alt={photo.name}
                className="w-full h-full object-cover absolute inset-0"
              />

              {/* Bandă informativă discretă cu statisticile optimizării */}
              <div className="relative z-10 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-transparent p-2 pt-4 text-white text-[10px] space-y-0.5">
                <div className="font-mono font-bold truncate text-[10px] text-slate-100">
                  {photo.width && photo.height ? `${photo.width}×${photo.height}` : 'Optimizat'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-300">
                  <span>{(photo.size / 1024).toFixed(0)} KB</span>
                  {photo.compressionRatio !== undefined && (
                    <span className="font-bold text-emerald-400">
                      -{photo.compressionRatio}%
                    </span>
                  )}
                </div>
              </div>

              {/* Buton eliminare fotografie */}
              <button
                type="button"
                onClick={() => handleRemovePhoto(photo.id)}
                className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-slate-900/80 hover:bg-red-600 text-white transition-colors shadow-md active:scale-95"
                title="Elimină fotografia"
                aria-label="Elimină fotografia"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Indicator vizual în timpul procesării / compresiei */}
          {isProcessingPhotos && (
            <div className="aspect-square rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/80 flex flex-col items-center justify-center p-3 text-center space-y-2 animate-pulse">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <div className="text-[11px] font-bold text-blue-900 leading-tight">
                Se optimizează...
              </div>
              {processingProgress && (
                <div className="text-[9px] text-blue-700 font-medium">
                  {processingProgress.current} din {processingProgress.total}
                </div>
              )}
            </div>
          )}

          {/* Buton Adăugare Poză (dacă mai e loc și nu se procesează) */}
          {photos.length < MAX_PHOTOS && !isProcessingPhotos && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/40 transition-all flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-blue-700 min-h-[100px] select-none active:scale-[0.98]"
            >
              <div className="p-2.5 rounded-full bg-white shadow-sm border border-slate-200">
                <Camera className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-[11px] font-bold">
                {photos.length === 0 ? 'Încarcă foto' : 'Mai adaugă'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 4. SECȚIUNEA LOCAȚIE (MANUALĂ + GPS LA CERERE) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="report-location" className="block text-sm font-extrabold text-slate-900">
            4. Locația incidentului *
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Indică strada, numărul, intersecția sau un reper binecunoscut din oraș
          </p>
        </div>

        {/* Câmp text locație manuală */}
        <div className="space-y-1">
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="report-location"
              type="text"
              value={addressOrDetails}
              onChange={(e) => {
                setAddressOrDetails(e.target.value);
                if (errors.location) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.location;
                    return copy;
                  });
                }
              }}
              placeholder="ex: Str. Portului nr. 12, lângă parcul central"
              className={`w-full pl-10 pr-3.5 py-3 bg-slate-50 border rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                errors.location
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
              }`}
            />
          </div>
          {errors.location && (
            <p className="text-xs text-red-600 font-medium pt-0.5">{errors.location}</p>
          )}
        </div>

        {/* Buton Activare GPS (Opțional la cererea utilizatorului) */}
        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleRequestGps}
            disabled={isGettingGps}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs transition-colors border border-blue-200 select-none active:scale-[0.98]"
          >
            {isGettingGps ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Se preia poziția GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-blue-600" />
                <span>Folosește locația mea (GPS)</span>
              </>
            )}
          </button>

          {/* Confirmare coordonate preluate */}
          {gpsCoordinates && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Coordonate GPS salvate ({gpsCoordinates.latitude.toFixed(4)}, {gpsCoordinates.longitude.toFixed(4)})
              </span>
            </div>
          )}
        </div>

        {/* Mesaj de eroare GPS prietenos (fără blocarea formularului) */}
        {gpsError && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{gpsError}</span>
          </div>
        )}
      </div>

      {/* 5. SECȚIUNEA DATE DE CONTACT (OPȚIONALE) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-extrabold text-slate-900">
              5. Date de contact
            </label>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
              Opțional
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Puteți lăsa date de contact pentru eventuale clarificări. Sesizarea poate fi trimisă și fără acestea.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor="contact-name" className="text-[11px] font-bold text-slate-700">
              Nume și prenume
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="contact-name"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Anonim sau Nume"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="contact-phone" className="text-[11px] font-bold text-slate-700">
              Număr telefon
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="contact-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value);
                  if (errors.contactPhone) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.contactPhone;
                      return copy;
                    });
                  }
                }}
                placeholder="07xxxxxxxx"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.contactPhone ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
            </div>
            {errors.contactPhone && (
              <p className="text-[10px] text-red-600 font-medium">{errors.contactPhone}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="contact-email" className="text-[11px] font-bold text-slate-700">
              Adresă e-mail
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  if (errors.contactEmail) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.contactEmail;
                      return copy;
                    });
                  }
                }}
                placeholder="cetatean@exemplu.ro"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.contactEmail ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
            </div>
            {errors.contactEmail && (
              <p className="text-[10px] text-red-600 font-medium">{errors.contactEmail}</p>
            )}
          </div>
        </div>
      </div>

      {/* 6. SECȚIUNEA AFIȘARE PE HARTĂ (ETAPA 6.6: fără opțiune de ascundere; identitatea autorului nu e publică) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-extrabold text-slate-900">
              6. Afișarea sesizării pe harta sesizărilor *
            </label>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
              Alegere Cetățean
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            După aprobarea moderatorului, sesizarea poate fi afișată pe harta orașului, pentru ca ceilalți cetățeni să vadă problema semnalată. <strong>Numele, telefonul și e-mailul dumneavoastră nu sunt afișate public.</strong>
          </p>
        </div>

        <div className="space-y-2.5">
          {/* Opțiunea 2: PUBLIC ANONIM */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
              publicationPreference === 'public_anonymous'
                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-100'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <input
              type="radio"
              name="publicationPreference"
              value="public_anonymous"
              checked={publicationPreference === 'public_anonymous'}
              onChange={() => setPublicationPreference('public_anonymous')}
              className="mt-1 text-emerald-600 focus:ring-emerald-500"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Afișare publică anonimă</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                După aprobarea moderatorului, problema apare pe hartă. <strong>Datele dumneavoastră personale (nume, telefon, e-mail) sunt 100% protejate și NU vor fi afișate public</strong>.
              </p>
            </div>
          </label>

          {/* Opțiunea 3: PUBLIC */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
              publicationPreference === 'public'
                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-100'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <input
              type="radio"
              name="publicationPreference"
              value="public"
              checked={publicationPreference === 'public'}
              onChange={() => setPublicationPreference('public')}
              className="mt-1 text-blue-600 focus:ring-blue-500"
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900">
                <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Afișare publică</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sesizarea intră în fluxul de moderare și, după aprobare, devine vizibilă pe hartă.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* 7. INFORMAREA OBLIGATORIE A CETĂȚEANULUI PRIVIND NATURA PLATFORMEI */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-5 text-xs text-amber-900 space-y-2 shadow-sm">
        <div className="font-bold flex items-center gap-2 text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Informare esențială înainte de trimitere</span>
        </div>
        <p className="leading-relaxed text-[11px] text-amber-900">
          Platforma este un demers civic independent și <strong>nu reprezintă registrul oficial al Primăriei Municipiului Turnu Măgurele</strong>. Formularul transmite sesizarea către platformă pentru procesarea fluxului civic. Platforma nu emite în această etapă un număr oficial de înregistrare, iar transmiterea formală către Primărie va fi activată conform Master Planului.
        </p>
      </div>

      {/* 8. BUTONUL DE TRIMITERE */}
      <div className="pt-2 space-y-3">
        {/* ETAPA 6.2 (C1): eroare de salvare — sesizarea NU a fost înregistrată */}
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
        <button
          type="submit"
          disabled={isSubmitting || isProcessingPhotos}
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

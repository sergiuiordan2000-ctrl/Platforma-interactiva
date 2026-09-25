/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  MapPin, 
  Clock, 
  Tag, 
  Camera, 
  ArrowRight, 
  PlusCircle, 
  ShieldAlert, 
  FileText 
} from 'lucide-react';
import { CivicReport } from '../../types/report';
import { AppView } from '../../types/navigation';

interface ReportConfirmationProps {
  report: CivicReport;
  onReset: () => void;
  onNavigate: (view: AppView) => void;
}

export const ReportConfirmation: React.FC<ReportConfirmationProps> = ({
  report,
  onReset,
  onNavigate,
}) => {
  const [copied, setCopied] = useState(false);

  const formattedDate = new Date(report.createdAt).toLocaleString('ro-RO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const handleCopyId = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(report.referenceNumber);
      } else {
        // Fallback pentru medii fără clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = report.referenceNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Ignoră eroarea dacă browserul refuză accesul la clipboard
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
      
      {/* 1. Card Principal de Confirmare */}
      <div className="bg-white rounded-3xl border border-emerald-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 text-center">
        
        {/* Simbol Succes */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        {/* Mesaje Principale de Confirmare */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Sesizarea a fost transmisă platformei
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Datele au fost preluate pentru procesarea fluxului aplicației. Vă mulțumim pentru implicarea civică în comunitatea Turnu Măgurele!
          </p>
        </div>

        {/* 2. EVIDENȚIERE IDENTIFICATOR CIVIC INTERN (ETAPA 3B) */}
        <div className="p-5 rounded-2xl bg-gradient-to-b from-blue-50/80 to-slate-50 border-2 border-blue-200 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
            Identificator intern al sesizării
          </div>

          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-3xl sm:text-4xl font-black text-blue-900 tracking-wider">
              {report.referenceNumber}
            </span>

            {/* Buton Copiază Identificatorul */}
            <button
              type="button"
              onClick={handleCopyId}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-blue-50 text-blue-800 border border-blue-200'
              }`}
              title="Copiază identificatorul în clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                  <span>Copiat!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-600" />
                  <span>Copiază</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-600">
            Păstrează acest identificator pentru referințe ulterioare în cadrul platformei.
          </p>
        </div>

        {/* 3. AVERTISMENT OBLIGATORIU PRIVIND STATUTUL TM-XXX (CERINȚĂ STRICTĂ 3B) */}
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 text-left text-xs text-amber-950 space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2 font-black text-amber-950">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Atenție: Delimitare instituțională obligatorie</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-900">
            Codul <strong>{report.referenceNumber}</strong> este identificatorul intern de evidență al platformei civice. <strong>NU este număr oficial de înregistrare al Primăriei Municipiului Turnu Măgurele</strong> și <strong>NU reprezintă număr oficial de registratură</strong>.
          </p>
        </div>

        {/* 4. Sumar al Informațiilor Transmise */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 text-left space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sumar sesizare înregistrată
            </h3>
            <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {report.referenceNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Categorie:</span>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{report.categoryName}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 font-medium">Data și ora transmiterii:</span>
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formattedDate}</span>
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="text-slate-500 font-medium">Locație indicată:</span>
              <div className="font-semibold text-slate-900 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                <span>{report.location.addressOrDetails}</span>
              </div>
              {report.location.latitude && report.location.longitude && (
                <div className="text-[10px] text-slate-500 font-mono pl-5">
                  Coordonate GPS: {report.location.latitude.toFixed(6)}, {report.location.longitude.toFixed(6)}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="text-slate-500 font-medium">Opțiune publicare aleasă:</span>
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  report.publicationPreference === 'private'
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : report.publicationPreference === 'public_anonymous'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  {report.publicationPreference === 'private' && 'Nu doresc afișarea publică (Privată)'}
                  {report.publicationPreference === 'public_anonymous' && 'Publică Anonim (Fără date personale pe hartă)'}
                  {report.publicationPreference === 'public' && 'Publică (În așteptarea moderării)'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {report.publicationPreference === 'private' 
                    ? '• Nu va apărea pe hartă' 
                    : '• Necesită aprobarea administratorului'}
                </span>
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <span className="text-slate-500 font-medium">Descrierea problemei:</span>
              <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed italic text-xs">
                „{report.description}”
              </p>
            </div>

            {report.photos && report.photos.length > 0 && (
              <div className="space-y-1.5 sm:col-span-2">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fotografii optimizate atașate ({report.photos.length}):</span>
                </span>
                <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                  {report.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-slate-900"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.name}
                        className="w-20 h-20 object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 p-0.5 text-[9px] font-mono text-center text-white truncate px-1">
                        {(photo.size / 1024).toFixed(0)} KB
                        {photo.compressionRatio !== undefined && (
                          <span className="text-emerald-400 font-bold ml-1">
                            -{photo.compressionRatio}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Butoane de Acțiune */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Trimite o altă sesizare</span>
          </button>

          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-colors"
          >
            <span>Înapoi la Acasă</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};

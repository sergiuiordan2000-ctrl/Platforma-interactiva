/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Phone, 
  Clock, 
  MapPin, 
  Copy, 
  Check, 
  AlertTriangle,
  ShieldAlert,
  Building2
} from 'lucide-react';
import { QuickDialContact } from '../../types/quickDial';

interface QuickDialCardProps {
  contact: QuickDialContact;
}

export const QuickDialCard: React.FC<QuickDialCardProps> = ({ contact }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUrgent = contact.isEmergency;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-white p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md ${
        isUrgent 
          ? 'border-red-200 ring-1 ring-red-100 hover:border-red-400' 
          : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      <div className="space-y-3">
        
        {/* Antet Card: Categorie + Disponibilitate / Urgență */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isUrgent 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-slate-100 text-slate-700'
            }`}>
              {contact.categoryName}
            </span>

            {contact.isDemo && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                DEMO
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate max-w-[170px]">{contact.availability}</span>
          </div>
        </div>

        {/* Nume Contact */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug flex items-start gap-1.5">
            {isUrgent && (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-1" />
            )}
            <span>{contact.name}</span>
          </h3>

          {contact.shortDescription && (
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {contact.shortDescription}
            </p>
          )}
        </div>

        {/* Adresă fizică (dacă există) */}
        {contact.address && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{contact.address}</span>
          </div>
        )}

      </div>

      {/* Zonă de Acțiune Rapidă: Număr Formatat + Buton Apelare cu Zonă Mare de Atingere */}
      <div className="pt-4 mt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Vizualizare Număr Formatat + Copiere */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
            {contact.formattedPhone}
          </div>
          <button
            onClick={handleCopy}
            title="Copiază numărul în clipboard"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
            aria-label="Copiază numărul"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Buton Apelare Directă (tel:) - Optimizat pentru smartphone, min-h-[44px] */}
        <a
          href={`tel:${contact.phone}`}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm text-white shadow-sm transition-all active:scale-[0.98] select-none ${
            isUrgent
              ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
          }`}
        >
          <Phone className="w-4 h-4 fill-white" />
          <span>Apelează acum</span>
        </a>

      </div>

    </div>
  );
};

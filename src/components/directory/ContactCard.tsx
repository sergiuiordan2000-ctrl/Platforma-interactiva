/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ExternalLink, 
  Copy, 
  Check,
  UserCheck,
  CalendarCheck
} from 'lucide-react';
import { CityHallInfo } from '../../types/directory';

interface ContactCardProps {
  info: CityHallInfo;
}

export const ContactCard: React.FC<ContactCardProps> = ({ info }) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Card Principal de Date Instituționale & Contact Rapid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Antet Instituție */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-200 border border-white/20 backdrop-blur-sm">
                <Building2 className="w-3.5 h-3.5 text-blue-300" />
                <span>Sediul Central Administrativ</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {info.institutionName}
              </h2>
              <p className="text-xs sm:text-sm text-blue-200 font-medium">
                {info.county} • Cod Poștal {info.postalCode}
              </p>
            </div>

            {/* Buton vizualizare website oficial */}
            <a
              href={info.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/20 transition-all shrink-0 self-start sm:self-center"
            >
              <span>Site Oficial Primărie</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Canale Interactive de Contact (Adresă, Telefoane, Email-uri) */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
          
          {/* Adresă Fizică */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Adresă Sediul Primăriei</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                {info.address}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Municipiul Turnu Măgurele
              </p>
            </div>
            <div className="pt-1 flex items-center gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors"
              >
                <span>Deschide în Hărți</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => handleCopy(info.address, 'adresa')}
                title="Copiază adresa"
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                {copied === 'adresa' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Telefoane Interactive (Apelabile pe Mobil) */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
              <Phone className="w-4 h-4 shrink-0" />
              <span>Centrale Telefonice</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Linia Principală (Secretariat):</div>
                <a
                  href={`tel:${info.primaryPhone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-blue-700 hover:text-blue-900 hover:underline"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{info.primaryPhone}</span>
                </a>
              </div>

              {info.secondaryPhone && (
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Linia Secundară:</div>
                  <a
                    href={`tel:${info.secondaryPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 hover:text-blue-700 hover:underline"
                  >
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{info.secondaryPhone}</span>
                  </a>
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-500 italic">
              * Atinge numărul pentru a iniția apelul direct de pe telefon.
            </div>
          </div>

          {/* E-mailuri Interactive */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
              <Mail className="w-4 h-4 shrink-0" />
              <span>Corespondență Electronică</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-[11px] text-slate-500 font-medium">E-mail Oficial:</div>
                <a
                  href={`mailto:${info.primaryEmail}`}
                  className="text-xs sm:text-sm font-bold text-blue-700 hover:text-blue-900 hover:underline break-all"
                >
                  {info.primaryEmail}
                </a>
              </div>

              {info.registryEmail && (
                <div>
                  <div className="text-[11px] text-slate-500 font-medium">Registratură & Petiții:</div>
                  <a
                    href={`mailto:${info.registryEmail}`}
                    className="text-xs sm:text-sm font-semibold text-slate-800 hover:text-blue-700 hover:underline break-all"
                  >
                    {info.registryEmail}
                  </a>
                </div>
              )}
            </div>
            <div className="text-[11px] text-slate-500 italic">
              * Transmite petiții și cereri oficiale prin e-mail.
            </div>
          </div>

        </div>

      </div>

      {/* 2. Programul Instituțional și Programul de Audiențe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Orar de Funcționare cu Publicul */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Program de Lucru & Ghișee</h3>
              <p className="text-xs text-slate-500">Programul general de funcționare al Primăriei</p>
            </div>
          </div>

          <div className="space-y-3 divide-y divide-slate-100">
            {info.schedule.map((item, idx) => (
              <div key={idx} className={`pt-3 first:pt-0 flex items-start justify-between gap-3 text-xs sm:text-sm`}>
                <div className="font-semibold text-slate-800 min-w-[120px]">
                  {item.day}
                </div>
                <div className="text-right space-y-0.5">
                  <div className="font-bold text-blue-900">{item.hours}</div>
                  {item.note && (
                    <div className="text-[11px] text-slate-500 font-normal">{item.note}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Programul Audiențelor Conducerii */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Programul Audiențelor</h3>
              <p className="text-xs text-slate-500">Întâlniri cu reprezentanții conducerii executive</p>
            </div>
          </div>

          <div className="space-y-3.5 divide-y divide-slate-100">
            {info.audienceSchedule.map((aud, idx) => (
              <div key={idx} className="pt-3 first:pt-0 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-700" />
                    <span>{aud.role}</span>
                  </span>
                  <span className="font-extrabold text-purple-900 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200">
                    {aud.schedule}
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  {aud.registrationNote}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

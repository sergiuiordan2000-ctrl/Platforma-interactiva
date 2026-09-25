/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Clock, 
  Coins, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  Building2,
  Search
} from 'lucide-react';
import { CityHallService } from '../../types/directory';

interface ServicesListProps {
  services: CityHallService[];
}

export const ServicesList: React.FC<ServicesListProps> = ({ services }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  const filteredServices = services.filter((srv) => {
    const term = searchTerm.toLowerCase();
    return (
      srv.title.toLowerCase().includes(term) ||
      srv.departmentName.toLowerCase().includes(term) ||
      srv.description.toLowerCase().includes(term)
    );
  });

  const toggleExpand = (id: string) => {
    setExpandedServiceId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      
      {/* Antet Secțiune & Căutare */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700" />
            <span>Servicii Publice & Documente pentru Cetățeni</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghidul actelor necesare, termenelor și procedurilor pentru cererile adresate Primăriei
          </p>
        </div>

        {/* Căutare rapidă servicii */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Caută certificat, buletin..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Lista de Servicii (Format Carduri Interactive) */}
      <div className="space-y-3">
        {filteredServices.length > 0 ? (
          filteredServices.map((srv) => {
            const isExpanded = expandedServiceId === srv.id;

            return (
              <div
                key={srv.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                  isExpanded ? 'border-blue-400 ring-1 ring-blue-400/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header Card (Clickable pentru Expandare) */}
                <div
                  onClick={() => toggleExpand(srv.id)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                        <Building2 className="w-3 h-3 text-blue-600" />
                        <span>{srv.departmentName}</span>
                      </span>
                      {srv.fee && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {srv.fee}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {srv.title}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {srv.description}
                    </p>
                  </div>

                  <div className="shrink-0 self-center p-1.5 rounded-lg bg-slate-100 text-slate-500">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Corp Detaliat (Vizibil la Expandare) */}
                {isExpanded && (
                  <div className="px-4 pb-5 sm:px-5 space-y-4 border-t border-slate-100 pt-4 bg-slate-50/50 text-xs">
                    
                    {/* Documente Solicitate */}
                    {srv.documentsRequired && srv.documentsRequired.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Acte și Documente Solicitate:</span>
                        </div>
                        <ul className="space-y-1.5 pl-5 list-disc text-slate-700 leading-relaxed">
                          {srv.documentsRequired.map((doc, idx) => (
                            <li key={idx}>{doc}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Metadate: Termen și Taxă */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {srv.processingTime && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-0.5">
                          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>Termen legal de soluționare:</span>
                          </div>
                          <div className="font-bold text-slate-800">{srv.processingTime}</div>
                        </div>
                      )}

                      {srv.fee && (
                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-0.5">
                          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                            <Coins className="w-3 h-3 text-amber-600" />
                            <span>Taxă de eliberare:</span>
                          </div>
                          <div className="font-bold text-slate-800">{srv.fee}</div>
                        </div>
                      )}
                    </div>

                    {/* Link direct către formular sau portal extern (dacă există) */}
                    {srv.onlineLink && (
                      <div className="pt-1">
                        <a
                          href={srv.onlineLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm"
                        >
                          <span>Accesează serviciul online</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            Niciun serviciu nu corespunde căutării „{searchTerm}”.
          </div>
        )}
      </div>

    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Info, 
  FileCheck2, 
  Clock, 
  MapPin, 
  Tag, 
  ShieldCheck, 
  PlusCircle,
  Hash
} from 'lucide-react';
import { AppView } from '../types/navigation';
import { CivicReport } from '../types/report';
import { ReportForm } from '../components/report/ReportForm';
import { ReportConfirmation } from '../components/report/ReportConfirmation';
import { reportService } from '../services/reportService';

interface IssuesViewProps {
  onNavigate: (view: AppView) => void;
}

export const IssuesView: React.FC<IssuesViewProps> = ({ onNavigate }) => {
  const [submittedReport, setSubmittedReport] = useState<CivicReport | null>(() => 
    reportService.getLastSubmittedReport()
  );
  const [activeTab, setActiveTab] = useState<'form' | 'testList'>('form');
  const [reports, setReports] = useState<CivicReport[]>(() => reportService.getAllReports());

  // Ascultare modificări din reportService
  useEffect(() => {
    return reportService.subscribe(() => {
      setReports(reportService.getAllReports());
    });
  }, []);

  const handleSubmitted = (report: CivicReport) => {
    setSubmittedReport(report);
    setReports(reportService.getAllReports());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    reportService.resetLastSubmittedReport();
    setSubmittedReport(null);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      
      {/* 1. Antet Modul */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            <span>Modul Funcțional • Etapa 3E (Sesizări, TM-XXX, Compresie & Moderare)</span>
          </div>

          {/* Comutator între Formular și Lista Tehnică Minimală (pentru verificarea identificatorilor) */}
          {!submittedReport && reports.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === 'form'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Formular Sesizare
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('testList')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'testList'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                <span>Evidență Locală ({reports.length})</span>
              </button>
            </div>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Sesizări Cetățenești Turnu Măgurele
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Semnalează o problemă urbană pentru a fi preluată în fluxul civic. Fiecare sesizare primește un identificator intern de referință (TM-XXX).
        </p>
      </div>

      {/* 2. Conținut Principal */}
      {submittedReport ? (
        /* Ecran de Confirmare cu TM-XXX și Buton de Copiere */
        <ReportConfirmation
          report={submittedReport}
          onReset={handleResetForm}
          onNavigate={onNavigate}
        />
      ) : activeTab === 'testList' ? (
        /* Listă Tehnică Minimală pentru Verificarea Identificatorilor (Cerința 11 & 15) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <span>Listă tehnică de verificare a identificatorilor (Etapa 3B)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verificare determinism, unicitate, persistență și nerefolosire a numerelor secvențiale.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('form')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Sesizare nouă</span>
            </button>
          </div>

          {/* Notă de Confidențialitate (Secțiunea 15) */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              <strong>Confidențialitate garantată:</strong> Datele personale ale cetățeanului (telefon, e-mail, nume) sunt protejate și nu sunt afișate în această listă tehnică.
            </span>
          </div>

          {/* Tabel / Carduri Minimale */}
          <div className="space-y-3">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-2.5 hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm sm:text-base font-black text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                      {rep.referenceNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {rep.categoryName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (ID tehnic: {rep.id})
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 line-clamp-2">
                    {rep.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{rep.location.addressOrDetails}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(rep.createdAt).toLocaleString('ro-RO')}</span>
                    </span>
                    {rep.photos && rep.photos.length > 0 && (
                      <span className="text-slate-400">
                        • {rep.photos.length} {rep.photos.length === 1 ? 'poză' : 'poze'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Formularul de Sesizare */
        <ReportForm onSuccess={handleSubmitted} />
      )}

      {/* 3. Notă de Subsol Metodologică */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start justify-between gap-4 text-xs text-slate-600">
        <div className="space-y-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Delimitare Modul Sesizări (Etapele 3A, 3B, 3C, 3D, 3E)</span>
          </div>
          <p className="leading-relaxed">
            Formularul colectează datele și coordonatele, optimizează fotografiile (3C), alocă identificatorul intern permanent <code>TM-XXX</code> (3B) și înregistrează opțiunea de publicare aleasă de cetățean (3E). Sesizările aprobate în panoul de moderare sunt vizibile pe Harta Publică (3D). Trimiterea automată către Primărie aparține etapelor viitoare.
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

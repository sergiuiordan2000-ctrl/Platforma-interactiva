/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Info
} from 'lucide-react';
import { AppView } from '../types/navigation';
import { CivicReport } from '../types/report';
import { ReportForm } from '../components/report/ReportForm';
import { ReportConfirmation } from '../components/report/ReportConfirmation';
import { reportService } from '../services/reportService';

interface IssuesViewProps {
  onNavigate: (view: AppView) => void;
}

/**
 * ETAPA 6.5 (P3): zona publică NU mai citește lista completă de sesizări (`getAllReports()`).
 * Lista tehnică „Evidență Locală” (artefact Etapa 3B) afișa public sesizări private/nemoderate
 * și primea obiectul complet (inclusiv datele de contact). Cetățeanul vede doar formularul și
 * confirmarea propriei sesizări; lista completă există exclusiv în panoul Admin (Moderare).
 */
export const IssuesView: React.FC<IssuesViewProps> = ({ onNavigate }) => {
  const [submittedReport, setSubmittedReport] = useState<CivicReport | null>(() =>
    reportService.getLastSubmittedReport()
  );

  const handleSubmitted = (report: CivicReport) => {
    setSubmittedReport(report);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetForm = () => {
    reportService.resetLastSubmittedReport();
    setSubmittedReport(null);
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

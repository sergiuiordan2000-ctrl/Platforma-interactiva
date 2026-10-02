/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X, 
  BarChart3, 
  Users, 
  Info, 
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { surveyService, SURVEY_ADVISORY_TEXT, type SurveyResults } from '../../services/surveyService';
import { useAsync } from '../../hooks/useAsync';
import { ErrorBlock, LoadingBlock } from '../common/LoadState';
import { formatRoDateTime } from '../../utils/roTime';

interface SurveyResultsModalProps {
  /** Elementul din lista publică sau din lista Admin. */
  survey: {
    id: string;
    title: string;
    category: string | null;
    startAt: string;
    endAt: string;
    integrityFlag: boolean;
    integrityNote: string | null;
  };
  /** Admin: rezultatele se văd indiferent de vizibilitatea publică (B2 §6.4). */
  admin?: boolean;
  onClose: () => void;
}

export const SurveyResultsModal: React.FC<SurveyResultsModalProps> = ({ survey, admin = false, onClose }) => {
  // Faza 5.6: agregatele se calculează pe server (D3; procentele: T-8). Textele libere nu ajung aici.
  const results = useAsync<SurveyResults>(
    () => (admin ? surveyService.adminResults(survey.id) : surveyService.getResults(survey.id)),
    [survey.id, admin],
  );
  const report = results.data;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Antet Modal Rezultate */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                <BarChart3 className="w-3 h-3 text-purple-600" />
                Rezultate Agregate
              </span>
              {survey.category && (
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white text-slate-600 border border-slate-200">
                  {survey.category}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mt-1">
              {survey.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Închide fereastra"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corp Modal (Scrollabil) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Rezumat Participare & Perioadă */}
          <div className="bg-purple-50/40 border border-purple-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-purple-900 text-xs font-bold uppercase tracking-wider">
                <Info className="w-3.5 h-3.5 text-purple-600" />
                <span>Statut Consultare</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Perioada desfășurării: <strong>{formatRoDateTime(survey.startAt)} — {formatRoDateTime(survey.endAt)}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-purple-200 shadow-xs shrink-0">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Participări</div>
                <div className="text-base font-black text-slate-900">
                  {report ? report.totalSubmissions : 0} {report?.totalSubmissions === 1 ? 'răspuns' : 'răspunsuri'}
                </div>
              </div>
            </div>
          </div>

          {/* P-2: marcajul „rezultate posibil afectate” (public numai în arhivă; în Admin oricând) */}
          {survey.integrityFlag && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[11px] text-amber-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Rezultate posibil afectate</span>
                {survey.integrityNote && <p className="leading-relaxed">{survey.integrityNote}</p>}
              </div>
            </div>
          )}

          {/* Cazul 1: Nu există participări înregistrate */}
          {results.loading && !report ? (
            <LoadingBlock label="Se încarcă rezultatele…" />
          ) : results.error || !report ? (
            <ErrorBlock message={results.error ?? 'Rezultatele nu sunt disponibile.'} onRetry={() => void results.reload()} />
          ) : report.totalSubmissions === 0 ? (
            <div className="text-center py-12 px-4 space-y-3 bg-slate-50/60 border border-dashed border-slate-200 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Nu există încă participări înregistrate
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pentru acest sondaj nu au fost înregistrate încă opțiuni. Rezultatele vor fi calculate și afișate imediat ce primii cetățeni își vor trimite votul.
                </p>
              </div>
            </div>
          ) : (
            /* Cazul 2: Rezultate disponibile */
            <div className="space-y-6">
              
              {/* Afișare rezultate per întrebare */}
              {report.questions.map((qResult, idx) => (
                <div
                  key={qResult.questionId}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs"
                >
                  {/* Antet Întrebare */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                      <span className="text-purple-700 font-black mr-1.5">
                        #{idx + 1}.
                      </span>
                      {qResult.text}
                    </h3>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        {qResult.type === 'single_choice' && 'Alegere unică'}
                        {qResult.type === 'multiple_choice' && 'Alegere multiplă'}
                        {qResult.type === 'free_text' && 'Răspuns liber'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        ({qResult.respondents} {qResult.respondents === 1 ? 'răspuns' : 'răspunsuri'})
                      </span>
                    </div>
                  </div>

                  {/* 1. TIP: SINGLE CHOICE (Bare procentuale, suma = 100%) */}
                  {qResult.type === 'single_choice' && (
                    <div className="space-y-3 pt-1">
                      {qResult.options.map((opt) => (
                        <div key={opt.optionId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{opt.text}</span>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{opt.count} voturi</span>
                              <span className="text-purple-700 font-black min-w-[45px] text-right">
                                {opt.percentage}%
                              </span>
                            </span>
                          </div>

                          {/* Bară vizuală procentuală */}
                          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${Math.min(opt.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 2. TIP: MULTIPLE CHOICE (Bare procentuale raportate la numărul de respondenți) */}
                  {qResult.type === 'multiple_choice' && (
                    <div className="space-y-3 pt-1">
                      <div className="text-[11px] text-slate-500 italic pb-1">
                        Notă: La alegerea multiplă, procentul indică proporția de respondenți care au bifat fiecare opțiune (suma procentelor poate depăși 100%).
                      </div>

                      {qResult.options.map((opt) => (
                        <div key={opt.optionId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{opt.text}</span>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{opt.count} selecții</span>
                              <span className="text-indigo-700 font-black min-w-[45px] text-right">
                                {opt.percentage}%
                              </span>
                            </span>
                          </div>

                          {/* Bară vizuală procentuală */}
                          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
                              style={{ width: `${Math.min(opt.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. TIP: FREE TEXT (Răspunsuri text deschise - confidențialitate civică) */}
                  {qResult.type === 'free_text' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Total propuneri și opinii transmise:</span>
                        <span className="font-bold text-slate-900">
                          {qResult.freeTextCount} mesaje înregistrate
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed italic">
                        Conform principiilor de confidențialitate civică ale platformei, conținutul detaliat al mesajelor text este transmis administrației locale pentru analiză calitativă și nu este expus public în format brut, protejând datele personale potențial menționate de respondenți.
                      </p>
                    </div>
                  )}

                </div>
              ))}

              {/* N4-1: mesajul public obligatoriu */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-500 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{SURVEY_ADVISORY_TEXT}</p>
              </div>

              {/* Notă explicativă privind caracterul anonim și agregat */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-500 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-700">Date Agregate & Anonime</span>
                  <p className="leading-relaxed">
                    Statisticile prezentate reflectă exclusiv agregarea numerică a răspunsurilor colectate. Nicio dată de identificare personală nu este asociată sau stocată în cadrul platformei.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Subsol Modal */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
          >
            Închide
          </button>
        </div>

      </div>
    </div>
  );
};

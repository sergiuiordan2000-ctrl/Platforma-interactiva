/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  X, 
  BarChart3, 
  Users, 
  Calendar, 
  HelpCircle, 
  Info, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { Survey } from '../../types/survey';
import { SurveyStatisticsReport } from '../../types/surveyStatistics';
import { surveyService } from '../../services/surveyService';

interface SurveyResultsModalProps {
  survey: Survey;
  onClose: () => void;
}

export const SurveyResultsModal: React.FC<SurveyResultsModalProps> = ({ survey, onClose }) => {
  // Calcul agregat bazat pe stocarea locală MVP (Etapa 4D)
  const report: SurveyStatisticsReport | null = useMemo(() => {
    return surveyService.calculateSurveyStatistics(survey.id);
  }, [survey.id]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ro-RO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

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
                Perioada desfășurării: <strong>{formatDate(survey.period.startDate)} — {formatDate(survey.period.endDate)}</strong>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-purple-200 shadow-xs shrink-0">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Participări</div>
                <div className="text-base font-black text-slate-900">
                  {report ? report.totalSubmissions : 0} răspunsuri
                </div>
              </div>
            </div>
          </div>

          {/* Cazul 1: Nu există participări înregistrate local */}
          {(!report || report.totalSubmissions === 0) ? (
            <div className="text-center py-12 px-4 space-y-3 bg-slate-50/60 border border-dashed border-slate-200 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Nu există încă participări înregistrate
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pentru acest sondaj nu au fost înregistrate încă opțiuni în stocarea locală. Rezultatele vor fi calculate și afișate imediat ce primii cetățeni își vor trimite votul.
                </p>
              </div>
            </div>
          ) : (
            /* Cazul 2: Rezultate disponibile */
            <div className="space-y-6">
              
              {/* Afișare rezultate per întrebare */}
              {report.questionsResults.map((qResult, idx) => (
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
                      {qResult.questionText}
                    </h3>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                        {qResult.questionType === 'single_choice' && 'Alegere unică'}
                        {qResult.questionType === 'multiple_choice' && 'Alegere multiplă'}
                        {qResult.questionType === 'free_text' && 'Răspuns liber'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        ({qResult.totalAnswersCount} {qResult.totalAnswersCount === 1 ? 'răspuns' : 'răspunsuri'})
                      </span>
                    </div>
                  </div>

                  {/* 1. TIP: SINGLE CHOICE (Bare procentuale, suma = 100%) */}
                  {qResult.questionType === 'single_choice' && qResult.optionsResults && (
                    <div className="space-y-3 pt-1">
                      {qResult.optionsResults.map((opt) => (
                        <div key={opt.optionId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{opt.text}</span>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{opt.votesCount} voturi</span>
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
                  {qResult.questionType === 'multiple_choice' && qResult.optionsResults && (
                    <div className="space-y-3 pt-1">
                      <div className="text-[11px] text-slate-500 italic pb-1">
                        Notă: La alegerea multiplă, procentul indică proporția de respondenți care au bifat fiecare opțiune (suma procentelor poate depăși 100%).
                      </div>

                      {qResult.optionsResults.map((opt) => (
                        <div key={opt.optionId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{opt.text}</span>
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{opt.votesCount} selecții</span>
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
                  {qResult.questionType === 'free_text' && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Total propuneri și opinii transmise:</span>
                        <span className="font-bold text-slate-900">
                          {qResult.freeTextEntriesCount || 0} mesaje înregistrate
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed italic">
                        Conform principiilor de confidențialitate civică ale platformei, conținutul detaliat al mesajelor text este transmis administrației locale pentru analiză calitativă și nu este expus public în format brut, protejând datele personale potențial menționate de respondenți.
                      </p>
                    </div>
                  )}

                </div>
              ))}

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

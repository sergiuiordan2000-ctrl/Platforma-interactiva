/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  HelpCircle, 
  ShieldCheck, 
  Info, 
  CircleDot, 
  CheckSquare, 
  FileText 
} from 'lucide-react';
import { Survey, SurveyQuestion, SurveyAnswerOption } from '../../types/survey';
import { surveyService } from '../../services/surveyService';

interface SurveyVotingModalProps {
  survey: Survey;
  onClose: () => void;
  onVoteSuccess: (submissionId: string) => void;
}

export const SurveyVotingModal: React.FC<SurveyVotingModalProps> = ({
  survey,
  onClose,
  onVoteSuccess,
}) => {
  // Starea răspunsurilor per question.id
  // single_choice: string
  // multiple_choice: string[]
  // free_text: string
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSubmissionId, setSubmittedSubmissionId] = useState<string | null>(null);

  // Verifică din start dacă utilizatorul a participat deja
  const hasAlreadyVoted = surveyService.hasUserParticipatedLocally(survey.id);

  // Gestionare selecție single_choice (radio)
  const handleSingleChoiceSelect = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
    // Șterge eroarea dacă a fost selectată o opțiune
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Gestionare selecție multiple_choice (checkbox)
  const handleMultipleChoiceToggle = (questionId: string, optionId: string) => {
    const currentList: string[] = Array.isArray(answers[questionId]) ? answers[questionId] : [];
    let updatedList: string[];
    if (currentList.includes(optionId)) {
      updatedList = currentList.filter((id) => id !== optionId);
    } else {
      updatedList = [...currentList, optionId];
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: updatedList,
    }));

    if (errors[questionId] && updatedList.length > 0) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Gestionare introducere text liber (free_text)
  const handleFreeTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));

    if (errors[questionId] && text.trim().length > 0) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  // Trimitere formular vot
  const handleSubmitVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setGeneralError(null);
    setIsSubmitting(true);

    // 1. Verificare validitate locală prin surveyService
    const validation = surveyService.validateSubmissionAnswers(survey, answers);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setGeneralError('Vă rugăm să completați toate întrebările obligatorii marcate.');
      setIsSubmitting(false);

      // Scroll la prima întrebare cu eroare
      const firstErrorQuestionId = Object.keys(validation.errors)[0];
      if (firstErrorQuestionId) {
        const element = document.getElementById(`question-card-${firstErrorQuestionId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 2. Apel submitVote în service
    const result = surveyService.submitVote(survey.id, answers);
    if (!result.success) {
      if (result.validationErrors) {
        setErrors(result.validationErrors);
      }
      setGeneralError(result.error || 'A apărut o eroare la trimiterea răspunsurilor.');
      setIsSubmitting(false);
      return;
    }

    // 3. Succes trimitere
    setIsSubmitting(false);
    const subId = result.submissionId || 'sub-local';
    setSubmittedSubmissionId(subId);
    onVoteSuccess(subId);
  };

  // Formatare dată lizibilă
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
        
        {/* Antet Modal */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                Consultare Publică Activă
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
          
          {/* Cazul 1: Votul a fost deja înregistrat în această sesiune (Confirmare Succes) */}
          {submittedSubmissionId ? (
            <div className="text-center py-8 px-4 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xl font-black text-slate-900">
                  Răspunsurile dumneavoastră au fost înregistrate!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Vă mulțumim pentru implicarea activă în deciziile comunității din Turnu Măgurele. Părerea dumneavoastră contează.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-sm mx-auto text-xs text-slate-600 space-y-1">
                <div className="text-slate-400 font-bold uppercase text-[10px]">
                  Identificator local al participării
                </div>
                <div className="font-mono font-bold text-slate-800 text-sm">
                  {submittedSubmissionId}
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  (Marker local de confirmare generat pentru instanța de prototip MVP)
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-900/10 transition-colors"
                >
                  Închide fereastra
                </button>
              </div>
            </div>
          ) : hasAlreadyVoted ? (
            /* Cazul 2: Utilizatorul a participat deja de pe acest browser/dispozitiv */
            <div className="text-center py-8 px-4 space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <Info className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-black text-slate-900">
                  Ați participat deja la acest sondaj
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Conform markerului local de pe acest dispozitiv/browser, ați trimis deja opțiunile dumneavoastră pentru această consultare publică.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto text-[11px] text-slate-500">
                În cadrul prototipului MVP, participarea este marcată local pentru a preveni trimiterile duplicate accidentale.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  Înapoi la lista de sondaje
                </button>
              </div>
            </div>
          ) : (
            /* Cazul 3: Formularul activ de votare */
            <form onSubmit={handleSubmitVote} className="space-y-6">
              
              {/* Context & Perioadă Consultare */}
              <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 sm:p-5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-purple-800 text-xs font-bold uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5 text-purple-600" />
                  <span>Despre această consultare</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {survey.description}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-purple-100">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Perioadă: {formatDate(survey.period.startDate)} — {formatDate(survey.period.endDate)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                    <span>{survey.questions.length} întrebări</span>
                  </span>
                </div>
              </div>

              {/* Eroare Generală Formular */}
              {generalError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* Lista Întrebărilor din Sondaj */}
              <div className="space-y-5">
                {survey.questions
                  .slice()
                  .sort((a: SurveyQuestion, b: SurveyQuestion) => a.order - b.order)
                  .map((question: SurveyQuestion, idx: number) => {
                    const hasError = !!errors[question.id];

                    return (
                      <div
                        key={question.id}
                        id={`question-card-${question.id}`}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          hasError 
                            ? 'bg-red-50/30 border-red-300 ring-2 ring-red-200' 
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        {/* Enunț Întrebare + Indicator Obligatoriu */}
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              <span className="text-purple-700 font-black mr-1.5">
                                #{idx + 1}.
                              </span>
                              {question.text}
                              {question.isRequired && (
                                <span className="text-red-500 ml-1 font-bold" title="Răspuns obligatoriu">*</span>
                              )}
                            </h3>

                            {/* Badge Tip */}
                            <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                              {question.type === 'single_choice' && 'Alegere unică'}
                              {question.type === 'multiple_choice' && 'Alegere multiplă'}
                              {question.type === 'free_text' && 'Răspuns liber'}
                            </span>
                          </div>

                          {/* Text ajutător opțional */}
                          {question.helpText && (
                            <p className="text-[11px] text-slate-500 italic">
                              {question.helpText}
                            </p>
                          )}
                        </div>

                        {/* Răspunsuri în funcție de tip */}
                        <div className="pt-3">
                          
                          {/* 1. TIP: SINGLE CHOICE (Radio) */}
                          {question.type === 'single_choice' && (
                            <div className="space-y-2">
                              {question.options
                                ?.slice()
                                .sort((a: SurveyAnswerOption, b: SurveyAnswerOption) => a.order - b.order)
                                .map((opt: SurveyAnswerOption) => {
                                  const isSelected = answers[question.id] === opt.id;

                                  return (
                                    <label
                                      key={opt.id}
                                      onClick={() => handleSingleChoiceSelect(question.id, opt.id)}
                                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                        isSelected
                                          ? 'bg-purple-50/70 border-purple-500 text-purple-950 font-bold shadow-xs'
                                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected 
                                          ? 'border-purple-600 bg-purple-600' 
                                          : 'border-slate-300 bg-white'
                                      }`}>
                                        {isSelected && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                        )}
                                      </div>
                                      <span className="flex-1">{opt.text}</span>
                                    </label>
                                  );
                                })}
                            </div>
                          )}

                          {/* 2. TIP: MULTIPLE CHOICE (Checkbox) */}
                          {question.type === 'multiple_choice' && (
                            <div className="space-y-2">
                              {question.options
                                ?.slice()
                                .sort((a: SurveyAnswerOption, b: SurveyAnswerOption) => a.order - b.order)
                                .map((opt: SurveyAnswerOption) => {
                                  const currentSelected: string[] = Array.isArray(answers[question.id]) 
                                    ? answers[question.id] 
                                    : [];
                                  const isChecked = currentSelected.includes(opt.id);

                                  return (
                                    <label
                                      key={opt.id}
                                      onClick={() => handleMultipleChoiceToggle(question.id, opt.id)}
                                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                                        isChecked
                                          ? 'bg-purple-50/70 border-purple-500 text-purple-950 font-bold shadow-xs'
                                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                        isChecked 
                                          ? 'border-purple-600 bg-purple-600 text-white' 
                                          : 'border-slate-300 bg-white'
                                      }`}>
                                        {isChecked && (
                                          <CheckSquare className="w-3.5 h-3.5" />
                                        )}
                                      </div>
                                      <span className="flex-1">{opt.text}</span>
                                    </label>
                                  );
                                })}
                            </div>
                          )}

                          {/* 3. TIP: FREE TEXT (Textarea) */}
                          {question.type === 'free_text' && (
                            <div className="space-y-1">
                              <textarea
                                rows={3}
                                value={answers[question.id] || ''}
                                onChange={(e) => handleFreeTextChange(question.id, e.target.value)}
                                placeholder="Scrieți răspunsul sau propunerea dumneavoastră aici..."
                                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white outline-none resize-none placeholder:text-slate-400"
                              />
                              <p className="text-[10px] text-slate-400">
                                Notă: Vă rugăm să nu includeți date cu caracter personal în câmpul de răspuns liber.
                              </p>
                            </div>
                          )}

                          {/* Mesaj de Eroare Individual pe Întrebare */}
                          {hasError && (
                            <div className="mt-2 text-[11px] font-bold text-red-600 flex items-center gap-1.5 animate-in fade-in">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{errors[question.id]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Bară Notă Confidențialitate */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-500 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-700">Participare Anonimă & Securizată</span>
                  <p className="leading-relaxed">
                    Platforma Turnu Măgurele Civic nu solicită nume, CNP, adresă sau alte date de identificare personală pentru participarea la consultările publice locale.
                  </p>
                </div>
              </div>

              {/* Butoane Acțiune Formular (Include protecție la bottom navigation) */}
              <div className="pt-2 pb-6 sm:pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors order-2 sm:order-1"
                >
                  Anulează
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md shadow-purple-900/10 inline-flex items-center justify-center gap-2 transition-all order-1 sm:order-2 ${
                    isSubmitting 
                      ? 'bg-purple-400 cursor-not-allowed' 
                      : 'bg-purple-700 hover:bg-purple-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Se trimite votul...' : 'Trimite Răspunsurile'}</span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};

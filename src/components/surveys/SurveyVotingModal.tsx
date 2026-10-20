/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  X, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  HelpCircle, 
  ShieldCheck, 
  Info, 
  CheckSquare
} from 'lucide-react';
import {
  surveyService,
  SURVEY_ADVISORY_TEXT,
  SURVEY_LIMITS,
  type PublicSurveyDetail,
  type PublicSurveyQuestion,
  type PublicSurveySummary,
  type SurveyAnswers,
} from '../../services/surveyService';
import { ErrorBlock, LoadingBlock } from '../common/LoadState';
import { formatRoDateTime } from '../../utils/roTime';
import { userMessage } from '../../services/apiClient';

interface SurveyVotingModalProps {
  survey: PublicSurveySummary;
  onClose: () => void;
  onVoteSuccess: () => void;
  /** Sondajul s-a închis între timp (403): lista se reîncarcă. */
  onStateChanged?: () => void;
}

export const SurveyVotingModal: React.FC<SurveyVotingModalProps> = ({
  survey,
  onClose,
  onVoteSuccess,
  onStateChanged,
}) => {
  // Starea răspunsurilor per question.id
  // single_choice: string
  // multiple_choice: string[]
  // free_text: string
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hp, setHp] = useState(''); // capcana anti-robot (B7): câmp invizibil, rămâne gol

  // Faza 5.6: structura și jetonul formularului vin de la server (care emite și cookie-ul de participare)
  const [detail, setDetail] = useState<PublicSurveyDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const formLoadedAt = useRef(0);

  const loadDetail = useCallback(async () => {
    setLoadError(null);
    try {
      const d = await surveyService.getDetail(survey.id);
      formLoadedAt.current = Date.now();
      setDetail(d);
    } catch (err) {
      setLoadError(userMessage(err, 'Sondajul nu a putut fi încărcat.'));
    }
  }, [survey.id]);

  // „Ai participat deja”: indiciu de interfață (N4-12); unicitatea reală o asigură serverul (409)
  const [alreadyVoted, setAlreadyVoted] = useState(() => surveyService.hasParticipationHint(survey.id));
  // 403: consultarea s-a închis între timp
  const [closedNotice, setClosedNotice] = useState(false);

  useEffect(() => {
    if (!alreadyVoted) void loadDetail();
  }, [alreadyVoted, loadDetail]);

  const questions: PublicSurveyQuestion[] = detail?.questions ?? [];
  const isClosed = closedNotice || (detail !== null && detail.state !== 'open');

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
    const stored = answers[questionId];
    const currentList: string[] = Array.isArray(stored) ? stored : [];
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

  const scrollToFirstError = (errs: Record<string, string>) => {
    const firstErrorQuestionId = Object.keys(errs)[0];
    if (firstErrorQuestionId) {
      const element = document.getElementById(`question-card-${firstErrorQuestionId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Trimitere formular vot
  const handleSubmitVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !detail) return;

    setGeneralError(null);

    // 1. Verificare în browser (serverul verifică din nou)
    const validation = surveyService.validateAnswers(questions, answers);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setGeneralError('Vă rugăm să completați toate întrebările obligatorii marcate.');
      scrollToFirstError(validation.errors);
      return;
    }

    // 2. Trimiterea către server
    setIsSubmitting(true);
    const result = await surveyService.submitVote(detail, answers, hp, formLoadedAt.current);
    setIsSubmitting(false);

    if (result.success) {
      setSubmitted(true);
      onVoteSuccess();
      return;
    }

    // 409: serverul are deja un vot de la acest browser
    if (result.status === 409) {
      setAlreadyVoted(true);
      return;
    }
    // 403: consultarea s-a închis
    if (result.status === 403) {
      setClosedNotice(true);
      onStateChanged?.();
      return;
    }
    // 422 cu câmpuri: răspunsuri incomplete sau invalide
    if (result.status === 422 && result.fields) {
      const fieldErrors = surveyService.fieldMessages(questions, result.fields);
      setErrors(fieldErrors);
      setGeneralError('Vă rugăm să corectați răspunsurile marcate înainte de a trimite.');
      scrollToFirstError(fieldErrors);
      return;
    }
    // 429: prea multe voturi din aceeași rețea
    if (result.status === 429) {
      setGeneralError('Prea multe voturi trimise din această rețea în ultima oră. Vă rugăm să reveniți mai târziu.');
      return;
    }
    // 422 fără câmpuri (formular expirat) sau 400 (cookie de participare lipsă, verificare anti-robot):
    // formularul se reînnoiește în fundal, iar răspunsurile completate rămân
    if (result.status === 422 || result.status === 400) {
      void loadDetail();
      setGeneralError(
        result.code === 'POW_INVALID'
          ? result.error
          : 'Votul nu a putut fi înregistrat. Formularul a fost reîmprospătat; vă rugăm să trimiteți din nou.',
      );
      return;
    }
    setGeneralError(result.error || 'A apărut o eroare la trimiterea răspunsurilor.');
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
          {submitted ? (
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
          ) : alreadyVoted ? (
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
                  De pe acest dispozitiv/browser au fost trimise deja opțiunile pentru această consultare publică. Un vot înregistrat nu poate fi modificat.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto text-[11px] text-slate-500">
                {SURVEY_ADVISORY_TEXT}
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
          ) : isClosed ? (
            /* Cazul 3: Consultarea nu (mai) este deschisă pentru vot (403) */
            <div className="text-center py-8 px-4 space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                <Info className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-black text-slate-900">
                  Consultarea nu este deschisă pentru vot
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Perioada de consultare pentru acest sondaj s-a încheiat. Rezultatele finale se găsesc în arhiva consultărilor încheiate.
                </p>
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
          ) : loadError && !detail ? (
            <ErrorBlock message={loadError} onRetry={() => void loadDetail()} />
          ) : !detail ? (
            <LoadingBlock label="Se încarcă sondajul…" />
          ) : (
            /* Cazul 4: Formularul activ de votare */
            <form onSubmit={handleSubmitVote} className="space-y-6" noValidate>

              {/* capcana anti-robot (B7): invizibilă pentru oameni și pentru cititoarele de ecran */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <label>
                  Site web
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
                </label>
              </div>
              
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
                    <span>Perioadă: {formatRoDateTime(survey.startAt)} — {formatRoDateTime(survey.endAt)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                    <span>{questions.length} întrebări</span>
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
                {questions
                  .slice()
                  .sort((a, b) => a.ordinal - b.ordinal)
                  .map((question, idx) => {
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
                                .slice()
                                .sort((a, b) => a.ordinal - b.ordinal)
                                .map((opt) => {
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
                                .slice()
                                .sort((a, b) => a.ordinal - b.ordinal)
                                .map((opt) => {
                                  const storedList = answers[question.id];
                                  const currentSelected: string[] = Array.isArray(storedList) ? storedList : [];
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
                                value={typeof answers[question.id] === 'string' ? (answers[question.id] as string) : ''}
                                maxLength={SURVEY_LIMITS.freeText}
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

              {/* N4-1: mesajul public obligatoriu */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-500 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{SURVEY_ADVISORY_TEXT}</p>
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

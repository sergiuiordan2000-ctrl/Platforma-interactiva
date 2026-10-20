/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Vote,
  Calendar,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Info,
  AlertTriangle,
  Archive,
  BarChart3
} from 'lucide-react';
import { surveyService, SURVEY_ADVISORY_TEXT, type PublicSurveySummary } from '../../services/surveyService';
import { useAsync } from '../../hooks/useAsync';
import { ErrorBlock, LoadingBlock } from '../common/LoadState';
import { formatRoDateTime } from '../../utils/roTime';
import { SurveyVotingModal } from './SurveyVotingModal';
import { SurveyResultsModal } from './SurveyResultsModal';
import { userMessage } from '../../services/apiClient';

interface PublicSurveysListProps {
  onSurveyVoted?: (surveyId: string) => void;
}

export const PublicSurveysList: React.FC<PublicSurveysListProps> = ({ onSurveyVoted }) => {
  // Faza 5.6: consultările deschise și arhiva vin de la server (starea se calculează acolo, E-3)
  const open = useAsync(() => surveyService.listOpen(), []);
  const archive = useAsync(() => surveyService.listArchive(), []);
  const activeSurveys: PublicSurveySummary[] = open.data ?? [];

  // Paginile următoare ale arhivei (D3), încărcate la cerere
  const [archiveMore, setArchiveMore] = useState<{ items: PublicSurveySummary[]; nextCursor: string | null } | null>(null);
  const [archiveMoreLoading, setArchiveMoreLoading] = useState(false);
  const [archiveMoreError, setArchiveMoreError] = useState<string | null>(null);
  const closedSurveys: PublicSurveySummary[] = [...(archive.data?.items ?? []), ...(archiveMore?.items ?? [])];
  const archiveNextCursor = archiveMore ? archiveMore.nextCursor : (archive.data?.nextCursor ?? null);

  const [selectedSurvey, setSelectedSurvey] = useState<PublicSurveySummary | null>(null);
  const [resultsSurvey, setResultsSurvey] = useState<PublicSurveySummary | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  // Redesenare după vot (indiciul „Ai participat deja” se citește la randare)
  const [, setVoteTick] = useState(0);

  const reloadAll = () => {
    setArchiveMore(null);
    setArchiveMoreError(null);
    void open.reload();
    void archive.reload();
  };

  const handleVoteSuccess = () => {
    setVoteTick((n) => n + 1);
    if (selectedSurvey && onSurveyVoted) {
      onSurveyVoted(selectedSurvey.id);
    }
    setSuccessToast('Votul dumneavoastră a fost înregistrat cu succes!');
    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  const handleLoadMoreArchive = async () => {
    if (!archiveNextCursor || archiveMoreLoading) return;
    setArchiveMoreLoading(true);
    setArchiveMoreError(null);
    try {
      const page = await surveyService.listArchive(archiveNextCursor);
      setArchiveMore((prev) => ({ items: [...(prev?.items ?? []), ...page.items], nextCursor: page.nextCursor }));
    } catch (err) {
      setArchiveMoreError(userMessage(err, 'Arhiva nu a putut fi încărcată.'));
    } finally {
      setArchiveMoreLoading(false);
    }
  };

  // D3: nota despre rezultate rămâne adevărată numai dacă nicio consultare deschisă nu are rezultate în timp real
  const noLiveResults = activeSurveys.every((s) => !s.resultsAvailable);

  return (
    <div className="space-y-6">

      {/* Toast Notificare Succes Vot */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900"
          >
            Închide
          </button>
        </div>
      )}

      {/* Antet Secțiune Publică */}
      <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-purple-950/20">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-2xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-purple-200 backdrop-blur-xs border border-white/10">
            <Vote className="w-3.5 h-3.5 text-purple-300" />
            <span>Consultare Publică Activă • Turnu Măgurele</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Vocea ta contează în dezvoltarea orașului
          </h1>

          <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed pt-1">
            Participă la consultările publice deschise și contribuie la stabilirea priorităților locale pentru parcuri, infrastructură și viața comunitară.
          </p>
        </div>
      </div>

      {/* N4-1: mesajul public obligatoriu (textul aprobat la 01.10.2026, P-3) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-500 flex items-start gap-2.5" data-testid="survey-advisory">
        <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">{SURVEY_ADVISORY_TEXT}</p>
      </div>

      {/* Lista Sondajelor Active */}
      {open.loading && open.data === undefined ? (
        <LoadingBlock label="Se încarcă consultările…" />
      ) : open.error ? (
        <ErrorBlock message={open.error} onRetry={reloadAll} />
      ) : activeSurveys.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Vote className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              Nu există consultări deschise în acest moment
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              În prezent nu există sondaje active deschise participării cetățenești. Vă rugăm să reveniți curând pentru noi consultări ale comunității.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4" data-testid="surveys-open-list">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Consultări deschise participării ({activeSurveys.length})</span>
            </div>
            {noLiveResults && (
              <span className="text-[11px] text-slate-400">
                Rezultatele vor fi disponibile la finalizarea fiecărei consultări
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {activeSurveys.map((survey) => {
              const alreadyVoted = surveyService.hasParticipationHint(survey.id);

              return (
                <div
                  key={survey.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    {/* Badge-uri Superioare */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        Deschis Consultării
                      </span>

                      {alreadyVoted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Ai participat deja
                        </span>
                      )}

                      {survey.category && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                          {survey.category}
                        </span>
                      )}

                      {survey.isDemo && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                          DEMO
                        </span>
                      )}
                    </div>

                    {/* Titlu & Descriere */}
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                        {survey.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">
                        {survey.description}
                      </p>
                    </div>
                  </div>

                  {/* Informații Calendar & Acțiune Vot */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        <span>Valabil până la: <strong>{formatRoDateTime(survey.endAt)}</strong></span>
                      </span>

                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                        <span>{survey.questionCount} {survey.questionCount === 1 ? 'întrebare' : 'întrebări'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* D3: butonul apare numai când rezultatele sunt publice acum */}
                      {survey.resultsAvailable && (
                        <button
                          type="button"
                          onClick={() => setResultsSurvey(survey)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-xs"
                          title="Vezi rezultatele curente agregate"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                          <span>Rezultate</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedSurvey(survey)}
                        className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                          alreadyVoted
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-900/10 hover:shadow-md'
                        }`}
                      >
                        <span>{alreadyVoted ? 'Vezi detalii' : 'Participă'}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Arhiva consultărilor încheiate (D3): rezultatele finale; răspunsurile libere nu sunt publice */}
      {!open.error && (archive.error ? (
        <ErrorBlock message={archive.error} onRetry={reloadAll} />
      ) : closedSurveys.length > 0 && (
        <div className="space-y-4" data-testid="surveys-archive">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              <span>Arhiva consultărilor încheiate</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Rezultatele finale ale consultărilor închise
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {closedSurveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      Consultare Încheiată
                    </span>

                    {/* P-2: marcajul de integritate se afișează public numai în arhivă */}
                    {survey.integrityFlag && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Rezultate posibil afectate
                      </span>
                    )}

                    {survey.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                        {survey.category}
                      </span>
                    )}

                    {survey.isDemo && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                        DEMO
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {survey.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">
                      {survey.description}
                    </p>
                  </div>

                  {survey.integrityFlag && survey.integrityNote && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
                      {survey.integrityNote}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>Închis la: <strong>{formatRoDateTime(survey.endAt)}</strong></span>
                    </span>

                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                      <span>{survey.questionCount} {survey.questionCount === 1 ? 'întrebare' : 'întrebări'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setResultsSurvey(survey)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-xs"
                      title="Vezi rezultatele finale agregate"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Rezultate</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {archiveMoreError && (
            <p role="alert" className="text-center text-xs text-rose-600">{archiveMoreError}</p>
          )}

          {archiveNextCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLoadMoreArchive}
                disabled={archiveMoreLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all"
              >
                {archiveMoreLoading ? 'Se încarcă…' : 'Încarcă mai multe'}
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Modal Formular Vot */}
      {selectedSurvey && (
        <SurveyVotingModal
          survey={selectedSurvey}
          onClose={() => setSelectedSurvey(null)}
          onVoteSuccess={handleVoteSuccess}
          onStateChanged={reloadAll}
        />
      )}

      {/* Modal Rezultate Agregate (D3) */}
      {resultsSurvey && (
        <SurveyResultsModal
          survey={resultsSurvey}
          onClose={() => setResultsSurvey(null)}
        />
      )}

    </div>
  );
};

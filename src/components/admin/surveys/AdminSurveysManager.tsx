/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Vote, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Play, 
  Square, 
  Calendar, 
  Clock, 
  Search, 
  X, 
  HelpCircle,
  AlertTriangle,
  Users,
  BarChart3
} from 'lucide-react';
import {
  surveyService,
  SURVEY_LIMITS,
  type AdminSurvey,
  type AdminSurveyFreeText,
  type SurveyStatus,
} from '../../../services/surveyService';
import { SurveyFormModal } from './SurveyFormModal';
import { SurveyResultsModal } from '../../surveys/SurveyResultsModal';
import { AdminUser } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';
import { useAsync } from '../../../hooks/useAsync';
import { ErrorBlock, LoadingBlock } from '../../common/LoadState';
import { formatRoDate, formatRoDateTime } from '../../../utils/roTime';

interface AdminSurveysManagerProps {
  onSuccess: (message: string) => void;
  currentUser: AdminUser | null;
}

type SurveyStatusFilter = 'all' | SurveyStatus;

/** Starea afișată: un sondaj `active` cu perioada încheiată este deja închis (E-3). */
const displayStatus = (s: AdminSurvey): SurveyStatus =>
  s.effectiveState === 'closed' ? 'closed' : s.effectiveState === 'draft' ? 'draft' : 'active';

const TYPE_LABELS = { single_choice: 'alegere unică', multiple_choice: 'alegere multiplă', free_text: 'răspuns liber' } as const;

export const AdminSurveysManager: React.FC<AdminSurveysManagerProps> = ({ onSuccess, currentUser }) => {
  // Etapa 5D: permisiuni granulare pentru administrarea sondajelor. Rolul `primarie_operator`
  // are doar `surveys.view` — poate consulta, dar nu poate crea/edita/activa/închide/șterge.
  // Ștergerea nu are o permisiune dedicată în matrice; este tratată ca acțiune de modificare
  // (create sau edit sunt suficiente). Serverul verifică din nou fiecare permisiune (B4).
  const canCreate = permissionService.hasPermission(currentUser?.role, 'surveys.create');
  const canEdit = permissionService.hasPermission(currentUser?.role, 'surveys.edit');
  const canActivate = permissionService.hasPermission(currentUser?.role, 'surveys.activate');
  const canClose = permissionService.hasPermission(currentUser?.role, 'surveys.close');
  const canManageData = permissionService.hasAnyPermission(currentUser?.role, ['surveys.create', 'surveys.edit']);

  // Faza 5.6: lista vine de la server; reîncărcare explicită după fiecare mutație (B2 §7). D4: fără „Reset Demo”.
  const list = useAsync(() => surveyService.adminList(), []);
  const surveys: AdminSurvey[] = list.data ?? [];
  const [statusFilter, setStatusFilter] = useState<SurveyStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Stare Modale & Acțiuni
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<AdminSurvey | null>(null);
  const [inspectingSurvey, setInspectingSurvey] = useState<AdminSurvey | null>(null);
  const [resultsModalSurvey, setResultsModalSurvey] = useState<AdminSurvey | null>(null);

  // Inspectare: marcajul de integritate (N4-10) și textele libere (N4-9)
  const [integrityFlag, setIntegrityFlag] = useState(false);
  const [integrityNote, setIntegrityNote] = useState('');
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [freeTexts, setFreeTexts] = useState<AdminSurveyFreeText[] | null>(null);

  // Stare Dialog Confirmare Ștergere
  const [surveyToDelete, setSurveyToDelete] = useState<AdminSurvey | null>(null);

  const refreshSurveys = () => {
    void list.reload();
  };

  const errorMessage = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

  // Filtrare sondaje
  const filteredSurveys = surveys.filter((s) => {
    if (statusFilter !== 'all' && displayStatus(s) !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchDesc = s.description.toLowerCase().includes(q);
      const matchCat = s.category?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  // Deschidere modal creare
  const handleOpenCreate = () => {
    if (!canCreate) return;
    setEditingSurvey(null);
    setIsFormOpen(true);
  };

  // Deschidere modal editare
  const handleOpenEdit = (survey: AdminSurvey) => {
    if (!canEdit) return;
    setEditingSurvey(survey);
    setIsFormOpen(true);
  };

  // Callback salvare din modal
  const handleSaved = (saved: AdminSurvey, isNew: boolean) => {
    setIsFormOpen(false);
    setEditingSurvey(null);
    refreshSurveys();
    onSuccess(
      isNew 
        ? `Sondajul „${saved.title}” a fost creat cu succes!` 
        : `Sondajul „${saved.title}” a fost actualizat!`
    );
  };

  // Activare / închidere (B2 §6.4: PATCH /status; P-1: închis = definitiv)
  const changeStatus = async (survey: AdminSurvey, status: SurveyStatus, success: string, fallback: string) => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await surveyService.adminSetStatus(survey.id, status);
      onSuccess(success);
    } catch (err) {
      setActionError(errorMessage(err, fallback));
    } finally {
      setBusy(false);
      refreshSurveys();
    }
  };

  const handleActivate = (survey: AdminSurvey) => {
    if (!canActivate) return;
    void changeStatus(survey, 'active', `Sondajul „${survey.title}” a fost activat pentru consultare publică!`, 'Eroare la activare.');
  };

  const handleCloseSurvey = (survey: AdminSurvey) => {
    if (!canClose) return;
    void changeStatus(survey, 'closed', `Sondajul „${survey.title}” a fost închis și arhivat.`, 'Eroare la închiderea sondajului.');
  };

  // Ștergere sondaj confirmată (409 dacă are voturi: se poate numai închide)
  const handleConfirmDelete = async () => {
    if (!canManageData || !surveyToDelete || busy) return;
    const deletedId = surveyToDelete.id;
    const deletedTitle = surveyToDelete.title;
    setBusy(true);
    setActionError(null);
    try {
      await surveyService.adminDelete(deletedId);
      onSuccess(`Sondajul „${deletedTitle}” a fost șters definitiv.`);
    } catch (err) {
      setActionError(errorMessage(err, 'Eroare la ștergerea sondajului.'));
    } finally {
      setBusy(false);
      setSurveyToDelete(null);
      refreshSurveys();
    }
  };

  // Inspectare
  const openInspect = (survey: AdminSurvey) => {
    setInspectingSurvey(survey);
    setIntegrityFlag(survey.integrityFlag);
    setIntegrityNote(survey.integrityNote ?? '');
    setInspectError(null);
    setFreeTexts(null);
  };

  const closeInspect = () => {
    setInspectingSurvey(null);
    setFreeTexts(null);
    setInspectError(null);
  };

  const applyInspected = (updated: AdminSurvey) => {
    setInspectingSurvey(updated);
    setIntegrityFlag(updated.integrityFlag);
    setIntegrityNote(updated.integrityNote ?? '');
    refreshSurveys();
  };

  // Marcajul „rezultate posibil afectate” (N4-10; public numai în arhivă, P-2)
  const handleSaveIntegrity = async (survey: AdminSurvey) => {
    if (!canEdit || busy) return;
    setBusy(true);
    setInspectError(null);
    try {
      applyInspected(await surveyService.adminSetIntegrity(survey.id, integrityFlag, integrityFlag ? integrityNote.trim() || null : null));
      onSuccess('Marcajul de integritate a fost salvat.');
    } catch (err) {
      setInspectError(errorMessage(err, 'Marcajul nu a putut fi salvat.'));
    } finally {
      setBusy(false);
    }
  };

  // Textele libere (N4-9): numai după închidere; fiecare citire se înregistrează în audit
  const handleLoadFreeTexts = async (survey: AdminSurvey) => {
    if (!canEdit || busy) return;
    setBusy(true);
    setInspectError(null);
    try {
      setFreeTexts(await surveyService.adminFreeText(survey.id));
    } catch (err) {
      setInspectError(errorMessage(err, 'Răspunsurile libere nu au putut fi încărcate.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Acțiune refuzată de server (permisiune, 409): nu se afișează succes */}
      {actionError && (
        <div role="alert" className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900 font-bold">×</button>
        </div>
      )}
      
      {/* 1. Bară Acțiuni Superioare & Statistică Modul */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider">
            <Vote className="w-4 h-4" />
            <span>Gestiune Sondaje & Consultări • Etapa 4B</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            Administrare Sondaje Cetățenești ({surveys.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Creați, editați, validați și gestionați ciclul de viață al consultărilor publice locale.
          </p>
        </div>

        {/* Etapa 5D: butoane administrative vizibile doar cu permisiunile corespunzătoare */}
        <div className="flex items-center gap-2.5 shrink-0">
          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-900/10 inline-flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Sondaj Nou</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filtre & Căutare */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Butoane Filtrare Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toate ({surveys.length})
          </button>

          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === 'draft'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Draft ({surveys.filter((s) => displayStatus(s) === 'draft').length})
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active ({surveys.filter((s) => displayStatus(s) === 'active').length})
          </button>

          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === 'closed'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Închise ({surveys.filter((s) => displayStatus(s) === 'closed').length})
          </button>
        </div>

        {/* Input Căutare */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Căutare după titlu sau categorie..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      {/* 3. Lista de Sondaje */}
      {list.loading && list.data === undefined ? (
        <LoadingBlock label="Se încarcă sondajele…" />
      ) : list.error ? (
        <ErrorBlock message={list.error} onRetry={refreshSurveys} />
      ) : filteredSurveys.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Vote className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-800">
            Niciun sondaj găsit
          </div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Nu există sondaje care să corespundă filtrelor selectate.'
              : 'Nu există încă niciun sondaj înregistrat. Apăsați pe „Sondaj Nou” pentru a crea prima consultare.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-purple-700 hover:underline"
            >
              Resetează filtrele
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSurveys.map((survey) => {
            const shownStatus = displayStatus(survey);

            return (
              <div
                key={survey.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Informații Principale Sondaj */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Status */}
                    {shownStatus === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        Activ
                      </span>
                    )}
                    {shownStatus === 'draft' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Draft (Ciornă)
                      </span>
                    )}
                    {shownStatus === 'closed' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <Square className="w-3 h-3 text-slate-500" />
                        Închis / Finalizat
                      </span>
                    )}

                    {/* Badge Categorie */}
                    {survey.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                        {survey.category}
                      </span>
                    )}

                    {/* Badge Demo */}
                    {survey.isDemo && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase">
                        DEMO
                      </span>
                    )}

                    {/* Marcajul de integritate (N4-10): în Admin se vede oricând */}
                    {survey.integrityFlag && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Rezultate posibil afectate
                      </span>
                    )}

                    {/* Stare Temporală (calculată pe server, E-3) */}
                    <span className="text-[11px] text-slate-500">
                      {survey.effectiveState === 'open' && '• În desfășurare'}
                      {survey.effectiveState === 'upcoming' && '• Urmează să înceapă'}
                      {survey.status === 'active' && survey.effectiveState === 'closed' && '• Perioadă expirată'}
                    </span>
                  </div>

                  {/* Titlu & Descriere */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 hover:text-purple-700 transition-colors">
                      {survey.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {survey.description}
                    </p>
                  </div>

                  {/* Detalii Perioadă, Număr Întrebări & Dată Modificare */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatRoDateTime(survey.startAt)} — {formatRoDateTime(survey.endAt)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">{survey.questions.length} {survey.questions.length === 1 ? 'întrebare' : 'întrebări'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">{survey.submissionsCount} {survey.submissionsCount === 1 ? 'vot' : 'voturi'}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Modificat: {formatRoDate(survey.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Butoane Acțiuni Administrative */}
                <div className="flex flex-wrap md:flex-col lg:flex-row items-center gap-1.5 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                  {/* Rezultate Agregate (Etapa 4D) */}
                  <button
                    onClick={() => setResultsModalSurvey(survey)}
                    className="p-2 rounded-xl text-purple-700 hover:bg-purple-50 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    title="Vezi rezultatele și statisticile colectate"
                  >
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span>Rezultate</span>
                  </button>

                  {/* Inspectare */}
                  <button
                    onClick={() => openInspect(survey)}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    title="Inspectează detaliile și întrebările"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span className="hidden sm:inline">Inspectează</span>
                  </button>

                  {/* Editare — Etapa 5D: doar cu `surveys.edit`; un sondaj închis nu se mai modifică (P-1) */}
                  {canEdit && shownStatus !== 'closed' && (
                    <button
                      onClick={() => handleOpenEdit(survey)}
                      className="p-2 rounded-xl text-blue-700 hover:bg-blue-50 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      title="Editează sondajul"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Editează</span>
                    </button>
                  )}

                  {/* Activare (numai din ciornă; închis = definitiv, P-1) — Etapa 5D: doar cu `surveys.activate` */}
                  {canActivate && shownStatus === 'draft' && (
                    <button
                      onClick={() => handleActivate(survey)}
                      className="p-2 rounded-xl text-emerald-700 hover:bg-emerald-50 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      title="Activează sondajul pentru consultare"
                    >
                      <Play className="w-4 h-4" />
                      <span>Activează</span>
                    </button>
                  )}

                  {/* Închidere (pentru active) — Etapa 5D: doar cu `surveys.close` */}
                  {canClose && shownStatus === 'active' && (
                    <button
                      onClick={() => handleCloseSurvey(survey)}
                      className="p-2 rounded-xl text-amber-700 hover:bg-amber-50 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      title="Închide sondajul"
                    >
                      <Square className="w-4 h-4" />
                      <span>Închide</span>
                    </button>
                  )}

                  {/* Ștergere — Etapa 5D: doar cu permisiune de creare/editare */}
                  {canManageData && (
                    <button
                      onClick={() => setSurveyToDelete(survey)}
                      className="p-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      title="Șterge sondajul"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Modal Formular Creare / Editare */}
      {isFormOpen && (
        <SurveyFormModal
          initialSurvey={editingSurvey}
          canActivate={canActivate}
          canClose={canClose}
          onClose={() => {
            setIsFormOpen(false);
            setEditingSurvey(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {/* 5. Modal Inspectare Detaliată Sondaj */}
      {inspectingSurvey && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                  Inspectare Structură
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {inspectingSurvey.title}
                </h3>
              </div>
              <button
                onClick={closeInspect}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descriere</div>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">{inspectingSurvey.description}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-slate-800">
                    {displayStatus(inspectingSurvey) === 'draft' && 'Ciornă'}
                    {displayStatus(inspectingSurvey) === 'active' && (inspectingSurvey.effectiveState === 'upcoming' ? 'Activ (urmează să înceapă)' : 'Activ')}
                    {displayStatus(inspectingSurvey) === 'closed' && 'Închis'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Început</span>
                  <span className="font-medium text-slate-800">{formatRoDateTime(inspectingSurvey.startAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sfârșit</span>
                  <span className="font-medium text-slate-800">{formatRoDateTime(inspectingSurvey.endAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Voturi</span>
                  <span className="font-medium text-slate-800">{inspectingSurvey.submissionsCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Rezultate publice</span>
                  <span className="font-medium text-slate-800">
                    {inspectingSurvey.resultsVisibility === 'live' ? 'În timp real' : 'După închidere'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Creat La</span>
                  <span className="font-medium text-slate-800">{formatRoDate(inspectingSurvey.createdAt)}</span>
                </div>
              </div>

              {inspectError && (
                <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold">
                  {inspectError}
                </div>
              )}

              {/* Protecție și integritate (N4-5, N4-10): numai cu `surveys.edit` */}
              {canEdit && (
                <div className="space-y-3 p-3.5 rounded-2xl border border-slate-200 bg-white" data-testid="survey-protection">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">Protecție și integritate</div>

                  {/* D-B3 (13.10.2026): ALTCHA este obligatoriu la vot în orice sondaj; nu se mai pornește / oprește */}
                  <div className="flex items-start gap-2 text-xs font-semibold text-slate-700" data-testid="survey-pow-required">
                    <span aria-hidden="true" className="mt-0.5">✓</span>
                    <span>
                      Verificare anti-robot la vot (ALTCHA): obligatorie
                      <span className="block text-[11px] font-normal text-slate-500">
                        Se aplică la toate sondajele; votul durează câteva secunde în plus.
                      </span>
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={integrityFlag}
                        disabled={busy}
                        onChange={(e) => setIntegrityFlag(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                      />
                      <span>
                        Marcaj „Rezultate posibil afectate”
                        <span className="block text-[11px] font-normal text-slate-500">
                          Voturile nu se șterg manual. Marcajul și nota apar public numai în arhivă, după închiderea sondajului.
                        </span>
                      </span>
                    </label>

                    {integrityFlag && (
                      <textarea
                        rows={2}
                        value={integrityNote}
                        onChange={(e) => setIntegrityNote(e.target.value)}
                        maxLength={SURVEY_LIMITS.integrityNote}
                        placeholder="Notă publică (opțional): ce s-a observat și de ce rezultatele pot fi afectate."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                      />
                    )}

                    <button
                      type="button"
                      disabled={busy || (integrityFlag === inspectingSurvey.integrityFlag && (integrityNote.trim() || null) === (inspectingSurvey.integrityNote ?? null))}
                      onClick={() => void handleSaveIntegrity(inspectingSurvey)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                    >
                      Salvează marcajul
                    </button>
                  </div>
                </div>
              )}

              {/* Lista Întrebărilor */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Întrebări ({inspectingSurvey.questions.length})</span>
                  <span className="text-slate-500 font-normal text-[11px]">Rezultatele sunt disponibile în fereastra dedicată „Rezultate”</span>
                </div>

                <div className="space-y-3">
                  {inspectingSurvey.questions.map((q, idx) => {
                    const texts = freeTexts?.find((f) => f.questionId === q.id);
                    return (
                    <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          #{idx + 1}. {q.text}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {TYPE_LABELS[q.type]} {q.isRequired ? '• obligatoriu' : '• opțional'}
                        </span>
                      </div>

                      {q.helpText && (
                        <p className="text-[11px] text-slate-500 italic">{q.helpText}</p>
                      )}

                      {q.options.length > 0 && (
                        <div className="pl-3 border-l-2 border-purple-200 space-y-1 pt-1">
                          {q.options.map((opt) => (
                            <div key={opt.id} className="text-xs text-slate-600 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                              <span>{opt.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'free_text' && (
                        <div className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                          Câmp de text deschis pentru răspunsul liber al cetățeanului.
                        </div>
                      )}

                      {/* Textele libere citite (N4-9): numai aici, niciodată public */}
                      {texts && (
                        <div className="space-y-1.5 pt-1" data-testid="survey-free-texts">
                          {texts.answers.length === 0 ? (
                            <p className="text-[11px] text-slate-500">Niciun răspuns liber păstrat (fără răspunsuri sau șterse la 6 luni de la închidere).</p>
                          ) : (
                            texts.answers.map((t, i) => (
                              <p key={i} className="text-xs text-slate-700 bg-purple-50/50 border border-purple-100 rounded-lg p-2 whitespace-pre-wrap break-words">
                                {t}
                              </p>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>

                {/* Răspunsurile libere (N4-9): `surveys.edit`, numai după închidere, cu audit la fiecare citire */}
                {canEdit && inspectingSurvey.questions.some((q) => q.type === 'free_text') && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-[11px] text-slate-600 space-y-2">
                    {displayStatus(inspectingSurvey) !== 'closed' ? (
                      <p>Răspunsurile libere se pot citi numai după închiderea sondajului.</p>
                    ) : (
                      <>
                        <p>
                          Răspunsurile libere nu sunt publice. Fiecare citire se înregistrează în jurnalul de audit. Textele se șterg automat la 6 luni de la închidere.
                        </p>
                        {!freeTexts && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleLoadFreeTexts(inspectingSurvey)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                          >
                            Citește răspunsurile libere
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={closeInspect}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-300"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal Confirmare Ștergere Sondaj */}
      {surveyToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Confirmare ștergere sondaj
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sigur doriți să ștergeți acest sondaj?
              </p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 mt-2">
                „{surveyToDelete.title}”
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSurveyToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Anulează
              </button>

              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-900/10 transition-colors"
              >
                Da, șterge definitiv
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Rezultate Agregate (Etapa 4D) */}
      {resultsModalSurvey && (
        <SurveyResultsModal
          survey={resultsModalSurvey}
          admin
          onClose={() => setResultsModalSurvey(null)}
        />
      )}

    </div>
  );
};

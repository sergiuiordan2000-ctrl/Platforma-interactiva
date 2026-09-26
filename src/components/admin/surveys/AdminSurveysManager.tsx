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
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Search, 
  Filter, 
  Layers, 
  CheckSquare, 
  CircleDot, 
  FileText, 
  X, 
  HelpCircle,
  BarChart3
} from 'lucide-react';
import { 
  Survey, 
  SurveyStatus, 
  SurveyStatusFilter 
} from '../../../types/survey';
import { surveyService } from '../../../services/surveyService';
import { SurveyFormModal } from './SurveyFormModal';
import { SurveyResultsModal } from '../../surveys/SurveyResultsModal';
import { AdminUser } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';

interface AdminSurveysManagerProps {
  onSuccess: (message: string) => void;
  currentUser: AdminUser | null;
}

export const AdminSurveysManager: React.FC<AdminSurveysManagerProps> = ({ onSuccess, currentUser }) => {
  // Etapa 5D: permisiuni granulare pentru administrarea sondajelor. Rolul `primarie_operator`
  // are doar `surveys.view` — poate consulta, dar nu poate crea/edita/activa/închide/șterge.
  // Ștergerea și resetarea la demo nu au o permisiune dedicată în matrice; sunt tratate ca
  // acțiuni de modificare și gatate prin `surveys.edit` (create sau edit sunt suficiente).
  const canCreate = permissionService.hasPermission(currentUser?.role, 'surveys.create');
  const canEdit = permissionService.hasPermission(currentUser?.role, 'surveys.edit');
  const canActivate = permissionService.hasPermission(currentUser?.role, 'surveys.activate');
  const canClose = permissionService.hasPermission(currentUser?.role, 'surveys.close');
  const canManageData = permissionService.hasAnyPermission(currentUser?.role, ['surveys.create', 'surveys.edit']);

  const [surveys, setSurveys] = useState<Survey[]>(() => surveyService.getAllSurveys());
  const [statusFilter, setStatusFilter] = useState<SurveyStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Stare Modale & Acțiuni
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [inspectingSurvey, setInspectingSurvey] = useState<Survey | null>(null);
  const [resultsModalSurvey, setResultsModalSurvey] = useState<Survey | null>(null);

  // Stare Dialog Confirmare Ștergere
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);

  // Refresh listă din stocare
  const refreshSurveys = () => {
    setSurveys(surveyService.getAllSurveys());
  };

  // Filtrare sondaje
  const filteredSurveys = surveys.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
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
  const handleOpenEdit = (survey: Survey) => {
    if (!canEdit) return;
    setEditingSurvey(survey);
    setIsFormOpen(true);
  };

  // Callback salvare din modal
  const handleSaved = (saved: Survey, isNew: boolean) => {
    setIsFormOpen(false);
    setEditingSurvey(null);
    refreshSurveys();
    onSuccess(
      isNew 
        ? `Sondajul „${saved.title}” a fost creat cu succes!` 
        : `Sondajul „${saved.title}” a fost actualizat persistent!`
    );
  };

  // Activare sondaj
  const handleActivate = (survey: Survey) => {
    if (!canActivate) return;
    const result = surveyService.updateSurveyStatus(survey.id, 'active');
    if (result.success) {
      refreshSurveys();
      onSuccess(`Sondajul „${survey.title}” a fost activat pentru consultare publică!`);
    } else {
      const errList = result.errors?.join(' ') || 'Eroare la activare.';
      alert(`Activarea a eșuat:\n\n${errList}`);
    }
  };

  // Închidere sondaj
  const handleCloseSurvey = (survey: Survey) => {
    if (!canClose) return;
    const result = surveyService.updateSurveyStatus(survey.id, 'closed');
    if (result.success) {
      refreshSurveys();
      onSuccess(`Sondajul „${survey.title}” a fost închis și arhivat.`);
    } else {
      alert(result.errors?.join(' ') || 'Eroare la închiderea sondajului.');
    }
  };

  // Ștergere sondaj confirmată
  const handleConfirmDelete = () => {
    if (!canManageData) return;
    if (!surveyToDelete) return;
    const deletedId = surveyToDelete.id;
    const deletedTitle = surveyToDelete.title;
    const success = surveyService.deleteSurvey(deletedId);
    if (success) {
      refreshSurveys();
      setSurveyToDelete(null);
      onSuccess(`Sondajul „${deletedTitle}” a fost șters definitiv din stocare.`);
    } else {
      alert('Eroare la ștergerea sondajului.');
    }
  };

  // Reset la date demonstrative inițiale
  const handleResetDemo = () => {
    if (!canManageData) return;
    if (window.confirm('Sigur doriți să resetați lista de sondaje la starea inițială DEMO? Toate sondajele create manual vor fi resetate.')) {
      surveyService.resetToDemo();
      refreshSurveys();
      onSuccess('Sondajele au fost resetate la starea demonstrativă inițială.');
    }
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
    <div className="space-y-6">
      
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
          {canManageData && (
            <button
              onClick={handleResetDemo}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              title="Resetează la sondajele demonstrative implicite"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>
          )}

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
            Draft ({surveys.filter((s) => s.status === 'draft').length})
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active ({surveys.filter((s) => s.status === 'active').length})
          </button>

          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === 'closed'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Închise ({surveys.filter((s) => s.status === 'closed').length})
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
      {filteredSurveys.length === 0 ? (
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
            const temporalState = surveyService.getTemporalState(survey);

            return (
              <div
                key={survey.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Informații Principale Sondaj */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge Status */}
                    {survey.status === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                        Activ
                      </span>
                    )}
                    {survey.status === 'draft' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Draft (Ciornă)
                      </span>
                    )}
                    {survey.status === 'closed' && (
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

                    {/* Stare Temporală */}
                    <span className="text-[11px] text-slate-500">
                      {temporalState === 'in_progress' && '• În desfășurare'}
                      {temporalState === 'upcoming' && '• Urmează să înceapă'}
                      {temporalState === 'expired' && '• Perioadă expirată'}
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
                      <span>{formatDate(survey.period.startDate)} — {formatDate(survey.period.endDate)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">{survey.questions.length} întrebări</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Modificat: {formatDate(survey.audit?.updatedAt || survey.audit?.createdAt)}</span>
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
                    onClick={() => setInspectingSurvey(survey)}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    title="Inspectează detaliile și întrebările"
                  >
                    <Eye className="w-4 h-4 text-slate-500" />
                    <span className="hidden sm:inline">Inspectează</span>
                  </button>

                  {/* Editare — Etapa 5D: doar cu `surveys.edit` */}
                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(survey)}
                      className="p-2 rounded-xl text-blue-700 hover:bg-blue-50 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      title="Editează sondajul"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Editează</span>
                    </button>
                  )}

                  {/* Activare (pentru draft sau closed) — Etapa 5D: doar cu `surveys.activate` */}
                  {canActivate && survey.status !== 'active' && (
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
                  {canClose && survey.status === 'active' && (
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
                  Inspectare Structură • {inspectingSurvey.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {inspectingSurvey.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectingSurvey(null)}
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-bold text-slate-800">{inspectingSurvey.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Început</span>
                  <span className="font-medium text-slate-800">{formatDate(inspectingSurvey.period.startDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Sfârșit</span>
                  <span className="font-medium text-slate-800">{formatDate(inspectingSurvey.period.endDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Creat La</span>
                  <span className="font-medium text-slate-800">{formatDate(inspectingSurvey.audit.createdAt)}</span>
                </div>
              </div>

              {/* Lista Întrebărilor */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Întrebări ({inspectingSurvey.questions.length})</span>
                  <span className="text-slate-500 font-normal text-[11px]">Rezultatele sunt disponibile în fereastra dedicată „Rezultate”</span>
                </div>

                <div className="space-y-3">
                  {inspectingSurvey.questions.map((q, idx) => (
                    <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          #{idx + 1}. {q.text}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {q.type} {q.isRequired ? '• obligatoriu' : '• opțional'}
                        </span>
                      </div>

                      {q.helpText && (
                        <p className="text-[11px] text-slate-500 italic">{q.helpText}</p>
                      )}

                      {q.options && q.options.length > 0 && (
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
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setInspectingSurvey(null)}
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
                onClick={handleConfirmDelete}
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
          onClose={() => setResultsModalSurvey(null)}
        />
      )}

    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Save, 
  X, 
  Plus, 
  Calendar, 
  Tag, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Layers 
} from 'lucide-react';
import { 
  Survey, 
  SurveyStatus, 
  SurveyQuestion 
} from '../../../types/survey';
import { surveyService } from '../../../services/surveyService';
import { SurveyQuestionEditor } from './SurveyQuestionEditor';

interface SurveyFormModalProps {
  initialSurvey?: Survey | null; // Dacă este null, este mod creare sondaj nou
  onClose: () => void;
  onSaved: (savedSurvey: Survey, isNew: boolean) => void;
}

export const SurveyFormModal: React.FC<SurveyFormModalProps> = ({
  initialSurvey,
  onClose,
  onSaved,
}) => {
  const isEditing = !!initialSurvey;

  // Calculare date calendaristice implicite pentru un sondaj nou (astăzi -> peste 30 de zile)
  const defaultStartDate = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const defaultEndDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  // Stare Formular
  const [title, setTitle] = useState(initialSurvey?.title || '');
  const [description, setDescription] = useState(initialSurvey?.description || '');
  const [category, setCategory] = useState(initialSurvey?.category || 'General & Comunitate');
  const [startDate, setStartDate] = useState(
    initialSurvey?.period?.startDate ? initialSurvey.period.startDate.split('T')[0] : defaultStartDate()
  );
  const [endDate, setEndDate] = useState(
    initialSurvey?.period?.endDate ? initialSurvey.period.endDate.split('T')[0] : defaultEndDate()
  );
  const [status, setStatus] = useState<SurveyStatus>(initialSurvey?.status || 'draft');

  // Stare Întrebări (cel puțin 1 întrebare inițială dacă este nou)
  const [questions, setQuestions] = useState<SurveyQuestion[]>(() => {
    if (initialSurvey?.questions && initialSurvey.questions.length > 0) {
      return [...initialSurvey.questions];
    }
    return [
      {
        id: `q-${Date.now()}-1`,
        text: '',
        type: 'single_choice',
        order: 1,
        isRequired: true,
        options: [
          { id: `opt-${Date.now()}-1`, text: '', order: 1 },
          { id: `opt-${Date.now()}-2`, text: '', order: 2 },
        ],
      },
    ];
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adăugare întrebare nouă
  const handleAddQuestion = () => {
    const newQ: SurveyQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: '',
      type: 'single_choice',
      order: questions.length + 1,
      isRequired: true,
      options: [
        { id: `opt-${Date.now()}-1`, text: '', order: 1 },
        { id: `opt-${Date.now()}-2`, text: '', order: 2 },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  // Actualizare întrebare specifică
  const handleQuestionChange = (index: number, updated: SurveyQuestion) => {
    const next = [...questions];
    next[index] = updated;
    setQuestions(next);
  };

  // Ștergere întrebare
  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      setValidationErrors(['Sondajul trebuie să aibă cel puțin o întrebare.']);
      return;
    }
    const filtered = questions.filter((_, idx) => idx !== index);
    const reordered = filtered.map((q, idx) => ({ ...q, order: idx + 1 }));
    setQuestions(reordered);
  };

  // Reordonare întrebare sus / jos
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((q, idx) => ({ ...q, order: idx + 1 }));
    setQuestions(updated);
  };

  // Salvare sondaj (ca draft sau conform statusului selectat)
  const handleSubmit = (targetStatus?: SurveyStatus) => {
    setIsSubmitting(true);
    setValidationErrors([]);

    const finalStatus = targetStatus || status;

    // Asigurăm ordinea corectă a întrebărilor
    const normalizedQuestions: SurveyQuestion[] = questions.map((q, idx) => ({
      ...q,
      order: idx + 1,
      options: q.options ? q.options.map((opt, oIdx) => ({ ...opt, order: oIdx + 1 })) : undefined,
    }));

    const surveyId = initialSurvey?.id || surveyService.generateSurveyId();

    const candidateSurvey: Survey = {
      id: surveyId,
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || undefined,
      period: {
        startDate: `${startDate}T00:00:00.000Z`,
        endDate: `${endDate}T23:59:59.000Z`,
      },
      status: finalStatus,
      isDemo: initialSurvey ? initialSurvey.isDemo : false,
      audit: initialSurvey?.audit || {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'admin',
      },
      questions: normalizedQuestions,
    };

    // Validare centralizată prin validatorul oficial din Etapa 4A
    const validation = surveyService.validateSurveyStructure(candidateSurvey);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setIsSubmitting(false);
      return;
    }

    // Salvare persistentă prin surveyService
    const result = surveyService.upsertSurvey(candidateSurvey);
    if (!result.success) {
      setValidationErrors(result.errors || ['Eroare neașteptată la salvarea în stocarea locală.']);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onSaved(candidateSurvey, !isEditing);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Antet Modal */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                {isEditing ? 'Editare Sondaj' : 'Sondaj Nou'}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Etapa 4B • Panou Administrativ
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {isEditing ? `Modifică sondaj: ${initialSurvey.title}` : 'Crează o nouă consultare publică'}
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
          
          {/* Erori de Validare Centralizate */}
          {validationErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Corectați următoarele erori înainte de salvare:</span>
              </div>
              <ul className="list-disc list-inside text-xs space-y-1 pl-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 1. Date Generale Sondaj */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>1. Informații Generale</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Titlu Sondaj */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Titlu consultare <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Consultare privind amenajarea parcului central..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Categorie */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Categorie municipală
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Mediu, Mobilitate, Urbanism"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              {/* Descriere Sondaj */}
              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Descriere și context <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explicați cetățenilor scopul consultării, cadrul legal sau decizional și modul în care vor fi utilizate rezultatele..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                />
              </div>

              {/* Data Început */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Data de început</span> <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Data Sfârșit */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Data de sfârșit</span> <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Status Inițial */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Status sondaj</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SurveyStatus)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none font-semibold"
                >
                  <option value="draft">Ciornă / În lucru (Draft)</option>
                  <option value="active">Activ (Deschis consultării)</option>
                  <option value="closed">Închis / Finalizat (Closed)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  {status === 'draft' && 'Recomandat: Sondajul este salvat, dar nu este publicat.'}
                  {status === 'active' && 'Atenție: Va fi activ dacă data curentă este în interval.'}
                  {status === 'closed' && 'Sondajul va fi considerat finalizat.'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Întrebările Sondajului */}
          <div className="space-y-4 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-600" />
                  <span>2. Întrebările Sondajului ({questions.length})</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Adăugați întrebări cu alegere unică, alegere multiplă sau răspuns liber.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adaugă întrebare</span>
              </button>
            </div>

            {/* Listă Redactori de Întrebări */}
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <SurveyQuestionEditor
                  key={q.id}
                  question={q}
                  index={idx}
                  totalQuestions={questions.length}
                  onChange={(updated) => handleQuestionChange(idx, updated)}
                  onDelete={() => handleDeleteQuestion(idx)}
                  onMoveUp={() => handleMoveQuestion(idx, 'up')}
                  onMoveDown={() => handleMoveQuestion(idx, 'down')}
                />
              ))}
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-200"
              >
                <Plus className="w-4 h-4 text-purple-600" />
                <span>Adaugă încă o întrebare în sondaj</span>
              </button>
            </div>
          </div>

        </div>

        {/* Bară Inferioară Modal (Acțiuni Salvare) */}
        <div className="px-5 py-4 sm:px-6 sm:py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            Validarea structurală verifică integritatea înainte de persistență.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              Anulează
            </button>

            {/* Buton Salvare ca Draft */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-all"
            >
              Salvează ca Draft
            </button>

            {/* Buton Salvare Principal */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(status)}
              className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-900/10 inline-flex items-center gap-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Actualizează Sondajul' : 'Salvează Sondajul'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

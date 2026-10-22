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
  HelpCircle, 
  AlertCircle, 
  Clock, 
  Eye,
  Lock,
  Layers 
} from 'lucide-react';
import {
  surveyService,
  SURVEY_LIMITS,
  type AdminSurvey,
  type AdminSurveyInput,
  type SurveyResultsVisibility,
  type SurveyStatus,
} from '../../../services/surveyService';
import { ApiError } from '../../../services/apiClient';
import { isoToRoInput, roInputToIso } from '../../../utils/roTime';
import { SurveyQuestionEditor, newLocalKey, type SurveyFormQuestion } from './SurveyQuestionEditor';

interface SurveyFormModalProps {
  initialSurvey?: AdminSurvey | null; // Dacă este null, este mod creare sondaj nou
  /** Permisiunile stării țintă (B4): activare / închidere. */
  canActivate: boolean;
  canClose: boolean;
  onClose: () => void;
  onSaved: (savedSurvey: AdminSurvey, isNew: boolean) => void;
}

const newQuestion = (): SurveyFormQuestion => ({
  key: newLocalKey('q'),
  text: '',
  type: 'single_choice',
  isRequired: true,
  helpText: '',
  options: [
    { key: newLocalKey('opt'), text: '' },
    { key: newLocalKey('opt'), text: '' },
  ],
});

/**
 * Numele câmpurilor din erorile serverului (422 / 409) → text pentru formular. 7B.2 (E3): opțiunea se păstrează
 * („Întrebarea #2, opțiunea #3”), iar o cale necunoscută nu ajunge pe ecran („alte câmpuri”).
 */
function fieldLabel(path: string): string {
  const q = /^questions\.(\d+)(?:\.options\.(\d+))?/.exec(path);
  if (q) return q[2] !== undefined ? `Întrebarea #${Number(q[1]) + 1}, opțiunea #${Number(q[2]) + 1}` : `Întrebarea #${Number(q[1]) + 1}`;
  const labels: Record<string, string> = {
    title: 'Titlul',
    description: 'Descrierea',
    category: 'Categoria',
    startAt: 'Data de început',
    endAt: 'Data de sfârșit',
    resultsVisibility: 'Vizibilitatea rezultatelor',
    questions: 'Întrebările',
    status: 'Starea',
  };
  return labels[path] ?? 'alte câmpuri';
}

function serverErrors(err: unknown): string[] {
  if (err instanceof ApiError) {
    const fields = err.fields ? Object.keys(err.fields).map(fieldLabel) : [];
    return [fields.length ? `${err.message} (${[...new Set(fields)].join(', ')})` : err.message];
  }
  return ['A apărut o eroare. Încercați din nou.'];
}

export const SurveyFormModal: React.FC<SurveyFormModalProps> = ({
  initialSurvey,
  canActivate,
  canClose,
  onClose,
  onSaved,
}) => {
  const isEditing = !!initialSurvey;
  // T-4: după primul vot, întrebările, opțiunile, data de început și vizibilitatea rezultatelor rămân neschimbate
  const locked = !!initialSurvey?.locked;

  // Perioada implicită a unui sondaj nou: de acum, 30 de zile (ora României, P-5)
  const defaultStart = () => isoToRoInput(new Date().toISOString());
  const defaultEnd = () => `${isoToRoInput(new Date(Date.now() + 30 * 86_400_000).toISOString()).slice(0, 10)}T23:59`;

  // Stare Formular
  const [title, setTitle] = useState(initialSurvey?.title || '');
  const [description, setDescription] = useState(initialSurvey?.description || '');
  const [category, setCategory] = useState(initialSurvey ? (initialSurvey.category ?? '') : 'General & Comunitate');
  const [startAt, setStartAt] = useState(initialSurvey ? isoToRoInput(initialSurvey.startAt) : defaultStart());
  const [endAt, setEndAt] = useState(initialSurvey ? isoToRoInput(initialSurvey.endAt) : defaultEnd());
  const [status, setStatus] = useState<SurveyStatus>(initialSurvey?.status || 'draft');
  const [resultsVisibility, setResultsVisibility] = useState<SurveyResultsVisibility>(initialSurvey?.resultsVisibility || 'after_close');

  // Stare Întrebări (cel puțin 1 întrebare inițială dacă este nou)
  const [questions, setQuestions] = useState<SurveyFormQuestion[]>(() => {
    if (initialSurvey && initialSurvey.questions.length > 0) {
      return initialSurvey.questions
        .slice()
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((q) => ({
          key: q.id,
          id: q.id,
          text: q.text,
          type: q.type,
          isRequired: q.isRequired,
          helpText: q.helpText ?? '',
          options: q.options
            .slice()
            .sort((a, b) => a.ordinal - b.ordinal)
            .map((o) => ({ key: o.id, id: o.id, text: o.text })),
        }));
    }
    return [newQuestion()];
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stările care se pot alege din formular (P-1: închis = definitiv; B4: permisiunea stării țintă)
  const currentStatus: SurveyStatus = initialSurvey?.status || 'draft';
  const statusOptions: SurveyStatus[] = [
    ...(currentStatus === 'draft' || !locked ? (['draft'] as const) : []),
    ...(currentStatus === 'active' || canActivate ? (['active'] as const) : []),
    ...(isEditing && currentStatus === 'active' && canClose ? (['closed'] as const) : []),
  ];

  // Adăugare întrebare nouă
  const handleAddQuestion = () => {
    if (locked) return;
    setQuestions([...questions, newQuestion()]);
  };

  // Actualizare întrebare specifică
  const handleQuestionChange = (index: number, updated: SurveyFormQuestion) => {
    const next = [...questions];
    next[index] = updated;
    setQuestions(next);
  };

  // Ștergere întrebare
  const handleDeleteQuestion = (index: number) => {
    if (locked) return;
    if (questions.length <= 1) {
      setValidationErrors(['Sondajul trebuie să aibă cel puțin o întrebare.']);
      return;
    }
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  // Reordonare întrebare sus / jos
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (locked) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setQuestions(reordered);
  };

  /** Verificarea structurii în browser (aceleași reguli ca pe server, B2 §6.4); serverul verifică din nou. */
  const validate = (startIso: string | null, endIso: string | null): string[] => {
    const errors: string[] = [];
    if (title.trim().length < 5) errors.push('Titlul sondajului trebuie să conțină minim 5 caractere.');
    if (description.trim().length < 10) errors.push('Descrierea sondajului trebuie să conțină minim 10 caractere.');
    if (!startIso || !endIso) {
      errors.push('Perioada sondajului trebuie să conțină date calendaristice valide.');
    } else if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      errors.push('Data de sfârșit a sondajului trebuie să fie ulterioară datei de început.');
    }
    if (questions.length === 0) errors.push('Sondajul trebuie să conțină cel puțin o întrebare.');
    questions.forEach((q, idx) => {
      const qIndex = idx + 1;
      if (q.text.trim().length < 3) errors.push(`Textul întrebării #${qIndex} este prea scurt (minim 3 caractere).`);
      if (q.type !== 'free_text') {
        if (q.options.length < 2) errors.push(`Întrebarea #${qIndex} necesită cel puțin 2 variante de răspuns.`);
        else if (q.options.some((o) => !o.text.trim())) errors.push(`Întrebarea #${qIndex} are variante de răspuns fără text.`);
      }
    });
    return errors;
  };

  // Salvare sondaj (ca draft sau conform statusului selectat)
  const handleSubmit = async (targetStatus?: SurveyStatus) => {
    if (isSubmitting) return;
    setValidationErrors([]);

    const finalStatus = targetStatus || status;
    const startIso = roInputToIso(startAt);
    const endIso = roInputToIso(endAt);

    const errors = validate(startIso, endIso);
    if (errors.length > 0 || !startIso || !endIso) {
      setValidationErrors(errors);
      return;
    }

    const input: AdminSurveyInput = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim() || null,
      startAt: startIso,
      endAt: endIso,
      resultsVisibility,
      questions: questions.map((q) => ({
        ...(q.id ? { id: q.id } : {}),
        text: q.text.trim(),
        type: q.type,
        isRequired: q.isRequired,
        helpText: q.helpText.trim() || null,
        options: q.type === 'free_text' ? [] : q.options.map((o) => ({ ...(o.id ? { id: o.id } : {}), text: o.text.trim() })),
      })),
    };

    // 7B.3 (O3, acțiunea 4, din formular): închiderea cere aceeași confirmare ca butonul „Închide” din listă, înainte
    // de orice cerere; „Anulează” nu trimite nimic și formularul rămâne deschis. Calea din formular nu trece prin
    // butonul din listă, deci confirmarea apare o singură dată.
    if (initialSurvey && finalStatus === 'closed' && initialSurvey.status !== 'closed'
      && !window.confirm(`Închideți sondajul „${input.title}”? Închiderea este definitivă.`)) return;

    setIsSubmitting(true);
    let saved: AdminSurvey;
    try {
      saved = initialSurvey
        ? await surveyService.adminUpdate(initialSurvey.id, input)
        : await surveyService.adminCreate(input, finalStatus === 'active' ? 'active' : 'draft');
    } catch (err) {
      setValidationErrors(serverErrors(err));
      setIsSubmitting(false);
      return;
    }

    // La editare, starea se schimbă separat (B2 §6.4: PATCH /status, cu permisiunea stării țintă)
    if (initialSurvey && finalStatus !== saved.status) {
      try {
        saved = await surveyService.adminSetStatus(initialSurvey.id, finalStatus);
      } catch (err) {
        setValidationErrors(['Modificările au fost salvate, dar starea sondajului nu a fost schimbată.', ...serverErrors(err)]);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    onSaved(saved, !isEditing);
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
                Panou Administrativ
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {isEditing ? `Modifică sondaj: ${initialSurvey.title}` : 'Crează o nouă consultare publică'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="tinta-iconita p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
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

          {/* T-4: structura blocată după primul vot */}
          {locked && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Sondajul a primit voturi. Întrebările, variantele de răspuns, data de început și vizibilitatea rezultatelor nu se mai modifică. Rămân editabile titlul, descrierea, categoria, textele ajutătoare și data de sfârșit (numai în viitor).
              </span>
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
                  maxLength={SURVEY_LIMITS.title}
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
                  maxLength={SURVEY_LIMITS.category}
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
                  maxLength={SURVEY_LIMITS.description}
                  placeholder="Explicați cetățenilor scopul consultării, cadrul legal sau decizional și modul în care vor fi utilizate rezultatele..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
                />
              </div>

              {/* Data Început */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Data și ora de început</span> <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  disabled={locked}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
                <p className="text-[10px] text-slate-500">Ora României.</p>
              </div>

              {/* Data Sfârșit */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Data și ora de sfârșit</span> <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <p className="text-[10px] text-slate-500">Ora României. La această oră, votul se închide automat.</p>
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
                  {statusOptions.includes('draft') && <option value="draft">Ciornă / În lucru (Draft)</option>}
                  {statusOptions.includes('active') && <option value="active">Activ (Deschis consultării)</option>}
                  {statusOptions.includes('closed') && <option value="closed">Închis / Finalizat (Closed)</option>}
                </select>
                <p className="text-[10px] text-slate-500">
                  {status === 'draft' && 'Recomandat: Sondajul este salvat, dar nu este publicat.'}
                  {status === 'active' && 'Atenție: Va fi activ dacă data curentă este în interval.'}
                  {status === 'closed' && 'Închiderea este definitivă: sondajul trece în arhivă și nu se mai redeschide.'}
                </p>
              </div>

              {/* D3: vizibilitatea rezultatelor (P-6: blocată după primul vot) */}
              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-600" />
                  <span>Vizibilitatea rezultatelor</span>
                </label>
                <select
                  value={resultsVisibility}
                  onChange={(e) => setResultsVisibility(e.target.value as SurveyResultsVisibility)}
                  disabled={locked}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="after_close">După închiderea consultării (recomandat)</option>
                  <option value="live">În timp real, cât consultarea este deschisă</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Răspunsurile libere nu sunt niciodată publice. După primul vot, această alegere nu se mai poate schimba.
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
                className={locked ? 'hidden' : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-colors shadow-xs'}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adaugă întrebare</span>
              </button>
            </div>

            {/* Listă Redactori de Întrebări */}
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <SurveyQuestionEditor
                  key={q.key}
                  question={q}
                  index={idx}
                  totalQuestions={questions.length}
                  locked={locked}
                  onChange={(updated) => handleQuestionChange(idx, updated)}
                  onDelete={() => handleDeleteQuestion(idx)}
                  onMoveUp={() => handleMoveQuestion(idx, 'up')}
                  onMoveDown={() => handleMoveQuestion(idx, 'down')}
                />
              ))}
            </div>

            <div className={locked ? 'hidden' : 'pt-2 flex justify-center'}>
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
            Structura se verifică în browser și din nou pe server, la salvare.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              Anulează
            </button>

            {/* Buton Salvare ca Draft (un sondaj cu voturi nu mai poate deveni ciornă) */}
            {statusOptions.includes('draft') && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSubmit('draft')}
                className="px-4 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition-all"
              >
                Salvează ca Draft
              </button>
            )}

            {/* Buton Salvare Principal */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleSubmit(status)}
              className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md shadow-purple-900/10 inline-flex items-center gap-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Se salvează…' : isEditing ? 'Actualizează Sondajul' : 'Salvează Sondajul'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

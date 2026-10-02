/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  HelpCircle, 
  CheckSquare, 
  CircleDot, 
  FileText, 
  AlertCircle 
} from 'lucide-react';
import { SURVEY_LIMITS, type SurveyQuestionType } from '../../../services/surveyService';

/**
 * Faza 5.6: starea formularului de Admin. `key` = cheia locală a rândului; `id` = ID-ul de pe server
 * (lipsă la întrebările și opțiunile noi). Ordinea este cea din listă.
 */
export interface SurveyFormOption {
  key: string;
  id?: string;
  text: string;
}

export interface SurveyFormQuestion {
  key: string;
  id?: string;
  text: string;
  type: SurveyQuestionType;
  isRequired: boolean;
  helpText: string;
  options: SurveyFormOption[];
}

let localKeySeq = 0;
/** Cheie locală pentru un rând nou din formular (nu ajunge la server). */
export const newLocalKey = (prefix: string): string => `${prefix}-${Date.now()}-${++localKeySeq}`;

interface SurveyQuestionEditorProps {
  question: SurveyFormQuestion;
  index: number;
  totalQuestions: number;
  /** T-4: după primul vot, structura nu se mai modifică; rămâne editabil numai textul de ajutor. */
  locked?: boolean;
  onChange: (updatedQuestion: SurveyFormQuestion) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const SurveyQuestionEditor: React.FC<SurveyQuestionEditorProps> = ({
  question,
  index,
  totalQuestions,
  locked = false,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [newOptionText, setNewOptionText] = useState('');

  // Schimbare tip întrebare
  const handleTypeChange = (newType: SurveyQuestionType) => {
    let updatedOptions = question.options;

    // Dacă se trece la free_text, opțiunile nu sunt necesare
    if (newType === 'free_text') {
      updatedOptions = [];
    } else if (updatedOptions.length === 0) {
      // Dacă se trece la single_choice sau multiple_choice, inițializăm 2 opțiuni implicite
      updatedOptions = [
        { key: newLocalKey('opt'), text: 'Opțiunea 1' },
        { key: newLocalKey('opt'), text: 'Opțiunea 2' },
      ];
    }

    onChange({
      ...question,
      type: newType,
      options: updatedOptions,
    });
  };

  // Adăugare opțiune nouă
  const handleAddOption = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newOptionText.trim()) return;

    const currentOptions = question.options;
    const newOption: SurveyFormOption = {
      key: newLocalKey('opt'),
      text: newOptionText.trim(),
    };

    onChange({
      ...question,
      options: [...currentOptions, newOption],
    });
    setNewOptionText('');
  };

  // Modificare text opțiune
  const handleUpdateOptionText = (optKey: string, text: string) => {
    const updated = question.options.map((opt) =>
      opt.key === optKey ? { ...opt, text } : opt
    );
    onChange({
      ...question,
      options: updated,
    });
  };

  // Ștergere opțiune
  const handleDeleteOption = (optKey: string) => {
    onChange({
      ...question,
      options: question.options.filter((opt) => opt.key !== optKey),
    });
  };

  // Reordonare opțiuni sus/jos
  const handleMoveOption = (optIndex: number, direction: 'up' | 'down') => {
    const currentOptions = question.options;
    if (direction === 'up' && optIndex === 0) return;
    if (direction === 'down' && optIndex === currentOptions.length - 1) return;

    const targetIndex = direction === 'up' ? optIndex - 1 : optIndex + 1;
    const reordered = [...currentOptions];
    const [moved] = reordered.splice(optIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    onChange({
      ...question,
      options: reordered,
    });
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm relative">
      {/* Bară Superioară Întrebare: Titlu, Ordine & Acțiuni */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs font-bold text-slate-800">
            Întrebarea #{index + 1}
          </span>
        </div>

        {/* Butoane Ordonare & Ștergere (T-4: ascunse după primul vot) */}
        <div className={locked ? 'hidden' : 'flex items-center gap-1'}>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center transition-colors ${
              index === 0
                ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-white'
                : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-100'
            }`}
            title="Mută întrebarea mai sus"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalQuestions - 1}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center transition-colors ${
              index === totalQuestions - 1
                ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-white'
                : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-100'
            }`}
            title="Mută întrebarea mai jos"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors ml-1"
            title="Șterge întrebarea"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid: Text Întrebare + Tip Întrebare */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Textul Întrebării */}
        <div className="md:col-span-2 space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Enunțul întrebării <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={question.text}
            onChange={(e) => onChange({ ...question, text: e.target.value })}
            placeholder="Ex: Cât de des frecventați parcurile din oraș?"
            maxLength={SURVEY_LIMITS.question}
            disabled={locked}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* Tipul Întrebării */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Tipul întrebării
          </label>
          <select
            value={question.type}
            onChange={(e) => handleTypeChange(e.target.value as SurveyQuestionType)}
            disabled={locked}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white font-medium outline-none disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="single_choice">Alegere unică (Radio)</option>
            <option value="multiple_choice">Alegere multiplă (Checkbox)</option>
            <option value="free_text">Răspuns liber (Text)</option>
          </select>
        </div>
      </div>

      {/* Text orientativ / Ajutător & Obligativitate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        <div className="md:col-span-2 space-y-1">
          <label className="block text-[11px] font-semibold text-slate-600">
            Text orientativ / Ajutător (Opțional)
          </label>
          <input
            type="text"
            value={question.helpText}
            onChange={(e) => onChange({ ...question, helpText: e.target.value })}
            placeholder="Ex: Puteți bifa mai multe opțiuni din listă."
            maxLength={SURVEY_LIMITS.helpText}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 bg-white outline-none"
          />
        </div>

        <div className="pt-3 md:pt-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={question.isRequired}
              onChange={(e) => onChange({ ...question, isRequired: e.target.checked })}
              disabled={locked}
              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
            />
            <span>Răspuns obligatoriu</span>
          </label>
        </div>
      </div>

      {/* Secțiunea de Variante de Răspuns (pentru single_choice și multiple_choice) */}
      {question.type !== 'free_text' ? (
        <div className="border-t border-slate-200/80 pt-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              {question.type === 'single_choice' ? (
                <CircleDot className="w-3.5 h-3.5 text-purple-600" />
              ) : (
                <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
              )}
              <span>Variante de răspuns</span>
              <span className="text-[10px] font-normal text-slate-500">
                (minim 2 variante necesare)
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {question.options.length} variante definite
            </span>
          </div>

          {/* Listă Opțiuni Existente */}
          <div className="space-y-1.5">
            {question.options.map((opt, optIdx) => (
              <div 
                key={opt.key}
                className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs"
              >
                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {optIdx + 1}
                </span>

                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleUpdateOptionText(opt.key, e.target.value)}
                  placeholder="Text variantă de răspuns..."
                  maxLength={SURVEY_LIMITS.option}
                  disabled={locked}
                  className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />

                <div className={locked ? 'hidden' : 'flex items-center gap-1 shrink-0'}>
                  <button
                    type="button"
                    onClick={() => handleMoveOption(optIdx, 'up')}
                    disabled={optIdx === 0}
                    className={`p-1 rounded text-slate-500 hover:text-slate-900 ${
                      optIdx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'
                    }`}
                    title="Mută varianta mai sus"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMoveOption(optIdx, 'down')}
                    disabled={optIdx === question.options.length - 1}
                    className={`p-1 rounded text-slate-500 hover:text-slate-900 ${
                      optIdx === question.options.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'
                    }`}
                    title="Mută varianta mai jos"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteOption(opt.key)}
                    className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 ml-1"
                    title="Șterge varianta"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Adăugare Variantă Nouă (T-4: ascunsă după primul vot) */}
          <div className={locked ? 'hidden' : 'flex items-center gap-2 pt-1'}>
            <input
              type="text"
              value={newOptionText}
              onChange={(e) => setNewOptionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOption();
                }
              }}
              placeholder="Adaugă o variantă nouă și apasă Enter..."
              maxLength={SURVEY_LIMITS.option}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 bg-white outline-none"
            />
            <button
              type="button"
              onClick={() => handleAddOption()}
              disabled={!newOptionText.trim()}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all ${
                newOptionText.trim()
                  ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adaugă variantă</span>
            </button>
          </div>

          {/* Alertă dacă sunt mai puțin de 2 variante */}
          {question.options.length < 2 && (
            <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>Întrebarea necesită cel puțin 2 variante de răspuns pentru a putea fi validată.</span>
            </div>
          )}
        </div>
      ) : (
        /* Mesaj explicativ pentru Free Text */
        <div className="border-t border-slate-200/80 pt-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
            <FileText className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Pentru întrebările cu <strong>răspuns liber</strong>, cetățeanul va avea la dispoziție un câmp de introducere text. Nu sunt necesare variante de răspuns predefinite.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

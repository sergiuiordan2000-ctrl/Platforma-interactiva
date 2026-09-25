/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FolderPlus, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  X, 
  AlertCircle,
  Layers
} from 'lucide-react';
import { QuickDialCategory } from '../../../types/quickDial';
import { quickDialService } from '../../../services/quickDialService';

interface AdminCategoriesManagerProps {
  onSuccess: (msg: string) => void;
}

export const AdminCategoriesManager: React.FC<AdminCategoriesManagerProps> = ({ onSuccess }) => {
  const [categories, setCategories] = useState<QuickDialCategory[]>(() => 
    quickDialService.getCategories(true)
  );

  const [isCreating, setIsCreating] = useState(false);
  const [editingCat, setEditingCat] = useState<QuickDialCategory | null>(null);

  const [formState, setFormState] = useState({
    name: '',
    description: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const refresh = () => {
    setCategories(quickDialService.getCategories(true));
  };

  const handleStartCreate = () => {
    setFormState({ name: '', description: '' });
    setFormErrors({});
    setIsCreating(true);
    setEditingCat(null);
  };

  const handleStartEdit = (cat: QuickDialCategory) => {
    setFormState({
      name: cat.name,
      description: cat.description,
    });
    setFormErrors({});
    setEditingCat(cat);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingCat(null);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formState.name.trim()) {
      errs.name = 'Denumirea categoriei este obligatorie.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isCreating) {
      quickDialService.addCategory({
        name: formState.name.trim(),
        description: formState.description.trim(),
        order: categories.length + 1,
        isActive: true,
      });
      onSuccess(`Categoria „${formState.name}” a fost adăugată!`);
    } else if (editingCat) {
      quickDialService.updateCategory(editingCat.id, {
        name: formState.name.trim(),
        description: formState.description.trim(),
      });
      onSuccess(`Categoria „${formState.name}” a fost actualizată!`);
    }

    handleCancelForm();
    refresh();
  };

  const handleDelete = (cat: QuickDialCategory) => {
    const res = quickDialService.deleteCategory(cat.id);
    if (!res.success) {
      alert(res.error);
      return;
    }

    onSuccess(`Categoria „${cat.name}” a fost ștearsă.`);
    refresh();
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const newOrder = [...categories];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    quickDialService.reorderCategories(newOrder.map(c => c.id));
    onSuccess('Ordinea categoriilor a fost actualizată!');
    refresh();
  };

  const counts = quickDialService.getCountsByCategory(true);

  return (
    <div className="space-y-6">
      
      {/* Bară Acțiuni */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Gestiune Categorii Quick Dial</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Organizarea tematică a numerelor utile fără modificarea codului aplicației
          </p>
        </div>

        {!isCreating && !editingCat && (
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adaugă Categorie Nouă</span>
          </button>
        )}
      </div>

      {/* Formular Adăugare / Editare Categorie */}
      {(isCreating || editingCat) && (
        <form onSubmit={handleSaveForm} className="bg-slate-50 border-2 border-purple-300 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-purple-700" />
              <span>{isCreating ? 'Adăugare Categorie Nouă' : `Editare: ${editingCat?.name}`}</span>
            </h4>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Denumire categorie *</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="ex: Servicii Sanitare & Farmacii"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.name ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-purple-200'
                }`}
              />
              {formErrors.name && <p className="text-[11px] text-red-600">{formErrors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Descriere</label>
              <input
                type="text"
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Descrieți pe scurt tipul de contacte din această categorie..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all"
            >
              {isCreating ? 'Salvează Categoria' : 'Actualizează Categoria'}
            </button>
          </div>
        </form>
      )}

      {/* Listă Categorii */}
      <div className="space-y-3">
        {categories.map((cat, idx) => {
          const count = counts[cat.id] || 0;

          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    {cat.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                    {count} {count === 1 ? 'contact' : 'contacte'}
                  </span>
                </div>

                {cat.description && (
                  <p className="text-xs text-slate-600">
                    {cat.description}
                  </p>
                )}
              </div>

              {/* Acțiuni */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                <button
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  title="Mută mai sus"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === categories.length - 1}
                  title="Mută mai jos"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleStartEdit(cat)}
                  title="Editează categoria"
                  className="p-1.5 rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(cat)}
                  title={count > 0 ? 'Nu se poate șterge (are contacte atribuite)' : 'Șterge categoria'}
                  disabled={count > 0}
                  className="p-1.5 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

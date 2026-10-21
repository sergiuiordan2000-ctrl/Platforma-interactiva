/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Globe, 
  Plus, 
  Edit3, 
  Trash2, 
  Power, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink, 
  X,
  AlertCircle
} from 'lucide-react';
import { UsefulLink } from '../../../types/directory';
import { directoryService } from '../../../services/directoryService';
import { AdminUser } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';
import { ErrorBlock, LoadingBlock } from '../../common/LoadState';
import { useAsync } from '../../../hooks/useAsync';

interface AdminUsefulLinksManagerProps {
  onSuccess: (msg: string) => void;
  currentUser: AdminUser | null;
}

const CATEGORIES: Array<UsefulLink['category']> = [
  'Plăți & Taxe',
  'Transparență Decizională',
  'Servicii Digitale',
  'Instituții Partenere',
];

export const AdminUsefulLinksManager: React.FC<AdminUsefulLinksManagerProps> = ({ onSuccess, currentUser }) => {
  // Etapa 5D: permisiunea `directory.links.manage` controlează CRUD-ul link-urilor utile.
  const canManage = permissionService.hasPermission(currentUser?.role, 'directory.links.manage');

  // Faza 5.3: linkurile (inclusiv cele inactive) vin de la server; reîncărcare explicită după mutații
  const data = useAsync(() => directoryService.getAdminCityHallInfo(), []);
  const links: UsefulLink[] = data.data?.usefulLinks ?? [];
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);

  const [formState, setFormState] = useState({
    title: '',
    url: '',
    category: CATEGORIES[0],
    description: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const refresh = () => {
    void data.reload();
  };

  /** Rulează o operație pe server; succesul se afișează numai dacă serverul a acceptat-o. */
  const run = async (op: () => Promise<{ success: boolean; error?: string }>, okMessage: string): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    const res = await op();
    setBusy(false);
    if (!res.success) {
      setActionError(res.error ?? 'Operația a eșuat.');
      return false;
    }
    setActionError(null);
    onSuccess(okMessage);
    refresh();
    return true;
  };

  const handleStartCreate = () => {
    if (!canManage) return;
    setFormState({
      title: '',
      url: '',
      category: CATEGORIES[0],
      description: '',
    });
    setFormErrors({});
    setIsCreating(true);
    setEditingLink(null);
  };

  const handleStartEdit = (link: UsefulLink) => {
    if (!canManage) return;
    setFormState({
      title: link.title,
      url: link.url,
      category: link.category,
      description: link.description,
    });
    setFormErrors({});
    setEditingLink(link);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingLink(null);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formState.title.trim()) {
      errs.title = 'Titlul portalului este obligatoriu.';
    }
    if (!formState.url.trim()) {
      errs.url = 'Adresa URL este obligatorie.';
    } else if (!/^https?:\/\//i.test(formState.url.trim())) {
      errs.url = 'URL-ul trebuie să înceapă cu https:// sau http://';
    }
    if (!formState.description.trim()) {
      errs.description = 'Descrierea portalului este obligatorie.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!validate()) return;

    if (isCreating) {
      const ok = await run(() => directoryService.addUsefulLink({
        title: formState.title.trim(),
        url: formState.url.trim(),
        category: formState.category,
        description: formState.description.trim(),
        isExternal: true,
        isActive: true,
      }), `Link-ul util „${formState.title}” a fost adăugat!`);
      if (!ok) return;
    } else if (editingLink) {
      const ok = await run(() => directoryService.updateUsefulLink(editingLink.id, {
        title: formState.title.trim(),
        url: formState.url.trim(),
        category: formState.category,
        description: formState.description.trim(),
      }), `Link-ul util „${formState.title}” a fost actualizat cu succes!`);
      if (!ok) return;
    }

    handleCancelForm();
  };

  const handleToggleStatus = (link: UsefulLink) => {
    if (!canManage) return;
    const updatedStatus = !link.isActive;
    void run(
      () => directoryService.setUsefulLinkActive(link.id, updatedStatus),
      `Link-ul „${link.title}” este acum ${updatedStatus ? 'ACTIV' : 'DEZACTIVAT'} în zona publică.`,
    );
  };

  const handleDelete = (link: UsefulLink) => {
    if (!canManage) return;
    if (window.confirm(`Sigur doriți să ștergeți link-ul „${link.title}”?`)) {
      void run(() => directoryService.deleteUsefulLink(link.id), `Link-ul „${link.title}” a fost șters.`);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!canManage) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const newOrder = [...links];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    void run(() => directoryService.reorderUsefulLinks(newOrder.map(l => l.id)), 'Ordinea link-urilor a fost actualizată!');
  };

  if (data.loading && !data.data) return <LoadingBlock label="Se încarcă link-urile…" />;
  if (data.error && !data.data) return <ErrorBlock message={data.error} onRetry={data.reload} />;

  return (
    <div className="space-y-6">

      {/* Faza 5.3: operație refuzată de server — nu se afișează succes */}
      {actionError && (
        <div role="alert" className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} className="text-red-700 hover:text-red-900 font-bold">×</button>
        </div>
      )}
      
      {/* Bară de Acțiuni */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>Gestiune Portaluri & Link-uri Utile</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {links.length} portaluri ({links.filter(l => l.isActive !== false).length} active)
          </p>
        </div>

        {canManage && !isCreating && !editingLink && (
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adaugă Link Nou</span>
          </button>
        )}
      </div>

      {/* Formular Adăugare / Editare */}
      {(isCreating || editingLink) && (
        <form onSubmit={handleSaveForm} className="bg-slate-50 border-2 border-indigo-300 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>{isCreating ? 'Adăugare Link Nou' : `Editare: ${editingLink?.title}`}</span>
            </h4>
            <button
              type="button"
              onClick={handleCancelForm}
              className="tinta-iconita p-1.5 rounded-lg text-slate-400 hover:text-slate-600 bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Denumire portal / serviciu *</label>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                placeholder="ex: Ghișeul.ro — Plată Taxe Online"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.title ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'
                }`}
              />
              {formErrors.title && <p className="text-[11px] text-red-600">{formErrors.title}</p>}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Adresă URL completă *</label>
              <input
                type="url"
                value={formState.url}
                onChange={(e) => setFormState({ ...formState, url: e.target.value })}
                placeholder="https://www.ghiseul.ro"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.url ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'
                }`}
              />
              {formErrors.url && <p className="text-[11px] text-red-600">{formErrors.url}</p>}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Categorie portal</label>
              <select
                value={formState.category}
                onChange={(e) => setFormState({ ...formState, category: e.target.value as UsefulLink['category'] })}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Descriere scurtă *</label>
              <textarea
                rows={2}
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Platforma națională oficială pentru plata fără comision a taxelor locale..."
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.description ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'
                }`}
              />
              {formErrors.description && <p className="text-[11px] text-red-600">{formErrors.description}</p>}
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              {isCreating ? 'Salvează Link-ul' : 'Actualizează Link-ul'}
            </button>
          </div>
        </form>
      )}

      {/* Listă Link-uri */}
      <div className="space-y-3">
        {links.map((link, idx) => {
          const isInactive = link.isActive === false;

          return (
            <div
              key={link.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isInactive ? 'opacity-60 bg-slate-50 border-dashed border-slate-300' : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    {link.category}
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    {link.title}
                  </h4>
                  {isInactive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                      Dezactivat
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600">
                  {link.description}
                </p>

                <div className="text-[11px] text-indigo-600 pt-0.5 flex items-center gap-1 font-mono">
                  <span className="truncate max-w-md">{link.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </div>
              </div>

              {/* Acțiuni — Etapa 5D: vizibil doar cu `directory.links.manage` */}
              {canManage && (
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    title="Mută mai sus"
                    className="tinta-iconita p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === links.length - 1}
                    title="Mută mai jos"
                    className="tinta-iconita p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(link)}
                    title={isInactive ? 'Activează în zona publică' : 'Dezactivează din zona publică'}
                    className={`tinta-iconita p-1.5 rounded-lg border transition-colors ${
                      isInactive
                        ? 'border-slate-300 text-slate-400 hover:text-emerald-700 hover:border-emerald-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleStartEdit(link)}
                    title="Editează link-ul"
                    className="tinta-iconita p-1.5 rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(link)}
                    title="Șterge definitiv link-ul"
                    className="tinta-iconita p-1.5 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

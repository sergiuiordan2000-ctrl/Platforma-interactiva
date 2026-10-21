/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  Power, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Clock,
  UserCheck
} from 'lucide-react';
import { CityHallDepartment } from '../../../types/directory';
import { directoryService } from '../../../services/directoryService';
import { AdminUser } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';
import { ErrorBlock, LoadingBlock } from '../../common/LoadState';
import { useAsync } from '../../../hooks/useAsync';

interface AdminDepartmentsManagerProps {
  onSuccess: (msg: string) => void;
  currentUser: AdminUser | null;
}

export const AdminDepartmentsManager: React.FC<AdminDepartmentsManagerProps> = ({ onSuccess, currentUser }) => {
  // Etapa 5D: permisiunea `directory.departments.manage` controlează crearea, editarea,
  // reordonarea, activarea/dezactivarea și ștergerea direcțiilor. Verificare centrală.
  const canManage = permissionService.hasPermission(currentUser?.role, 'directory.departments.manage');

  // Faza 5.3: lista vine de la server (inclusiv direcțiile inactive); reîncărcare explicită după mutații
  const data = useAsync(() => directoryService.getAdminCityHallInfo(), []);
  const departments: CityHallDepartment[] = data.data?.departments ?? [];
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingDept, setEditingDept] = useState<CityHallDepartment | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Formular stare locală
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    location: '',
    phone: '',
    email: '',
    schedule: '',
    headOfDepartment: '',
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
      name: '',
      description: '',
      location: '',
      phone: '',
      email: '',
      schedule: '',
      headOfDepartment: '',
    });
    setFormErrors({});
    setIsCreating(true);
    setEditingDept(null);
  };

  const handleStartEdit = (dept: CityHallDepartment) => {
    if (!canManage) return;
    setFormState({
      name: dept.name,
      description: dept.description,
      location: dept.location || '',
      phone: dept.phone || '',
      email: dept.email || '',
      schedule: dept.schedule || '',
      headOfDepartment: dept.headOfDepartment || '',
    });
    setFormErrors({});
    setEditingDept(dept);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingDept(null);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formState.name.trim()) {
      errs.name = 'Denumirea direcției este obligatorie.';
    }
    if (!formState.description.trim()) {
      errs.description = 'Descrierea activității este obligatorie.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formState.email.trim() && !emailRegex.test(formState.email.trim())) {
      errs.email = 'Format de e-mail invalid.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!validate()) return;

    if (isCreating) {
      const ok = await run(() => directoryService.addDepartment({
        name: formState.name.trim(),
        description: formState.description.trim(),
        location: formState.location,
        phone: formState.phone,
        email: formState.email,
        schedule: formState.schedule,
        headOfDepartment: formState.headOfDepartment,
        isActive: true,
      }), `Direcția „${formState.name}” a fost adăugată cu succes!`);
      if (!ok) return;
    } else if (editingDept) {
      const ok = await run(() => directoryService.updateDepartment(editingDept.id, {
        name: formState.name.trim(),
        description: formState.description.trim(),
        location: formState.location,
        phone: formState.phone,
        email: formState.email,
        schedule: formState.schedule,
        headOfDepartment: formState.headOfDepartment,
      }), `Direcția „${formState.name}” a fost actualizată cu succes!`);
      if (!ok) return;
    }

    handleCancelForm();
  };

  const handleToggleStatus = (dept: CityHallDepartment) => {
    if (!canManage) return;
    const updatedStatus = !dept.isActive;
    void run(
      () => directoryService.setDepartmentActive(dept.id, updatedStatus),
      `Direcția „${dept.name}” este acum ${updatedStatus ? 'ACTIVĂ' : 'DEZACTIVATĂ'} în zona publică.`,
    );
  };

  const handleDelete = (dept: CityHallDepartment) => {
    if (!canManage) return;
    if (window.confirm(`Sigur doriți să ștergeți direcția „${dept.name}”?`)) {
      void run(() => directoryService.deleteDepartment(dept.id), `Direcția „${dept.name}” a fost ștearsă.`);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!canManage) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= departments.length) return;

    const newOrder = [...departments];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    void run(() => directoryService.reorderDepartments(newOrder.map(d => d.id)), 'Ordinea direcțiilor a fost actualizată!');
  };

  if (data.loading && !data.data) return <LoadingBlock label="Se încarcă direcțiile…" />;
  if (data.error && !data.data) return <ErrorBlock message={data.error} onRetry={data.reload} />;

  return (
    <div className="space-y-6">

      {/* Faza 5.3: operație refuzată de server (ex. direcție cu servicii) — nu se afișează succes */}
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
            <Building2 className="w-4 h-4 text-cyan-700" />
            <span>Gestiune Direcții & Servicii Administrative</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {departments.length} direcții înregistrate ({departments.filter(d => d.isActive !== false).length} active)
          </p>
        </div>

        {canManage && !isCreating && !editingDept && (
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adaugă Direcție Nouă</span>
          </button>
        )}
      </div>

      {/* Formular Adăugare / Editare Modal-like inline */}
      {(isCreating || editingDept) && (
        <form onSubmit={handleSaveForm} className="bg-slate-50 border-2 border-cyan-300 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-700" />
              <span>{isCreating ? 'Adăugare Direcție Nouă' : `Editare: ${editingDept?.name}`}</span>
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
              <label className="text-xs font-bold text-slate-700">Denumire direcție / serviciu *</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="ex: Direcția Urbanism și Amenajarea Teritoriului"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.name ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-cyan-200'
                }`}
              />
              {formErrors.name && <p className="text-[11px] text-red-600">{formErrors.name}</p>}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Descriere activitate & atribuții *</label>
              <textarea
                rows={2}
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Descrieți pe scurt atribuțiile pentru cetățeni..."
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.description ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-cyan-200'
                }`}
              />
              {formErrors.description && <p className="text-[11px] text-red-600">{formErrors.description}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Locație în sediu / adresă</label>
              <input
                type="text"
                value={formState.location}
                onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                placeholder="ex: Sediul Central, Parter, Cam. 12"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Șef departament / director</label>
              <input
                type="text"
                value={formState.headOfDepartment}
                onChange={(e) => setFormState({ ...formState, headOfDepartment: e.target.value })}
                placeholder="ex: Director Executiv"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Telefon direct</label>
              <input
                type="text"
                value={formState.phone}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                placeholder="0247 416 414"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">E-mail direct</label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                placeholder="urbanism@turnumagurele.ro"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.email ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-cyan-200'
                }`}
              />
              {formErrors.email && <p className="text-[11px] text-red-600">{formErrors.email}</p>}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Program de lucru cu publicul</label>
              <input
                type="text"
                value={formState.schedule}
                onChange={(e) => setFormState({ ...formState, schedule: e.target.value })}
                placeholder="ex: Marți și Joi: 09:00 – 13:00"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200"
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
              className="px-5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shadow-sm transition-all"
            >
              {isCreating ? 'Salvează Direcția' : 'Actualizează Modificările'}
            </button>
          </div>
        </form>
      )}

      {/* Listă Direcții Existente */}
      <div className="space-y-3">
        {departments.map((dept, idx) => {
          const isInactive = dept.isActive === false;

          return (
            <div
              key={dept.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isInactive ? 'opacity-60 bg-slate-50 border-dashed border-slate-300' : 'border-slate-200 hover:border-cyan-300'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    {dept.name}
                  </h4>
                  {isInactive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                      Dezactivat (Ascuns public)
                    </span>
                  )}
                  {dept.headOfDepartment && (
                    <span className="text-xs text-slate-500 font-medium">
                      • {dept.headOfDepartment}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {dept.description}
                </p>

                <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 pt-1">
                  {dept.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{dept.location}</span>
                    </span>
                  )}
                  {dept.phone && (
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Phone className="w-3 h-3 text-cyan-600" />
                      <span>{dept.phone}</span>
                    </span>
                  )}
                  {dept.email && (
                    <span className="flex items-center gap-1 text-blue-700">
                      <Mail className="w-3 h-3 text-blue-500" />
                      <span>{dept.email}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Panou de Acțiuni (Reorder, Status Toggle, Edit, Delete) — Etapa 5D: vizibil doar cu `directory.departments.manage` */}
              {canManage && (
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">

                  {/* Reordonare */}
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
                    disabled={idx === departments.length - 1}
                    title="Mută mai jos"
                    className="tinta-iconita p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Comutator Activ / Dezactivat */}
                  <button
                    onClick={() => handleToggleStatus(dept)}
                    title={isInactive ? 'Activează în zona publică' : 'Dezactivează din zona publică'}
                    className={`tinta-iconita p-1.5 rounded-lg border transition-colors ${
                      isInactive
                        ? 'border-slate-300 text-slate-400 hover:text-emerald-700 hover:border-emerald-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleStartEdit(dept)}
                    title="Editează direcția"
                    className="tinta-iconita p-1.5 rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(dept)}
                    title="Șterge definitiv direcția"
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

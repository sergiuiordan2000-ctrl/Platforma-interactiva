/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  Power, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  Clock, 
  Coins, 
  Building2,
  ExternalLink
} from 'lucide-react';
import { CityHallService } from '../../../types/directory';
import { directoryService } from '../../../services/directoryService';
import { AdminUser } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';

interface AdminServicesManagerProps {
  onSuccess: (msg: string) => void;
  currentUser: AdminUser | null;
}

export const AdminServicesManager: React.FC<AdminServicesManagerProps> = ({ onSuccess, currentUser }) => {
  // Etapa 5D: permisiunea `directory.services.manage` controlează CRUD-ul serviciilor.
  const canManage = permissionService.hasPermission(currentUser?.role, 'directory.services.manage');

  const [services, setServices] = useState<CityHallService[]>(() =>
    directoryService.getServices(true)
  );
  const departments = directoryService.getDepartments(false);

  const [editingService, setEditingService] = useState<CityHallService | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formState, setFormState] = useState({
    title: '',
    departmentId: departments[0]?.id || '',
    departmentName: departments[0]?.name || '',
    description: '',
    documentsText: '', // delimitat prin linie nouă
    processingTime: '',
    fee: '',
    onlineLink: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const refresh = () => {
    setServices(directoryService.getServices(true));
  };

  const handleStartCreate = () => {
    if (!canManage) return;
    setFormState({
      title: '',
      departmentId: departments[0]?.id || '',
      departmentName: departments[0]?.name || '',
      description: '',
      documentsText: '',
      processingTime: '',
      fee: '',
      onlineLink: '',
    });
    setFormErrors({});
    setIsCreating(true);
    setEditingService(null);
  };

  const handleStartEdit = (srv: CityHallService) => {
    if (!canManage) return;
    setFormState({
      title: srv.title,
      departmentId: srv.departmentId,
      departmentName: srv.departmentName,
      description: srv.description,
      documentsText: (srv.documentsRequired || []).join('\n'),
      processingTime: srv.processingTime || '',
      fee: srv.fee || '',
      onlineLink: srv.onlineLink || '',
    });
    setFormErrors({});
    setEditingService(srv);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingService(null);
    setFormErrors({});
  };

  const handleDepartmentChange = (depId: string) => {
    const selectedDept = departments.find(d => d.id === depId);
    setFormState({
      ...formState,
      departmentId: depId,
      departmentName: selectedDept ? selectedDept.name : 'Direcție Generală',
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formState.title.trim()) {
      errs.title = 'Titlul serviciului este obligatoriu.';
    }
    if (!formState.description.trim()) {
      errs.description = 'Descrierea serviciului este obligatorie.';
    }
    if (!formState.departmentId) {
      errs.departmentId = 'Selectați direcția responsabilă.';
    }
    if (formState.onlineLink && !/^https?:\/\//i.test(formState.onlineLink.trim())) {
      errs.onlineLink = 'Link-ul online trebuie să înceapă cu https:// sau http://';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!validate()) return;

    const docs = formState.documentsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (isCreating) {
      directoryService.addService({
        title: formState.title.trim(),
        departmentId: formState.departmentId,
        departmentName: formState.departmentName,
        description: formState.description.trim(),
        documentsRequired: docs.length > 0 ? docs : undefined,
        processingTime: formState.processingTime.trim() || undefined,
        fee: formState.fee.trim() || undefined,
        onlineLink: formState.onlineLink.trim() || undefined,
        isActive: true,
      });
      onSuccess(`Serviciul „${formState.title}” a fost adăugat în Ghid!`);
    } else if (editingService) {
      directoryService.updateService(editingService.id, {
        title: formState.title.trim(),
        departmentId: formState.departmentId,
        departmentName: formState.departmentName,
        description: formState.description.trim(),
        documentsRequired: docs.length > 0 ? docs : undefined,
        processingTime: formState.processingTime.trim() || undefined,
        fee: formState.fee.trim() || undefined,
        onlineLink: formState.onlineLink.trim() || undefined,
      });
      onSuccess(`Serviciul „${formState.title}” a fost actualizat cu succes!`);
    }

    handleCancelForm();
    refresh();
  };

  const handleToggleStatus = (srv: CityHallService) => {
    if (!canManage) return;
    directoryService.toggleServiceStatus(srv.id);
    const updatedStatus = !srv.isActive;
    onSuccess(`Serviciul „${srv.title}” este acum ${updatedStatus ? 'ACTIV' : 'DEZACTIVAT'} în zona publică.`);
    refresh();
  };

  const handleDelete = (srv: CityHallService) => {
    if (!canManage) return;
    if (window.confirm(`Sigur doriți să ștergeți serviciul „${srv.title}”?`)) {
      directoryService.deleteService(srv.id);
      onSuccess(`Serviciul „${srv.title}” a fost șters.`);
      refresh();
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!canManage) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= services.length) return;

    const newOrder = [...services];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    directoryService.reorderServices(newOrder.map(s => s.id));
    onSuccess('Ordinea serviciilor a fost actualizată!');
    refresh();
  };

  return (
    <div className="space-y-6">
      
      {/* Bară de Acțiuni */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-700" />
            <span>Gestiune Servicii & Acte Cetățeni</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {services.length} servicii înregistrate ({services.filter(s => s.isActive !== false).length} active în Ghid)
          </p>
        </div>

        {canManage && !isCreating && !editingService && (
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adaugă Serviciu Nou</span>
          </button>
        )}
      </div>

      {/* Formular Adăugare / Editare Serviciu */}
      {(isCreating || editingService) && (
        <form onSubmit={handleSaveForm} className="bg-slate-50 border-2 border-blue-300 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700" />
              <span>{isCreating ? 'Adăugare Serviciu Nou' : `Editare: ${editingService?.title}`}</span>
            </h4>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 bg-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Denumire serviciu / act *</label>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                placeholder="ex: Eliberare Certificat de Atestare Fiscală"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.title ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
              {formErrors.title && <p className="text-[11px] text-red-600">{formErrors.title}</p>}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Direcția responsabilă *</label>
              <select
                value={formState.departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
              >
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Descriere procedură *</label>
              <textarea
                rows={2}
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                placeholder="Descrieți scopul procedurii și cui se adresează..."
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.description ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
              {formErrors.description && <p className="text-[11px] text-red-600">{formErrors.description}</p>}
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">
                Acte și documente solicitate (Câte un document pe fiecare rând)
              </label>
              <textarea
                rows={4}
                value={formState.documentsText}
                onChange={(e) => setFormState({ ...formState, documentsText: e.target.value })}
                placeholder="Cerere tip completată&#10;Act de identitate (original și copie)&#10;Dovada achitării taxei"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono"
              />
              <p className="text-[11px] text-slate-400">Apăsați Enter pentru a introduce fiecare act din listă.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Termen legal de soluționare</label>
              <input
                type="text"
                value={formState.processingTime}
                onChange={(e) => setFormState({ ...formState, processingTime: e.target.value })}
                placeholder="ex: Maxim 2 zile lucrătoare"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Taxă de eliberare</label>
              <input
                type="text"
                value={formState.fee}
                onChange={(e) => setFormState({ ...formState, fee: e.target.value })}
                placeholder="ex: Gratuit sau 7 lei"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Link formular online / portal</label>
              <input
                type="url"
                value={formState.onlineLink}
                onChange={(e) => setFormState({ ...formState, onlineLink: e.target.value })}
                placeholder="https://ghiseul.ro sau https://turnumagurele.ro/formulare"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.onlineLink ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
              {formErrors.onlineLink && <p className="text-[11px] text-red-600">{formErrors.onlineLink}</p>}
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
              className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-sm transition-all"
            >
              {isCreating ? 'Salvează Serviciul' : 'Actualizează Serviciul'}
            </button>
          </div>
        </form>
      )}

      {/* Listă Servicii */}
      <div className="space-y-3">
        {services.map((srv, idx) => {
          const isInactive = srv.isActive === false;

          return (
            <div
              key={srv.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isInactive ? 'opacity-60 bg-slate-50 border-dashed border-slate-300' : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {srv.departmentName}
                  </span>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    {srv.title}
                  </h4>
                  {isInactive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                      Dezactivat
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {srv.description}
                </p>

                <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 pt-1">
                  {srv.processingTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>{srv.processingTime}</span>
                    </span>
                  )}
                  {srv.fee && (
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-600" />
                      <span>{srv.fee}</span>
                    </span>
                  )}
                  {srv.documentsRequired && (
                    <span className="text-slate-500">
                      • {srv.documentsRequired.length} acte solicitate
                    </span>
                  )}
                  {srv.onlineLink && (
                    <a
                      href={srv.onlineLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 flex items-center gap-1 hover:underline"
                    >
                      <span>Link Online</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Acțiuni — Etapa 5D: vizibil doar cu `directory.services.manage` */}
              {canManage && (
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
                    disabled={idx === services.length - 1}
                    title="Mută mai jos"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(srv)}
                    title={isInactive ? 'Activează în zona publică' : 'Dezactivează din zona publică'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isInactive
                        ? 'border-slate-300 text-slate-400 hover:text-emerald-700 hover:border-emerald-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleStartEdit(srv)}
                    title="Editează serviciul"
                    className="p-1.5 rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(srv)}
                    title="Șterge definitiv serviciul"
                    className="p-1.5 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 transition-colors"
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

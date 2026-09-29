/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PhoneCall, 
  Plus, 
  Edit3, 
  Trash2, 
  Power, 
  ArrowUp, 
  ArrowDown, 
  Phone, 
  Clock, 
  MapPin, 
  X, 
  Search,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { QuickDialContact } from '../../../types/quickDial';
import { filterContacts, quickDialService } from '../../../services/quickDialService';
import { AdminUser } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';
import { ErrorBlock, LoadingBlock } from '../../common/LoadState';
import { useAsync } from '../../../hooks/useAsync';

interface AdminQuickDialManagerProps {
  onSuccess: (msg: string) => void;
  currentUser: AdminUser | null;
}

export const AdminQuickDialManager: React.FC<AdminQuickDialManagerProps> = ({ onSuccess, currentUser }) => {
  // Etapa 5D: permisiunea `quickDial.contacts.manage` controlează CRUD-ul contactelor.
  const canManage = permissionService.hasPermission(currentUser?.role, 'quickDial.contacts.manage');

  // Faza 5.3: contactele și categoriile (inclusiv inactive) vin de la server; filtrarea este locală
  const data = useAsync(() => quickDialService.getAdmin(), []);
  const categories = data.data?.categories ?? [];

  const [activeFilterCat, setActiveFilterCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const allContacts = filterContacts(data.data?.contacts ?? [], 'all', '', false);
  const contacts: QuickDialContact[] = filterContacts(data.data?.contacts ?? [], activeFilterCat, searchQuery, false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingContact, setEditingContact] = useState<QuickDialContact | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    formattedPhone: '',
    categoryId: categories[0]?.id || 'urgente',
    categoryName: categories[0]?.name || 'Urgențe & Siguranță',
    shortDescription: '',
    availability: '24/7 (Non-stop)',
    address: '',
    isEmergency: false,
    isDemo: true,
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
      phone: '',
      formattedPhone: '',
      categoryId: categories[0]?.id || 'urgente',
      categoryName: categories[0]?.name || 'Urgențe & Siguranță',
      shortDescription: '',
      availability: '24/7 (Non-stop)',
      address: '',
      isEmergency: false,
      isDemo: true,
    });
    setFormErrors({});
    setIsCreating(true);
    setEditingContact(null);
  };

  const handleStartEdit = (contact: QuickDialContact) => {
    if (!canManage) return;
    setFormState({
      name: contact.name,
      phone: contact.phone,
      formattedPhone: contact.formattedPhone,
      categoryId: contact.categoryId,
      categoryName: contact.categoryName,
      shortDescription: contact.shortDescription || '',
      availability: contact.availability,
      address: contact.address || '',
      isEmergency: contact.isEmergency || false,
      isDemo: contact.isDemo,
    });
    setFormErrors({});
    setEditingContact(contact);
    setIsCreating(false);
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingContact(null);
    setFormErrors({});
  };

  const handleCategoryChange = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    setFormState({
      ...formState,
      categoryId: catId,
      categoryName: cat ? cat.name : 'General',
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formState.name.trim()) {
      errs.name = 'Denumirea serviciului / contactului este obligatorie.';
    }
    const cleanDigits = formState.phone.replace(/\D/g, '');
    if (!formState.phone.trim()) {
      errs.phone = 'Numărul de telefon este obligatoriu.';
    } else if (cleanDigits.length < 3) {
      errs.phone = 'Numărul de telefon trebuie să conțină minim 3 cifre (ex: 112).';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!validate()) return;

    const formatted = formState.formattedPhone.trim() || formState.phone.trim();

    if (isCreating) {
      const ok = await run(() => quickDialService.addContact({
        name: formState.name.trim(),
        phone: formState.phone.trim(),
        formattedPhone: formatted,
        categoryId: formState.categoryId,
        categoryName: formState.categoryName,
        shortDescription: formState.shortDescription,
        availability: formState.availability.trim() || '24/7 (Non-stop)',
        address: formState.address,
        isEmergency: formState.isEmergency,
        isActive: true,
      }), `Numărul util „${formState.name}” a fost adăugat cu succes!`);
      if (!ok) return;
    } else if (editingContact) {
      const ok = await run(() => quickDialService.updateContact(editingContact.id, {
        name: formState.name.trim(),
        phone: formState.phone.trim(),
        formattedPhone: formatted,
        categoryId: formState.categoryId,
        categoryName: formState.categoryName,
        shortDescription: formState.shortDescription,
        availability: formState.availability.trim() || '24/7 (Non-stop)',
        address: formState.address,
        isEmergency: formState.isEmergency,
      }), `Contactul „${formState.name}” a fost actualizat cu succes!`);
      if (!ok) return;
    }

    handleCancelForm();
  };

  const handleToggleStatus = (contact: QuickDialContact) => {
    if (!canManage) return;
    const updatedStatus = !contact.isActive;
    void run(
      () => quickDialService.setContactActive(contact.id, updatedStatus),
      `Contactul „${contact.name}” este acum ${updatedStatus ? 'ACTIV' : 'DEZACTIVAT'} în zona publică.`,
    );
  };

  const handleDelete = (contact: QuickDialContact) => {
    if (!canManage) return;
    if (window.confirm(`Sigur doriți să ștergeți numărul util „${contact.name}”?`)) {
      void run(() => quickDialService.deleteContact(contact.id), `Contactul „${contact.name}” a fost șters.`);
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!canManage) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= contacts.length) return;

    // serverul cere ordinea completă: cele două contacte își schimbă locul în lista întreagă (și când lista e filtrată)
    const full = allContacts.map((c) => c.id);
    const a = full.indexOf(contacts[index].id);
    const b = full.indexOf(contacts[targetIndex].id);
    [full[a], full[b]] = [full[b], full[a]];

    void run(() => quickDialService.reorderContacts(full), 'Ordinea contactelor a fost actualizată!');
  };

  if (data.loading && !data.data) return <LoadingBlock label="Se încarcă numerele utile…" />;
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
      
      {/* Bară Superioară: Titlu + Buton Adăugare */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-600" />
            <span>Gestiune Contacte & Numere Utile (Quick Dial)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {contacts.length} numere înregistrate ({contacts.filter(c => c.isActive !== false).length} active)
          </p>
        </div>

        {canManage && !isCreating && !editingContact && (
          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adaugă Număr Util Nou</span>
          </button>
        )}
      </div>

      {/* Formular Adăugare / Editare Contact */}
      {(isCreating || editingContact) && (
        <form onSubmit={handleSaveForm} className="bg-slate-50 border-2 border-emerald-300 rounded-3xl p-5 sm:p-6 space-y-4 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              <span>{isCreating ? 'Adăugare Contact Quick Dial Nou' : `Editare: ${editingContact?.name}`}</span>
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
              <label className="text-xs font-bold text-slate-700">Denumire serviciu / dispecerat *</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="ex: Dispecerat Avarii Apă-Canal"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                  formErrors.name ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-200'
                }`}
              />
              {formErrors.name && <p className="text-[11px] text-red-600">{formErrors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Număr telefon (pentru apelare tel:) *</label>
              <input
                type="text"
                value={formState.phone}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                placeholder="ex: 0247416990 sau 112"
                className={`w-full p-2.5 bg-white border rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 ${
                  formErrors.phone ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-200'
                }`}
              />
              {formErrors.phone && <p className="text-[11px] text-red-600">{formErrors.phone}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Număr afișat vizual (Formatat)</label>
              <input
                type="text"
                value={formState.formattedPhone}
                onChange={(e) => setFormState({ ...formState, formattedPhone: e.target.value })}
                placeholder="ex: 0247 416 990"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Categorie atribuită *</label>
              <select
                value={formState.categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Program / Disponibilitate</label>
              <input
                type="text"
                value={formState.availability}
                onChange={(e) => setFormState({ ...formState, availability: e.target.value })}
                placeholder="ex: 24/7 (Non-stop) sau Luni – Vineri: 08:00 – 16:00"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Descriere scurtă a intervenției</label>
              <input
                type="text"
                value={formState.shortDescription}
                onChange={(e) => setFormState({ ...formState, shortDescription: e.target.value })}
                placeholder="ex: Conducte sparte, canalizări înfundate, avarii rețea apă potabilă..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Adresă fizică / Sediu (Opțional)</label>
              <input
                type="text"
                value={formState.address}
                onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                placeholder="ex: Str. Portului nr. 14"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            {/* Checkbox-uri opțiuni */}
            <div className="sm:col-span-2 flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formState.isEmergency}
                  onChange={(e) => setFormState({ ...formState, isEmergency: e.target.checked })}
                  className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  <span>Contact prioritar / Urgență majoră (Evidențiere roșie)</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formState.isDemo}
                  onChange={(e) => setFormState({ ...formState, isDemo: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span className="text-xs font-medium text-slate-700">
                  Marchează ca DEMO
                </span>
              </label>
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              {isCreating ? 'Salvează Contactul' : 'Actualizează Contactul'}
            </button>
          </div>
        </form>
      )}

      {/* Bară de Filtrare și Căutare */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrează contacte după nume, telefon sau descriere..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <select
          value={activeFilterCat}
          onChange={(e) => setActiveFilterCat(e.target.value)}
          className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer"
        >
          <option value="all">Toate Categoriile</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grilă Contacte */}
      <div className="space-y-3">
        {contacts.map((contact, idx) => {
          const isInactive = contact.isActive === false;

          return (
            <div
              key={contact.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                contact.isEmergency ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-200'
              } ${isInactive ? 'opacity-50 bg-slate-50 border-dashed border-slate-300' : ''}`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                    {contact.categoryName}
                  </span>
                  {contact.isEmergency && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-red-600" />
                      <span>Urgență</span>
                    </span>
                  )}
                  {contact.isDemo && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      DEMO
                    </span>
                  )}
                  {isInactive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                      Dezactivat
                    </span>
                  )}
                </div>

                <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {contact.name}
                </h4>

                {contact.shortDescription && (
                  <p className="text-xs text-slate-600">
                    {contact.shortDescription}
                  </p>
                )}

                <div className="flex items-center gap-3 flex-wrap text-xs pt-1">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{contact.formattedPhone}</span>
                  </span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{contact.availability}</span>
                  </span>
                  {contact.address && (
                    <span className="text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{contact.address}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Acțiuni — Etapa 5D: vizibil doar cu `quickDial.contacts.manage` */}
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
                    disabled={idx === contacts.length - 1}
                    title="Mută mai jos"
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(contact)}
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
                    onClick={() => handleStartEdit(contact)}
                    title="Editează contactul"
                    className="p-1.5 rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(contact)}
                    title="Șterge definitiv contactul"
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

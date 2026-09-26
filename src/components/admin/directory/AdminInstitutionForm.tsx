/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Save, 
  Check, 
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { CityHallInfo } from '../../../types/directory';
import { directoryService } from '../../../services/directoryService';
import { AdminUser } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';

interface AdminInstitutionFormProps {
  onSuccess: (msg: string) => void;
  currentUser: AdminUser | null;
}

export const AdminInstitutionForm: React.FC<AdminInstitutionFormProps> = ({ onSuccess, currentUser }) => {
  const currentInfo = directoryService.getRawCityHallInfo();

  // Etapa 5D: doar utilizatorii cu permisiunea `directory.institution.edit` pot
  // modifica datele instituționale. Verificare centrală prin permissionService.
  const canEdit = permissionService.hasPermission(currentUser?.role, 'directory.institution.edit');

  const [formData, setFormData] = useState({
    institutionName: currentInfo.institutionName || '',
    shortName: currentInfo.shortName || '',
    county: currentInfo.county || '',
    address: currentInfo.address || '',
    postalCode: currentInfo.postalCode || '',
    primaryPhone: currentInfo.primaryPhone || '',
    secondaryPhone: currentInfo.secondaryPhone || '',
    fax: currentInfo.fax || '',
    primaryEmail: currentInfo.primaryEmail || '',
    registryEmail: currentInfo.registryEmail || '',
    websiteUrl: currentInfo.websiteUrl || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedRecently, setSavedRecently] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.institutionName.trim()) {
      newErrors.institutionName = 'Denumirea instituției este obligatorie.';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Adresa fizică este obligatorie.';
    }
    if (!formData.primaryPhone.trim()) {
      newErrors.primaryPhone = 'Numărul de telefon principal este obligatoriu.';
    } else if (formData.primaryPhone.replace(/\D/g, '').length < 3) {
      newErrors.primaryPhone = 'Introduceți un număr de telefon valid.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.primaryEmail.trim()) {
      newErrors.primaryEmail = 'Adresa de e-mail oficială este obligatorie.';
    } else if (!emailRegex.test(formData.primaryEmail)) {
      newErrors.primaryEmail = 'Format de e-mail invalid (ex: nume@domeniu.ro).';
    }

    if (formData.registryEmail && !emailRegex.test(formData.registryEmail)) {
      newErrors.registryEmail = 'Format de e-mail registratură invalid.';
    }

    if (!formData.websiteUrl.trim()) {
      newErrors.websiteUrl = 'URL-ul paginii web este obligatoriu.';
    } else if (!/^https?:\/\//i.test(formData.websiteUrl)) {
      newErrors.websiteUrl = 'URL-ul trebuie să înceapă cu http:// sau https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!validate()) return;

    directoryService.updateInstitutionInfo(formData);
    setSavedRecently(true);
    onSuccess('Datele instituționale ale Primăriei au fost actualizate și salvate cu succes!');
    setTimeout(() => setSavedRecently(false), 3000);
  };

  const handleReset = () => {
    if (!canEdit) return;
    if (window.confirm('Sigur doriți să resetați toate datele Ghidului Primăriei la setul demonstrativ inițial?')) {
      directoryService.resetToDemo();
      const fresh = directoryService.getRawCityHallInfo();
      setFormData({
        institutionName: fresh.institutionName || '',
        shortName: fresh.shortName || '',
        county: fresh.county || '',
        address: fresh.address || '',
        postalCode: fresh.postalCode || '',
        primaryPhone: fresh.primaryPhone || '',
        secondaryPhone: fresh.secondaryPhone || '',
        fax: fresh.fax || '',
        primaryEmail: fresh.primaryEmail || '',
        registryEmail: fresh.registryEmail || '',
        websiteUrl: fresh.websiteUrl || '',
      });
      onSuccess('Datele Ghidului Primăriei au fost resetate la valorile demonstrative inițiale.');
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">

      {/* Etapa 5D: notificare acces doar-vizualizare pentru rolurile fără permisiunea de editare */}
      {!canEdit && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Rolul curent are acces doar de vizualizare la Datele Instituționale. Modificarea nu este permisă.</span>
        </div>
      )}

      <fieldset disabled={!canEdit} className="space-y-6">

      {/* Notificare de succes recent */}
      {savedRecently && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Modificările au fost salvate și sunt vizibile imediat în interfața publică!</span>
        </div>
      )}

      {/* Secțiunea 1: Identificare & Adresă */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Identificare Instituțională & Sediu</span>
          </h3>
          <p className="text-xs text-slate-500">Denumire oficială, județ și adresa sediului administrativ</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Denumire completă instituție *</label>
            <input
              type="text"
              value={formData.institutionName}
              onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
              className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                errors.institutionName ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
              }`}
            />
            {errors.institutionName && <p className="text-[11px] text-red-600">{errors.institutionName}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Denumire scurtă</label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Județ / Unitate administrativă</label>
            <input
              type="text"
              value={formData.county}
              onChange={(e) => setFormData({ ...formData, county: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Adresă fizică completă *</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.address ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
            </div>
            {errors.address && <p className="text-[11px] text-red-600">{errors.address}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Cod poștal</label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Pagină web oficială *</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.websiteUrl ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
            </div>
            {errors.websiteUrl && <p className="text-[11px] text-red-600">{errors.websiteUrl}</p>}
          </div>
        </div>
      </div>

      {/* Secțiunea 2: Canale de Contact Instituționale */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" />
            <span>Centrale Telefonice & Corespondență E-mail</span>
          </h3>
          <p className="text-xs text-slate-500">Numere apelabile din zona publică și adrese oficiale de contact</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Telefon principal (Secretariat) *</label>
            <input
              type="text"
              value={formData.primaryPhone}
              onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
              placeholder="0247 416 410"
              className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                errors.primaryPhone ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
              }`}
            />
            {errors.primaryPhone && <p className="text-[11px] text-red-600">{errors.primaryPhone}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Telefon secundar (Opțional)</label>
            <input
              type="text"
              value={formData.secondaryPhone}
              onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
              placeholder="0247 416 411"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Fax instituțional</label>
            <input
              type="text"
              value={formData.fax}
              onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
              placeholder="0247 416 415"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">E-mail oficial primărie *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={formData.primaryEmail}
                onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                placeholder="primaria@turnumagurele.ro"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.primaryEmail ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'
                }`}
              />
            </div>
            {errors.primaryEmail && <p className="text-[11px] text-red-600">{errors.primaryEmail}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">E-mail registratură & petiții</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={formData.registryEmail}
                onChange={(e) => setFormData({ ...formData, registryEmail: e.target.value })}
                placeholder="registratura@turnumagurele.ro"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            {errors.registryEmail && <p className="text-[11px] text-red-600">{errors.registryEmail}</p>}
          </div>
        </div>
      </div>

      {/* Butoane de Acțiune — Etapa 5D: vizibile doar cu `directory.institution.edit` */}
      {canEdit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-slate-500 hover:text-red-700 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetează la valorile demonstrative inițiale</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>Salvează Modificările Instituționale</span>
          </button>
        </div>
      )}

      </fieldset>

    </form>
  );
};

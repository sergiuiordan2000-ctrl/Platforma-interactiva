/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Clock, CalendarCheck, Save, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { CityHallSchedule, CityHallAudience } from '../../../types/directory';
import { directoryService } from '../../../services/directoryService';
import { AdminUser } from '../../../services/authService';
import { permissionService } from '../../../services/permissionService';

interface AdminScheduleManagerProps {
  onSuccess: (msg: string) => void;
  currentUser: AdminUser | null;
}

export const AdminScheduleManager: React.FC<AdminScheduleManagerProps> = ({ onSuccess, currentUser }) => {
  // Etapa 5D: permisiunea `directory.schedule.manage` controlează editarea programului și audiențelor.
  const canManage = permissionService.hasPermission(currentUser?.role, 'directory.schedule.manage');

  const currentInfo = directoryService.getRawCityHallInfo();

  const [schedules, setSchedules] = useState<CityHallSchedule[]>(() => [
    ...(currentInfo.schedule || []),
  ]);

  const [audiences, setAudiences] = useState<CityHallAudience[]>(() => [
    ...(currentInfo.audienceSchedule || []),
  ]);

  const handleScheduleChange = (idx: number, field: keyof CityHallSchedule, val: string) => {
    const updated = [...schedules];
    updated[idx] = { ...updated[idx], [field]: val };
    setSchedules(updated);
  };

  const handleAddScheduleRow = () => {
    if (!canManage) return;
    setSchedules([...schedules, { day: 'Ziua', hours: '08:00 – 16:00', note: '' }]);
  };

  const handleDeleteScheduleRow = (idx: number) => {
    if (!canManage) return;
    setSchedules(schedules.filter((_, i) => i !== idx));
  };

  const handleAudienceChange = (idx: number, field: keyof CityHallAudience, val: string) => {
    const updated = [...audiences];
    updated[idx] = { ...updated[idx], [field]: val };
    setAudiences(updated);
  };

  const handleAddAudienceRow = () => {
    if (!canManage) return;
    setAudiences([
      ...audiences,
      { role: 'Funcție Conducere', schedule: 'Zi: 10:00 – 12:00', registrationNote: 'Înscriere prealabilă' },
    ]);
  };

  const handleDeleteAudienceRow = (idx: number) => {
    if (!canManage) return;
    setAudiences(audiences.filter((_, i) => i !== idx));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    directoryService.updateSchedule(schedules);
    directoryService.updateAudienceSchedule(audiences);
    onSuccess('Programul instituțional și calendarul audiențelor au fost salvate cu succes!');
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">

      {/* Etapa 5D: notificare acces doar-vizualizare pentru rolurile fără permisiunea de editare */}
      {!canManage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Rolul curent are acces doar de vizualizare la Program & Audiențe. Modificarea nu este permisă.</span>
        </div>
      )}

      <fieldset disabled={!canManage} className="space-y-6">

      {/* 1. Program de Lucru General & Ghișee */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Program de Funcționare cu Publicul</span>
            </h3>
            <p className="text-xs text-slate-500">Zilele, orele generale și intervalul de lucru la ghișee</p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={handleAddScheduleRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adaugă Rând</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {schedules.map((row, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Zile</label>
                <input
                  type="text"
                  value={row.day}
                  onChange={(e) => handleScheduleChange(idx, 'day', e.target.value)}
                  placeholder="ex: Luni – Joi"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Interval Orar</label>
                <input
                  type="text"
                  value={row.hours}
                  onChange={(e) => handleScheduleChange(idx, 'hours', e.target.value)}
                  placeholder="ex: 08:00 – 16:30"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Observații / Program Ghișeu</label>
                <input
                  type="text"
                  value={row.note || ''}
                  onChange={(e) => handleScheduleChange(idx, 'note', e.target.value)}
                  placeholder="ex: Program ghișee: 08:30 – 14:00"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {canManage && (
                <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleDeleteScheduleRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                    title="Șterge rândul"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Programul Audiențelor Conducerii */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-purple-600" />
              <span>Programul Audiențelor Conducerii Primăriei</span>
            </h3>
            <p className="text-xs text-slate-500">Zilele, intervalele orare și cerințele de înscriere pentru cetățeni</p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={handleAddAudienceRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adaugă Audiență</span>
            </button>
          )}
        </div>

        <div className="space-y-3">
          {audiences.map((row, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Funcție / Rol Oficial</label>
                <input
                  type="text"
                  value={row.role}
                  onChange={(e) => handleAudienceChange(idx, 'role', e.target.value)}
                  placeholder="ex: Primar"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Zi & Interval Orar</label>
                <input
                  type="text"
                  value={row.schedule}
                  onChange={(e) => handleAudienceChange(idx, 'schedule', e.target.value)}
                  placeholder="ex: Marți: 10:00 – 12:00"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Procedură Înscriere</label>
                <input
                  type="text"
                  value={row.registrationNote}
                  onChange={(e) => handleAudienceChange(idx, 'registrationNote', e.target.value)}
                  placeholder="ex: Înscriere prealabilă în baza unei cereri"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {canManage && (
                <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleDeleteAudienceRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                    title="Șterge rândul"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Salvare */}
      {canManage && (
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>Salvează Orarul și Audiențele</span>
          </button>
        </div>
      )}

      </fieldset>

    </form>
  );
};

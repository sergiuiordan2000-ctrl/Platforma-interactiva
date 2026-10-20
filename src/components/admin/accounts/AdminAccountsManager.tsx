/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Conturile Admin (Faza 5.2, D8, B2 §6.5): listă, creare, rol, dezactivare / reactivare, resetarea parolei
 * și a TOTP. Numai `accounts.manage` (super_admin); regulile sunt impuse de server. Parolele temporare se
 * afișează o singură dată. Fără ștergere (D8-2).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, KeyRound, RefreshCw, ShieldOff, UserPlus, Users } from 'lucide-react';
import { api, ApiError } from '../../../services/apiClient';
import { authService } from '../../../services/authService';
import { RecoveryCodesPanel } from '../AdminAuthSteps';

type Account = {
  id: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'primarie_operator';
  status: 'active' | 'disabled';
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
};

const ROLE_LABEL: Record<Account['role'], string> = {
  super_admin: 'Super administrator',
  primarie_operator: 'Operator Primărie',
};

const btn = 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-40';

export const AdminAccountsManager: React.FC = () => {
  const [items, setItems] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ label: string; value: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [form, setForm] = useState({ email: '', displayName: '', role: 'primarie_operator' as Account['role'] });
  const me = authService.getCurrentUser();

  const load = useCallback(async () => {
    try {
      setItems((await api.get<{ items: Account[] }>('/admin/accounts')).items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lista nu a putut fi încărcată.');
    }
  }, []);
  useEffect(() => void load(), [load]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Operația a eșuat.');
    }
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const res = await api.post<{ temporaryPassword: string }>('/admin/accounts', form);
      setSecret({ label: `Parola temporară pentru ${form.email}`, value: res.temporaryPassword });
      setForm({ email: '', displayName: '', role: 'primarie_operator' });
    });
  };

  if (codes) return <RecoveryCodesPanel codes={codes} onDone={() => setCodes(null)} />;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" /> Conturi Admin
        </h2>
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {secret && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1" data-testid="temporary-password">
            <div className="font-bold">{secret.label} (afișată o singură dată; se schimbă la prima autentificare):</div>
            <div className="font-mono text-sm select-all">{secret.value}</div>
            <button className="text-[11px] underline" onClick={() => setSecret(null)}>Am transmis parola, ascunde</button>
          </div>
        )}
        {/* 7B.3 (AM-11): pe ecrane înguste (sub `md`), fiecare cont apare ca un card (nume, rol, stare, butoane una sub
            alta); de la `md` în sus, tabelul este cel de dinainte. Același DOM, numai afișarea diferă. */}
        <div className="md:overflow-x-auto">
          <table className="w-full text-xs block md:table">
            <thead className="hidden md:table-header-group">
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-3">Cont</th><th className="pr-3">Rol</th><th className="pr-3">Stare</th><th className="pr-3">TOTP</th><th>Acțiuni</th>
              </tr>
            </thead>
            <tbody className="block md:table-row-group space-y-3 md:space-y-0">
              {items.map((a) => {
                const self = a.id === me?.id;
                return (
                  <tr key={a.id} className="block md:table-row border border-slate-200 rounded-2xl p-3 md:p-0 md:border-x-0 md:border-b-0 md:rounded-none md:border-slate-100 align-top space-y-2 md:space-y-0" data-testid="admin-account">
                    <td className="block md:table-cell md:py-2 md:pr-3">
                      <div className="font-bold text-slate-900">{a.displayName}{self && ' (dvs.)'}</div>
                      <div className="text-slate-500">{a.email}</div>
                    </td>
                    <td className="block md:table-cell md:pr-3">
                      <span className="md:hidden text-slate-500 mr-2">Rol</span>
                      <select value={a.role} disabled={self} className="border rounded-lg px-1 py-1"
                        onChange={(e) => void run(() => api.patch(`/admin/accounts/${a.id}`, { role: e.target.value }))}>
                        <option value="super_admin">{ROLE_LABEL.super_admin}</option>
                        <option value="primarie_operator">{ROLE_LABEL.primarie_operator}</option>
                      </select>
                    </td>
                    <td className="block md:table-cell md:pr-3"><span className="md:hidden text-slate-500 mr-2">Stare</span>{a.status === 'active' ? 'activ' : 'dezactivat'}{a.mustChangePassword && ' · parolă temporară'}</td>
                    <td className="block md:table-cell md:pr-3"><span className="md:hidden text-slate-500 mr-2">TOTP</span>{a.mfaEnabled ? 'configurat' : '—'}</td>
                    <td className="flex flex-wrap gap-1.5 md:table-cell md:space-x-1 md:space-y-1">
                      <button className={`${btn} border-slate-300`} disabled={self}
                        onClick={() => void run(() => api.patch(`/admin/accounts/${a.id}`, { status: a.status === 'active' ? 'disabled' : 'active' }))}>
                        {a.status === 'active' ? 'Dezactivează' : 'Reactivează'}
                      </button>
                      <button className={`${btn} border-slate-300`} disabled={self}
                        onClick={() => void run(async () => {
                          const r = await api.post<{ temporaryPassword: string }>(`/admin/accounts/${a.id}/reset-password`);
                          setSecret({ label: `Parola temporară nouă pentru ${a.email}`, value: r.temporaryPassword });
                        })}>
                        <KeyRound className="w-3 h-3 inline" /> Resetează parola
                      </button>
                      <button className={`${btn} border-slate-300`} disabled={self || !a.mfaEnabled}
                        onClick={() => { if (window.confirm(`Resetați TOTP pentru ${a.email}? Sesiunile și codurile de recuperare ale contului se anulează.`)) void run(() => api.post(`/admin/accounts/${a.id}/reset-mfa`)); }}>
                        <ShieldOff className="w-3 h-3 inline" /> Resetează TOTP
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={create} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-black text-slate-900 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Cont nou</h3>
        <p className="text-[11px] text-slate-500">Numai adrese controlate de proiect sau furnizate de Primărie (D8-6).</p>
        <div className="grid sm:grid-cols-3 gap-2">
          <input required type="email" placeholder="e-mail" className="border rounded-xl px-3 py-2 text-xs" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required placeholder="nume afișat" className="border rounded-xl px-3 py-2 text-xs" value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <select className="border rounded-xl px-3 py-2 text-xs" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Account['role'] })}>
            <option value="primarie_operator">{ROLE_LABEL.primarie_operator}</option>
            <option value="super_admin">{ROLE_LABEL.super_admin}</option>
          </select>
        </div>
        <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Creează contul</button>
      </form>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 space-y-2">
        <h3 className="font-black text-slate-900">Contul meu</h3>
        <button className={`${btn} border-slate-300`}
          onClick={() => { if (window.confirm('Generați coduri de recuperare noi? Cele vechi nu vor mai funcționa.')) void run(async () => setCodes(await authService.regenerateRecoveryCodes())); }}>
          <RefreshCw className="w-3 h-3 inline" /> Coduri de recuperare noi
        </button>
      </div>
    </div>
  );
};

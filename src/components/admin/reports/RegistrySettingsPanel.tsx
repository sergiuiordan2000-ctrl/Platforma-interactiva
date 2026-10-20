/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Fluxul către Primărie (B2 §6.5, N3-5, A17-1, A17-8, 2.13): destinatarul tehnic, comutatorul,
 * modul de participare al Primăriei și referința acordului scris. Numai `notifications.recipient.manage`
 * (super_admin). Orice schimbare se auditează; la pornirea fluxului, mesajele „în așteptare” pleacă automat.
 */

import React, { useEffect, useState } from 'react';
import { Building2, ChevronDown, ChevronUp, Loader2, Save } from 'lucide-react';
import { api, ApiError, userMessage } from '../../../services/apiClient';

interface Registry {
  recipientEmail: string | null;
  flowEnabled: boolean;
  primariaMode: 'none' | 'email_only' | 'platform';
  agreementReference: string | null;
  emailMode: 'simulated' | 'allowlist' | 'live';
}

const MODE_LABELS: Record<Registry['primariaMode'], string> = {
  none: 'Primăria nu participă',
  email_only: 'Primăria primește numai e-mailuri',
  platform: 'Primăria lucrează în platformă (poate marca „rezolvată”)',
};
const EMAIL_MODE_LABELS: Record<Registry['emailMode'], string> = {
  simulated: 'simulat: nu pleacă niciun e-mail real',
  allowlist: 'staging: numai adresele din listă',
  live: 'producție: e-mailuri reale',
};

export const RegistrySettingsPanel: React.FC<{ onSuccess: (m: string) => void }> = ({ onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Registry | null>(null);
  const [form, setForm] = useState<Registry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    api
      .get<Registry>('/admin/settings/registry')
      .then((r) => {
        setData(r);
        setForm(r);
      })
      .catch((err: unknown) => setError(userMessage(err, 'A apărut o eroare. Încercați din nou.')));
  }, [open, data]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.put<Registry & { releasedFromHold: number }>('/admin/settings/registry', {
        recipientEmail: form.recipientEmail?.trim() || null,
        flowEnabled: form.flowEnabled,
        primariaMode: form.primariaMode,
        agreementReference: form.agreementReference?.trim() || null,
      });
      setData(res);
      setForm(res);
      onSuccess(
        res.releasedFromHold > 0
          ? `Setările au fost salvate; ${res.releasedFromHold} mesaje „în așteptare” au fost repuse în coadă.`
          : 'Setările fluxului către Primărie au fost salvate.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Setările nu au putut fi salvate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3" data-testid="registry-settings">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
        <span className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-teal-700" /> Fluxul către Primărie (super_admin)
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open &&
        (!form ? (
          error ? (
            <p className="text-xs text-red-700">{error}</p>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Se încarcă...
            </div>
          )
        ) : (
          <div className="space-y-3 text-xs">
            <p className="text-slate-500">
              Modul e-mail al serverului: <strong>{EMAIL_MODE_LABELS[form.emailMode]}</strong>. Destinatarul nu este public și nu este adresa din Ghid.
            </p>
            <label className="block space-y-1">
              <span className="font-bold text-slate-700">Destinatarul tehnic al sesizărilor</span>
              <input
                type="email"
                value={form.recipientEmail ?? ''}
                onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
                placeholder="registratura@exemplu.ro"
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-bold text-slate-700">Participarea Primăriei</span>
              <select value={form.primariaMode} onChange={(e) => setForm({ ...form, primariaMode: e.target.value as Registry['primariaMode'] })} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">
                {(Object.keys(MODE_LABELS) as Registry['primariaMode'][]).map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="font-bold text-slate-700">Referința acordului scris al Primăriei (obligatorie în producție)</span>
              <input
                type="text"
                value={form.agreementReference ?? ''}
                onChange={(e) => setForm({ ...form, agreementReference: e.target.value })}
                placeholder="ex. nr. / data adresei de acord"
                className="w-full p-2.5 border border-slate-200 rounded-xl"
              />
            </label>
            <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input type="checkbox" checked={form.flowEnabled} onChange={(e) => setForm({ ...form, flowEnabled: e.target.checked })} />
              <span className="font-bold text-slate-800">Fluxul este pornit</span>
              <span className="text-slate-500">(oprit = mesajele așteaptă și pleacă automat la pornire)</span>
            </label>
            {error && <p role="alert" className="text-red-700 font-semibold">{error}</p>}
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvează
            </button>
          </div>
        ))}
    </div>
  );
};

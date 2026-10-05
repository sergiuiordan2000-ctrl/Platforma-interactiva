/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Autentificarea cetățeanului (B3 §8, A-9, D29–D31, 2.9): e-mail → cod de 6 cifre pe e-mail.
 * Același mesaj dacă adresa are cont sau nu (fără enumerare). Contul se cere numai pentru depunere.
 */

import React, { useState } from 'react';
import { KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { citizenService } from '../../services/citizenService';
import { ApiError } from '../../services/apiClient';
import { CITIZEN_ACCOUNT_EMAILS_PER_DAY } from '@tmc/shared';

interface CitizenLoginProps {
  onLoggedIn: () => void;
  /** Mesaj afișat deasupra (de ex. „sesiunea a expirat”). */
  notice?: string | null;
}

export const CitizenLogin: React.FC<CitizenLoginProps> = ({ onLoggedIn, notice }) => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [policy, setPolicy] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Introduceți o adresă de e-mail validă.');
      return;
    }
    if (!policy) {
      setError('Pentru a continua, acceptați regulile de utilizare.');
      return;
    }
    setBusy(true);
    try {
      const res = await citizenService.start(email.trim(), policy);
      setInfo(res.message);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Codul nu a putut fi trimis. Încercați din nou.');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Codul are 6 cifre.');
      return;
    }
    setBusy(true);
    try {
      await citizenService.verify(email.trim(), code.trim());
      onLoggedIn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Codul nu a putut fi verificat. Încercați din nou.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 max-w-xl mx-auto" data-testid="citizen-login">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Contul meu</h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Pentru a depune o sesizare aveți nevoie de un cont confirmat prin e-mail. Nu cerem nume, telefon sau parolă: primiți un cod pe e-mail. Restul aplicației se folosește fără cont.
          </p>
        </div>
      </div>

      {notice && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">{notice}</div>}

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-3" noValidate>
          <label htmlFor="citizen-email" className="block text-xs font-bold text-slate-700">
            Adresa de e-mail
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="citizen-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@exemplu.ro"
              className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input type="checkbox" checked={policy} onChange={(e) => setPolicy(e.target.checked)} className="mt-0.5" />
            <span className="text-[11px] text-slate-600 leading-relaxed">
              Accept regulile de utilizare: sesizările mele apar <strong>imediat și public</strong> pe hartă (fără e-mailul meu), fără verificare prealabilă; răspund de conținutul lor, inclusiv de fotografii; sesizările se păstrează 45 de zile și le pot șterge oricând; contul poate fi blocat pentru abuz.
            </span>
          </label>

          {error && <p role="alert" className="text-xs text-red-600 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            <span>Trimite codul pe e-mail</span>
          </button>
          {/* limita este afișată mereu: nu dezvăluie dacă o adresă are cont (constatarea 5.4.9) */}
          <p className="text-[11px] text-slate-500 leading-relaxed" data-testid="citizen-code-limit">
            Se pot cere cel mult {CITIZEN_ACCOUNT_EMAILS_PER_DAY} coduri pe zi pentru o adresă de e-mail.
          </p>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3" noValidate>
          {info && <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">{info} Codul este valabil 15 minute.</div>}
          <label htmlFor="citizen-code" className="block text-xs font-bold text-slate-700">
            Codul primit pe {email.trim()}
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="citizen-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-mono tracking-[0.4em] text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          {error && <p role="alert" className="text-xs text-red-600 font-semibold">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span>Confirmă codul</span>
          </button>
          <div className="flex items-center justify-between text-[11px]">
            <button type="button" className="font-bold text-blue-700 hover:underline" onClick={() => void sendCode()} disabled={busy}>
              Retrimite codul
            </button>
            <button
              type="button"
              className="font-bold text-slate-500 hover:underline"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
              }}
            >
              Altă adresă
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed" data-testid="citizen-code-limit">
            Se pot cere cel mult {CITIZEN_ACCOUNT_EMAILS_PER_DAY} coduri pe zi pentru o adresă de e-mail.
          </p>
        </form>
      )}
    </div>
  );
};

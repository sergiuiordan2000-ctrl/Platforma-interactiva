/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Autentificarea cetățeanului (B3 §8, A-9, D29–D31, 2.9): e-mail → cod de 6 cifre pe e-mail.
 * Același mesaj dacă adresa are cont sau nu (fără enumerare). Contul se cere numai pentru depunere.
 *
 * Amendamentul Google (G-1, §2, §8 A, §11.1, §12.1): dacă serverul are autentificarea cu Google configurată,
 * ordinea pe ecran este bifa regulilor → „Continuă cu Google” → „sau” → codul pe e-mail. Fără configurare,
 * ecranul rămâne cel de dinainte. În pagină nu se încarcă nimic de la Google (G-T1): sigla este desenată aici,
 * iar browserul ajunge la Google numai când cetățeanul apasă butonul.
 */

import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { citizenService } from '../../services/citizenService';
import { ApiError } from '../../services/apiClient';
import { CITIZEN_ACCOUNT_EMAILS_PER_DAY } from '@tmc/shared';

interface CitizenLoginProps {
  onLoggedIn: () => void;
  /** Mesaj afișat deasupra (de ex. „sesiunea a expirat”). */
  notice?: string | null;
  /** Mesajul de la întoarcerea de la Google, după un refuz (`#sesizari?google=<motiv>`). */
  googleNotice?: string | null;
}

const POLICY_REQUIRED = 'Pentru a continua, acceptați regulile de utilizare.';
const GOOGLE_START_FAILED = 'Autentificarea cu Google nu a putut fi pornită. Încercați din nou sau folosiți codul primit pe e-mail.';

/** Sigla „G” standard, în culorile ei (regulile Google: fără recolorare, pe fond alb). Desenată în pagină, fără descărcare. */
const GoogleLogo: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false" className="shrink-0">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export const CitizenLogin: React.FC<CitizenLoginProps> = ({ onLoggedIn, notice, googleNotice }) => {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [policy, setPolicy] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // amendamentul Google: butonul există numai dacă serverul răspunde 200 la `GET /citizen/auth/google` (§12.1 a)
  const [google, setGoogle] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleNoticeHidden, setGoogleNoticeHidden] = useState(false);

  useEffect(() => {
    let active = true;
    void citizenService.googleEnabled().then((enabled) => {
      if (active) setGoogle(enabled);
    });
    // întoarcerea cu „Înapoi” de la Google poate reafișa pagina din memoria browserului, cu butonul încă „ocupat”
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setGoogleBusy(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      active = false;
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  /** §8 A: bifa regulilor este obligatorie înainte de Google (serverul o verifică din nou). §11.1: pornirea este un `POST`. */
  const continueWithGoogle = async () => {
    setError(null);
    setGoogleError(null);
    setGoogleNoticeHidden(true);
    if (!policy) {
      setGoogleError(POLICY_REQUIRED);
      return;
    }
    setGoogleBusy(true);
    try {
      // adresa este validată strict în serviciu (numai Google sau, local, furnizorul fals); `null` = respinsă
      const url = await citizenService.googleStart();
      if (url === null) throw new Error('adresă de autorizare respinsă');
      window.location.assign(url); // butonul rămâne „ocupat” până la plecarea din pagină
    } catch (err) {
      setGoogleBusy(false);
      setGoogleError(err instanceof ApiError && err.status !== 404 ? err.message : GOOGLE_START_FAILED);
    }
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setGoogleError(null);
    setGoogleNoticeHidden(true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Introduceți o adresă de e-mail validă.');
      return;
    }
    if (!policy) {
      setError(POLICY_REQUIRED);
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

  const policyBox = (
    <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer" data-testid="citizen-policy">
      <input type="checkbox" checked={policy} onChange={(e) => setPolicy(e.target.checked)} className="mt-0.5" />
      <span className="text-[11px] text-slate-600 leading-relaxed">
        Accept regulile de utilizare: sesizările mele apar <strong>imediat și public</strong> pe hartă (fără e-mailul meu), fără verificare prealabilă; răspund de conținutul lor, inclusiv de fotografii; sesizările se păstrează 45 de zile și le pot șterge oricând; contul poate fi blocat pentru abuz.
      </span>
    </label>
  );

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4 max-w-xl mx-auto" data-testid="citizen-login">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">Contul meu</h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {google
              ? 'Pentru a depune o sesizare aveți nevoie de un cont. Nu cerem nume, telefon sau parolă: intrați cu contul Google sau cu un cod primit pe e-mail. Restul aplicației se folosește fără cont.'
              : 'Pentru a depune o sesizare aveți nevoie de un cont confirmat prin e-mail. Nu cerem nume, telefon sau parolă: primiți un cod pe e-mail. Restul aplicației se folosește fără cont.'}
          </p>
        </div>
      </div>

      {notice && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">{notice}</div>}

      {googleNotice && !googleNoticeHidden && (
        <div role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900" data-testid="citizen-google-message">
          {googleNotice}
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-3" noValidate>
          {/* G-1 / §2: cu Google configurat, bifa este prima (obligatorie pentru ambele variante), apoi butonul Google */}
          {google && policyBox}
          {google && (
            <div className="space-y-3" data-testid="citizen-google-block">
              <button
                type="button"
                onClick={() => void continueWithGoogle()}
                disabled={googleBusy || busy}
                data-testid="citizen-google"
                className="w-full py-3 pl-3 pr-3 rounded-full bg-white hover:bg-slate-50 border border-[#747775] text-[#1F1F1F] text-sm leading-5 font-medium flex items-center justify-center gap-2.5 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-200"
                style={{ fontFamily: '"Google Sans", Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif' }}
              >
                {googleBusy ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : <GoogleLogo />}
                <span>Continuă cu Google</span>
              </button>
              {googleError && <p role="alert" className="text-xs text-red-600 font-semibold" data-testid="citizen-google-error">{googleError}</p>}
              <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-400" data-testid="citizen-login-or">
                <span className="h-px flex-1 bg-slate-200" />
                <span>sau</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </div>
          )}

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

          {/* fără Google: ecranul de dinainte, cu bifa sub adresa de e-mail */}
          {!google && policyBox}

          {error && <p role="alert" className="text-xs text-red-600 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={busy || googleBusy}
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

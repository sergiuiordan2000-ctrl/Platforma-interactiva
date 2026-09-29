/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pașii de după parolă (Faza 5.2, B3 §5–§6): înrolarea TOTP (cod QR + secret text, DN-16), codul TOTP sau
 * un cod de recuperare (2.15-A), schimbarea parolei temporare. Codurile de recuperare se afișează o singură dată.
 */

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { AlertCircle, KeyRound, LogOut, ShieldCheck, Smartphone } from 'lucide-react';
import { authService, type AuthStep } from '../../services/authService';

const card = 'max-w-md mx-auto my-8 bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-5';
const input =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
const primary =
  'w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-50';

const ErrorBox: React.FC<{ text: string | null }> = ({ text }) =>
  text ? (
    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{text}</span>
    </div>
  ) : null;

const LogoutLink: React.FC = () => (
  <button type="button" onClick={() => void authService.logout()} className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
    <LogOut className="w-3.5 h-3.5" /> Renunță (deconectare)
  </button>
);

/** Codurile de recuperare, afișate o singură dată. */
export const RecoveryCodesPanel: React.FC<{ codes: string[]; onDone: () => void }> = ({ codes, onDone }) => (
  <div className={card}>
    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
      <KeyRound className="w-5 h-5 text-amber-600" /> Coduri de recuperare
    </h2>
    <p className="text-xs text-slate-600">
      Păstrați aceste coduri într-un loc sigur (de exemplu tipărite sau într-un manager de parole). Fiecare cod se
      folosește o singură dată, dacă pierdeți telefonul. <strong>Nu vor mai fi afișate.</strong>
    </p>
    <ul className="grid grid-cols-2 gap-2 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl p-3" data-testid="recovery-codes">
      {codes.map((c) => (
        <li key={c}>{c}</li>
      ))}
    </ul>
    <button type="button" className={primary} onClick={onDone}>
      Am salvat codurile
    </button>
  </div>
);

const TotpEnroll: React.FC<{ onCodes: (codes: string[]) => void }> = ({ onCodes }) => {
  const [secret, setSecret] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    authService
      .startEnrollment()
      .then(async (r) => {
        setSecret(r.secretBase32);
        setQr(await QRCode.toDataURL(r.otpauthUri, { margin: 1, width: 200 }));
      })
      .catch(() => setError('Configurarea nu a putut porni. Autentificați-vă din nou.'));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authService.confirmEnrollment(code.trim());
    setBusy(false);
    if (res.success && res.recoveryCodes) onCodes(res.recoveryCodes);
    else setError(res.error ?? 'Cod incorect.');
  };

  return (
    <form className={card} onSubmit={submit}>
      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-blue-600" /> Configurați codul de autentificare
      </h2>
      <ol className="text-xs text-slate-600 list-decimal pl-4 space-y-1">
        <li>Instalați pe telefon o aplicație de autentificare (Google Authenticator, Microsoft Authenticator, Aegis etc.).</li>
        <li>Scanați codul QR sau introduceți manual cheia de mai jos.</li>
        <li>Scrieți codul de 6 cifre afișat de aplicație.</li>
      </ol>
      {qr && <img src={qr} alt="Cod QR pentru aplicația de autentificare" className="mx-auto w-48 h-48" />}
      {secret && (
        <p className="text-center font-mono text-xs break-all bg-slate-50 border border-slate-200 rounded-xl p-2" data-testid="totp-secret">
          {secret}
        </p>
      )}
      <ErrorBox text={error} />
      <input className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
        value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label="Cod de 6 cifre" />
      <button type="submit" className={primary} disabled={busy || code.length !== 6}>
        <ShieldCheck className="w-4 h-4" /> Confirmă
      </button>
      <div className="text-center"><LogoutLink /></div>
    </form>
  );
};

const TotpVerify: React.FC = () => {
  const [recovery, setRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = recovery ? await authService.useRecoveryCode(code.trim()) : await authService.verifyTotp(code.trim());
    setBusy(false);
    if (!res.success) setError(res.error ?? 'Cod incorect.');
  };

  return (
    <form className={card} onSubmit={submit}>
      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" /> {recovery ? 'Cod de recuperare' : 'Cod de autentificare'}
      </h2>
      <p className="text-xs text-slate-600">
        {recovery
          ? 'Introduceți unul dintre codurile de recuperare salvate (fiecare se folosește o singură dată).'
          : 'Introduceți codul de 6 cifre din aplicația de autentificare de pe telefon.'}
      </p>
      <ErrorBox text={error} />
      <input className={input} autoComplete="one-time-code" placeholder={recovery ? 'xxxx-xxxx-xxxx' : '000000'}
        value={code} onChange={(e) => setCode(recovery ? e.target.value : e.target.value.replace(/\D/g, ''))}
        maxLength={recovery ? 20 : 6} aria-label={recovery ? 'Cod de recuperare' : 'Cod de 6 cifre'} />
      <button type="submit" className={primary} disabled={busy || (!recovery && code.length !== 6)}>
        Continuă
      </button>
      <div className="flex justify-between">
        <button type="button" className="text-xs text-blue-700 hover:underline" onClick={() => { setRecovery(!recovery); setCode(''); setError(null); }}>
          {recovery ? 'Folosește codul din aplicație' : 'Am pierdut telefonul (cod de recuperare)'}
        </button>
        <LogoutLink />
      </div>
    </form>
  );
};

export const ChangePasswordForm: React.FC<{ title?: string; onDone?: () => void }> = ({ title, onDone }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== repeat) return setError('Parolele noi nu coincid.');
    if (next.length < 12) return setError('Parola nouă trebuie să aibă cel puțin 12 caractere.');
    setBusy(true);
    const res = await authService.changePassword(current, next);
    setBusy(false);
    if (!res.success) setError(res.error ?? 'Parola nu a putut fi schimbată.');
    else onDone?.();
  };

  return (
    <form className={card} onSubmit={submit}>
      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-blue-600" /> {title ?? 'Alegeți o parolă nouă'}
      </h2>
      <p className="text-xs text-slate-600">Minimum 12 caractere. O frază lungă, ușor de ținut minte, este cea mai bună alegere.</p>
      <ErrorBox text={error} />
      <input className={input} type="password" autoComplete="current-password" placeholder="Parola actuală (temporară)"
        value={current} onChange={(e) => setCurrent(e.target.value)} aria-label="Parola actuală" />
      <input className={input} type="password" autoComplete="new-password" placeholder="Parola nouă"
        value={next} onChange={(e) => setNext(e.target.value)} aria-label="Parola nouă" />
      <input className={input} type="password" autoComplete="new-password" placeholder="Repetați parola nouă"
        value={repeat} onChange={(e) => setRepeat(e.target.value)} aria-label="Repetați parola nouă" />
      <button type="submit" className={primary} disabled={busy}>Salvează parola</button>
      <div className="text-center"><LogoutLink /></div>
    </form>
  );
};

/** Ecranul potrivit pasului curent; codurile de recuperare se afișează înaintea pasului următor. */
export const AdminAuthSteps: React.FC<{ step: AuthStep }> = ({ step }) => {
  const [codes, setCodes] = useState<string[] | null>(null);
  if (codes) return <RecoveryCodesPanel codes={codes} onDone={() => { setCodes(null); void authService.refresh(); }} />;
  if (step === 'mfa_enroll') return <TotpEnroll onCodes={setCodes} />;
  if (step === 'mfa_required') return <TotpVerify />;
  if (step === 'change_password') return <ChangePasswordForm />;
  return null;
};

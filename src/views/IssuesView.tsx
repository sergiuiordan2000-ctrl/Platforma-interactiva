/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Ban, FileText, Info, ListChecks, Loader2, LogOut, PlusCircle, UserX } from 'lucide-react';
import { AppView } from '../types/navigation';
import { ReportForm, type SubmittedReport } from '../components/report/ReportForm';
import { ReportConfirmation } from '../components/report/ReportConfirmation';
import { CitizenLogin } from '../components/report/CitizenLogin';
import { MyReports } from '../components/report/MyReports';
import { citizenService, takeGoogleReturnMessage, type CitizenMe } from '../services/citizenService';
import { userMessage } from '../services/apiClient';

interface IssuesViewProps {
  onNavigate: (view: AppView) => void;
  /** `#contul-meu` deschide direct lista proprie. */
  initialTab?: 'new' | 'mine';
}

/**
 * Faza 5.4 (B2 §7, A-9, D27): „Depune o sesizare” cere contul confirmat; lista proprie și ștergerea
 * sunt în „Contul meu”. Restul aplicației rămâne fără cont. Nimic în `localStorage`.
 */
export const IssuesView: React.FC<IssuesViewProps> = ({ onNavigate, initialTab = 'new' }) => {
  const [me, setMe] = useState<CitizenMe | null | undefined>(undefined); // undefined = se verifică
  const [meError, setMeError] = useState<string | null>(null);
  const [tab, setTab] = useState<'new' | 'mine'>(initialTab);
  const [submitted, setSubmitted] = useState<SubmittedReport | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [myCount, setMyCount] = useState<number | null>(null);
  // amendamentul Google: mesajul de la întoarcerea cu refuz (`#sesizari?google=<motiv>`); adresa se curăță la citire
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  useEffect(() => {
    const message = takeGoogleReturnMessage();
    if (message) setGoogleNotice(message);
  }, []);

  const loadMe = useCallback(async () => {
    setMeError(null);
    try {
      setMe(await citizenService.me());
    } catch (err) {
      setMeError(userMessage(err, 'Contul nu a putut fi verificat.'));
      setMe(null);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  useEffect(() => setTab(initialTab), [initialTab]);

  const logout = async () => {
    setBusy(true);
    try {
      await citizenService.logout();
    } finally {
      setBusy(false);
      setMe(null);
      setSubmitted(null);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    try {
      await citizenService.deleteAccount();
      setMe(null);
      setSubmitted(null);
      setConfirmDeleteAccount(false);
      setNotice('Contul a fost șters. Sesizările depuse rămân până la termenul lor (45 de zile), fără legătură cu vreun cont.');
    } catch (err) {
      setNotice(userMessage(err, 'Contul nu a putut fi șters.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* 1. Antet */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-wider">
          <AlertCircle className="w-4 h-4" />
          <span>Sesizări cetățenești • Contul meu</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Sesizări Cetățenești Turnu Măgurele</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Semnalează o problemă urbană. Sesizarea apare imediat pe harta publică și primește un identificator intern (TM-XXX); la cererea dumneavoastră, este transmisă și Primăriei.
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start justify-between gap-3">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-bold" aria-label="Închide mesajul">
            ×
          </button>
        </div>
      )}

      {/* 2. Conținut */}
      {me === undefined ? (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 p-10">
          <Loader2 className="w-4 h-4 animate-spin" /> Se verifică contul...
        </div>
      ) : me === null ? (
        <>
          {meError && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 max-w-xl mx-auto">{meError}</div>}
          <CitizenLogin
            notice={notice}
            googleNotice={googleNotice}
            onLoggedIn={() => {
              setNotice(null);
              setGoogleNotice(null);
              void loadMe();
            }}
          />
        </>
      ) : (
        <>
          {/* bara contului */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm" data-testid="citizen-account-bar">
            <div className="text-xs text-slate-600">
              Autentificat ca <strong className="text-slate-900">{me.email}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void logout()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
              >
                <LogOut className="w-3.5 h-3.5" /> Ieșire
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteAccount(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-slate-200 text-slate-500 hover:text-red-700 font-bold text-[11px]"
              >
                <UserX className="w-3.5 h-3.5" /> Șterge contul
              </button>
            </div>
            {confirmDeleteAccount && (
              <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Contul și adresa de e-mail se șterg definitiv. Sesizările depuse <strong>rămân</strong> până la termenul de 45 de zile (le puteți șterge înainte din „Sesizările mele”).
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => void deleteAccount()} disabled={busy} className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold">
                    Da, șterge contul
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteAccount(false)} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold">
                    Renunță
                  </button>
                </span>
              </div>
            )}
          </div>

          {me.blocked.active && (
            <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
              <Ban className="w-5 h-5 text-red-600 shrink-0" />
              <span>
                Contul nu poate depune sesizări{' '}
                {me.blocked.kind === 'temporary' && me.blocked.endsAt
                  ? `până la ${new Date(me.blocked.endsAt).toLocaleString('ro-RO')}`
                  : 'în acest moment'}
                . Puteți vedea și șterge în continuare sesizările proprii.
              </span>
            </div>
          )}

          {/* file */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('new')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                tab === 'new' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> Sesizare nouă
            </button>
            <button
              type="button"
              onClick={() => setTab('mine')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all ${
                tab === 'mine' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" /> Sesizările mele{myCount !== null ? ` (${myCount})` : ''}
            </button>
          </div>

          {tab === 'mine' ? (
            <MyReports onChanged={setMyCount} />
          ) : me.blocked.active ? null : submitted ? (
            <ReportConfirmation
              report={submitted}
              onReset={() => {
                setSubmitted(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onNavigate={onNavigate}
            />
          ) : (
            <ReportForm
              accountEmail={me.email}
              onSuccess={(r) => {
                setSubmitted(r);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSessionExpired={() => {
                setNotice('Sesiunea contului a expirat. Autentificați-vă din nou.');
                setMe(null);
              }}
            />
          )}
        </>
      )}

      {/* 3. Notă */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start justify-between gap-4 text-xs text-slate-600">
        <div className="space-y-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Cum funcționează sesizările</span>
          </div>
          <p className="leading-relaxed">
            Sesizările se salvează pe serverul platformei și apar imediat pe hartă, fără moderare, dacă au o poziție în municipiu. Datele contului nu sunt publice. La cererea dumneavoastră, sesizarea se transmite pe e-mail Primăriei; stadiul („nouă”, „în analiză”, „rezolvată”) se vede public. <FileText className="inline w-3 h-3" /> <code>TM-XXX</code> nu este un număr oficial de înregistrare.
          </p>
        </div>
        <button
          onClick={() => onNavigate('home')}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs whitespace-nowrap transition-colors self-start sm:self-center"
        >
          ← Înapoi la Acasă
        </button>
      </div>
    </div>
  );
};

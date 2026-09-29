/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, Mail, KeyRound, AlertCircle, ShieldCheck, ArrowRight, Info } from 'lucide-react';
import { authService } from '../../services/authService';

interface AdminLoginFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({ onSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Vă rugăm să introduceți adresa de e-mail a contului de administrator.');
      return;
    }

    if (!password) {
      setError('Vă rugăm să introduceți parola.');
      return;
    }

    setIsLoading(true);
    void authService.login(email, password).then((res) => {
      setIsLoading(false);
      if (res.success) {
        setPassword('');
        onSuccess();
      } else {
        setError(res.error || 'E-mail sau parolă incorecte.');
      }
    });
  };

  return (
    <div className="max-w-md mx-auto my-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Card Principal Autentificare */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        
        {/* Antet */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Autentificare Administrator
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Accesați panoul de gestiune pentru Ghidul Primăriei și Quick Dial Turnu Măgurele.
          </p>
        </div>

        {/* Mesaj de eroare */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Formular de autentificare */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              E-mail administrator
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nume@exemplu.ro"
                autoComplete="email"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Parolă
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>{isLoading ? 'Se verifică accesul...' : 'Conectare în Panou'}</span>
            </button>
          </div>
        </form>

        {/* Link Înapoi */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-700 font-medium"
          >
            ← Înapoi la ecranul public Acasă
          </button>
        </div>

      </div>

      {/* Faza 5.2: autentificarea se verifică pe server */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 space-y-1.5 shadow-sm">
        <div className="font-bold flex items-center gap-1.5 text-slate-900">
          <Info className="w-4 h-4 text-slate-600 shrink-0" />
          <span>Autentificare pe server</span>
        </div>
        <p className="leading-relaxed text-[11px] text-slate-600">
          Parola și codul de autentificare (TOTP) sunt verificate pe server; sesiunea expiră după 60 de minute de inactivitate.
        </p>
      </div>

    </div>
  );
};

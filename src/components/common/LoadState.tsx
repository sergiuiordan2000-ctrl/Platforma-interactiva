/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';

/** Faza 5.3 (B2 §7): starea „se încarcă” a unei liste sau a unui ecran. */
export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Se încarcă…' }) => (
  <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500" data-testid="load-state-loading">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>{label}</span>
  </div>
);

/** Faza 5.3 (B2 §7): eroarea de încărcare, cu reîncercare. */
export const ErrorBlock: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="text-center py-10 bg-white rounded-2xl border border-rose-200 p-6 space-y-3" data-testid="load-state-error">
    <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
    <p className="text-sm font-semibold text-slate-800">Datele nu au putut fi încărcate.</p>
    <p className="text-xs text-slate-500 max-w-sm mx-auto">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Încearcă din nou</span>
      </button>
    )}
  </div>
);

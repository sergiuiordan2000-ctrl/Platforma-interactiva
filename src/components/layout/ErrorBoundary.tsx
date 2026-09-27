/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Navigare la pagina principală (resetează și eroarea, prin schimbarea paginii). */
  onGoHome: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Plasă de siguranță pentru erorile de afișare ale conținutului unei pagini.
 * O excepție la randare nu mai demontează întreaga aplicație (ecran alb): antetul și navigarea
 * rămân funcționale, iar în zona paginii apare un mesaj de rezervă, fără detalii tehnice.
 * Nu modifică datele salvate. Nu prinde erorile din handlere de evenimente sau din codul asincron.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Eroare la afișarea paginii:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="max-w-2xl mx-auto my-8 p-6 rounded-2xl bg-red-50 border border-red-300 text-red-800 shadow-sm space-y-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm sm:text-base">A apărut o eroare la afișarea acestei pagini.</p>
            <p className="text-xs sm:text-sm leading-relaxed">
              Puteți reîncărca pagina sau reveni la pagina principală.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reîncarcă pagina</span>
          </button>
          <button
            type="button"
            onClick={this.props.onGoHome}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-sm"
          >
            <Home className="w-4 h-4" />
            <span>Pagina principală</span>
          </button>
        </div>
      </div>
    );
  }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { AppView } from '../types/navigation';
import { PublicSurveysList } from '../components/surveys/PublicSurveysList';

interface SurveysViewProps {
  onNavigate: (view: AppView) => void;
}

export const SurveysView: React.FC<SurveysViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300 pb-12">
      
      {/* Bară Superioară Înapoi */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Înapoi la ecranul principal</span>
        </button>
      </div>

      {/* Componentă Principală: Listă Sondaje Publice & Flux de Vot (Etapa 4C) */}
      <PublicSurveysList />

    </div>
  );
};

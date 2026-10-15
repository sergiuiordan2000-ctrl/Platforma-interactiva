import React from 'react';
import { Building2, ShieldAlert } from 'lucide-react';
import { AppView } from '../../types/navigation';

interface FooterProps {
  onNavigate: (view: AppView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-16 pb-20 lg:pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Coloana 1: Identitate & Misiune */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg tracking-tight">Turnu Măgurele Civic</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Platformă digitală civică independentă dedicată locuitorilor municipiului Turnu Măgurele, județul Teleorman. Creată pentru informare rapidă, semnalarea problemelor urbane și consultare publică.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Versiune: <strong>Etapa 1A (Scheletul Aplicației)</strong></span>
            </div>
          </div>

          {/* Coloana 2: Notă Legală & Delimitare Instituțională */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Notă privind delimitarea oficială</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Această platformă este <strong>administrată independent</strong> și nu reprezintă registratura oficială a Primăriei Municipiului Turnu Măgurele. Sesizările transmise primesc un număr de evidență intern al platformei. Sesizarea se transmite prin e-mail către Primărie numai dacă alegeți această opțiune la depunere și dacă serviciul de transmitere este activ. Această transmitere nu înlocuiește înregistrarea oficială a sesizării la Primărie.
            </p>
          </div>

          {/* Coloana 3: Navigare & Link-uri utile */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Navigare Rapidă
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button 
                  onClick={() => onNavigate('home')} 
                  className="hover:text-white transition-colors text-left"
                >
                  • Pagina Principală (Acasă)
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('announcements')} 
                  className="hover:text-white transition-colors text-left"
                >
                  • Comunicate & Evenimente
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('issues')} 
                  className="hover:text-white transition-colors text-left"
                >
                  • Sesizări Cetățenești
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('map')} 
                  className="hover:text-white transition-colors text-left"
                >
                  • Harta Sesizărilor
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('surveys')} 
                  className="hover:text-white transition-colors text-left"
                >
                  • Sondaje Civice
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate('directory')} 
                  className="hover:text-white transition-colors text-left"
                >
                  • Ghid Primărie & Dispecerate
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© {new Date().getFullYear()} Turnu Măgurele Civic. Dezvoltat pentru comunitatea locală.</p>
          <p className="flex items-center gap-1">
            <span>Construit cu grijă pentru orașul de la Dunăre</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

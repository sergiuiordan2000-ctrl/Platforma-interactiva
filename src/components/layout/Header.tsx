import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  MapPin, 
  Megaphone, 
  AlertCircle, 
  Map, 
  Vote, 
  PhoneCall
} from 'lucide-react';
import { AppView } from '../../types/navigation';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Brand Logo & Civic Identity */}
          <button 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-left group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 transition"
            aria-label="Mergi la pagina principală"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 flex items-center justify-center text-white shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight leading-tight group-hover:text-blue-700 transition-colors">
                  Turnu Măgurele
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  CIVIC
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <span>Platformă Independentă</span>
                <span className="inline-block w-1 h-1 rounded-full bg-emerald-500"></span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">Teleorman</span>
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentView === 'home'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Acasă
            </button>

            <button
              onClick={() => onNavigate('announcements')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                currentView === 'announcements'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Comunicate</span>
            </button>

            <button
              onClick={() => onNavigate('issues')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                currentView === 'issues'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Sesizări</span>
            </button>

            <button
              onClick={() => onNavigate('map')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                currentView === 'map'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Hartă</span>
            </button>

            <button
              onClick={() => onNavigate('surveys')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                currentView === 'surveys'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Vote className="w-4 h-4" />
              <span>Sondaje</span>
            </button>

            <button
              onClick={() => onNavigate('directory')}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                currentView === 'directory'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>Ghid Primărie</span>
            </button>
          </nav>

          {/* D11-B (post-audit): fără buton public către Admin; ruta #admin rămâne cu acces direct. */}
        </div>
      </div>
    </header>
  );
};

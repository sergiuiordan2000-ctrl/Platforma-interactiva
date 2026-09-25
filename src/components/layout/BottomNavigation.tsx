import React from 'react';
import { Home, Megaphone, AlertCircle, Map, Vote, PhoneCall } from 'lucide-react';
import { AppView } from '../../types/navigation';

interface BottomNavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentView, onNavigate }) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1 safe-area-pb shadow-lg shadow-slate-900/5">
      <nav className="flex items-center justify-around max-w-md mx-auto" aria-label="Navigație principală mobilă">
        
        {/* Acasă */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors min-w-[56px] ${
            currentView === 'home'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className={`w-5 h-5 transition-transform ${currentView === 'home' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Acasă</span>
        </button>

        {/* Comunicate */}
        <button
          onClick={() => onNavigate('announcements')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors min-w-[56px] relative ${
            currentView === 'announcements'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Megaphone className={`w-5 h-5 transition-transform ${currentView === 'announcements' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Comunicate</span>
        </button>

        {/* Sesizări (Buton Central Evidențiat) */}
        <button
          onClick={() => onNavigate('issues')}
          className="flex flex-col items-center justify-center -mt-3.5 group"
          aria-label="Trimite Sesizare"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-active:scale-95 ${
            currentView === 'issues'
              ? 'bg-amber-500 text-white shadow-amber-500/30 ring-4 ring-amber-100'
              : 'bg-gradient-to-tr from-blue-700 to-blue-600 text-white shadow-blue-600/30'
          }`}>
            <AlertCircle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className={`text-[10px] mt-0.5 font-medium tracking-tight ${
            currentView === 'issues' ? 'text-amber-600 font-bold' : 'text-slate-600'
          }`}>
            Sesizări
          </span>
        </button>

        {/* Hartă */}
        <button
          onClick={() => onNavigate('map')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors min-w-[56px] ${
            currentView === 'map'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Map className={`w-5 h-5 transition-transform ${currentView === 'map' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Hartă</span>
        </button>

        {/* Sondaje */}
        <button
          onClick={() => onNavigate('surveys')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors min-w-[56px] ${
            currentView === 'surveys'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Vote className={`w-5 h-5 transition-transform ${currentView === 'surveys' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Sondaje</span>
        </button>

        {/* Ghid Primărie */}
        <button
          onClick={() => onNavigate('directory')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors min-w-[56px] ${
            currentView === 'directory'
              ? 'text-blue-700 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <PhoneCall className={`w-5 h-5 transition-transform ${currentView === 'directory' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Ghid</span>
        </button>

      </nav>
    </div>
  );
};

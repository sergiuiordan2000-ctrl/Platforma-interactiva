import React from 'react';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { Footer } from './Footer';
import { AppView } from '../../types/navigation';

interface AppLayoutProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  currentView, 
  onNavigate, 
  children 
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased">
      {/* Antet fix pe desktop și mobil */}
      <Header currentView={currentView} onNavigate={onNavigate} />

      {/* Spațiu principal de conținut */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Subsol complet (desktop & scrollable pe mobil) */}
      <Footer onNavigate={onNavigate} />

      {/* Bară inferioară tactilă pentru telefoane mobile */}
      <BottomNavigation currentView={currentView} onNavigate={onNavigate} />
    </div>
  );
};

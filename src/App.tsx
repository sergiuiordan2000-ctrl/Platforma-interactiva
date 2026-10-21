/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { AppView } from './types/navigation';
import { HomeView } from './views/HomeView';
import { AnnouncementsView } from './views/AnnouncementsView';
import { IssuesView } from './views/IssuesView';
import { MapView } from './views/MapView';
import { SurveysView } from './views/SurveysView';
import { DirectoryView } from './views/DirectoryView';
import { AdminView } from './views/AdminView';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { UnsubscribeNotice } from './components/report/UnsubscribeNotice';

export default function App() {
  // Stare pentru comunicatul selectat (dacă se navighează direct pe detaliu din Home)
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  // Mapare hash URL la AppView
  const getViewFromHash = (): AppView => {
    const rawHash = window.location.hash.replace('#', '').toLowerCase();
    const hash = rawHash.split('?')[0];

    switch (hash) {
      case 'comunicate':
      case 'announcements':
        return 'announcements';
      case 'sesizari':
      case 'issues':
      case 'contul-meu':
        return 'issues';
      case 'harta':
      case 'map':
        return 'map';
      case 'sondaje':
      case 'surveys':
        return 'surveys';
      case 'ghid':
      case 'primarie':
      case 'directory':
        return 'directory';
      case 'admin':
        return 'admin';
      case 'home':
      default:
        return 'home';
    }
  };

  const [currentView, setCurrentView] = useState<AppView>(getViewFromHash);
  // Faza 5.4: `#contul-meu` = sesizările proprii; `#dezabonare?token=…` = linkul din notificările D9
  const hashName = () => window.location.hash.replace('#', '').toLowerCase().split('?')[0];
  const [issuesTab, setIssuesTab] = useState<'new' | 'mine'>(() => (hashName() === 'contul-meu' ? 'mine' : 'new'));
  /** Citește jetonul de dezabonare din adresă și îl scoate imediat din bara de adrese. */
  const takeUnsubscribeToken = (): string | null => {
    if (hashName() !== 'dezabonare') return null;
    const token = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('token');
    history.replaceState(null, '', window.location.pathname);
    return token ?? '';
  };
  const [unsubscribeToken, setUnsubscribeToken] = useState<string | null>(takeUnsubscribeToken);

  // Sincronizare cu hash-ul din URL și suport pentru butoanele Back/Forward din browser
  useEffect(() => {
    const handleHashChange = () => {
      const token = takeUnsubscribeToken(); // linkul deschis cu aplicația deja încărcată
      if (token !== null) setUnsubscribeToken(token);
      setCurrentView(getViewFromHash());
      setIssuesTab(hashName() === 'contul-meu' ? 'mine' : 'new');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (view: AppView) => {
    // Dacă utilizatorul navighează explicit din meniu la comunicate, resetăm selecția anterioară de detaliu
    if (view === 'announcements') {
      setSelectedAnnouncementId(null);
    }
    setCurrentView(view);

    // Actualizare hash fără reîncărcare
    const hashMap: Record<AppView, string> = {
      home: '',
      announcements: 'comunicate',
      issues: 'sesizari',
      map: 'harta',
      surveys: 'sondaje',
      directory: 'ghid',
      admin: 'admin',
    };
    const targetHash = hashMap[view];
    if (targetHash) {
      window.location.hash = targetHash;
    } else {
      history.pushState(null, '', window.location.pathname);
    }
    // Derulare sus la schimbarea paginii
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAnnouncement = (id: string) => {
    setSelectedAnnouncementId(id);
    setCurrentView('announcements');
    window.location.hash = 'comunicate';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <>
            {unsubscribeToken !== null && <UnsubscribeNotice token={unsubscribeToken} />}
            <HomeView
              onNavigate={handleNavigate}
              onOpenAnnouncement={handleOpenAnnouncement}
            />
          </>
        );
      case 'announcements':
        return (
          <AnnouncementsView 
            onNavigate={handleNavigate} 
            selectedAnnouncementId={selectedAnnouncementId}
            onClearSelected={() => setSelectedAnnouncementId(null)}
          />
        );
      case 'issues':
        return <IssuesView onNavigate={handleNavigate} initialTab={issuesTab} />;
      case 'map':
        return <MapView onNavigate={handleNavigate} />;
      case 'surveys':
        return <SurveysView onNavigate={handleNavigate} />;
      case 'directory':
        return <DirectoryView onNavigate={handleNavigate} />;
      case 'admin':
        return <AdminView onNavigate={handleNavigate} />;
      default:
        return (
          <HomeView 
            onNavigate={handleNavigate} 
            onOpenAnnouncement={handleOpenAnnouncement} 
          />
        );
    }
  };

  // Zona Admin folosește un shell propriu, separat de interfața publică
  // (fără Header/Footer/BottomNavigation publice) — Etapa 5A-2.
  if (currentView === 'admin') {
    return (
      // 7B.3 (A21-2): `tinte-admin` — pe mobil, butoanele cu text au cel puțin 44 px, iar butoanele-iconiță
      // (`tinta-iconita`) și celelalte ținte cel puțin 24 px (regulile din index.css)
      <div className="tinte-admin min-h-screen bg-slate-50 text-slate-800 antialiased">
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <ErrorBoundary key={currentView} onGoHome={() => handleNavigate('home')}>
            {renderView()}
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  return (
    <AppLayout currentView={currentView} onNavigate={handleNavigate}>
      <ErrorBoundary key={currentView} onGoHome={() => handleNavigate('home')}>
        {renderView()}
      </ErrorBoundary>
    </AppLayout>
  );
}

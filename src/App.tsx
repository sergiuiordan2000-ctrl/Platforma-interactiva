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

  // Sincronizare cu hash-ul din URL și suport pentru butoanele Back/Forward din browser
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(getViewFromHash());
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
          <HomeView 
            onNavigate={handleNavigate} 
            onOpenAnnouncement={handleOpenAnnouncement} 
          />
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
        return <IssuesView onNavigate={handleNavigate} />;
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

  return (
    <AppLayout currentView={currentView} onNavigate={handleNavigate}>
      {renderView()}
    </AppLayout>
  );
}

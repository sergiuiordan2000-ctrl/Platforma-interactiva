/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Lock,
  ShieldCheck,
  LogOut,
  Building2,
  PhoneCall,
  ExternalLink,
  FileText,
  Clock,
  Globe,
  Layers,
  CheckCircle2,
  X,
  Sparkles,
  Info,
  LayoutDashboard,
  Megaphone
} from 'lucide-react';
import { AppView } from '../types/navigation';
import { authService, AdminUser } from '../services/authService';
import { permissionService, Permission } from '../services/permissionService';
import { AdminLoginForm } from '../components/admin/AdminLoginForm';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminAnnouncementsManager } from '../components/admin/announcements/AdminAnnouncementsManager';
import { AdminInstitutionForm } from '../components/admin/directory/AdminInstitutionForm';
import { AdminDepartmentsManager } from '../components/admin/directory/AdminDepartmentsManager';
import { AdminServicesManager } from '../components/admin/directory/AdminServicesManager';
import { AdminScheduleManager } from '../components/admin/directory/AdminScheduleManager';
import { AdminUsefulLinksManager } from '../components/admin/directory/AdminUsefulLinksManager';
import { AdminQuickDialManager } from '../components/admin/quickdial/AdminQuickDialManager';
import { AdminCategoriesManager } from '../components/admin/quickdial/AdminCategoriesManager';
import { AdminReports } from '../components/admin/reports/AdminReports';
import { AdminSurveysManager } from '../components/admin/surveys/AdminSurveysManager';
import { AdminAccountsManager } from '../components/admin/accounts/AdminAccountsManager';
import { AdminAuthSteps } from '../components/admin/AdminAuthSteps';
import { Users, Vote } from 'lucide-react';

interface AdminViewProps {
  onNavigate: (view: AppView) => void;
}

type MainAdminTab = 'dashboard' | 'announcements' | 'directory' | 'quickdial' | 'reports' | 'surveys' | 'accounts';
type DirectorySubTab = 'institution' | 'departments' | 'services' | 'schedule' | 'links';
type QuickDialSubTab = 'contacts' | 'categories';

/**
 * Permisiunea de vizualizare (`.view`) necesară pentru accesul la fiecare tab principal
 * din Admin (Etapa 5G). SURSĂ UNICĂ pentru gating-ul taburilor — nicio componentă nu
 * verifică `currentUser.role` direct; totul trece prin `permissionService`.
 */
const TAB_VIEW_PERMISSIONS: Record<Exclude<MainAdminTab, 'accounts'>, Permission> = {
  dashboard: 'dashboard.view',
  announcements: 'announcements.view',
  directory: 'directory.view',
  quickdial: 'quickDial.view',
  reports: 'reports.view',
  surveys: 'surveys.view',
};

/**
 * Panou afișat dacă (teoretic) starea internă ar indica un tab pentru care utilizatorul
 * curent nu are permisiunea de vizualizare. Reprezintă verificarea de autorizare la
 * nivelul view-ului, nu doar ascunderea butonului de navigare (Etapa 5G, Secțiunea 8).
 */
const AccessDeniedPanel: React.FC<{ moduleName: string }> = ({ moduleName }) => (
  <div className="bg-white rounded-3xl border-2 border-red-200 p-8 text-center space-y-2">
    <Lock className="w-8 h-8 text-red-400 mx-auto" />
    <p className="text-sm font-bold text-red-800">Acces interzis</p>
    <p className="text-xs text-slate-500 max-w-md mx-auto">
      Rolul curent nu are permisiunea de a accesa modulul „{moduleName}”.
    </p>
  </div>
);

export const AdminView: React.FC<AdminViewProps> = ({ onNavigate }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [authStep, setAuthStep] = useState(() => authService.getStep());
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => authService.getCurrentUser());

  const [activeMainTab, setActiveMainTab] = useState<MainAdminTab>('dashboard');
  // 7B.2 (A21-3a): pe ecrane înguste, fâșia de tab-uri se derulează orizontal; tab-ul activ se aduce complet în vizor
  // (numai derulare orizontală a fâșiei, fără derularea paginii)
  const tabStripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = tabStripRef.current;
    const tab = strip?.querySelector<HTMLElement>(`[data-admin-tab="${activeMainTab}"]`);
    if (!strip || !tab) return;
    const s = strip.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    if (t.left < s.left) strip.scrollLeft -= s.left - t.left;
    else if (t.right > s.right) strip.scrollLeft += t.right - s.right;
  }, [activeMainTab]);
  // 7B.3 (A21-3b, varianta A): bara de derulare vizibilă. Barele native sunt ascunse sau apar numai în timpul
  // derulării pe telefoane, de aceea bara este desenată de aplicație: apare numai când tab-urile nu încap,
  // arată cât din fâșie se vede și unde (lățimea și poziția „cursorului”).
  const [tabBar, setTabBar] = useState<{ width: number; left: number } | null>(null);
  // funcție stabilă (citește fâșia prin ref, starea prin actualizare funcțională): ascultătorii se atașează o singură dată
  const updateTabBar = useCallback(() => {
    const strip = tabStripRef.current;
    const next = !strip || strip.scrollWidth <= strip.clientWidth + 1
      ? null
      : { width: (strip.clientWidth / strip.scrollWidth) * 100, left: (strip.scrollLeft / strip.scrollWidth) * 100 };
    // starea se schimbă numai la o diferență reală (fără randări în buclă)
    setTabBar((prev) =>
      next === null ? null : prev && Math.abs(prev.width - next.width) < 0.1 && Math.abs(prev.left - next.left) < 0.1 ? prev : next,
    );
  }, []);
  // redimensionarea ferestrei: un singur ascultător, atașat la montare
  useEffect(() => {
    window.addEventListener('resize', updateTabBar);
    return () => window.removeEventListener('resize', updateTabBar);
  }, [updateTabBar]);
  // schimbarea layoutului fâșiei (fonturi încărcate, tab-uri afișate după rol, lățimea containerului): ResizeObserver,
  // atașat când fâșia există (după autentificare)
  useEffect(() => {
    const strip = tabStripRef.current;
    updateTabBar();
    if (!strip || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateTabBar);
    observer.observe(strip);
    // și tab-urile: lățimea conținutului (scrollWidth) se schimbă fără ca fâșia să-și schimbe dimensiunea
    for (const tab of Array.from(strip.children)) observer.observe(tab);
    return () => observer.disconnect();
  }, [updateTabBar, isAuthenticated, currentUser]);
  // tab-ul activ s-a schimbat (fâșia poate fi derulată de efectul A21-3a): poziția cursorului se recalculează
  useEffect(() => {
    updateTabBar();
  }, [updateTabBar, activeMainTab]);
  const [activeDirSubTab, setActiveDirSubTab] = useState<DirectorySubTab>('institution');
  const [activeQdSubTab, setActiveQdSubTab] = useState<QuickDialSubTab>('contacts');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ascultare schimbare stare autentificare
  useEffect(() => {
    return authService.subscribe((isAuth) => {
      setIsAuthenticated(isAuth);
      setAuthStep(authService.getStep());
      setCurrentUser(authService.getCurrentUser());
    });
  }, []);

  // Verificare centrală de autorizare (Etapa 5G) — sursă unică: permissionService.
  const canAccessTab = (tab: MainAdminTab): boolean =>
    tab === 'accounts'
      ? Boolean(currentUser?.permissions.includes('accounts.manage')) // permisiune nouă, de la server (5.2)
      : permissionService.hasPermission(currentUser?.role, TAB_VIEW_PERMISSIONS[tab]);

  // Protecție reală (nu doar vizuală): dacă starea internă ar indica vreodată un tab
  // pentru care rolul curent nu are permisiune, comutăm automat pe primul tab accesibil.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (canAccessTab(activeMainTab)) return;
    const firstAllowed = (Object.keys(TAB_VIEW_PERMISSIONS) as MainAdminTab[]).find((t) => canAccessTab(t));
    if (firstAllowed) {
      setActiveMainTab(firstAllowed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentUser, activeMainTab]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 4500);
  };

  const handleLogout = () => {
    void authService.logout();
  };

  if (authStep === 'loading') {
    return <div className="max-w-md mx-auto my-16 text-center text-sm text-slate-500">Se verifică sesiunea...</div>;
  }

  // Pașii de după parolă (Faza 5.2): TOTP, schimbarea parolei temporare
  if (authStep !== 'anonymous' && authStep !== 'ready') {
    return <AdminAuthSteps step={authStep} />;
  }

  // Dacă utilizatorul nu este autentificat, afișăm formularul de autentificare protejat
  if (!isAuthenticated) {
    return (
      <AdminLoginForm
        onSuccess={() => {
          setActiveMainTab('dashboard');
        }}
        onCancel={() => onNavigate('home')}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      
      {/* Toast Notificare Operație Reușită */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-start gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-emerald-400 mb-0.5">Operație Confirmată</div>
            <p className="text-slate-200">{toastMessage}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="tinta-iconita p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Bară Superioară Admin cu Date Utilizator și Butoane de Navigare */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
              CMS Activ • Etapa 2C
            </span>
            <span className="text-xs text-slate-400">
              {currentUser?.email}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <span>Panou de Administrare Informații</span>
          </h1>

          <p className="text-xs text-slate-400">
            Modificările efectuate aici sunt salvate persistent și se reflectă instantaneu în interfața publică.
          </p>
        </div>

        {/* Butoane Acțiuni Header */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('directory')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold transition-all"
            title="Deschide interfața publică a Ghidului"
          >
            <span>Vezi în zona publică</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-xs font-bold transition-all"
            title="Deconectare din contul de administrator"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Ieșire (Logout)</span>
          </button>
        </div>
      </div>

      {/* 2. Comutator Principal de Modul: Dashboard, Ghid Primărie vs. Quick Dial */}
      <div>
      <div ref={tabStripRef} onScroll={updateTabBar} className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1.5 border border-slate-200 shadow-inner overflow-x-auto scrollbar-none">
        {canAccessTab('dashboard') && (
          <button
            onClick={() => setActiveMainTab('dashboard')}
            data-admin-tab="dashboard"
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none whitespace-nowrap ${
              activeMainTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${activeMainTab === 'dashboard' ? 'text-slate-700' : 'text-slate-400'}`} />
            <span>Dashboard</span>
          </button>
        )}

        {canAccessTab('announcements') && (
          <button
            onClick={() => setActiveMainTab('announcements')}
            data-admin-tab="announcements"
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none whitespace-nowrap ${
              activeMainTab === 'announcements'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className={`w-4 h-4 ${activeMainTab === 'announcements' ? 'text-blue-700' : 'text-slate-400'}`} />
            <span>Comunicate (5B)</span>
          </button>
        )}

        {canAccessTab('directory') && (
          <button
            onClick={() => setActiveMainTab('directory')}
            data-admin-tab="directory"
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none whitespace-nowrap md:whitespace-normal ${
              activeMainTab === 'directory'
                ? 'bg-white text-cyan-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeMainTab === 'directory' ? 'text-cyan-700' : 'text-slate-400'}`} />
            <span>A. Ghidul Primăriei</span>
          </button>
        )}

        {canAccessTab('quickdial') && (
          <button
            onClick={() => setActiveMainTab('quickdial')}
            data-admin-tab="quickdial"
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none whitespace-nowrap md:whitespace-normal ${
              activeMainTab === 'quickdial'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PhoneCall className={`w-4 h-4 ${activeMainTab === 'quickdial' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>B. Numere Utile / Quick Dial</span>
          </button>
        )}

        {canAccessTab('reports') && (
          <button
            onClick={() => setActiveMainTab('reports')}
            data-admin-tab="reports"
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none whitespace-nowrap md:whitespace-normal ${
              activeMainTab === 'reports'
                ? 'bg-white text-blue-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className={`w-4 h-4 ${activeMainTab === 'reports' ? 'text-blue-700' : 'text-slate-400'}`} />
            <span>C. Sesizări</span>
          </button>
        )}

        {canAccessTab('surveys') && (
          <button
            onClick={() => setActiveMainTab('surveys')}
            data-admin-tab="surveys"
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none whitespace-nowrap md:whitespace-normal ${
              activeMainTab === 'surveys'
                ? 'bg-white text-purple-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Vote className={`w-4 h-4 ${activeMainTab === 'surveys' ? 'text-purple-700' : 'text-slate-400'}`} />
            <span>D. Sondaje Civice (4B)</span>
          </button>
        )}
        {canAccessTab('accounts') && (
          <button
            onClick={() => setActiveMainTab('accounts')}
            data-admin-tab="accounts"
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none whitespace-nowrap ${
              activeMainTab === 'accounts'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className={`w-4 h-4 ${activeMainTab === 'accounts' ? 'text-slate-700' : 'text-slate-400'}`} />
            <span>Conturi</span>
          </button>
        )}
      </div>
      {tabBar && (
        <div className="mt-1.5 mx-3 h-1.5 rounded-full bg-slate-200 relative overflow-hidden" aria-hidden="true" data-testid="admin-tabs-scrollbar">
          <div className="absolute top-0 h-1.5 rounded-full bg-slate-500" style={{ left: `${tabBar.left}%`, width: `${tabBar.width}%` }} />
        </div>
      )}
      </div>

      {/* 3. Sub-Navigare specifică fiecărui modul */}

      {/* DASHBOARD (Etapa 5A.1) */}
      {activeMainTab === 'dashboard' && (
        canAccessTab('dashboard') ? (
          <AdminDashboard
            currentUser={currentUser}
            onNavigateTab={(tab) => setActiveMainTab(tab)}
          />
        ) : (
          <AccessDeniedPanel moduleName="Dashboard" />
        )
      )}

      {/* MODUL COMUNICATE & EVENIMENTE (Etapa 5B) */}
      {activeMainTab === 'announcements' && (
        canAccessTab('announcements') ? (
          <div className="space-y-6">
            <AdminAnnouncementsManager onSuccess={showToast} />
          </div>
        ) : (
          <AccessDeniedPanel moduleName="Comunicate & Evenimente" />
        )
      )}

      {/* SUB-NAVIGARE PENTRU GHID PRIMĂRIE */}
      {activeMainTab === 'directory' && !canAccessTab('directory') && (
        <AccessDeniedPanel moduleName="Ghidul Primăriei" />
      )}
      {activeMainTab === 'directory' && canAccessTab('directory') && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Secțiuni Administrare Ghid">
            <button
              onClick={() => setActiveDirSubTab('institution')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeDirSubTab === 'institution'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Date Instituționale</span>
            </button>

            <button
              onClick={() => setActiveDirSubTab('departments')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeDirSubTab === 'departments'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Direcții & Departamente</span>
            </button>

            <button
              onClick={() => setActiveDirSubTab('services')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeDirSubTab === 'services'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Servicii & Acte Cetățeni</span>
            </button>

            <button
              onClick={() => setActiveDirSubTab('schedule')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeDirSubTab === 'schedule'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Program & Audiențe</span>
            </button>

            <button
              onClick={() => setActiveDirSubTab('links')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeDirSubTab === 'links'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Link-uri Utile</span>
            </button>
          </div>

          {/* Corp Conținut Ghid Sub-Secțiune */}
          <div className="pt-1">
            {activeDirSubTab === 'institution' && (
              <AdminInstitutionForm onSuccess={showToast} currentUser={currentUser} />
            )}
            {activeDirSubTab === 'departments' && (
              <AdminDepartmentsManager onSuccess={showToast} currentUser={currentUser} />
            )}
            {activeDirSubTab === 'services' && (
              <AdminServicesManager onSuccess={showToast} currentUser={currentUser} />
            )}
            {activeDirSubTab === 'schedule' && (
              <AdminScheduleManager onSuccess={showToast} currentUser={currentUser} />
            )}
            {activeDirSubTab === 'links' && (
              <AdminUsefulLinksManager onSuccess={showToast} currentUser={currentUser} />
            )}
          </div>
        </div>
      )}

      {/* SUB-NAVIGARE PENTRU QUICK DIAL */}
      {activeMainTab === 'quickdial' && !canAccessTab('quickdial') && (
        <AccessDeniedPanel moduleName="Numere Utile / Quick Dial" />
      )}
      {activeMainTab === 'quickdial' && canAccessTab('quickdial') && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Secțiuni Administrare Quick Dial">
            <button
              onClick={() => setActiveQdSubTab('contacts')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeQdSubTab === 'contacts'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Contacte & Numere Utile</span>
            </button>

            <button
              onClick={() => setActiveQdSubTab('categories')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-sm ${
                activeQdSubTab === 'categories'
                  ? 'bg-purple-700 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gestiune Categorii</span>
            </button>
          </div>

          {/* Corp Conținut Quick Dial Sub-Secțiune */}
          <div className="pt-1">
            {activeQdSubTab === 'contacts' && (
              <AdminQuickDialManager onSuccess={showToast} currentUser={currentUser} />
            )}
            {activeQdSubTab === 'categories' && (
              <AdminCategoriesManager onSuccess={showToast} currentUser={currentUser} />
            )}
          </div>
        </div>
      )}

      {/* SUB-MODUL SESIZĂRI (FAZA 5.4: fără moderare, 2.3) */}
      {activeMainTab === 'reports' && (
        canAccessTab('reports') ? (
          <div className="space-y-6">
            <AdminReports onSuccess={showToast} />
          </div>
        ) : (
          <AccessDeniedPanel moduleName="Sesizări" />
        )
      )}

      {/* SUB-MODUL PENTRU ADMINISTRARE SONDAJE (ETAPA 4B) */}
      {activeMainTab === 'surveys' && (
        canAccessTab('surveys') ? (
          <div className="space-y-6">
            <AdminSurveysManager onSuccess={showToast} currentUser={currentUser} />
          </div>
        ) : (
          <AccessDeniedPanel moduleName="Sondaje Civice" />
        )
      )}

      {/* CONTURI ADMIN (Faza 5.2) */}
      {activeMainTab === 'accounts' && (
        canAccessTab('accounts') ? <AdminAccountsManager /> : <AccessDeniedPanel moduleName="Conturi" />
      )}

      {/* 4. Notă de Subsol Metodologică */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start justify-between gap-4 text-xs text-slate-600">
        <div className="space-y-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Delimitarea panoului de administrare</span>
          </div>
          <p className="leading-relaxed">
            Panoul gestionează comunicatele, sesizările (stadii, asumare / preluare, note interne; fără moderare), Ghidul Primăriei, Apelul rapid și sondajele. Autentificarea și regulile se verifică pe server.
          </p>
        </div>

        <button
          onClick={() => onNavigate('home')}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs whitespace-nowrap transition-colors self-start sm:self-center"
        >
          ← Înapoi la Acasă
        </button>
      </div>

    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  LayoutDashboard
} from 'lucide-react';
import { AppView } from '../types/navigation';
import { authService, AdminUser } from '../services/authService';
import { AdminLoginForm } from '../components/admin/AdminLoginForm';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AdminInstitutionForm } from '../components/admin/directory/AdminInstitutionForm';
import { AdminDepartmentsManager } from '../components/admin/directory/AdminDepartmentsManager';
import { AdminServicesManager } from '../components/admin/directory/AdminServicesManager';
import { AdminScheduleManager } from '../components/admin/directory/AdminScheduleManager';
import { AdminUsefulLinksManager } from '../components/admin/directory/AdminUsefulLinksManager';
import { AdminQuickDialManager } from '../components/admin/quickdial/AdminQuickDialManager';
import { AdminCategoriesManager } from '../components/admin/quickdial/AdminCategoriesManager';
import { AdminReportsModeration } from '../components/admin/reports/AdminReportsModeration';
import { AdminSurveysManager } from '../components/admin/surveys/AdminSurveysManager';
import { Vote } from 'lucide-react';

interface AdminViewProps {
  onNavigate: (view: AppView) => void;
}

type MainAdminTab = 'dashboard' | 'directory' | 'quickdial' | 'reports' | 'surveys';
type DirectorySubTab = 'institution' | 'departments' | 'services' | 'schedule' | 'links';
type QuickDialSubTab = 'contacts' | 'categories';

export const AdminView: React.FC<AdminViewProps> = ({ onNavigate }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => authService.getCurrentUser());

  const [activeMainTab, setActiveMainTab] = useState<MainAdminTab>('dashboard');
  const [activeDirSubTab, setActiveDirSubTab] = useState<DirectorySubTab>('institution');
  const [activeQdSubTab, setActiveQdSubTab] = useState<QuickDialSubTab>('contacts');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ascultare schimbare stare autentificare
  useEffect(() => {
    return authService.subscribe((isAuth) => {
      setIsAuthenticated(isAuth);
      setCurrentUser(authService.getCurrentUser());
    });
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 4500);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // Dacă utilizatorul nu este autentificat, afișăm formularul de autentificare protejat
  if (!isAuthenticated) {
    return (
      <AdminLoginForm
        onSuccess={() => {
          setIsAuthenticated(true);
          setCurrentUser(authService.getCurrentUser());
          setActiveMainTab('dashboard');
          showToast('V-ați autentificat cu succes în panoul de administrare!');
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
            className="p-1 rounded-lg text-slate-400 hover:text-white"
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
      <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1.5 border border-slate-200 shadow-inner overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveMainTab('dashboard')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none whitespace-nowrap ${
            activeMainTab === 'dashboard'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${activeMainTab === 'dashboard' ? 'text-slate-700' : 'text-slate-400'}`} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveMainTab('directory')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none ${
            activeMainTab === 'directory'
              ? 'bg-white text-cyan-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeMainTab === 'directory' ? 'text-cyan-700' : 'text-slate-400'}`} />
          <span>A. Ghidul Primăriei</span>
        </button>

        <button
          onClick={() => setActiveMainTab('quickdial')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none ${
            activeMainTab === 'quickdial'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PhoneCall className={`w-4 h-4 ${activeMainTab === 'quickdial' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>B. Numere Utile / Quick Dial</span>
        </button>

        <button
          onClick={() => setActiveMainTab('reports')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none ${
            activeMainTab === 'reports'
              ? 'bg-white text-blue-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className={`w-4 h-4 ${activeMainTab === 'reports' ? 'text-blue-700' : 'text-slate-400'}`} />
          <span>C. Moderare Sesizări (3E)</span>
        </button>

        <button
          onClick={() => setActiveMainTab('surveys')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all select-none ${
            activeMainTab === 'surveys'
              ? 'bg-white text-purple-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Vote className={`w-4 h-4 ${activeMainTab === 'surveys' ? 'text-purple-700' : 'text-slate-400'}`} />
          <span>D. Sondaje Civice (4B)</span>
        </button>
      </div>

      {/* 3. Sub-Navigare specifică fiecărui modul */}

      {/* DASHBOARD (Etapa 5A.1) */}
      {activeMainTab === 'dashboard' && (
        <AdminDashboard
          currentUser={currentUser}
          onNavigateTab={(tab) => setActiveMainTab(tab)}
        />
      )}

      {/* SUB-NAVIGARE PENTRU GHID PRIMĂRIE */}
      {activeMainTab === 'directory' && (
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
              <AdminInstitutionForm onSuccess={showToast} />
            )}
            {activeDirSubTab === 'departments' && (
              <AdminDepartmentsManager onSuccess={showToast} />
            )}
            {activeDirSubTab === 'services' && (
              <AdminServicesManager onSuccess={showToast} />
            )}
            {activeDirSubTab === 'schedule' && (
              <AdminScheduleManager onSuccess={showToast} />
            )}
            {activeDirSubTab === 'links' && (
              <AdminUsefulLinksManager onSuccess={showToast} />
            )}
          </div>
        </div>
      )}

      {/* SUB-NAVIGARE PENTRU QUICK DIAL */}
      {activeMainTab === 'quickdial' && (
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
              <AdminQuickDialManager onSuccess={showToast} />
            )}
            {activeQdSubTab === 'categories' && (
              <AdminCategoriesManager onSuccess={showToast} />
            )}
          </div>
        </div>
      )}

      {/* SUB-MODUL PENTRU MODERARE SESIZĂRI (ETAPA 3E) */}
      {activeMainTab === 'reports' && (
        <div className="space-y-6">
          <AdminReportsModeration onSuccess={showToast} />
        </div>
      )}

      {/* SUB-MODUL PENTRU ADMINISTRARE SONDAJE (ETAPA 4B) */}
      {activeMainTab === 'surveys' && (
        <div className="space-y-6">
          <AdminSurveysManager onSuccess={showToast} />
        </div>
      )}

      {/* 4. Notă de Subsol Metodologică */}
      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start justify-between gap-4 text-xs text-slate-600">
        <div className="space-y-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Delimitare Etapa 3E (Moderare & Publicare Sesizări MVP)</span>
          </div>
          <p className="leading-relaxed">
            Panoul permite evaluarea, aprobarea și respingerea sesizărilor cetățenești (3E), alături de gestionarea Ghidului Primăriei (2A) și Quick Dial (2B). Autentificarea server-side, rolurile RBAC avansate și trimiterea automată către Primărie aparțin etapelor ulterioare.
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

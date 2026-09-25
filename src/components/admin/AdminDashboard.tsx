/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  PhoneCall,
  Layers,
  Vote,
  Megaphone,
  ArrowRight,
  UserCircle2,
  ShieldCheck,
} from 'lucide-react';
import { AdminUser } from '../../services/authService';
import { permissionService, Permission } from '../../services/permissionService';

export type AdminDashboardTab = 'announcements' | 'directory' | 'quickdial' | 'reports' | 'surveys';

interface AdminDashboardProps {
  currentUser: AdminUser | null;
  onNavigateTab: (tab: AdminDashboardTab) => void;
}

interface ModuleCardConfig {
  tab: AdminDashboardTab;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentClasses: string;
  /** Permisiunea de vizualizare necesară pentru ca acest card să fie afișat (Etapa 5G). */
  viewPermission: Permission;
}

const MODULE_CARDS: ModuleCardConfig[] = [
  {
    tab: 'announcements',
    title: 'Comunicate & Evenimente',
    description: 'Creare, editare, publicare, dezactivare și evenimente locale (Etapa 5B).',
    icon: <Megaphone className="w-5 h-5" />,
    accentClasses: 'bg-blue-50 text-blue-700 border-blue-200',
    viewPermission: 'announcements.view',
  },
  {
    tab: 'directory',
    title: 'Ghidul Primăriei',
    description: 'Date instituționale, direcții, servicii, program și link-uri utile.',
    icon: <Building2 className="w-5 h-5" />,
    accentClasses: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    viewPermission: 'directory.view',
  },
  {
    tab: 'quickdial',
    title: 'Numere Utile / Quick Dial',
    description: 'Contacte de apelare rapidă și categoriile acestora.',
    icon: <PhoneCall className="w-5 h-5" />,
    accentClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    viewPermission: 'quickDial.view',
  },
  {
    tab: 'reports',
    title: 'Moderare Sesizări',
    description: 'Evaluarea, aprobarea și respingerea sesizărilor cetățenești (Etapa 3E).',
    icon: <Layers className="w-5 h-5" />,
    accentClasses: 'bg-blue-50 text-blue-700 border-blue-200',
    viewPermission: 'reports.view',
  },
  {
    tab: 'surveys',
    title: 'Sondaje Civice',
    description: 'Administrarea sondajelor și consultărilor publice (Etapa 4B).',
    icon: <Vote className="w-5 h-5" />,
    accentClasses: 'bg-purple-50 text-purple-700 border-purple-200',
    viewPermission: 'surveys.view',
  },
];

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  super_admin: 'Administrator Platformă',
  primarie_operator: 'Operator Primărie',
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onNavigateTab }) => {
  const displayName = currentUser?.name || 'Administrator';
  const roleLabel = currentUser ? ROLE_LABELS[currentUser.role] : '—';

  // Etapa 5G: afișăm doar modulele pentru care rolul curent are permisiune de vizualizare.
  // Verificare centrală prin permissionService — nu se compară `role` direct aici.
  const visibleModuleCards = MODULE_CARDS.filter((mod) =>
    permissionService.hasPermission(currentUser?.role, mod.viewPermission)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Mesaj de bun venit + identificare utilizator/rol */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-6 h-6 text-blue-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Bine ai revenit, {displayName}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md">
              Acesta este panoul central al platformei civice Turnu Măgurele. Alege mai jos modulul pe care vrei să-l gestionezi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <UserCircle2 className="w-5 h-5 text-slate-400" />
          <div className="text-xs leading-tight">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <span>{roleLabel}</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-slate-500">{currentUser?.email || '—'}</div>
          </div>
        </div>
      </div>

      {/* Prezentare module disponibile + navigare */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
          Module disponibile
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {visibleModuleCards.map((mod) => (
            <button
              key={mod.tab}
              onClick={() => onNavigateTab(mod.tab)}
              className="text-left bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-4 sm:p-5 flex items-start gap-3.5 group"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${mod.accentClasses}`}>
                {mod.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span>{mod.title}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {mod.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

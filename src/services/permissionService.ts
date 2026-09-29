/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminUser, authService } from './authService';

/*
 * Faza 5.2 — tranziție (FAZA_5_2_PLAN §2): rolul vine acum de la server (sesiune verificată), iar serverul
 * impune matricea finală (`shared/src/permissions.ts`: 26 / 12, fără `reports.moderate`). Matricea locală
 * de mai jos (24 / 13) rămâne numai pentru ecranele domeniilor încă stocate în browser (comunicate, Ghid,
 * sesizări, sondaje) și se înlocuiește domeniu cu domeniu (5.3–5.6). Permisiunile noi (conturi, audit)
 * se citesc din `authService.getCurrentUser().permissions`, primite de la server.
 */

/**
 * Serviciu central de autorizare (Etapa 5G).
 *
 * SURSĂ UNICĂ pentru permisiuni. Nicio componentă nu trebuie să conțină propria
 * matrice de roluri sau verificări de forma `if (user.role === 'super_admin')`.
 * Toate componentele trebuie să interogheze acest serviciu (`hasPermission`).
 *
 * Permisiunile de mai jos reflectă STRICT acțiunile administrative reale,
 * identificate în auditul 5G-1, direct din cod — nu s-a inventat nicio
 * funcționalitate care nu există deja în aplicație.
 */
export type Permission =
  // Dashboard
  | 'dashboard.view'
  // Comunicate (Etapa 5B)
  | 'announcements.view'
  | 'announcements.create'
  | 'announcements.edit'
  | 'announcements.publish'
  | 'announcements.disable'
  // Sesizări (Etapele 3E, 5C)
  | 'reports.view'
  | 'reports.moderate'
  | 'reports.resolve'
  | 'reports.reply'
  // Ghidul Primăriei (Etapa 2C / 5D)
  | 'directory.view'
  | 'directory.institution.edit'
  | 'directory.departments.manage'
  | 'directory.services.manage'
  | 'directory.schedule.manage'
  | 'directory.links.manage'
  // Quick Dial (Etapa 2B)
  | 'quickDial.view'
  | 'quickDial.contacts.manage'
  | 'quickDial.categories.manage'
  // Sondaje (Etapa 4B)
  | 'surveys.view'
  | 'surveys.create'
  | 'surveys.edit'
  | 'surveys.activate'
  | 'surveys.close';

export type AdminRole = AdminUser['role'];

/**
 * Lista completă a permisiunilor existente în aplicație.
 */
const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'announcements.view',
  'announcements.create',
  'announcements.edit',
  'announcements.publish',
  'announcements.disable',
  'reports.view',
  'reports.moderate',
  'reports.resolve',
  'reports.reply',
  'directory.view',
  'directory.institution.edit',
  'directory.departments.manage',
  'directory.services.manage',
  'directory.schedule.manage',
  'directory.links.manage',
  'quickDial.view',
  'quickDial.contacts.manage',
  'quickDial.categories.manage',
  'surveys.view',
  'surveys.create',
  'surveys.edit',
  'surveys.activate',
  'surveys.close',
];

/**
 * Permisiunile efective ale rolului `primarie_operator` (Etapa 5D — finalizare,
 * conform matricei de produs confirmate):
 * - Dashboard: doar vizualizare.
 * - Comunicate: acces complet (view/create/edit/publish/disable) — fără diferență
 *   față de `super_admin`, deoarece nu există o permisiune de ștergere fizică.
 * - Sesizări: acces complet (view/moderate/resolve/reply) — identic cu `super_admin`.
 * - Ghidul Primăriei: doar vizualizare — fără nicio permisiune de modificare
 *   (instituție, direcții, servicii, program, link-uri utile).
 * - Quick Dial: doar vizualizare — fără administrarea contactelor sau categoriilor.
 * - Sondaje: doar vizualizare — fără creare, editare, activare sau închidere.
 *
 * Modificare STRICT în acest singur loc — nicio componentă Admin nu conține
 * verificări de forma `if (role === 'primarie_operator')`.
 */
const PRIMARIE_OPERATOR_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'announcements.view',
  'announcements.create',
  'announcements.edit',
  'announcements.publish',
  'announcements.disable',
  'reports.view',
  'reports.moderate',
  'reports.resolve',
  'reports.reply',
  'directory.view',
  'quickDial.view',
  'surveys.view',
];

/**
 * `super_admin` = acces complet la toate modulele și toate acțiunile administrative
 * (neschimbat față de etapele anterioare).
 * `primarie_operator` = acces limitat și configurabil, conform matricei de mai sus
 * (Etapa 5D — finalizarea sistemului de roluri).
 */
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  primarie_operator: PRIMARIE_OPERATOR_PERMISSIONS,
};

/**
 * ETAPA 6.6 (C6) — Rolurile care acționează în numele INSTITUȚIEI (Primăria).
 * Nu este o permisiune și nu modifică `ROLE_PERMISSIONS`: stabilește doar dacă o acțiune de
 * preluare a unei sesizări este preluarea instituțională a Primăriei (`primarie_operator`)
 * sau o asumare individuală (`super_admin`). Menținut aici pentru ca nicio componentă sau
 * serviciu să nu conțină propriile verificări de forma `role === '...'`.
 */
const CITY_HALL_ROLES: ReadonlyArray<AdminRole> = ['primarie_operator'];

class PermissionService {
  /**
   * Returnează lista de permisiuni pentru un rol. Un rol necunoscut sau lipsă
   * (`null`/`undefined`) primește întotdeauna o listă goală — niciodată acces implicit.
   */
  public getPermissionsForRole(role: string | null | undefined): Permission[] {
    if (!role) return [];
    const permissions = (ROLE_PERMISSIONS as Record<string, Permission[]>)[role];
    return permissions ? [...permissions] : [];
  }

  /**
   * Verificarea centrală de autorizare. Eșuează sigur (returnează `false`) dacă:
   * - nu există utilizator/rol (`role` este `null`/`undefined`/gol);
   * - rolul nu este unul cunoscut (`super_admin` / `primarie_operator`).
   * Nu se acordă niciodată implicit vreo permisiune unui rol necunoscut.
   */
  public hasPermission(role: string | null | undefined, permission: Permission): boolean {
    if (!role) return false;
    const permissions = (ROLE_PERMISSIONS as Record<string, Permission[]>)[role];
    if (!permissions) return false;
    return permissions.includes(permission);
  }

  /**
   * Adevărat dacă rolul are cel puțin una dintre permisiunile date.
   */
  public hasAnyPermission(role: string | null | undefined, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(role, p));
  }

  /**
   * ETAPA 6.5 (P1/P2) — Verificare la nivel de SERVICIU pentru utilizatorul autentificat curent.
   * Folosește aceeași matrice (`ROLE_PERMISSIONS`); fără sesiune validă → `false`.
   * Operațiile administrative din servicii apelează această metodă înainte de orice modificare.
   *
   * LIMITĂ ASUMATĂ (fără backend): verificarea rulează în browser; împiedică modificările făcute
   * prin codul aplicației fără permisiune, dar nu înlocuiește autorizarea pe server.
   */
  public currentUserCan(permission: Permission): boolean {
    return this.hasPermission(authService.getCurrentUser()?.role, permission);
  }

  /**
   * ETAPA 6.5 — Adevărat dacă utilizatorul curent are cel puțin una dintre permisiuni.
   */
  public currentUserCanAny(permissions: Permission[]): boolean {
    return this.hasAnyPermission(authService.getCurrentUser()?.role, permissions);
  }

  /**
   * ETAPA 6.5 — Adevărat dacă utilizatorul curent are TOATE permisiunile date.
   */
  public currentUserCanAll(permissions: Permission[]): boolean {
    const role = authService.getCurrentUser()?.role;
    return permissions.length > 0 && permissions.every((p) => this.hasPermission(role, p));
  }

  /**
   * ETAPA 6.6 (C6) — Adevărat dacă rolul acționează în numele Primăriei. Rol lipsă sau
   * necunoscut → `false` (fail-safe).
   */
  public actsForCityHall(role: string | null | undefined): boolean {
    if (!role) return false;
    return (CITY_HALL_ROLES as ReadonlyArray<string>).includes(role);
  }

  /**
   * ETAPA 6.6 (C6) — Același test pentru utilizatorul autentificat curent; fără sesiune → `false`.
   */
  public currentUserActsForCityHall(): boolean {
    return this.actsForCityHall(authService.getCurrentUser()?.role);
  }
}

export const permissionService = new PermissionService();

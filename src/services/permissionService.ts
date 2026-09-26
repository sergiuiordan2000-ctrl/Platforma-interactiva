/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdminUser } from './authService';

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
}

export const permissionService = new PermissionService();

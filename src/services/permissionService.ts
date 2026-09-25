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
 * DECIZIE DE PRODUS (Etapa 5G-2, confirmată explicit):
 * `super_admin` și `primarie_operator` primesc, la acest moment, ACELEAȘI
 * permisiuni — toate cele existente. Diferențierea reală a rolurilor rămâne
 * pentru o etapă viitoare și se va face STRICT prin modificarea acestei mape,
 * într-un singur loc, fără a umbla prin componentele Admin.
 */
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  primarie_operator: ALL_PERMISSIONS,
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

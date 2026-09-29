// Matricea permisiunilor: sursa unică pentru server (impunere) și frontend (numai afișare).
// Design: docs/faza4/FAZA_4_B3_B4_AUTENTIFICARE_AUTORIZARE.md, B4 §2.
// - 23 de permisiuni existente (5D, fără `reports.moderate`, eliminat prin 2.3);
// - 3 permisiuni noi, numai `super_admin` (DN-01);
// - `super_admin` = 26; `primarie_operator` = 12.
// Drepturile exclusive ale `super_admin` (B4 §2.4) NU sunt permisiuni: lista SUPER_ADMIN_EXCLUSIVE.

export const EXISTING_PERMISSIONS = [
  'dashboard.view',
  'announcements.view',
  'announcements.create',
  'announcements.edit',
  'announcements.publish',
  'announcements.disable',
  'reports.view',
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
] as const;

/** DN-01: exact trei, exclusiv `super_admin`. */
export const NEW_PERMISSIONS = ['accounts.manage', 'notifications.recipient.manage', 'audit.view'] as const;

export const ALL_PERMISSIONS = [...EXISTING_PERMISSIONS, ...NEW_PERMISSIONS] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const ADMIN_ROLES = ['super_admin', 'primarie_operator'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const PRIMARIE_OPERATOR_PERMISSIONS: readonly Permission[] = [
  'dashboard.view',
  'announcements.view',
  'announcements.create',
  'announcements.edit',
  'announcements.publish',
  'announcements.disable',
  'reports.view',
  'reports.resolve',
  'reports.reply',
  'directory.view',
  'quickDial.view',
  'surveys.view',
];

export const ROLE_PERMISSIONS: Readonly<Record<AdminRole, readonly Permission[]>> = {
  super_admin: ALL_PERMISSIONS,
  primarie_operator: PRIMARIE_OPERATOR_PERMISSIONS,
};

/** B4 §2.4: drepturi exclusive `super_admin` (nu sunt permisiuni; nu intră în matrice). */
export const SUPER_ADMIN_EXCLUSIVE = [
  'reports.delete',
  'citizens.block',
  'citizens.viewEmail',
  'reports.location.correct',
  'emails.retry',
  'emails.log.view',
  'citizens.block.lift',
] as const;
export type SuperAdminExclusive = (typeof SUPER_ADMIN_EXCLUSIVE)[number];

/** 6.6: rolurile care acționează pentru Primărie. */
const CITY_HALL_ROLES: readonly AdminRole[] = ['primarie_operator'];

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && (ADMIN_ROLES as readonly string[]).includes(role);
}

export function permissionsForRole(role: string | null | undefined): Permission[] {
  return isAdminRole(role) ? [...ROLE_PERMISSIONS[role]] : [];
}

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  return isAdminRole(role) && ROLE_PERMISSIONS[role].includes(permission);
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === 'super_admin';
}

export function actsForCityHall(role: string | null | undefined): boolean {
  return isAdminRole(role) && CITY_HALL_ROLES.includes(role);
}

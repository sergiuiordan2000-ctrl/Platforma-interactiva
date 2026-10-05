/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Faza 5.7 (B1 §5.1, D10-5, A-19): cheile vechi din `localStorage`, rămase de la prototipul fără server,
 * se șterg din browser la pornirea aplicației. Datele lor nu se migrează: erau locale fiecărui browser,
 * demo sau de test, iar unele conțineau date de contact (sesizări, jurnalul e-mail).
 *
 * Se șterg numai cheile din listă. Singura cheie folosită acum de aplicație este indiciul
 * „Ai participat deja” (`tmc_survey_participation_hint`, N4-12), care nu este în listă și rămâne.
 */

/** Inventarul din B1 §5.1 (toate cheile prototipului). */
export const LEGACY_LOCAL_STORAGE_KEYS = [
  'turnu_civic_reports_store',
  'turnu_civic_reports_counter',
  'turnu_civic_email_log_store',
  'turnu_civic_announcements',
  'turnu_civic_city_hall_directory',
  'turnu_civic_quickdial_contacts',
  'turnu_civic_quickdial_categories',
  'turnu_civic_surveys_store',
  'turnu_civic_survey_submissions_store',
  'turnu_civic_user_participated_surveys',
  'turnu_civic_admin_session',
] as const;

/** Sesiunea Admin veche stătea și în `sessionStorage` (P7; eliminată la 5.2). */
export const LEGACY_SESSION_STORAGE_KEYS = ['turnu_civic_admin_session'] as const;

/** Șterge cheile vechi. Fără stocare disponibilă (mod privat strict, de exemplu) nu face nimic. */
export function removeLegacyStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of LEGACY_LOCAL_STORAGE_KEYS) localStorage.removeItem(key);
  } catch {
    // stocare indisponibilă
  }
  try {
    for (const key of LEGACY_SESSION_STORAGE_KEYS) sessionStorage.removeItem(key);
  } catch {
    // stocare indisponibilă
  }
}

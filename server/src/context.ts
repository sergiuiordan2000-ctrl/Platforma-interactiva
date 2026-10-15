// Contextul comun al rutelor: configurare, DB, ceas (înlocuibil în teste).

import type mysql from 'mysql2/promise';
import { CITIZEN_ACCOUNT_EMAILS_PER_DAY, SURVEY_MIN_FORM_SECONDS } from '@tmc/shared';
import type { Config } from './config.ts';
import type { UatBoundary } from './uat.ts';
import type { GeocodeFn } from './reports/geocoder.ts';
import type { MailTransport } from './reports/outbox.ts';
import type { OidcProvider } from './auth/googleOAuth.ts';

export type AppContext = {
  config: Config;
  pool: mysql.Pool;
  now: () => Date;
  /** DN-19 / T-C9: căile imaginilor publicate cu aplicația (lipsă = nicio imagine). */
  announcementImages?: ReadonlySet<string>;
  /** 2.12: limita UAT (fără ea, depunerea cu coordonate și geocodarea sunt refuzate). */
  uat?: UatBoundary;
  /** 2.4: geocodarea; implicit Nominatim (`GEOCODER_URL`), înlocuită în teste. */
  geocode?: GeocodeFn;
  /** Transportul SMTP (5.5). Lipsă = mesajele care ar cere SMTP rămân în coadă. */
  mailTransport?: MailTransport;
  /** Amendamentul Google: furnizorul OpenID Connect; implicit Google, înlocuit în teste (G-T10). */
  oidc?: OidcProvider;
};

/** Valorile numerice propuse în design (DN-15); configurabile ulterior. */
export const LIMITS = {
  sessionIdleMinutes: 60,
  sessionAbsoluteHours: 12,
  preMfaMinutes: 5,
  loginMaxFailures: 5,
  loginLockMinutes: 15,
  /** RA-4 (decizia proprietarului, 13.10.2026): coduri TOTP greșite pe cont, pe oră, înainte de blocare. */
  totpMaxFailuresPerHour: 3,
  loginPerIpWindowMinutes: 15,
  loginPerIp: 20,
  /** D-B4 (13.10.2026): verificări de parolă Admin simultane. */
  loginConcurrentPasswordChecks: 2,
  citizenCodeMinutes: 15,
  citizenCodeMaxAttempts: 5,
  citizenStartPerAddressPerHour: 5,
  citizenStartPerIpPerHour: 20,
  citizenAccountEmailsPerDay: CITIZEN_ACCOUNT_EMAILS_PER_DAY,
  citizenBlockedNoticePerDay: 1,
  /** Amendamentul Google (G-T9): pornirile și întoarcerile, pe IP, pe oră (propunere tehnică, ca la cod). */
  citizenGooglePerIpPerHour: 20,
  /** §8 D: încercarea expiră după 10 minute (cookie și server). */
  citizenOauthAttemptMinutes: 10,
  recoveryCodes: 10,
  temporaryBlockDays: 15,
  /**
   * Decizia proprietarului (30.09.2026, varianta B): sesiunea de cetățean nu expiră pe server (numai ieșire,
   * ștergerea contului sau revocare). Cookie-ul persistent are durata maximă acceptată de browsere (400 de zile,
   * RFC 6265bis) și se reînnoiește la fiecare folosire.
   */
  citizenCookieMaxAgeDays: 400,
  /** R7 (7A; A05-1, B1 §3.9): sesiunile se șterg la 6 luni după expirare sau revocare. */
  sessionRetentionMonths: 6,
  /** R7 (7A; N4-8, B1 §3.6): jurnalul agregat al respingerilor se păstrează 30 de zile. */
  rejectedAttemptsRetentionDays: 30,
  /** D7-5 (7A; decizia proprietarului din 15.10.2026): conturile de cetățean `pending` neactivate se șterg la 45 de zile. */
  pendingAccountRetentionDays: 45,
  // ——— sesizări (B7 §2, B5 §2, 2.14; propuneri DN-15) ———
  reportMinFormSeconds: 8,
  /** Jetonul formularului expiră după 24 h (propunere tehnică). */
  reportFormTokenMaxHours: 24,
  reportsPerIpPerHour: 5,
  reportsPerIpPerDay: 20,
  reportsPerAccountPerDay: 5,
  cityHallTransmissionsPerAccountPer24h: 3,
  /** D9-4: toate notificările către cetățean, per sesizare, pe zi. */
  citizenNotificationsPerReportPerDay: 3,
  /** Geocodarea (2.4): propunere tehnică; Nominatim cere cel mult o cerere pe secundă. */
  geocodePerIpPerHour: 30,
  /** D-B5 (13.10.2026): căutări de adresă pe cont, pe oră. */
  geocodePerAccountPerHour: 20,
  geocodeGlobalPerMinute: 50,
  unsubscribePerIpPerHour: 30,
  /** B6 §1: pauzele între încercări (minute); după ultima → `failed`. */
  emailRetryMinutes: [1, 5, 30, 120, 720],
  // ——— sondaje (B7 §2; P-7, decizia proprietarului din 01.10.2026; configurabile, DN-15) ———
  surveyMinFormSeconds: SURVEY_MIN_FORM_SECONDS,
  surveyFormTokenMaxHours: 24,
  surveyVotesPerIpPerSurveyPerHour: 10,
  surveyVotesPerIpPerHour: 300,
  emailLeaseMinutes: 2,
} as const;

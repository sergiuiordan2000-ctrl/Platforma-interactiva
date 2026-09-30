// Contextul comun al rutelor: configurare, DB, ceas (înlocuibil în teste).

import type mysql from 'mysql2/promise';
import type { Config } from './config.ts';
import type { UatBoundary } from './uat.ts';
import type { GeocodeFn } from './reports/geocoder.ts';
import type { MailTransport } from './reports/outbox.ts';

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
};

/** Valorile numerice propuse în design (DN-15); configurabile ulterior. */
export const LIMITS = {
  sessionIdleMinutes: 60,
  sessionAbsoluteHours: 12,
  preMfaMinutes: 5,
  loginMaxFailures: 5,
  loginLockMinutes: 15,
  loginPerIpWindowMinutes: 15,
  loginPerIp: 20,
  citizenCodeMinutes: 15,
  citizenCodeMaxAttempts: 5,
  citizenStartPerAddressPerHour: 5,
  citizenStartPerIpPerHour: 20,
  citizenAccountEmailsPerDay: 3,
  citizenBlockedNoticePerDay: 1,
  recoveryCodes: 10,
  temporaryBlockDays: 15,
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
  geocodeGlobalPerMinute: 50,
  unsubscribePerIpPerHour: 30,
  /** B6 §1: pauzele între încercări (minute); după ultima → `failed`. */
  emailRetryMinutes: [1, 5, 30, 120, 720],
  emailLeaseMinutes: 2,
} as const;

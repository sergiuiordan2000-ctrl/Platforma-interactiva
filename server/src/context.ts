// Contextul comun al rutelor: configurare, DB, ceas (înlocuibil în teste).

import type mysql from 'mysql2/promise';
import type { Config } from './config.ts';

export type AppContext = {
  config: Config;
  pool: mysql.Pool;
  now: () => Date;
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
} as const;

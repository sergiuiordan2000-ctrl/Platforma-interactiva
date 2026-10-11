// Mediu de test complet și valid (valori generate, fără legătură cu vreun mediu real).

import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: Record<string, string | undefined> = {
    APP_ENV: 'development',
    PUBLIC_BASE_URL: 'http://localhost:3000',
    DATABASE_URL: process.env.CIVIC_TEST_DATABASE_URL ?? 'mysql://test:test@127.0.0.1:3306/civic_test',
    STORAGE_DIR: '/tmp/civic-test-storage',
    IP_HASH_SECRET: randomBytes(32).toString('hex'),
    PARTICIPATION_HMAC_SECRET: randomBytes(32).toString('hex'),
    FORM_TOKEN_SECRET: randomBytes(32).toString('hex'),
    POW_HMAC_KEY: randomBytes(32).toString('hex'),
    TOTP_ENC_KEY: randomBytes(32).toString('hex'),
    LOG_LEVEL: 'silent',
    ...overrides,
  };
  // Faza 6 (R1–R2): pe staging și în producție BACKUP_DIR este obligatoriu. Un mediu de test „complet și valid”
  // îl primește implicit; un test care verifică refuzul îl scoate explicit (`BACKUP_DIR: undefined`).
  if (env.APP_ENV !== 'development' && !('BACKUP_DIR' in overrides)) {
    env.BACKUP_DIR = join(tmpdir(), 'civic-test-backups');
  }
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  return env as NodeJS.ProcessEnv;
}

// Mediu de test complet și valid (valori generate, fără legătură cu vreun mediu real).

import { randomBytes } from 'node:crypto';

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
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  return env as NodeJS.ProcessEnv;
}

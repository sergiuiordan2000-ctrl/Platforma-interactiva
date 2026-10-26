// Faza 7C, P3: pagina temporară de diagnostic din Faza 6 (`GET /api/v1/diag/client-ip`) a fost eliminată.
// DG-1: ruta nu mai există în nicio configurare. DG-2: `DIAG_CLIENT_IP` nu mai este citită de configurație;
// schema de configurare ignoră variabilele necunoscute, deci o valoare rămasă în civic.env nu mai are niciun efect.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApp } from '../../src/app.ts';
import { loadConfig } from '../../src/config.ts';
import { testEnv } from '../helpers/env.ts';

const URL_ = '/api/v1/diag/client-ip';
const STAGING = { APP_ENV: 'staging', PUBLIC_BASE_URL: 'https://exemplu.test' };
const PRODUCTION = { APP_ENV: 'production', PUBLIC_BASE_URL: 'https://exemplu.test' };

describe('pagina de diagnostic eliminată (7C, P3)', () => {
  it('DG-1: ruta de diagnostic întoarce 404 în orice configurare', async () => {
    for (const env of [{}, { DIAG_CLIENT_IP: 'on' }, { ...STAGING, DIAG_CLIENT_IP: 'on' }, { DIAG_CLIENT_IP: 'on', TRUST_PROXY: 'true' }]) {
      const a = await buildApp({ config: loadConfig(testEnv(env)), health: async () => 'ok', logger: false });
      assert.equal((await a.inject({ method: 'GET', url: URL_ })).statusCode, 404, JSON.stringify(env));
      await a.close();
    }
  });

  it('DG-2: DIAG_CLIENT_IP nu mai este citită: orice valoare, în orice mediu, este ignorată', () => {
    for (const env of [{ DIAG_CLIENT_IP: 'on' }, { DIAG_CLIENT_IP: 'da' }, { ...STAGING, DIAG_CLIENT_IP: 'on' }, { ...PRODUCTION, DIAG_CLIENT_IP: 'on' }]) {
      const config = loadConfig(testEnv(env));
      assert.equal('diagClientIp' in config, false, JSON.stringify(env));
    }
  });
});

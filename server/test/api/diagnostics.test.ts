// Faza 6, Pasul 2: pagina temporară de diagnostic a adresei vizitatorului (`GET /api/v1/diag/client-ip`).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApp } from '../../src/app.ts';
import { ConfigError, loadConfig } from '../../src/config.ts';
import { DIAG_HEADERS } from '../../src/routes/diagnostics.ts';
import { testEnv } from '../helpers/env.ts';

const URL_ = '/api/v1/diag/client-ip';
const app = (env: Record<string, string | undefined> = {}) =>
  buildApp({ config: loadConfig(testEnv(env)), health: async () => 'ok', logger: false });

describe('pagina de diagnostic: pornire și oprire', () => {
  it('fără DIAG_CLIENT_IP → 404 (ruta nu există)', async () => {
    const a = await app();
    assert.equal((await a.inject({ method: 'GET', url: URL_ })).statusCode, 404);
    await a.close();
  });

  it('DIAG_CLIENT_IP=on pe staging → acceptat; în producție → configurare refuzată; altă valoare → refuzată', () => {
    const staging = { APP_ENV: 'staging', PUBLIC_BASE_URL: 'https://exemplu.test', DIAG_CLIENT_IP: 'on' };
    assert.equal(loadConfig(testEnv(staging)).diagClientIp, true);
    assert.throws(
      () => loadConfig(testEnv({ APP_ENV: 'production', PUBLIC_BASE_URL: 'https://exemplu.test', DIAG_CLIENT_IP: 'on' })),
      (err: unknown) => err instanceof ConfigError && /DIAG_CLIENT_IP: pagina de diagnostic nu este permisă în producție/.test(err.message),
    );
    assert.throws(() => loadConfig(testEnv({ DIAG_CLIENT_IP: 'da' })), (err: unknown) => err instanceof ConfigError && /DIAG_CLIENT_IP/.test(err.message));
    assert.equal(loadConfig(testEnv()).diagClientIp, false);
  });
});

describe('pagina de diagnostic: conținutul', () => {
  it('arată conexiunea, adresa calculată și anteturile de adresă; fără cache', async () => {
    const a = await app({ DIAG_CLIENT_IP: 'on' });
    const res = await a.inject({
      method: 'GET',
      url: URL_,
      remoteAddress: '10.1.2.3',
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'x-real-ip': '203.0.113.7' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['cache-control'], 'no-store');
    const body = res.json();
    assert.equal(body.connection.remoteAddress, '10.1.2.3');
    assert.equal(body.application.trustProxy, false);
    assert.equal(body.application.ip, '10.1.2.3', 'fără TRUST_PROXY, aplicația folosește adresa conexiunii');
    assert.equal(body.headers['x-forwarded-for'], '203.0.113.7, 10.0.0.1');
    assert.equal(body.headers['x-real-ip'], '203.0.113.7');
    assert.equal(body.headers.forwarded, null);
    assert.deepEqual(Object.keys(body.headers).sort(), [...DIAG_HEADERS].sort());
    assert.ok(body.headerNames.includes('x-forwarded-for'));
    await a.close();
  });

  it('cu TRUST_PROXY=true, adresa calculată vine din X-Forwarded-For (proba T1–T4 compară cele două)', async () => {
    const a = await app({ DIAG_CLIENT_IP: 'on', TRUST_PROXY: 'true' });
    const res = await a.inject({ method: 'GET', url: URL_, remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': '198.51.100.9' } });
    assert.equal(res.json().application.ip, '198.51.100.9');
    assert.equal(res.json().application.trustProxy, true);
    await a.close();
  });

  it('nu întoarce niciodată valori de cookie, autorizare sau alte anteturi: numai numele lor', async () => {
    const a = await app({ DIAG_CLIENT_IP: 'on' });
    const res = await a.inject({
      method: 'GET',
      url: URL_,
      headers: { cookie: 'civic_session=SECRET-COOKIE', authorization: 'Basic U0VDUkVULUFVVEg=', 'x-altceva': 'SECRET-ALT' },
    });
    assert.equal(res.statusCode, 200);
    for (const secret of ['SECRET-COOKIE', 'U0VDUkVULUFVVEg=', 'SECRET-ALT']) assert.ok(!res.body.includes(secret), secret);
    const names: string[] = res.json().headerNames;
    for (const n of ['cookie', 'authorization', 'x-altceva']) assert.ok(names.includes(n), n);
    await a.close();
  });

  it('numai GET: alte metode nu sunt acceptate', async () => {
    const a = await app({ DIAG_CLIENT_IP: 'on' });
    const res = await a.inject({ method: 'POST', url: URL_, payload: {} });
    assert.ok([404, 405].includes(res.statusCode), String(res.statusCode));
    await a.close();
  });
});

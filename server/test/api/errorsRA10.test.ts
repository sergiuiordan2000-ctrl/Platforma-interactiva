// RA-10 (reaudit, 13.10.2026; constatarea R17 din 11.10.2026): erorile rutelor `/api/v1` trec prin handlerul
// aplicației. Clientul nu primește niciodată mesajul brut al unei erori interne (de exemplu al bazei de date, care pe
// găzduire poate conține numele contului), ci mesajul generic, cu identificatorul de corelare; la 4xx, mesajul generic.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.ts';
import { loadConfig } from '../../src/config.ts';
import type { AppContext } from '../../src/context.ts';
import { testEnv } from '../helpers/env.ts';

const SECRET = "Access denied for user 'contul_civic'@'localhost' to database 'contul_civic_test'";
let app: FastifyInstance;
let origin: string;

before(async () => {
  const config = loadConfig(testEnv());
  origin = config.publicBaseUrl;
  const fail = async () => {
    throw new Error(SECRET);
  };
  const pool = { query: fail, execute: fail, getConnection: fail } as unknown as AppContext['pool'];
  app = await buildApp({ config, health: async () => 'ok', logger: false, ctx: { config, pool, now: () => new Date() } });
});
after(async () => {
  await app?.close();
});

const headers = () => ({ 'content-type': 'application/json', 'x-civic-request': '1', origin });

describe('RA-10: erorile de sub /api/v1 trec prin handlerul aplicației', () => {
  it('eroare internă (baza de date) → 500 INTERNAL, mesaj generic, cu identificator de corelare, fără textul erorii', async () => {
    for (const url of ['/api/v1/public/announcements', '/api/v1/public/surveys']) {
      const r = await app.inject({ method: 'GET', url });
      assert.equal(r.statusCode, 500, url);
      assert.ok(!r.body.includes('contul_civic'), `${url}: fără textul erorii`);
      const body = r.json();
      assert.equal(body.error.code, 'INTERNAL', url);
      assert.equal(body.error.message, 'A apărut o eroare internă. Încercați din nou mai târziu.');
      assert.equal(typeof body.error.correlationId, 'string', `${url}: identificator de corelare`);
      assert.ok(body.error.correlationId.length > 0);
    }
  });

  it('JSON invalid → 400 BAD_REQUEST, mesaj generic, fără codul intern al Fastify', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/v1/auth/login', headers: headers(), payload: '{nu e json' });
    assert.equal(r.statusCode, 400);
    assert.ok(!r.body.includes('FST_'), r.body);
    assert.deepEqual(r.json().error, { code: 'BAD_REQUEST', message: 'Cererea nu poate fi procesată.' });
  });

  it('tip de conținut nepermis → 415 UNSUPPORTED_MEDIA_TYPE', async () => {
    const r = await app.inject({
      method: 'POST', url: '/api/v1/auth/login', headers: { ...headers(), 'content-type': 'application/x-ciudat' }, payload: 'x',
    });
    assert.equal(r.statusCode, 415);
    assert.equal(r.json().error.code, 'UNSUPPORTED_MEDIA_TYPE');
  });
});

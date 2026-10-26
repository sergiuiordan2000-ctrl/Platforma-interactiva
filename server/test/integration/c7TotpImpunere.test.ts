// Faza 7C, P6 (DEC-18, varianta b): impunerea TOTP pentru super_admin, verificată în modul `production`.
// TO-1: super_admin fără TOTP → `enroll` după parolă; orice rută protejată → 403 MFA_REQUIRED până la înrolare.
// TO-2: după resetarea TOTP de către alt super_admin: sesiunile contului sunt revocate; la autentificare → `enroll`.
// TO-3: un cont promovat la super_admin fără TOTP: sesiunile sunt revocate; la autentificare → `enroll`.
// Testele nu schimbă comportamentul aplicației (criteriile: docs/faza7/FAZA_7_E0_REGISTRU_DECIZII.md, Anexa A.3).

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { bootstrapAdmin } from '../../src/accounts.ts';
import { totpCodeAt } from '../../src/auth/totp.ts';
import type { AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
const ORIGIN = 'https://exemplu.test';
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
const clock = new Clock();
let sa1: Client;

/** Autentificare completă: parolă temporară → înrolare TOTP (dacă se cere) → parolă nouă. */
async function loginNew(email: string, temp: string, newPw: string): Promise<Client> {
  const c = new Client(app, ORIGIN);
  const res = await c.post(`${V1}/auth/login`, { email, password: temp });
  assert.equal(res.statusCode, 200, res.body);
  if (res.json().mfa === 'enroll') {
    const secret = (await c.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
    assert.equal((await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) })).statusCode, 200);
  }
  assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: temp, newPassword: newPw })).statusCode, 204);
  clock.advanceMinutes(1);
  return c;
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app, ctx } = await makeApp(h, clock, { APP_ENV: 'production', PUBLIC_BASE_URL: ORIGIN }));
  assert.equal(ctx.config.appEnv, 'production');
});

after(async () => {
  await app.close();
  await h.close();
});

describe('impunerea TOTP pentru super_admin în modul production (7C, P6)', () => {
  it('TO-1: super_admin fără TOTP → enroll; rutele protejate → 403 MFA_REQUIRED până la înrolare', async () => {
    const b = await bootstrapAdmin(h.pool, clock.now(), 'sa1@exemplu.test', 'SA 1');
    const c = new Client(app, ORIGIN);
    const login = await c.post(`${V1}/auth/login`, { email: 'sa1@exemplu.test', password: b.temporaryPassword });
    assert.equal(login.statusCode, 200);
    assert.equal(login.json().mfa, 'enroll');
    for (const res of [await c.get(`${V1}/admin/accounts`), await c.get(`${V1}/admin/audit`)]) {
      assert.equal(res.statusCode, 403);
      assert.equal(res.json().error.code, 'MFA_REQUIRED');
    }
    assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: b.temporaryPassword, newPassword: 'parola-sa1-lunga-2026' })).statusCode, 403);
    // după înrolare, sesiunea devine completă (inițial numai schimbarea parolei temporare este permisă)
    const secret = (await c.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
    assert.equal((await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) })).statusCode, 200);
    assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: b.temporaryPassword, newPassword: 'parola-sa1-lunga-2026' })).statusCode, 204);
    assert.equal((await c.get(`${V1}/admin/accounts`)).statusCode, 200);
    clock.advanceMinutes(1);
    sa1 = c;
  });

  it('TO-2: resetarea TOTP de către alt super_admin revocă sesiunile; următoarea autentificare cere enroll', async () => {
    const created = await sa1.post(`${V1}/admin/accounts`, { email: 'sa2@exemplu.test', displayName: 'SA 2', role: 'super_admin' });
    assert.equal(created.statusCode, 201);
    const sa2 = await loginNew('sa2@exemplu.test', created.json().temporaryPassword, 'parola-sa2-lunga-2026');
    assert.equal((await sa2.get(`${V1}/auth/me`)).statusCode, 200);
    assert.equal((await sa1.post(`${V1}/admin/accounts/${created.json().id}/reset-mfa`)).statusCode, 204);
    assert.equal((await sa2.get(`${V1}/auth/me`)).statusCode, 401, 'sesiunea contului resetat este revocată');
    const again = new Client(app, ORIGIN);
    const login = await again.post(`${V1}/auth/login`, { email: 'sa2@exemplu.test', password: 'parola-sa2-lunga-2026' });
    assert.equal(login.statusCode, 200);
    assert.equal(login.json().mfa, 'enroll');
    const res = await again.get(`${V1}/admin/accounts`);
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, 'MFA_REQUIRED');
  });

  it('TO-3: un cont promovat la super_admin fără TOTP: sesiunile sunt revocate; următoarea autentificare cere enroll', async () => {
    const created = await sa1.post(`${V1}/admin/accounts`, { email: 'op@exemplu.test', displayName: 'Operator', role: 'primarie_operator' });
    assert.equal(created.statusCode, 201);
    const op = await loginNew('op@exemplu.test', created.json().temporaryPassword, 'parola-op-lunga-2026');
    const me = await op.get(`${V1}/auth/me`);
    assert.equal(me.statusCode, 200);
    assert.equal(me.json().mfaEnabled, false, 'operatorul nu are TOTP configurat');
    assert.equal((await sa1.send('PATCH', `${V1}/admin/accounts/${created.json().id}`, { role: 'super_admin' })).statusCode, 200);
    assert.equal((await op.get(`${V1}/auth/me`)).statusCode, 401, 'sesiunea contului promovat este revocată');
    const again = new Client(app, ORIGIN);
    const login = await again.post(`${V1}/auth/login`, { email: 'op@exemplu.test', password: 'parola-op-lunga-2026' });
    assert.equal(login.statusCode, 200);
    assert.equal(login.json().mfa, 'enroll');
    const res = await again.get(`${V1}/admin/accounts`);
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, 'MFA_REQUIRED');
  });
});

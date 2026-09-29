// Autentificarea Admin (B10 §3): parolă, blocare, TOTP (înrolare, verificare, anti-reluare, coduri de recuperare),
// schimbarea parolei, sesiuni (cookie, expirare, revocare), CSRF, P7 pe server.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { BootstrapRefusedError, bootstrapAdmin, createAdminAccount } from '../../src/accounts.ts';
import { decryptSecret } from '../../src/auth/crypto.ts';
import { totpCodeAt } from '../../src/auth/totp.ts';
import type { AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
const clock = new Clock();
let adminPassword: string;
let recoveryCodes: string[] = [];
const NEW_PASSWORD = 'o-parola-noua-si-lunga-2026';

async function totpSecret(email: string): Promise<string> {
  const [rows] = await h.pool.query('SELECT totp_secret_enc AS s FROM admin_users WHERE email = ?', [email]);
  return decryptSecret(ctx.config.secrets.totpEncKey, (rows as Array<{ s: Buffer }>)[0]!.s);
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app, ctx } = await makeApp(h, clock));
  const created = await bootstrapAdmin(h.pool, clock.now(), 'Admin@Exemplu.test', 'Administrator');
  adminPassword = created.temporaryPassword;
});
after(async () => {
  await app.close();
  await h.close();
});

describe('bootstrap-admin (D8-5)', () => {
  it('al doilea bootstrap este refuzat; parola temporară are ≥ 16 caractere', async () => {
    assert.ok(adminPassword.length >= 16);
    await assert.rejects(bootstrapAdmin(h.pool, clock.now(), 'altul@exemplu.test', 'X'), BootstrapRefusedError);
  });
});

describe('login (B3 §2, §4)', () => {
  it('parolă greșită și cont inexistent → același 401 generic', async () => {
    const c = new Client(app);
    const wrong = await c.post(`${V1}/auth/login`, { email: 'admin@exemplu.test', password: 'gresit-gresit-1' });
    const unknown = await c.post(`${V1}/auth/login`, { email: 'nimeni@exemplu.test', password: 'gresit-gresit-1' });
    assert.equal(wrong.statusCode, 401);
    assert.equal(unknown.statusCode, 401);
    assert.deepEqual(wrong.json(), unknown.json());
    assert.equal(c.cookie, undefined);
  });

  it('câmp necunoscut → 400; fără antetul CSRF → 403; Origin străin → 403', async () => {
    const c = new Client(app);
    assert.equal((await c.post(`${V1}/auth/login`, { email: 'a@b.ro', password: 'x', extra: 1 })).statusCode, 400);
    const noHeader = await app.inject({ method: 'POST', url: `${V1}/auth/login`, payload: { email: 'a@b.ro', password: 'x' } });
    assert.equal(noHeader.statusCode, 403);
    const evil = await new Client(app, 'https://rau.exemplu').post(`${V1}/auth/login`, { email: 'a@b.ro', password: 'x' });
    assert.equal(evil.statusCode, 403);
  });

  it('super_admin fără TOTP: sesiune pre-MFA, înrolare obligatorie; nimic altceva permis', async () => {
    const c = new Client(app);
    const res = await c.post(`${V1}/auth/login`, { email: 'admin@exemplu.test', password: adminPassword });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { mfa: 'enroll', mustChangePassword: true });
    assert.ok(c.cookie?.startsWith('civic_sid='));
    const me = await c.get(`${V1}/auth/me`);
    assert.equal(me.json().mfaPending, true);
    assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: adminPassword, newPassword: NEW_PASSWORD })).statusCode, 403);
    assert.equal((await c.post(`${V1}/auth/mfa/recovery-codes/regenerate`)).statusCode, 403);

    const start = await c.post(`${V1}/auth/mfa/enroll/start`);
    assert.equal(start.statusCode, 200);
    assert.match(start.json().otpauthUri, /^otpauth:\/\/totp\//);
    const secret = start.json().secretBase32 as string;
    assert.equal(secret, await totpSecret('admin@exemplu.test'));
    assert.equal((await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: '000000' })).statusCode, 401);
    const oldCookie = c.cookie;
    const confirm = await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) });
    assert.equal(confirm.statusCode, 200);
    recoveryCodes = confirm.json().recoveryCodes;
    assert.equal(recoveryCodes.length, 10);
    assert.notEqual(c.cookie, oldCookie, 'jeton rotit după TOTP (anti-fixare)');
    const stale = new Client(app);
    stale.cookie = oldCookie;
    assert.equal((await stale.get(`${V1}/auth/me`)).statusCode, 401);

    // parola temporară trebuie schimbată înainte de orice altă operație
    assert.equal((await c.post(`${V1}/auth/mfa/recovery-codes/regenerate`)).statusCode, 403);
    const weak = await c.post(`${V1}/auth/change-password`, { currentPassword: adminPassword, newPassword: 'scurta' });
    assert.equal(weak.statusCode, 422);
    const ok = await c.post(`${V1}/auth/change-password`, { currentPassword: adminPassword, newPassword: NEW_PASSWORD });
    assert.equal(ok.statusCode, 204);
    const me2 = await c.get(`${V1}/auth/me`);
    assert.equal(me2.json().mustChangePassword, false);
    assert.equal(me2.json().permissions.length, 26);
    assert.ok(!me2.json().permissions.includes('reports.moderate'));
  });

  it('login ulterior: TOTP cerut; cod greșit → 401; codul corect o singură dată (anti-reluare)', async () => {
    clock.advanceMinutes(1);
    const secret = await totpSecret('admin@exemplu.test');
    const c = new Client(app);
    const res = await c.post(`${V1}/auth/login`, { email: 'admin@exemplu.test', password: NEW_PASSWORD });
    assert.deepEqual(res.json(), { mfa: 'required', mustChangePassword: false });
    assert.equal((await c.post(`${V1}/auth/mfa/verify`, { code: '123456' })).statusCode, 401);
    const code = totpCodeAt(secret, clock.now());
    assert.equal((await c.post(`${V1}/auth/mfa/verify`, { code })).statusCode, 200);
    assert.equal((await c.get(`${V1}/auth/me`)).json().mfaPending, false);

    const c2 = new Client(app);
    await c2.post(`${V1}/auth/login`, { email: 'admin@exemplu.test', password: NEW_PASSWORD });
    assert.equal((await c2.post(`${V1}/auth/mfa/verify`, { code })).statusCode, 401, 'același cod refolosit');
  });

  it('cod de recuperare (2.15-A): acceptat o singură dată, cu audit', async () => {
    const c = new Client(app);
    await c.post(`${V1}/auth/login`, { email: 'admin@exemplu.test', password: NEW_PASSWORD });
    assert.equal((await c.post(`${V1}/auth/mfa/recovery`, { code: recoveryCodes[0] })).statusCode, 200);
    const c2 = new Client(app);
    await c2.post(`${V1}/auth/login`, { email: 'admin@exemplu.test', password: NEW_PASSWORD });
    assert.equal((await c2.post(`${V1}/auth/mfa/recovery`, { code: recoveryCodes[0] })).statusCode, 401);
    const [rows] = await h.pool.query("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'auth.recovery_code.used'");
    assert.equal(Number((rows as Array<{ n: number }>)[0]!.n), 1);
  });

  it('5 eșecuri → blocare 15 minute (tot 401 generic, chiar cu parola corectă); apoi deblocare automată', async () => {
    const op = await createAdminAccount(h.pool, clock.now(), {
      email: 'operator@exemplu.test', displayName: 'Operator', role: 'primarie_operator', createdBy: null,
    });
    const c = new Client(app);
    for (let i = 0; i < 5; i++) {
      assert.equal((await c.post(`${V1}/auth/login`, { email: 'operator@exemplu.test', password: 'gresit-gresit-1' })).statusCode, 401);
    }
    assert.equal((await c.post(`${V1}/auth/login`, { email: 'operator@exemplu.test', password: op.temporaryPassword })).statusCode, 401);
    clock.advanceMinutes(16);
    const res = await c.post(`${V1}/auth/login`, { email: 'operator@exemplu.test', password: op.temporaryPassword });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { mfa: 'none', mustChangePassword: true }, 'TOTP opțional pentru operator');
  });
});

describe('sesiunea (B3 §3) și P7 pe server', () => {
  it('cookie falsificat sau inventat → 401', async () => {
    const c = new Client(app);
    c.cookie = 'civic_sid=' + 'A'.repeat(43);
    assert.equal((await c.get(`${V1}/auth/me`)).statusCode, 401);
    c.cookie = 'civic_sid={"id":"admin","role":"super_admin"}';
    assert.equal((await c.get(`${V1}/auth/me`)).statusCode, 401);
  });

  it('expirare după 60 de minute de inactivitate; logout revocă sesiunea', async () => {
    const secret = await totpSecret('admin@exemplu.test');
    clock.advanceMinutes(1);
    const c = new Client(app);
    await c.post(`${V1}/auth/login`, { email: 'admin@exemplu.test', password: NEW_PASSWORD });
    await c.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(secret, clock.now()) });
    clock.advanceMinutes(59);
    assert.equal((await c.get(`${V1}/auth/me`)).statusCode, 200);
    clock.advanceMinutes(61);
    assert.equal((await c.get(`${V1}/auth/me`)).statusCode, 401);

    clock.advanceMinutes(1);
    const c2 = new Client(app);
    await c2.post(`${V1}/auth/login`, { email: 'admin@exemplu.test', password: NEW_PASSWORD });
    await c2.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(secret, clock.now()) });
    const saved = c2.cookie;
    assert.equal((await c2.post(`${V1}/auth/logout`)).statusCode, 204);
    const replay = new Client(app);
    replay.cookie = saved;
    assert.equal((await replay.get(`${V1}/auth/me`)).statusCode, 401);
  });

  it('pe staging: cookie `__Host-` cu Secure, HttpOnly, SameSite=Strict, Path=/, fără Domain', async () => {
    const staging = await makeApp(h, clock, { APP_ENV: 'staging', PUBLIC_BASE_URL: 'https://exemplu.test' });
    const res = await staging.app.inject({
      method: 'POST', url: `${V1}/auth/login`,
      headers: { 'x-civic-request': '1', origin: 'https://exemplu.test' },
      payload: { email: 'admin@exemplu.test', password: NEW_PASSWORD },
    });
    const cookie = String(res.headers['set-cookie']);
    assert.match(cookie, /^__Host-civic_sid=/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\//);
    assert.doesNotMatch(cookie, /Domain=/);
    await staging.app.close();
  });
});

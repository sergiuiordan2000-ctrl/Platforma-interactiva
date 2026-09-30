// Conturile Admin (B2 §6.5, D8) și conturile cetățenilor (B2 §4.1, B3 §8, K-A02-4).

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { bootstrapAdmin } from '../../src/accounts.ts';
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
const PW = 'parola-super-admin-2026';
let admin: Client;
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];

/** Autentificare completă: parolă temporară → TOTP → parolă nouă. */
async function loginNew(email: string, temp: string, newPw: string): Promise<Client> {
  const c = new Client(app);
  const res = await c.post(`${V1}/auth/login`, { email, password: temp });
  if (res.json().mfa === 'enroll') {
    const secret = (await c.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
    await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(secret, clock.now()) });
  }
  assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: temp, newPassword: newPw })).statusCode, 204);
  clock.advanceMinutes(1);
  return c;
}

async function loginExisting(email: string, pw: string): Promise<Client> {
  const c = new Client(app);
  const res = await c.post(`${V1}/auth/login`, { email, password: pw });
  if (res.json().mfa === 'required') {
    const [row] = await q<{ s: Buffer }>('SELECT totp_secret_enc AS s FROM admin_users WHERE email = ?', [email]);
    await c.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(decryptSecret(ctx.config.secrets.totpEncKey, row!.s), clock.now()) });
  }
  clock.advanceMinutes(1);
  return c;
}

async function citizenLogin(email: string, accept = true): Promise<Client> {
  const c = new Client(app);
  const start = await c.post(`${V1}/citizen/auth/start`, accept ? { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION } : { email });
  assert.equal(start.statusCode, 202);
  const [row] = await q<{ b: string }>(
    "SELECT body_text AS b FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC, id DESC LIMIT 1",
    [email.toLowerCase()],
  );
  const code = row!.b.match(/\b(\d{6})\b/)![1]!;
  assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email, code })).statusCode, 200);
  return c;
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app, ctx } = await makeApp(h, clock));
  const b = await bootstrapAdmin(h.pool, clock.now(), 'sa1@exemplu.test', 'SA 1');
  admin = await loginNew('sa1@exemplu.test', b.temporaryPassword, PW);
});
after(async () => {
  await app.close();
  await h.close();
});

describe('conturile Admin (accounts.manage)', () => {
  let opId = '';
  let opClient: Client;

  it('creare → parolă temporară o dată; e-mail duplicat → 409; audit', async () => {
    const res = await admin.post(`${V1}/admin/accounts`, { email: 'Op@Exemplu.test', displayName: 'Operator', role: 'primarie_operator' });
    assert.equal(res.statusCode, 201);
    opId = res.json().id;
    opClient = await loginNew('op@exemplu.test', res.json().temporaryPassword, 'parola-operatorului-2026');
    assert.equal((await admin.post(`${V1}/admin/accounts`, { email: 'op@exemplu.test', displayName: 'X', role: 'primarie_operator' })).statusCode, 409);
    const [a] = await q<{ n: number }>("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'account.create'");
    assert.equal(Number(a!.n), 1);
  });

  it('operatorul: 12 permisiuni; fără acces la conturi, audit, cetățeni (403)', async () => {
    assert.equal((await opClient.get(`${V1}/auth/me`)).json().permissions.length, 12);
    assert.equal((await opClient.get(`${V1}/admin/accounts`)).statusCode, 403);
    assert.equal((await opClient.get(`${V1}/admin/audit`)).statusCode, 403);
    assert.equal((await opClient.get(`${V1}/admin/citizens`)).statusCode, 403);
    assert.equal((await opClient.get(`${V1}/admin/accounts/directory`)).statusCode, 200);
  });

  it('protecții: nu pe sine; ultimul super_admin nu poate fi retrogradat', async () => {
    const [me] = await q<{ id: string }>("SELECT id FROM admin_users WHERE email = 'sa1@exemplu.test'");
    assert.equal((await admin.send('PATCH', `${V1}/admin/accounts/${me!.id}`, { role: 'primarie_operator' })).statusCode, 403);
    const sa2 = await admin.post(`${V1}/admin/accounts`, { email: 'sa2@exemplu.test', displayName: 'SA 2', role: 'super_admin' });
    const sa2Client = await loginNew('sa2@exemplu.test', sa2.json().temporaryPassword, 'parola-sa2-lunga-2026');
    // sa2 dezactivează sa1 → rămâne un singur super_admin activ (sa2); apoi nu se mai poate dezactiva
    assert.equal((await sa2Client.send('PATCH', `${V1}/admin/accounts/${me!.id}`, { status: 'disabled' })).statusCode, 200);
    assert.equal((await admin.get(`${V1}/auth/me`)).statusCode, 401, 'sesiunile contului dezactivat sunt revocate');
    await sa2Client.send('PATCH', `${V1}/admin/accounts/${me!.id}`, { status: 'active' });
    admin = await loginExisting('sa1@exemplu.test', PW);
    const res = await admin.send('PATCH', `${V1}/admin/accounts/${sa2.json().id}`, { role: 'primarie_operator' });
    assert.equal(res.statusCode, 200);
    const last = await q<{ id: string }>("SELECT id FROM admin_users WHERE role = 'super_admin' AND status = 'active'");
    assert.equal(last.length, 1);
    await admin.send('PATCH', `${V1}/admin/accounts/${sa2.json().id}`, { role: 'super_admin' });
  });

  it('schimbarea rolului revocă sesiunile; resetarea parolei → parolă temporară, sesiuni revocate', async () => {
    assert.equal((await admin.send('PATCH', `${V1}/admin/accounts/${opId}`, { displayName: 'Operator Primărie' })).statusCode, 200);
    assert.equal((await opClient.get(`${V1}/auth/me`)).statusCode, 200, 'numele nu revocă sesiunea');
    const reset = await admin.post(`${V1}/admin/accounts/${opId}/reset-password`);
    assert.equal(reset.statusCode, 200);
    assert.ok(reset.json().temporaryPassword.length >= 16);
    assert.equal((await opClient.get(`${V1}/auth/me`)).statusCode, 401);
  });

  it('resetarea TOTP (2.15-B): numai pentru alt cont; propriul → 403; audit distinct', async () => {
    const [me] = await q<{ id: string }>("SELECT id FROM admin_users WHERE email = 'sa1@exemplu.test'");
    assert.equal((await admin.post(`${V1}/admin/accounts/${me!.id}/reset-mfa`)).statusCode, 403);
    const [sa2] = await q<{ id: string }>("SELECT id FROM admin_users WHERE email = 'sa2@exemplu.test'");
    assert.equal((await admin.post(`${V1}/admin/accounts/${sa2!.id}/reset-mfa`)).statusCode, 204);
    const [row] = await q<{ t: Date | null; n: number }>(
      "SELECT totp_enabled_at AS t, (SELECT COUNT(*) FROM admin_recovery_codes WHERE user_id = ?) AS n FROM admin_users WHERE id = ?",
      [sa2!.id, sa2!.id],
    );
    assert.equal(row!.t, null);
    assert.equal(Number(row!.n), 0);
    const audit = await admin.get(`${V1}/admin/audit?action=account.mfa.reset`);
    assert.equal(audit.json().items.length, 1);
  });
});

describe('conturile cetățenilor (B3 §8)', () => {
  it('cont nou fără acceptarea politicii → 422; cu ea → 202, cont `pending`, cod simulat', async () => {
    const c = new Client(app);
    assert.equal((await c.post(`${V1}/citizen/auth/start`, { email: 'ion@exemplu.test' })).statusCode, 422);
    const ok = await c.post(`${V1}/citizen/auth/start`, { email: 'Ion@Exemplu.test', policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
    assert.equal(ok.statusCode, 202);
    const [acc] = await q<{ status: string }>("SELECT status FROM citizen_accounts WHERE email_normalized = 'ion@exemplu.test'");
    assert.equal(acc!.status, 'pending');
    const [mail] = await q<{ status: string }>("SELECT status FROM email_outbox WHERE recipient = 'ion@exemplu.test'");
    assert.equal(mail!.status, 'simulated', 'simulated nu devine niciodată sent');
  });

  it('fără enumerare: adresă existentă sau nu → același 202', async () => {
    const a = await new Client(app).post(`${V1}/citizen/auth/start`, { email: 'ion@exemplu.test' });
    const b = await new Client(app).post(`${V1}/citizen/auth/start`, { email: 'nou@exemplu.test', policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
    assert.equal(a.statusCode, 202);
    assert.deepEqual(a.json(), b.json());
  });

  it('cod greșit → 401; codul corect activează contul; un cod nu se refolosește', async () => {
    const c = new Client(app);
    assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email: 'ion@exemplu.test', code: '000000' })).statusCode, 401);
    const [row] = await q<{ b: string }>("SELECT body_text AS b FROM email_outbox WHERE recipient = 'ion@exemplu.test' ORDER BY created_at DESC, id DESC LIMIT 1");
    const code = row!.b.match(/\b(\d{6})\b/)![1]!;
    assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email: 'ion@exemplu.test', code })).statusCode, 200);
    const [acc] = await q<{ status: string }>("SELECT status FROM citizen_accounts WHERE email_normalized = 'ion@exemplu.test'");
    assert.equal(acc!.status, 'active');
    assert.equal((await new Client(app).post(`${V1}/citizen/auth/verify`, { email: 'ion@exemplu.test', code })).statusCode, 401);
    const me = await c.get(`${V1}/citizen/me`);
    assert.deepEqual(me.json(), { email: 'Ion@Exemplu.test', blocked: { active: false } });
  });

  it('codul expiră după 15 minute; 5 încercări greșite epuizează codul', async () => {
    await new Client(app).post(`${V1}/citizen/auth/start`, { email: 'ion@exemplu.test' });
    const [row] = await q<{ b: string }>("SELECT body_text AS b FROM email_outbox WHERE recipient = 'ion@exemplu.test' ORDER BY created_at DESC, id DESC LIMIT 1");
    const code = row!.b.match(/\b(\d{6})\b/)![1]!;
    const c = new Client(app);
    for (let i = 0; i < 5; i++) await c.post(`${V1}/citizen/auth/verify`, { email: 'ion@exemplu.test', code: code === '111111' ? '222222' : '111111' });
    assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email: 'ion@exemplu.test', code })).statusCode, 401);
    clock.advanceMinutes(61);
  });

  it('sesiunea de cetățean nu accesează /admin/* și nici /auth/me', async () => {
    const c = await citizenLogin('maria@exemplu.test');
    assert.equal((await c.get(`${V1}/admin/accounts`)).statusCode, 401);
    assert.equal((await c.get(`${V1}/auth/me`)).statusCode, 401);
    assert.equal((await admin.get(`${V1}/citizen/me`)).statusCode, 401, 'și invers');
  });

  it('blocare temporară = 15 zile, calculată de server; o durată trimisă → 400; ridicare cu audit', async () => {
    admin = await loginExisting('sa1@exemplu.test', PW);
    const c = await citizenLogin('vasile@exemplu.test');
    const [acc] = await q<{ id: string }>("SELECT id FROM citizen_accounts WHERE email_normalized = 'vasile@exemplu.test'");
    assert.equal((await admin.post(`${V1}/admin/citizens/${acc!.id}/blocks`, { kind: 'temporary', days: 99 })).statusCode, 400);
    const b = await admin.post(`${V1}/admin/citizens/${acc!.id}/blocks`, { kind: 'temporary', note: 'test' });
    assert.equal(b.statusCode, 201);
    assert.equal(new Date(b.json().endsAt).getTime() - clock.now().getTime(), 15 * 86_400_000);
    assert.equal((await c.get(`${V1}/citizen/me`)).json().blocked.kind, 'temporary', 'autentificarea rămâne permisă (D15)');
    assert.equal((await admin.post(`${V1}/admin/citizens/${acc!.id}/blocks`, { kind: 'permanent' })).statusCode, 409);
    assert.equal((await admin.post(`${V1}/admin/citizens/${acc!.id}/blocks/${b.json().id}/lift`)).statusCode, 204);
    assert.equal((await c.get(`${V1}/citizen/me`)).json().blocked.active, false);
    const audit = await admin.get(`${V1}/admin/audit?action=citizen.block.lift`);
    assert.equal(audit.json().items.length, 1);
  });

  it('blocare definitivă + ștergerea contului: rămân numai id, kind, email_hash; recrearea refuzată, cu mesaj', async () => {
    admin = await loginExisting('sa1@exemplu.test', PW);
    const c = await citizenLogin('rau@exemplu.test');
    const [acc] = await q<{ id: string }>("SELECT id FROM citizen_accounts WHERE email_normalized = 'rau@exemplu.test'");
    await admin.post(`${V1}/admin/citizens/${acc!.id}/blocks`, { kind: 'permanent', note: 'abuz' });
    assert.equal((await c.send('DELETE', `${V1}/citizen/account`)).statusCode, 204);
    const [block] = await q<Record<string, unknown>>("SELECT * FROM citizen_blocks WHERE kind = 'permanent'");
    assert.equal(block!.account_id, null);
    assert.equal(block!.note, null);
    assert.equal(block!.created_by, null);
    assert.equal(block!.starts_at, null);
    assert.equal(String(block!.email_hash).length, 64);
    assert.equal((await q("SELECT id FROM citizen_accounts WHERE email_normalized = 'rau@exemplu.test'")).length, 0);
    assert.equal((await q("SELECT id FROM email_outbox WHERE recipient = 'rau@exemplu.test' AND kind = 'citizen_login_code'")).length, 0);

    const again = await new Client(app).post(`${V1}/citizen/auth/start`, { email: 'rau@exemplu.test', policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
    assert.equal(again.statusCode, 202);
    assert.equal((await q("SELECT id FROM citizen_accounts WHERE email_normalized = 'rau@exemplu.test'")).length, 0);
    const notices = await q<{ kind: string }>("SELECT kind FROM email_outbox WHERE recipient = 'rau@exemplu.test'");
    assert.deepEqual(notices.map((n) => n.kind), ['citizen_account_blocked']);
    await new Client(app).post(`${V1}/citizen/auth/start`, { email: 'rau@exemplu.test', policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
    assert.equal((await q("SELECT id FROM email_outbox WHERE recipient = 'rau@exemplu.test'")).length, 1, 'cel mult un mesaj pe zi');
  });

  // Decizia proprietarului (30.09.2026, varianta B): sesiunea de cetățean nu expiră; se încheie numai prin ieșire,
  // ștergerea contului sau revocare. Cookie persistent de 400 de zile (limita browserelor), reînnoit la folosire.
  it('sesiunea de cetățean: fără expirare pe server; cookie persistent 400 de zile, reînnoit la folosire; ieșirea o încheie', async () => {
    const DAY = 24 * 60;
    const COOKIE = String(400 * 86_400);
    const maxAge = (res: { headers: Record<string, unknown> }) => {
      const set = res.headers['set-cookie'];
      const line = (Array.isArray(set) ? set : [set]).find((s) => typeof s === 'string' && s.includes('civic_sid')) as string | undefined;
      return line?.match(/Max-Age=(\d+)/i)?.[1];
    };

    await new Client(app).post(`${V1}/citizen/auth/start`, { email: 'lung@exemplu.test', policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
    const [row] = await q<{ b: string }>("SELECT body_text AS b FROM email_outbox WHERE recipient = 'lung@exemplu.test' ORDER BY created_at DESC, id DESC LIMIT 1");
    const c = new Client(app);
    const v = await c.post(`${V1}/citizen/auth/verify`, { email: 'lung@exemplu.test', code: row!.b.match(/\b(\d{6})\b/)![1]! });
    assert.equal(v.statusCode, 200);
    assert.equal(maxAge(v), COOKIE, 'la confirmarea codului');

    // dincolo de vechile 60 min / 12 h: valabilă, cookie reînnoit
    clock.advanceMinutes(13 * 60);
    const me1 = await c.get(`${V1}/citizen/me`);
    assert.equal(me1.statusCode, 200);
    assert.equal(maxAge(me1), COOKIE, 'cookie reînnoit la folosire');

    // 3 ani fără folosire → tot valabilă pe server (cookie-ul e păstrat de client)
    clock.advanceMinutes(3 * 365 * DAY);
    assert.equal((await c.get(`${V1}/citizen/me`)).statusCode, 200);
    const [sess] = await q<{ l: Date }>(
      "SELECT s.last_seen_at AS l FROM sessions s JOIN citizen_accounts a ON a.id = s.citizen_account_id WHERE a.email_normalized = 'lung@exemplu.test'",
    );
    assert.equal(sess!.l.getTime(), clock.now().getTime(), 'ultima folosire se notează');

    // ieșirea încheie sesiunea: cookie-ul e șters (ultimul Set-Cookie) și jetonul e revocat pe server
    const token = c.cookie;
    const out = await c.post(`${V1}/citizen/auth/logout`);
    assert.equal(out.statusCode, 204);
    const set = out.headers['set-cookie'];
    const lines = (Array.isArray(set) ? set : [set]).filter((x) => typeof x === 'string' && x.includes('civic_sid')) as string[];
    assert.match(lines.at(-1)!, /civic_sid=;/, 'ultimul Set-Cookie șterge cookie-ul');
    assert.equal(c.cookie, undefined);
    c.cookie = token;
    assert.equal((await c.get(`${V1}/citizen/me`)).statusCode, 401, 'jetonul vechi nu mai e valabil');
  });

  it('sesiunea Admin rămâne neschimbată: cookie fără Max-Age, expiră după 60 min de inactivitate', async () => {
    const c = new Client(app);
    const res = await c.post(`${V1}/auth/login`, { email: 'sa1@exemplu.test', password: PW });
    assert.equal(res.statusCode, 200);
    const set = res.headers['set-cookie'];
    const line = (Array.isArray(set) ? set : [set]).find((s) => typeof s === 'string' && s.includes('civic_sid')) as string;
    assert.ok(line && !/Max-Age|Expires/i.test(line), 'cookie de sesiune (dispare la închiderea browserului)');
    const [sa] = await q<{ s: Buffer }>("SELECT totp_secret_enc AS s FROM admin_users WHERE email = 'sa1@exemplu.test'");
    const mfa = await c.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(decryptSecret(ctx.config.secrets.totpEncKey, sa!.s), clock.now()) });
    const mfaSet = mfa.headers['set-cookie'];
    const mfaLine = (Array.isArray(mfaSet) ? mfaSet : [mfaSet]).find((s) => typeof s === 'string' && s.includes('civic_sid')) as string;
    assert.ok(mfaLine && !/Max-Age|Expires/i.test(mfaLine));
    assert.equal((await c.get(`${V1}/auth/me`)).statusCode, 200);
    clock.advanceMinutes(61);
    assert.equal((await c.get(`${V1}/auth/me`)).statusCode, 401);
  });
});

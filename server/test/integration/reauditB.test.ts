// Reauditul de securitate din Faza 6, etapa B (13.10.2026; docs/faza6/FAZA_6_REAUDIT_SECURITATE.md):
// - RA-3: eșecurile de parolă simultane se numără toate; același cod TOTP trimis simultan trece o singură dată;
// - RA-4: cel mult 3 coduri TOTP greșite pe cont într-o oră → contul blocat 15 minute (decizia proprietarului);
//         blocarea se aplică și codurilor de recuperare; un cod corect resetează numărătoarea;
// - RA-8: în modul `live`, codul de autentificare al cetățeanului nu rămâne în clar în coadă după trimitere.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { createAdminAccount } from '../../src/accounts.ts';
import { encryptSecret } from '../../src/auth/crypto.ts';
import { newTotpSecret, totpCodeAt } from '../../src/auth/totp.ts';
import { LIMITS, type AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import type { MailMessage } from '../../src/reports/outbox.ts';
import { issueRecoveryCodes } from '../../src/routes/auth.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
let appLive: FastifyInstance;
let appAllow: FastifyInstance;
const clock = new Clock();
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
let ipSeq = 1;
const nextIp = () => `10.88.0.${ipSeq++}`;

type Admin = { email: string; password: string; secret: string; recovery: string[] };

/** Un `super_admin` cu TOTP deja configurat și parola definitivă. */
async function superAdmin(email: string): Promise<Admin> {
  const { id, temporaryPassword } = await createAdminAccount(h.pool, clock.now(), {
    email, displayName: email, role: 'super_admin', createdBy: null,
  });
  const secret = newTotpSecret();
  await h.pool.query(
    'UPDATE admin_users SET must_change_password = 0, totp_secret_enc = ?, totp_enabled_at = ? WHERE id = ?',
    [encryptSecret(ctx.config.secrets.totpEncKey, secret), clock.now(), id],
  );
  return { email, password: temporaryPassword, secret, recovery: await issueRecoveryCodes(ctx, id) };
}

/** Sesiune dinaintea MFA (parola corectă). */
async function pending(a: Admin): Promise<Client> {
  const c = new Client(app, undefined, nextIp());
  const r = await c.post(`${V1}/auth/login`, { email: a.email, password: a.password });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().mfa, 'required');
  return c;
}

/** Un cod de 6 cifre diferit de codurile valide din fereastra de toleranță. */
function wrongCode(a: Admin): string {
  const t = clock.now().getTime();
  const valid = new Set([-30_000, 0, 30_000].map((d) => totpCodeAt(a.secret, new Date(t + d))));
  for (let n = 0; ; n++) {
    const c = String(n).padStart(6, '0');
    if (!valid.has(c)) return c;
  }
}

async function lockedUntil(email: string): Promise<Date | null> {
  return (await q<{ l: Date | null }>('SELECT locked_until AS l FROM admin_users WHERE email = ?', [email]))[0]!.l;
}

const sent: MailMessage[] = [];
const fakeTransport = { send: async (msg: MailMessage) => { sent.push(msg); return { providerMessageId: `test-${sent.length}` }; } };
const smtpEnv = {
  SMTP_HOST: '127.0.0.1', SMTP_USER: 'civic-test', SMTP_PASS: 'parola-de-test-smtp',
  MAIL_FROM: 'notificari@civic-test.example', CIVIC_MAIL_DOMAIN: 'civic-test.example',
};

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app, ctx } = await makeApp(h, clock, { IP_RATE_LIMITS: 'off' }));
  let cfg;
  ({ app: appLive, config: cfg } = await makeApp(h, clock, { IP_RATE_LIMITS: 'off', EMAIL_MODE: 'live', ...smtpEnv }, { mailTransport: fakeTransport }));
  assert.equal(cfg.email.mode, 'live', JSON.stringify(cfg.email.problems));
  ({ app: appAllow, config: cfg } = await makeApp(
    h, clock,
    { IP_RATE_LIMITS: 'off', EMAIL_MODE: 'allowlist', EMAIL_ALLOWLIST: 'staging.ana@exemplu.test', ...smtpEnv },
    { mailTransport: fakeTransport },
  ));
  assert.equal(cfg.email.mode, 'allowlist', JSON.stringify(cfg.email.problems));
});

after(async () => {
  await app?.close();
  await appLive?.close();
  await appAllow?.close();
  await h?.close();
});

describe('RA-3: condițiile de cursă la autentificarea Admin', () => {
  it('eșecurile de parolă trimise câte două deodată se numără toate → contul se blochează', async () => {
    const op = await createAdminAccount(h.pool, clock.now(), {
      email: 'ra3.operator@exemplu.test', displayName: 'Operator', role: 'primarie_operator', createdBy: null,
    });
    const rounds = Math.ceil(LIMITS.loginMaxFailures / 2); // 3 runde × 2 = 6 eșecuri ≥ 5
    for (let i = 0; i < rounds; i++) {
      const pair = await Promise.all([0, 1].map(() =>
        new Client(app, undefined, nextIp()).post(`${V1}/auth/login`, { email: 'ra3.operator@exemplu.test', password: 'parola-gresita-123' })));
      assert.deepEqual(pair.map((r) => r.statusCode), [401, 401], `runda ${i + 1}`);
    }
    assert.ok((await lockedUntil('ra3.operator@exemplu.test'))! > clock.now(), 'contul este blocat');
    const ok = await new Client(app, undefined, nextIp()).post(`${V1}/auth/login`, { email: 'ra3.operator@exemplu.test', password: op.temporaryPassword });
    assert.equal(ok.statusCode, 401, 'parola corectă este refuzată cât timp contul e blocat');
  });

  it('același cod TOTP trimis simultan din două sesiuni → o singură autentificare reușită', async () => {
    const a = await superAdmin('ra3.totp@exemplu.test');
    const [c1, c2] = [await pending(a), await pending(a)];
    const code = totpCodeAt(a.secret, clock.now());
    const res = await Promise.all([c1, c2].map((c) => c.post(`${V1}/auth/mfa/verify`, { code })));
    assert.deepEqual(res.map((r) => r.statusCode).sort(), [200, 401]);
  });
});

describe('RA-4: coduri TOTP greșite pe cont (3 pe oră → blocare 15 minute)', () => {
  it('al 3-lea cod greșit → 429 ACCOUNT_LOCKED; sesiunea revocată; altă sesiune refuzată și la recuperare; parola refuzată 15 minute', async () => {
    const a = await superAdmin('ra4.lock@exemplu.test');
    const c = await pending(a);
    const other = await pending(a); // deschise înaintea blocării
    const later = await pending(a);
    for (let i = 1; i < LIMITS.totpMaxFailuresPerHour; i++) {
      assert.equal((await c.post(`${V1}/auth/mfa/verify`, { code: wrongCode(a) })).statusCode, 401, `codul greșit ${i}`);
    }
    const third = await c.post(`${V1}/auth/mfa/verify`, { code: wrongCode(a) });
    assert.equal(third.statusCode, 429);
    assert.equal(third.json().error.code, 'ACCOUNT_LOCKED');
    assert.equal((await c.get(`${V1}/auth/me`)).statusCode, 401, 'sesiunea dinaintea MFA este revocată');
    const lock = await lockedUntil(a.email);
    assert.equal(lock!.getTime(), clock.now().getTime() + LIMITS.loginLockMinutes * 60_000);

    const rec = await other.post(`${V1}/auth/mfa/recovery`, { code: a.recovery[0] });
    assert.equal(rec.statusCode, 429, 'codul de recuperare nu ocolește blocarea');
    assert.equal(rec.json().error.code, 'ACCOUNT_LOCKED');
    const [unused] = await q<{ n: number }>('SELECT COUNT(*) AS n FROM admin_recovery_codes WHERE used_at IS NOT NULL');
    assert.equal(Number(unused!.n), 0, 'codul de recuperare nu a fost consumat');
    assert.equal((await other.get(`${V1}/auth/me`)).statusCode, 401, 'și această sesiune este revocată');
    assert.equal((await later.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(a.secret, clock.now()) })).statusCode, 429, 'nici codul TOTP corect');

    const relog = await new Client(app, undefined, nextIp()).post(`${V1}/auth/login`, { email: a.email, password: a.password });
    assert.equal(relog.statusCode, 401, 'parola corectă refuzată cât timp contul e blocat');

    clock.advanceMinutes(LIMITS.loginLockMinutes + 1);
    const again = await pending(a);
    assert.equal((await again.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(a.secret, clock.now()) })).statusCode, 200, 'după 15 minute, normal');
  });

  it('un cod corect (TOTP sau de recuperare) resetează numărătoarea', async () => {
    const a = await superAdmin('ra4.reset@exemplu.test');
    const almost = LIMITS.totpMaxFailuresPerHour - 1;
    let c = await pending(a);
    for (let i = 0; i < almost; i++) assert.equal((await c.post(`${V1}/auth/mfa/verify`, { code: wrongCode(a) })).statusCode, 401);
    assert.equal((await c.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(a.secret, clock.now()) })).statusCode, 200);

    c = await pending(a);
    for (let i = 0; i < almost; i++) {
      assert.equal((await c.post(`${V1}/auth/mfa/verify`, { code: wrongCode(a) })).statusCode, 401, 'numărătoarea a pornit de la zero');
    }
    assert.equal((await c.post(`${V1}/auth/mfa/recovery`, { code: a.recovery[1] })).statusCode, 200);

    c = await pending(a);
    for (let i = 0; i < almost; i++) {
      assert.equal((await c.post(`${V1}/auth/mfa/verify`, { code: wrongCode(a) })).statusCode, 401, 'resetată și de codul de recuperare');
    }
    assert.equal(await lockedUntil(a.email), null);
  });
});

describe('RA-8: codul de autentificare al cetățeanului, după trimitere', () => {
  async function sentRow(email: string) {
    for (let i = 0; i < 100; i++) {
      const [row] = await q<{ status: string; body: string | null }>(
        "SELECT status, body_text AS body FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ?", [email]);
      if (row?.status === 'sent') return row;
      await new Promise((r) => setTimeout(r, 30));
    }
    throw new Error(`mesajul către ${email} nu a fost trimis`);
  }

  it('live: după trimitere, textul (cu codul) este șters din coadă; codul primit pe e-mail funcționează', async () => {
    const email = 'live.ana@exemplu.test';
    const c = new Client(appLive, undefined, nextIp());
    assert.equal((await c.post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION })).statusCode, 202);
    const row = await sentRow(email);
    assert.equal(row.body, null, 'body_text șters');
    const msg = sent.find((m) => m.to === email)!;
    const code = msg.text.match(/\b(\d{6})\b/)![1]!;
    assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email, code })).statusCode, 200);
  });

  it('allowlist (staging): textul rămâne, pentru `dev:show-code`', async () => {
    const email = 'staging.ana@exemplu.test';
    const c = new Client(appAllow, undefined, nextIp());
    assert.equal((await c.post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION })).statusCode, 202);
    const row = await sentRow(email);
    assert.match(row.body ?? '', /\b\d{6}\b/);
  });
});

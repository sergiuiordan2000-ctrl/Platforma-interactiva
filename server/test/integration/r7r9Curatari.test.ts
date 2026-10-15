// R7 + R9 (Etapa 7A; deciziile proprietarului din 15.10.2026): `purge:retention` aplică termenele aprobate în Faza 4.
// - `rate_limits`: numai rândurile expirate (≤ 48 h, N4-4); limitele încă valabile rămân;
// - `citizen_login_codes`: codurile expirate, folosite sau nu (B1 §3.9); codurile valabile rămân funcționale;
// - `rejected_attempts`: 30 de zile (N4-8);
// - `sessions`: la 6 luni după expirare sau revocare (A05-1); sesiunile de cetățean nerevocate nu se șterg (decizia A);
// - `used_pow_challenges` (R9): numai provocările expirate; cele valabile blochează în continuare reluarea.
// Pragurile sunt stricte („mai vechi decât”): un rând aflat exact la prag rămâne.

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
import { monthsBeforeClamped, purgeRetention } from '../../src/maintenance.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { verifyPow } from '../../src/reports/antiabuse.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';
import { V1, reportFlow, type Flow } from '../helpers/reportFlow.ts';

const HOUR = 3_600_000;
// Ceasul aplicației pornește la o oră întreagă, cu o oră ÎN URMA ceasului real: provocările ALTCHA expiră după
// ceasul real (`Date.now()`), iar curățarea lor după `ctx.now()`; astfel, o provocare reală, valabilă, nu pare
// expirată pentru curățare (în producție cele două ceasuri coincid).
const clock = new Clock(new Date(Math.floor(Date.now() / HOUR) * HOUR - HOUR));
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
let flow: Flow;
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
const count = async (sql: string, p: unknown[] = []) => Number((await q<{ n: number }>(sql, p))[0]!.n);
const ms = (d: Date, delta: number) => new Date(d.getTime() + delta);
let ipSeq = 1;
const nextIp = () => `10.55.0.${ipSeq++}`;

/**
 * Pragul sesiunilor, calculat independent de `monthsBeforeClamped`: aceeași oră, cu 6 luni calendaristice în urmă,
 * cu ziua limitată la ultima zi a lunii-țintă (ceasul acestui fișier pornește de la ceasul real, deci poate cădea
 * și într-o zi de 29–31).
 */
function sixMonthsBefore(d: Date): Date {
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 6, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  const daysInTarget = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d.getUTCDate(), daysInTarget));
  return first;
}

before(async () => {
  assert.equal(LIMITS.sessionRetentionMonths, 6, 'premisa: 6 luni (A05-1)');
  assert.equal(LIMITS.rejectedAttemptsRetentionDays, 30, 'premisa: 30 de zile (N4-8)');
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app, ctx } = await makeApp(h, clock, { IP_RATE_LIMITS: 'off' }));
  flow = reportFlow(() => app, () => h.pool, clock);
  await purgeRetention(ctx); // pornim de la zero: numărătorile de mai jos privesc numai rândurile puse de teste
});

after(async () => {
  await app?.close();
  await h?.close();
});

describe('R9: provocările proof-of-work, prin purge:retention', () => {
  it('cea expirată se șterge; cea valabilă (la prag sau reală) rămâne și reluarea ei este refuzată', async () => {
    const pow = await new Client(app, undefined, nextIp()).pow(`${V1}/citizen/auth/pow-challenge`);
    assert.ok(pow, 'ALTCHA pornit la cererea de cod');
    assert.equal(await verifyPow(ctx, pow), true, 'prima folosire a provocării reale');
    const now = clock.now();
    await h.pool.query('INSERT INTO used_pow_challenges (challenge_hash, expires_at) VALUES (?, ?), (?, ?)', [
      'a'.repeat(64), ms(now, -1), // expirată cu 1 ms → se șterge
      'b'.repeat(64), now, //         exact la prag → rămâne
    ]);
    const res = await purgeRetention(ctx);
    assert.equal(res.powChallenges, 1);
    assert.equal(await count("SELECT COUNT(*) AS n FROM used_pow_challenges WHERE challenge_hash = ?", ['a'.repeat(64)]), 0);
    assert.equal(await count("SELECT COUNT(*) AS n FROM used_pow_challenges WHERE challenge_hash = ?", ['b'.repeat(64)]), 1);
    assert.equal(await verifyPow(ctx, pow), false, 'provocarea reală, încă valabilă, blochează în continuare reluarea');
  });
});

describe('R7: rate_limits', () => {
  it('numai rândurile expirate se șterg; limitele zilnice și gălețile TOTP valabile rămân', async () => {
    const now = clock.now();
    const rows: Array<[string, Date, Date]> = [
      ['r7:expirat', ms(now, -2 * HOUR), ms(now, -1)], //            expirat cu 1 ms → se șterge
      ['r7:la-prag', ms(now, -HOUR), now], //                         expiră exact acum → rămâne
      ['r7:zilnic', ms(now, -4 * HOUR), ms(now, 20 * HOUR)], //       fereastră de 24 h, încă în vigoare
      ['mfa:fail:acct:r7', ms(now, -30 * 60_000), ms(now, 31 * 60_000)], // găleată TOTP din fereastra de 61 de minute
    ];
    for (const [k, start, exp] of rows) {
      await h.pool.query('INSERT INTO rate_limits (bucket_key, window_start, count, expires_at) VALUES (?, ?, 1, ?)', [k, start, exp]);
    }
    const res = await purgeRetention(ctx);
    assert.equal(res.rateLimits, 1);
    const left = (await q<{ k: string }>("SELECT bucket_key AS k FROM rate_limits WHERE bucket_key LIKE 'r7:%' OR bucket_key = 'mfa:fail:acct:r7' ORDER BY k")).map((r) => r.k);
    assert.deepEqual(left, ['mfa:fail:acct:r7', 'r7:la-prag', 'r7:zilnic']);
  });
});

describe('R7: citizen_login_codes', () => {
  it('codurile expirate (folosite sau nu) se șterg; codul valabil rămâne și funcționează; limita zilnică rămâne', async () => {
    const a = 'r7.cod.a@exemplu.test';
    const b = 'r7.cod.b@exemplu.test';
    const ca = new Client(app, undefined, nextIp());
    assert.equal((await ca.post(`${V1}/citizen/auth/start`, { email: a, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION })).statusCode, 202);
    const [acc] = await q<{ id: string }>('SELECT id FROM citizen_accounts WHERE email = ?', [a]);
    clock.advanceMinutes(LIMITS.citizenCodeMinutes + 1); // codul lui A a expirat (nefolosit)
    const cb = new Client(app, undefined, nextIp());
    assert.equal((await cb.post(`${V1}/citizen/auth/start`, { email: b, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION })).statusCode, 202);
    const now = clock.now();
    await h.pool.query(
      `INSERT INTO citizen_login_codes (id, account_id, code_hash, purpose, expires_at, attempts, consumed_at, created_at)
       VALUES (?, ?, ?, 'login', ?, 0, ?, ?), (?, ?, ?, 'login', ?, 0, NULL, ?)`,
      [
        '01R7FOLOSITEXPIRAT000000AA', acc!.id, 'c'.repeat(64), ms(now, -1), ms(now, -60_000), ms(now, -16 * 60_000), // folosit, expirat cu 1 ms
        '01R7LAPRAG0000000000000AAA', acc!.id, 'd'.repeat(64), now, ms(now, -15 * 60_000), //                           expiră exact acum
      ],
    );
    const res = await purgeRetention(ctx);
    assert.equal(res.citizenCodes, 2, 'codul nefolosit al lui A și codul folosit, ambele expirate');
    assert.equal(await count('SELECT COUNT(*) AS n FROM citizen_login_codes WHERE id = ?', ['01R7LAPRAG0000000000000AAA']), 1);
    assert.ok((await count("SELECT COUNT(*) AS n FROM rate_limits WHERE bucket_key LIKE 'citizen:mail:addr:%'")) >= 2, 'limita zilnică de coduri rămâne');
    const [row] = await q<{ b: string }>(
      "SELECT body_text AS b FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC, id DESC LIMIT 1", [b],
    );
    const code = row!.b.match(/\b(\d{6})\b/)![1]!;
    assert.equal((await cb.post(`${V1}/citizen/auth/verify`, { email: b, code })).statusCode, 200, 'codul valabil funcționează după curățare');
  });
});

describe('R7: rejected_attempts (30 de zile)', () => {
  it('ora mai veche decât pragul se șterge; ora aflată exact la prag și cele recente rămân', async () => {
    const now = clock.now();
    const cutoff = new Date(now.getTime() - 30 * 86_400_000);
    const ins = (hour: Date, ip: string) => h.pool.query(
      "INSERT INTO rejected_attempts (hour, area, target_id, reason, ip_hash, count) VALUES (?, 'login', 'r7', 'invalid', ?, 1)", [hour, ip],
    );
    await ins(ms(cutoff, -1000), '1'.repeat(64)); // cu 1 s peste prag → se șterge
    await ins(cutoff, '2'.repeat(64)); //            exact la prag → rămâne
    await ins(ms(now, -29 * 86_400_000), '3'.repeat(64)); // acum 29 de zile → rămâne
    const res = await purgeRetention(ctx);
    assert.equal(res.rejectedAttempts, 1);
    const left = (await q<{ ip: string }>("SELECT ip_hash AS ip FROM rejected_attempts WHERE target_id = 'r7' ORDER BY ip")).map((r) => r.ip[0]);
    assert.deepEqual(left, ['2', '3']);
  });
});

describe('R7: sessions (6 luni după expirare sau revocare)', () => {
  it('pragul exact rămâne, depășirea lui se șterge; sesiunile active și cetățeanul nerevocat rămân și funcționează', async () => {
    // sesiuni reale, active: Admin (parolă + TOTP) și cetățean
    const { id: adminId, temporaryPassword } = await createAdminAccount(h.pool, clock.now(), {
      email: 'r7.admin@exemplu.test', displayName: 'R7', role: 'super_admin', createdBy: null,
    });
    const secret = newTotpSecret();
    await h.pool.query('UPDATE admin_users SET must_change_password = 0, totp_secret_enc = ?, totp_enabled_at = ? WHERE id = ?', [
      encryptSecret(ctx.config.secrets.totpEncKey, secret), clock.now(), adminId,
    ]);
    const admin = new Client(app, undefined, nextIp());
    assert.equal((await admin.post(`${V1}/auth/login`, { email: 'r7.admin@exemplu.test', password: temporaryPassword })).statusCode, 200);
    assert.equal((await admin.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(secret, clock.now()) })).statusCode, 200);
    const citizen = await flow.citizen('r7.sesiune@exemplu.test');
    const [cit] = await q<{ id: string }>('SELECT id FROM citizen_accounts WHERE email = ?', ['r7.sesiune@exemplu.test']);

    const now = clock.now();
    const cutoff = sixMonthsBefore(now);
    const FAR = new Date('9000-01-01T00:00:00.000Z');
    type S = { id: string; type: 'admin' | 'citizen'; idle: Date; abs: Date; revoked: Date | null; created: Date };
    const rows: S[] = [
      { id: 'adm-revocata-peste', type: 'admin', created: ms(cutoff, -30 * 60_000), idle: ms(cutoff, 30 * 60_000), abs: ms(cutoff, 11 * HOUR), revoked: ms(cutoff, -1) },
      { id: 'adm-expirata-la-prag', type: 'admin', created: ms(cutoff, -HOUR), idle: cutoff, abs: ms(cutoff, 11 * HOUR), revoked: null },
      { id: 'adm-expirata-peste', type: 'admin', created: ms(cutoff, -12 * HOUR), idle: ms(cutoff, 30 * 60_000), abs: ms(cutoff, -1), revoked: null },
      { id: 'adm-expirata-5-luni', type: 'admin', created: ms(now, -150 * 86_400_000 - HOUR), idle: ms(now, -150 * 86_400_000), abs: ms(now, -150 * 86_400_000 + 11 * HOUR), revoked: null },
      { id: 'cet-revocata-peste', type: 'citizen', created: ms(cutoff, -86_400_000), idle: FAR, abs: FAR, revoked: ms(cutoff, -1) },
      { id: 'cet-revocata-la-prag', type: 'citizen', created: ms(cutoff, -86_400_000), idle: FAR, abs: FAR, revoked: cutoff },
      { id: 'cet-nerevocata-veche', type: 'citizen', created: ms(now, -730 * 86_400_000), idle: FAR, abs: FAR, revoked: null },
    ];
    for (const r of rows) {
      await h.pool.query(
        `INSERT INTO sessions (id, principal_type, user_id, citizen_account_id, created_at, last_seen_at, idle_expires_at,
           absolute_expires_at, mfa_state, revoked_at, revoke_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id.padEnd(64, '0'), r.type, r.type === 'admin' ? adminId : null, r.type === 'citizen' ? cit!.id : null, r.created, r.created,
          r.idle, r.abs, r.type === 'admin' ? 'verified' : null, r.revoked, r.revoked ? 'logout' : null],
      );
    }
    const res = await purgeRetention(ctx);
    assert.equal(res.sessions, 3);
    const left = (await q<{ id: string }>("SELECT id FROM sessions WHERE id LIKE 'adm-%' OR id LIKE 'cet-%' ORDER BY id")).map((r) => r.id.replace(/0+$/, ''));
    assert.deepEqual(left, ['adm-expirata-5-luni', 'adm-expirata-la-prag', 'cet-nerevocata-veche', 'cet-revocata-la-prag']);
    assert.equal((await admin.get(`${V1}/auth/me`)).statusCode, 200, 'sesiunea Admin activă funcționează');
    assert.equal((await citizen.get(`${V1}/citizen/me`)).statusCode, 200, 'sesiunea de cetățean activă funcționează');
  });
});

describe('R7 + R9: rezultatul comenzii', () => {
  it('conține numărătorile noilor curățări; o a doua rulare nu mai găsește nimic de șters', async () => {
    const res = await purgeRetention(ctx);
    for (const k of ['rateLimits', 'citizenCodes', 'rejectedAttempts', 'sessions', 'powChallenges'] as const) {
      assert.equal(typeof res[k], 'number', k);
      assert.equal(res[k], 0, `${k}: nimic nou de șters`);
    }
  });
});

describe('R7: sesiunile, cele 6 luni calendaristice la sfârșitul lunii (ziua limitată la ultima zi a lunii)', () => {
  // Rulează ULTIMUL: mută ceasul în viitor (curățarea din aceste teste ar șterge și provocările ALTCHA reale).
  type Ended = { id: string; end: Date; revoked?: boolean };
  async function insertEnded(rows: Ended[], adminId: string, citizenId: string) {
    const FAR = new Date('9000-01-01T00:00:00.000Z');
    for (const r of rows) {
      const citizen = r.revoked === true;
      await h.pool.query(
        `INSERT INTO sessions (id, principal_type, user_id, citizen_account_id, created_at, last_seen_at, idle_expires_at,
           absolute_expires_at, mfa_state, revoked_at, revoke_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id.padEnd(64, '0'), citizen ? 'citizen' : 'admin', citizen ? null : adminId, citizen ? citizenId : null,
          ms(r.end, -HOUR), ms(r.end, -HOUR), citizen ? FAR : r.end, citizen ? FAR : ms(r.end, 11 * HOUR),
          citizen ? null : 'verified', citizen ? r.end : null, citizen ? 'logout' : null],
      );
    }
  }
  const present = async (id: string) => count('SELECT COUNT(*) AS n FROM sessions WHERE id = ?', [id.padEnd(64, '0')]);
  const ids = async () => {
    const [a] = await q<{ id: string }>('SELECT id FROM admin_users WHERE email = ?', ['r7.admin@exemplu.test']);
    const [c] = await q<{ id: string }>('SELECT id FROM citizen_accounts WHERE email = ?', ['r7.sesiune@exemplu.test']);
    return { adminId: a!.id, citizenId: c!.id };
  };

  it('revocarea din 31.08.2026 rămâne la curățarea din 28.02.2027 și se șterge la cea din 01.03.2027', async () => {
    const { adminId, citizenId } = await ids();
    await insertEnded([{ id: 'luna-revocata-31aug', end: new Date('2026-08-31T10:00:00.000Z'), revoked: true }], adminId, citizenId);
    clock.current = new Date('2027-02-28T12:00:00.000Z'); // pragul: 28.08.2026 12:00
    await purgeRetention(ctx);
    assert.equal(await present('luna-revocata-31aug'), 1, 'la 28.02.2027 rămâne');
    clock.current = new Date('2027-03-01T12:00:00.000Z'); // pragul: 01.09.2026 12:00
    await purgeRetention(ctx);
    assert.equal(await present('luna-revocata-31aug'), 0, 'la 01.03.2027 se șterge');
  });

  it('31.08.2027: sesiunea terminată pe 02.03.2027 rămâne; cea din 27.02.2027 se șterge; pragul exact (28.02.2027) rămâne', async () => {
    const { adminId, citizenId } = await ids();
    await insertEnded([
      { id: 'luna-02mar', end: new Date('2027-03-02T12:00:00.000Z') }, //        6 luni abia pe 02.09.2027 → rămâne
      { id: 'luna-27feb', end: new Date('2027-02-27T12:00:00.000Z') }, //        se șterge
      { id: 'luna-prag', end: new Date('2027-02-28T12:00:00.000Z') }, //         exact la pragul limitat → rămâne
      { id: 'luna-prag-1ms', end: new Date('2027-02-28T11:59:59.999Z') }, //     cu 1 ms peste prag → se șterge
    ], adminId, citizenId);
    clock.current = new Date('2027-08-31T12:00:00.000Z');
    await purgeRetention(ctx);
    assert.equal(await present('luna-02mar'), 1, 'algoritmul vechi (prag 03.03.2027) ar fi șters-o cu 2 zile prea devreme');
    assert.equal(await present('luna-27feb'), 0);
    assert.equal(await present('luna-prag'), 1, 'pragul strict');
    assert.equal(await present('luna-prag-1ms'), 0);
  });

  it('31.08.2028 (an bisect): pragul este 29.02.2028', async () => {
    assert.equal(monthsBeforeClamped(new Date('2028-08-31T12:00:00.000Z'), 6).toISOString(), '2028-02-29T12:00:00.000Z');
    assert.equal(monthsBeforeClamped(new Date('2027-08-31T12:00:00.000Z'), 6).toISOString(), '2027-02-28T12:00:00.000Z');
    assert.equal(monthsBeforeClamped(new Date('2027-01-15T08:30:00.000Z'), 6).toISOString(), '2026-07-15T08:30:00.000Z', 'trecerea anului');
    const { adminId, citizenId } = await ids();
    await insertEnded([
      { id: 'bisect-prag', end: new Date('2028-02-29T12:00:00.000Z') },
      { id: 'bisect-prag-1ms', end: new Date('2028-02-29T11:59:59.999Z') },
    ], adminId, citizenId);
    clock.current = new Date('2028-08-31T12:00:00.000Z');
    await purgeRetention(ctx);
    assert.equal(await present('bisect-prag'), 1, 'exact la prag → rămâne');
    assert.equal(await present('bisect-prag-1ms'), 0, 'cu 1 ms peste prag → se șterge');
  });
});

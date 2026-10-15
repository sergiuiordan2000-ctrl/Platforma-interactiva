// R15 / D7-5 (Etapa 7A; deciziile proprietarului din 15.10.2026): `purge:retention` șterge conturile de cetățean
// `pending` neactivate la 45 de zile de la creare (prag strict), numai dacă nu au un cod încă valabil și nu au o blocare
// activă (decizia A: blocarea rămâne vizibilă și administrabilă din Admin). Conturile `active` nu se ating; limitele pe
// adresă nu se resetează.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { LIMITS, type AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { purgePendingAccounts, purgeRetention } from '../../src/maintenance.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { emailHash } from '../../src/routes/citizens.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
const DAY = 86_400_000;
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
const clock = new Clock();
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
const ms = (d: Date, delta: number) => new Date(d.getTime() + delta);
let ipSeq = 1;
const nextIp = () => `10.75.0.${ipSeq++}`;
let idSeq = 0;
const newIdLike = () => `01D75TEST${String(++idSeq).padStart(17, '0')}`; // 26 de caractere

async function account(email: string, status: 'pending' | 'active', createdAt: Date): Promise<string> {
  const id = newIdLike();
  await h.pool.query(
    `INSERT INTO citizen_accounts (id, email, email_normalized, status, policy_version, policy_accepted_at, confirmed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, email, email, status, CITIZEN_POLICY_VERSION, createdAt, status === 'active' ? createdAt : null, createdAt],
  );
  return id;
}
async function block(opts: { accountId: string | null; email: string; kind: 'temporary' | 'permanent'; endsAt?: Date }) {
  const id = newIdLike();
  await h.pool.query(
    `INSERT INTO citizen_blocks (id, account_id, kind, starts_at, ends_at, created_by, note, email_hash)
     VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)`,
    [id, opts.accountId, opts.kind, ms(clock.now(), -DAY), opts.kind === 'temporary' ? opts.endsAt! : null, emailHash(ctx, opts.email)],
  );
  return id;
}
const exists = async (id: string) => Number((await q<{ n: number }>('SELECT COUNT(*) AS n FROM citizen_accounts WHERE id = ?', [id]))[0]!.n) === 1;
const start = (c: Client, email: string) => c.post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
async function lastCode(email: string): Promise<string> {
  const [row] = await q<{ b: string }>(
    "SELECT body_text AS b FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC, id DESC LIMIT 1", [email],
  );
  return row!.b.match(/\b(\d{6})\b/)![1]!;
}

before(async () => {
  assert.equal(LIMITS.pendingAccountRetentionDays, 45, 'premisa: 45 de zile (D7-5)');
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app, ctx } = await makeApp(h, clock, { IP_RATE_LIMITS: 'off' }));
});

after(async () => {
  await app?.close();
  await h?.close();
});

describe('D7-5: pragul de 45 de zile și conturile active', () => {
  it('pending creat cu 45 de zile + 1 ms în urmă → șters; exact la 45 de zile → rămâne; 44 de zile → rămâne; activ vechi → rămâne', async () => {
    const now = clock.now();
    const cutoff = ms(now, -45 * DAY);
    const peste = await account('d75.peste@exemplu.test', 'pending', ms(cutoff, -1));
    const laPrag = await account('d75.prag@exemplu.test', 'pending', cutoff);
    const recent = await account('d75.recent@exemplu.test', 'pending', ms(now, -44 * DAY));
    const activ = await account('d75.activ@exemplu.test', 'active', ms(now, -730 * DAY));
    await h.pool.query( // un cod expirat al contului vechi: se șterge odată cu el
      `INSERT INTO citizen_login_codes (id, account_id, code_hash, purpose, expires_at, attempts, consumed_at, created_at)
       VALUES (?, ?, ?, 'confirm', ?, 0, NULL, ?)`,
      [newIdLike(), peste, 'e'.repeat(64), ms(cutoff, 15 * 60_000), cutoff],
    );
    const res = await purgeRetention(ctx);
    assert.equal(res.pendingAccounts, 1);
    assert.equal(await exists(peste), false, 'peste prag → șters');
    assert.equal(Number((await q<{ n: number }>('SELECT COUNT(*) AS n FROM citizen_login_codes WHERE account_id = ?', [peste]))[0]!.n), 0, 'codurile lui, odată cu el');
    assert.equal(await exists(laPrag), true, 'exact la prag → rămâne (prag strict)');
    assert.equal(await exists(recent), true);
    assert.equal(await exists(activ), true, 'contul activ nu se șterge niciodată prin această regulă');
    // curățenia testului: testele următoare mută ceasul înainte și numără exact conturile șterse
    await h.pool.query('DELETE FROM citizen_accounts WHERE id IN (?, ?)', [laPrag, recent]);
  });
});

describe('D7-5: codul încă valabil', () => {
  it('un pending vechi de 50 de zile care tocmai a cerut un cod rămâne, iar codul funcționează', async () => {
    const email = 'd75.cod@exemplu.test';
    const id = await account(email, 'pending', ms(clock.now(), -50 * DAY));
    const c = new Client(app, undefined, nextIp());
    assert.equal((await start(c, email)).statusCode, 202);
    const res = await purgeRetention(ctx);
    assert.equal(res.pendingAccounts, 0);
    assert.equal(await exists(id), true, 'are un cod încă valabil → rămâne');
    assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email, code: await lastCode(email) })).statusCode, 200, 'codul funcționează');
  });
});

describe('D7-5: blocările active (decizia A), cu aceeași asociere ca la cererea unui cod', () => {
  it('blocare definitivă pe cont → rămâne; după ridicarea ei → șters', async () => {
    const email = 'd75.definitiva@exemplu.test';
    const id = await account(email, 'pending', ms(clock.now(), -60 * DAY));
    const b = await block({ accountId: id, email, kind: 'permanent' });
    assert.equal((await purgeRetention(ctx)).pendingAccounts, 0);
    assert.equal(await exists(id), true, 'blocarea definitivă activă păstrează contul');
    await h.pool.query('DELETE FROM citizen_blocks WHERE id = ?', [b]); // ridicarea din Admin șterge rândul
    assert.equal((await purgeRetention(ctx)).pendingAccounts, 1);
    assert.equal(await exists(id), false);
  });

  it('blocare numai după amprenta adresei (fără cont, de exemplu rămasă de la un cont anterior) → rămâne', async () => {
    const email = 'd75.amprenta@exemplu.test';
    const id = await account(email, 'pending', ms(clock.now(), -60 * DAY));
    await block({ accountId: null, email, kind: 'permanent' });
    assert.equal((await purgeRetention(ctx)).pendingAccounts, 0);
    assert.equal(await exists(id), true, 'amprenta adresei este verificată, nu numai legătura cu contul');
  });

  it('blocare temporară activă → rămâne; după expirarea ei → șters la prima curățare ulterioară', async () => {
    const email = 'd75.temporara@exemplu.test';
    const id = await account(email, 'pending', ms(clock.now(), -60 * DAY));
    const ends = ms(clock.now(), LIMITS.temporaryBlockDays * DAY);
    await block({ accountId: id, email, kind: 'temporary', endsAt: ends });
    assert.equal((await purgeRetention(ctx)).pendingAccounts, 0);
    assert.equal(await exists(id), true, 'blocarea temporară activă păstrează contul');
    clock.current = ends; // exact la expirare: `ends_at > acum` nu mai este adevărat → blocarea nu mai este activă
    const res = await purgeRetention(ctx);
    assert.equal(res.expiredBlocks >= 1, true, 'blocarea expirată este curățată (pasul existent)');
    assert.equal(res.pendingAccounts, 1);
    assert.equal(await exists(id), false);
  });

  it('expirarea blocării temporare, verificată direct pe funcție (fără pasul care curăță blocările expirate)', async () => {
    // În `purge:retention`, pasul 2 șterge blocările temporare expirate înaintea acestui pas; aici funcția este apelată
    // singură, ca să se vadă că o blocare expirată (inclusiv exact la `ends_at`) nu mai este socotită activă.
    const now = clock.now();
    const e1 = 'd75.exp-cont@exemplu.test';
    const e2 = 'd75.exp-prag@exemplu.test';
    const e3 = 'd75.exp-activa@exemplu.test';
    const e4 = 'd75.exp-cont-prag@exemplu.test';
    const a1 = await account(e1, 'pending', ms(now, -60 * DAY));
    const a2 = await account(e2, 'pending', ms(now, -60 * DAY));
    const a3 = await account(e3, 'pending', ms(now, -60 * DAY));
    const a4 = await account(e4, 'pending', ms(now, -60 * DAY));
    await block({ accountId: a1, email: e1, kind: 'temporary', endsAt: ms(now, -1) }); //  pe cont, expirată cu 1 ms
    await block({ accountId: null, email: e2, kind: 'temporary', endsAt: now }); //        numai după amprentă, expiră exact acum
    await block({ accountId: null, email: e3, kind: 'temporary', endsAt: ms(now, 1) }); //  numai după amprentă, încă activă (1 ms)
    await block({ accountId: a4, email: e4, kind: 'temporary', endsAt: now }); //            pe cont, expiră exact acum
    assert.equal(await purgePendingAccounts(ctx), 3);
    assert.equal(await exists(a1), false, 'blocarea pe cont, expirată → nu mai protejează');
    assert.equal(await exists(a2), false, 'expiră exact acum (`ends_at > acum` este fals) → nu mai protejează');
    assert.equal(await exists(a3), true, 'încă activă cu 1 ms → protejează');
    assert.equal(await exists(a4), false, 'pe cont, expiră exact acum → nu mai protejează (și condiția din DELETE)');
    // curățenia testului: blocarea lui a3 expiră imediat, iar testul următor numără exact conturile șterse
    await h.pool.query('DELETE FROM citizen_blocks WHERE email_hash = ?', [emailHash(ctx, e3)]);
    await h.pool.query('DELETE FROM citizen_accounts WHERE id = ?', [a3]);
  });
});

describe('D7-5: după ștergere', () => {
  it('limita zilnică de coduri pe adresă nu se resetează; a doua zi, aceeași adresă creează un cont nou', async () => {
    const email = 'd75.limita@exemplu.test';
    const id = await account(email, 'pending', ms(clock.now(), -50 * DAY));
    const c = new Client(app, undefined, nextIp());
    for (let i = 0; i < LIMITS.citizenAccountEmailsPerDay; i++) assert.equal((await start(c, email)).statusCode, 202);
    const mails = async () => Number((await q<{ n: number }>("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ?", [email]))[0]!.n);
    assert.equal(await mails(), LIMITS.citizenAccountEmailsPerDay);
    clock.advanceMinutes(LIMITS.citizenCodeMinutes + 1); // codurile au expirat
    assert.equal((await purgeRetention(ctx)).pendingAccounts, 1);
    assert.equal(await exists(id), false);
    assert.equal((await start(c, email)).statusCode, 202);
    assert.equal(await mails(), LIMITS.citizenAccountEmailsPerDay, 'limita zilnică pe adresă rămâne: niciun cod nou în aceeași zi');
    clock.advanceMinutes(24 * 60);
    assert.equal((await start(c, email)).statusCode, 202);
    const [acc] = await q<{ id: string; status: string }>('SELECT id, status FROM citizen_accounts WHERE email_normalized = ?', [email]);
    assert.ok(acc && acc.id !== id && acc.status === 'pending', 'cont nou, pending');
    assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email, code: await lastCode(email) })).statusCode, 200);
  });
});

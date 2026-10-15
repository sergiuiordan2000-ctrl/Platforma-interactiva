// CL-4 (Etapa 7A; decizia proprietarului din 15.10.2026): limita RA-4 (3 coduri TOTP greșite → blocare 15 minute)
// se numără pe o fereastră MOBILĂ de 60 de minute (găleți de un minut, 61 verificate), după timpii reali ai
// încercărilor, nu pe ora fixă. Înainte, la trecerea orei treceau până la 4 coduri greșite fără blocare.
// Testele RA-4 existente (`reauditB.test.ts`) rămân neschimbate.

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { createAdminAccount } from '../../src/accounts.ts';
import { encryptSecret } from '../../src/auth/crypto.ts';
import { newTotpSecret, totpCodeAt } from '../../src/auth/totp.ts';
import { LIMITS, type AppContext } from '../../src/context.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { issueRecoveryCodes } from '../../src/routes/auth.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
const clock = new Clock();
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
let ipSeq = 1;
const nextIp = () => `10.77.0.${ipSeq++}`;
/** Ceasul testului, mutat numai înainte (ora UTC exactă a fiecărei încercări). */
const at = (iso: string) => {
  const t = new Date(iso);
  assert.ok(t.getTime() >= clock.current.getTime(), `ceasul nu se mută înapoi: ${iso}`);
  clock.current = t;
};

type Admin = { email: string; password: string; secret: string; recovery: string[] };

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

/** O sesiune nouă dinaintea MFA (parola corectă), deschisă la ora curentă a ceasului. */
async function pending(a: Admin): Promise<Client> {
  const c = new Client(app, undefined, nextIp());
  const r = await c.post(`${V1}/auth/login`, { email: a.email, password: a.password });
  assert.equal(r.statusCode, 200, r.body);
  assert.equal(r.json().mfa, 'required');
  return c;
}

function wrongCode(a: Admin): string {
  const t = clock.now().getTime();
  const valid = new Set([-30_000, 0, 30_000].map((d) => totpCodeAt(a.secret, new Date(t + d))));
  for (let n = 0; ; n++) {
    const c = String(n).padStart(6, '0');
    if (!valid.has(c)) return c;
  }
}

/** Un cod greșit, dintr-o sesiune nouă, la ora curentă; întoarce codul HTTP. */
async function fail(a: Admin): Promise<number> {
  return (await (await pending(a)).post(`${V1}/auth/mfa/verify`, { code: wrongCode(a) })).statusCode;
}

async function lockedUntil(email: string): Promise<Date | null> {
  return (await q<{ l: Date | null }>('SELECT locked_until AS l FROM admin_users WHERE email = ?', [email]))[0]!.l;
}

before(async () => {
  assert.equal(LIMITS.totpMaxFailuresPerHour, 3, 'premisa testelor: pragul aprobat este 3');
  assert.equal(LIMITS.loginLockMinutes, 15, 'premisa testelor: blocarea aprobată este de 15 minute');
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

describe('CL-4: codurile TOTP greșite se numără pe ultimele 60 de minute, nu pe ora fixă', () => {
  it('2 eșecuri la 10:59 și 1 la 11:00 → blocare (pe codul vechi, găleata orei 11 pornea de la zero)', async () => {
    at('2026-10-02T10:58:00.000Z');
    const a = await superAdmin('cl4.granita@exemplu.test');
    at('2026-10-02T10:59:10.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-02T10:59:40.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-02T11:00:05.000Z');
    const c = await pending(a);
    const third = await c.post(`${V1}/auth/mfa/verify`, { code: wrongCode(a) });
    assert.equal(third.statusCode, 429, third.body);
    assert.equal(third.json().error.code, 'ACCOUNT_LOCKED');
    assert.equal((await lockedUntil(a.email))!.getTime(), clock.now().getTime() + 15 * 60_000);
  });

  it('timpi reali: 3 eșecuri la exact 60 de minute, apoi la 59 min 59 s distanță → blocare', async () => {
    at('2026-10-02T14:00:00.000Z');
    const a = await superAdmin('cl4.ora-exacta@exemplu.test');
    assert.equal(await fail(a), 401);
    at('2026-10-02T14:30:00.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-02T15:00:00.000Z');
    assert.equal(await fail(a), 429, 'primul eșec este exact cu 60 de minute în urmă');

    at('2026-10-02T15:20:00.000Z');
    const b = await superAdmin('cl4.secunde@exemplu.test');
    at('2026-10-02T15:20:59.000Z');
    assert.equal(await fail(b), 401);
    at('2026-10-02T15:50:00.000Z');
    assert.equal(await fail(b), 401);
    at('2026-10-02T16:20:58.000Z');
    assert.equal(await fail(b), 429, 'primul eșec este cu 59 min 59 s în urmă, în altă găleată de minut');
  });

  it('3 eșecuri întinse pe mai mult de 61 de minute → fără blocare; un al 4-lea în fereastră → blocare', async () => {
    at('2026-10-02T18:00:00.000Z');
    const a = await superAdmin('cl4.intinse@exemplu.test');
    assert.equal(await fail(a), 401);
    at('2026-10-02T18:30:00.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-02T19:01:30.000Z'); // 61 min 30 s după primul: primul nu mai este în fereastră
    assert.equal(await fail(a), 401);
    assert.equal(await lockedUntil(a.email), null, 'nicio blocare: în fereastră sunt numai 2 eșecuri');
    at('2026-10-02T19:02:00.000Z');
    assert.equal(await fail(a), 429, 'în ultimele 60 de minute: 18:30, 19:01, 19:02 → 3 eșecuri');
  });
});

describe('CL-4: expirarea blocării și resetarea numărătorii, cu fereastra mobilă', () => {
  it('după 15 minute contul funcționează; numărătoarea pornește de la zero după blocare', async () => {
    at('2026-10-03T08:00:00.000Z');
    const a = await superAdmin('cl4.expirare@exemplu.test');
    for (let i = 0; i < 2; i++) assert.equal(await fail(a), 401);
    assert.equal(await fail(a), 429);
    at('2026-10-03T08:14:00.000Z');
    const blocked = await new Client(app, undefined, nextIp()).post(`${V1}/auth/login`, { email: a.email, password: a.password });
    assert.equal(blocked.statusCode, 401, 'înainte de 15 minute, parola corectă este refuzată');
    at('2026-10-03T08:15:30.000Z');
    // după expirarea blocării, eșecurile dinainte nu se mai numără (încă sunt în ultimele 60 de minute)
    for (let i = 0; i < 2; i++) assert.equal(await fail(a), 401, `eșecul ${i + 1} după blocare`);
    assert.ok(!((await lockedUntil(a.email))! > clock.now()), 'contul nu este blocat din nou');
    const ok = await (await pending(a)).post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(a.secret, clock.now()) });
    assert.equal(ok.statusCode, 200, 'autentificarea normală');
  });

  it('codul TOTP corect resetează toate gălețile din fereastră', async () => {
    at('2026-10-03T10:58:00.000Z');
    const a = await superAdmin('cl4.reset-totp@exemplu.test');
    at('2026-10-03T10:59:10.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-03T10:59:40.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-03T11:00:05.000Z');
    assert.equal((await (await pending(a)).post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(a.secret, clock.now()) })).statusCode, 200);
    at('2026-10-03T11:01:00.000Z');
    assert.equal(await fail(a), 401, 'după succes, eșecurile de la 10:59 nu se mai numără');
    assert.equal(await lockedUntil(a.email), null);
  });

  it('codul de recuperare resetează toate gălețile din fereastră', async () => {
    at('2026-10-03T12:58:00.000Z');
    const a = await superAdmin('cl4.reset-recuperare@exemplu.test');
    at('2026-10-03T12:59:10.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-03T12:59:40.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-03T13:00:05.000Z');
    assert.equal((await (await pending(a)).post(`${V1}/auth/mfa/recovery`, { code: a.recovery[0] })).statusCode, 200);
    at('2026-10-03T13:01:00.000Z');
    assert.equal(await fail(a), 401, 'după codul de recuperare, eșecurile de la 12:59 nu se mai numără');
    assert.equal(await lockedUntil(a.email), null);
  });
});

describe('CL-4: zona conservatoare dintre 60 și 61 de minute', () => {
  it('un eșec de la 18:01:00 se numără încă la 19:01:59 (60 min 59 s; găleata 18:01 ≥ 19:01 − 60) → blocare', async () => {
    // Regula aprobată (61 de găleți): se numără găleata minutului de acum 60 de minute, deci eșecurile aflate între
    // 60:00 și 60:59,999 în urmă se pot număra, în funcție de secunde. Testul fixează explicit acest comportament.
    at('2026-10-04T18:00:00.000Z');
    const a = await superAdmin('cl4.zona-60-61@exemplu.test');
    at('2026-10-04T18:01:00.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-04T18:30:00.000Z');
    assert.equal(await fail(a), 401);
    at('2026-10-04T19:01:59.000Z');
    assert.equal(await fail(a), 429, 'eșecul de la 18:01:00 (acum 60 min 59 s) este încă în fereastră → 3 eșecuri');
    assert.ok((await lockedUntil(a.email))! > clock.now(), 'contul este blocat');
  });
});

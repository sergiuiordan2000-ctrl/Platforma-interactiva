// rotate:totp-key (plan FAZA_5_4_ROTIRE_TOTP_PLAN.md): schimbarea cheii TOTP_ENC_KEY, totul sau nimic.
// Cer MySQL real (CIVIC_TEST_DATABASE_URL). Ordinea testelor contează: fiecare pornește de la starea lăsată de precedentul.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { CITIZEN_POLICY_VERSION } from '@tmc/shared';
import { bootstrapAdmin } from '../../src/accounts.ts';
import { decryptSecret, deriveKey, hmacHex } from '../../src/auth/crypto.ts';
import { totpCodeAt } from '../../src/auth/totp.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { RotateTotpKeyError, RotateTotpKeyRenameError, parseTotpKey, rotateTotpKey } from '../../src/rotateTotpKey.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';

const V1 = '/api/v1';
const skip = process.platform === 'win32';
const clock = new Clock();
const OLD_HEX = randomBytes(32).toString('hex');
const OLD_KEY = Buffer.from(OLD_HEX, 'hex');
const SA1 = { email: 'sa1@exemplu.test', pw: 'parola-super-admin-1-2026', secret: '', codes: [] as string[] };
const SA2 = { email: 'sa2@exemplu.test', pw: 'parola-super-admin-2-2026', secret: '', codes: [] as string[] };
const BLOCKED = 'blocat@exemplu.test';
const PENDING = 'cod@exemplu.test';
const ORPHAN_HASH = 'f'.repeat(64);

let h: DbHandle;
let dir: string;
let file: string;
let baseEnv: Record<string, string>;
const apps: FastifyInstance[] = [];
let appOld: FastifyInstance;
let blockedCitizen: Client;
let pendingCode = '';
let ipSeq = 10;

const q = async <T = Record<string, unknown>>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
const count = async (sql: string, p: unknown[] = []) => Number((await q<{ n: number }>(sql, p))[0]!.n);
const client = (app: FastifyInstance) => new Client(app, 'http://localhost:3000', `10.0.0.${ipSeq++}`);

/** Starea care nu are voie să se schimbe la o probă sau la un eșec: datele legate de cheie, auditul, fișierul, folderul. */
async function snapshot() {
  return {
    users: await q('SELECT id, HEX(totp_secret_enc) AS s FROM admin_users ORDER BY id'),
    blocks: await q('SELECT id, account_id, kind, email_hash FROM citizen_blocks ORDER BY id'),
    recovery: await q('SELECT id, user_id, code_hash, used_at FROM admin_recovery_codes ORDER BY id'),
    codes: await q('SELECT id, account_id, code_hash, consumed_at FROM citizen_login_codes ORDER BY id'),
    audit: await count('SELECT COUNT(*) AS n FROM audit_log'),
    file: readFileSync(file, 'utf8'),
    mode: statSync(file).mode & 0o777,
    dir: readdirSync(dir).sort(),
  };
}

const fileEnv = (): Record<string, string> =>
  Object.fromEntries(
    readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
const fileKey = () => parseTotpKey(fileEnv().TOTP_ENC_KEY!)!;

/** O aplicație nouă, cu setările din fișier (ca după Restart). */
async function appFromFile(): Promise<FastifyInstance> {
  const { app } = await makeApp(h, clock, fileEnv());
  apps.push(app);
  return app;
}

const cli = (args: string[], env: Record<string, string> = { CIVIC_ENV_FILE: file }) =>
  spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), ...args], {
    env: { ...env, PATH: process.env.PATH ?? '' },
    encoding: 'utf8',
    timeout: 30_000,
  });

async function enrollAdmin(app: FastifyInstance, who: typeof SA1, temp: string): Promise<Client> {
  const c = client(app);
  assert.equal((await c.post(`${V1}/auth/login`, { email: who.email, password: temp })).json().mfa, 'enroll');
  who.secret = (await c.post(`${V1}/auth/mfa/enroll/start`)).json().secretBase32;
  const confirm = await c.post(`${V1}/auth/mfa/enroll/confirm`, { code: totpCodeAt(who.secret, clock.now()) });
  assert.equal(confirm.statusCode, 200);
  who.codes = confirm.json().recoveryCodes;
  assert.equal((await c.post(`${V1}/auth/change-password`, { currentPassword: temp, newPassword: who.pw })).statusCode, 204);
  clock.advanceMinutes(1);
  return c;
}

/** Parolă, apoi al doilea pas: codul din aplicația de autentificare (același secret ca la înrolare) sau un cod de recuperare. */
async function secondStep(app: FastifyInstance, who: typeof SA1, recoveryCode?: string): Promise<{ c: Client; status: number }> {
  clock.advanceMinutes(1);
  const c = client(app);
  assert.equal((await c.post(`${V1}/auth/login`, { email: who.email, password: who.pw })).json().mfa, 'required');
  const res = recoveryCode
    ? await c.post(`${V1}/auth/mfa/recovery`, { code: recoveryCode })
    : await c.post(`${V1}/auth/mfa/verify`, { code: totpCodeAt(who.secret, clock.now()) });
  return { c, status: res.statusCode };
}

async function citizenStart(app: FastifyInstance, email: string): Promise<{ c: Client; code: string | undefined }> {
  clock.advanceMinutes(1);
  const c = client(app);
  const start = await c.post(`${V1}/citizen/auth/start`, { email, policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
  assert.equal(start.statusCode, 202);
  const [row] = await q<{ b: string }>(
    "SELECT body_text AS b FROM email_outbox WHERE kind = 'citizen_login_code' AND recipient = ? ORDER BY created_at DESC LIMIT 1",
    [email],
  );
  return { c, code: row?.b.match(/\b(\d{6})\b/)?.[1] };
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);

  // fișierul de setări: comentariu, rând gol, cheia la mijloc; totul trebuie să rămână identic, în afara rândului cheii
  baseEnv = testEnv({ DATABASE_URL: testDatabaseUrl(), TOTP_ENC_KEY: OLD_HEX }) as Record<string, string>;
  dir = mkdtempSync(join(tmpdir(), 'civic-totp-rot-'));
  file = join(dir, 'civic.env');
  const entries = Object.entries(baseEnv).filter(([k]) => k !== 'TOTP_ENC_KEY').map(([k, v]) => `${k}=${v}`);
  writeFileSync(file, ['# setări de test', ...entries.slice(0, 3), '', `TOTP_ENC_KEY=${OLD_HEX}`, ...entries.slice(3), ''].join('\n'));
  chmodSync(file, 0o600);

  appOld = await appFromFile();
  // două conturi super_admin cu TOTP (ca în ordinea de pe staging), fiecare cu 10 coduri de recuperare
  const b = await bootstrapAdmin(h.pool, clock.now(), SA1.email, 'SA 1');
  const admin = await enrollAdmin(appOld, SA1, b.temporaryPassword);
  const created = await admin.post(`${V1}/admin/accounts`, { email: SA2.email, displayName: 'SA 2', role: 'super_admin' });
  assert.equal(created.statusCode, 201);
  await enrollAdmin(appOld, SA2, created.json().temporaryPassword);

  // un cetățean autentificat, blocat definitiv; un alt cetățean cu un cod cerut și încă nefolosit
  const login = await citizenStart(appOld, BLOCKED);
  blockedCitizen = login.c;
  assert.equal((await blockedCitizen.post(`${V1}/citizen/auth/verify`, { email: BLOCKED, code: login.code })).statusCode, 200);
  const [acc] = await q<{ id: string }>('SELECT id FROM citizen_accounts WHERE email_normalized = ?', [BLOCKED]);
  assert.equal((await admin.post(`${V1}/admin/citizens/${acc!.id}/blocks`, { kind: 'permanent' })).statusCode, 201);
  pendingCode = (await citizenStart(appOld, PENDING)).code!;
  assert.match(pendingCode, /^\d{6}$/);
  // o blocare temporară expirată, rămasă fără cont: nu are voie să oprească rotirea
  await h.pool.query(
    "INSERT INTO citizen_blocks (id, account_id, kind, starts_at, ends_at, email_hash) VALUES ('01TESTORFANEXPIRAT00000000', NULL, 'temporary', '2020-01-01', '2020-01-31', ?)",
    [ORPHAN_HASH],
  );
});

after(async () => {
  for (const a of apps) await a.close();
  await h.close();
});

describe('rotate:totp-key — proba și refuzurile nu schimbă nimic', { skip }, () => {
  const EXPECTED = { totpSecrets: 2, blocks: 1, recoveryCodes: 20, citizenCodes: 1 };

  it('proba (funcția): spune ce ar schimba; baza de date, fișierul și folderul rămân identice', async () => {
    const before = await snapshot();
    const res = await rotateTotpKey({ file, pool: h.pool, currentKey: OLD_KEY, now: clock.now(), dryRun: true });
    assert.deepEqual(res, { status: 'checked', counts: EXPECTED });
    assert.deepEqual(await snapshot(), before);
  });

  it('proba (CLI `--check`): cod 0, numerele, nicio valoare de cheie în ieșire; nimic schimbat', async () => {
    const before = await snapshot();
    const res = cli(['rotate:totp-key', '--check']);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /PROBĂ reușită/);
    assert.match(res.stdout, /secrete TOTP recriptate: 2; blocări cu amprenta recalculată: 1; coduri de recuperare șterse: 20; coduri de cetățean șterse: 1/);
    assert.match(res.stdout, /nimic nu a fost schimbat/);
    assert.ok(!/[0-9a-f]{64}/i.test(res.stdout + res.stderr), 'nicio valoare de cheie în ieșire');
    assert.deepEqual(await snapshot(), before);
  });

  it('fără CIVIC_ENV_FILE → cod 2; cheia din fișier diferită de cea cu care rulează comanda → refuz', async () => {
    const before = await snapshot();
    assert.equal(cli(['rotate:totp-key'], baseEnv).status, 2);
    assert.equal(cli(['rotate:totp-key', '--check'], baseEnv).status, 2);
    await assert.rejects(
      rotateTotpKey({ file, pool: h.pool, currentKey: randomBytes(32), now: clock.now() }),
      (e: unknown) => e instanceof RotateTotpKeyError && /nu este cea cu care a pornit comanda/.test(e.message),
    );
    assert.deepEqual(await snapshot(), before);
  });

  it('o blocare activă rămasă fără cont (definitivă sau temporară neexpirată) oprește comanda; cea expirată nu', async () => {
    for (const [kind, endsAt] of [['permanent', null], ['temporary', '2099-01-01']] as const) {
      await h.pool.query(
        "INSERT INTO citizen_blocks (id, account_id, kind, starts_at, ends_at, email_hash) VALUES ('01TESTORFANACTIV0000000000', NULL, ?, NULL, ?, ?)",
        [kind, endsAt, 'e'.repeat(64)],
      );
      const before = await snapshot();
      assert.deepEqual(await rotateTotpKey({ file, pool: h.pool, currentKey: OLD_KEY, now: clock.now() }), { status: 'orphan_blocks', orphanBlocks: 1 });
      for (const args of [['rotate:totp-key'], ['rotate:totp-key', '--check']]) {
        const res = cli(args);
        assert.equal(res.status, 1, res.stdout);
        assert.match(res.stderr, /există 1 blocări active ale unor conturi deja șterse/);
        assert.match(res.stderr, /Nimic nu a fost schimbat/);
      }
      assert.deepEqual(await snapshot(), before, kind);
      await h.pool.query("DELETE FROM citizen_blocks WHERE id = '01TESTORFANACTIV0000000000'");
    }
  });

  it('un secret care nu poate fi citit cu cheia actuală → refuz; celălalt cont rămâne neatins', async () => {
    const [u] = await q<{ id: string; s: Buffer }>('SELECT id, totp_secret_enc AS s FROM admin_users WHERE email = ?', [SA2.email]);
    await h.pool.query('UPDATE admin_users SET totp_secret_enc = ? WHERE id = ?', [randomBytes(60), u!.id]);
    const before = await snapshot();
    await assert.rejects(
      rotateTotpKey({ file, pool: h.pool, currentKey: OLD_KEY, now: clock.now() }),
      (e: unknown) => e instanceof RotateTotpKeyError && /nu poate fi citit cu cheia actuală/.test(e.message),
    );
    assert.deepEqual(await snapshot(), before);
    await h.pool.query('UPDATE admin_users SET totp_secret_enc = ? WHERE id = ?', [u!.s, u!.id]);
  });

  it('un eșec chiar înaintea confirmării (după toate scrierile) lasă totul neschimbat și nu lasă fișier temporar', async () => {
    const before = await snapshot();
    let reached = false;
    await assert.rejects(
      rotateTotpKey({
        file, pool: h.pool, currentKey: OLD_KEY, now: clock.now(),
        hooks: {
          beforeCommit: () => {
            reached = true;
            assert.equal(readdirSync(dir).length, 2, 'fișierul temporar există în acest moment');
            throw new Error('eșec simulat');
          },
        },
      }),
      /eșec simulat/,
    );
    assert.ok(reached);
    assert.deepEqual(await snapshot(), before);
  });
});

describe('rotate:totp-key — rotirea reală', { skip }, () => {
  let appNew: FastifyInstance;
  let newKey: Buffer;

  it('CLI: cod 0; numai rândul cheii se schimbă în fișier; secretele se citesc cu cheia nouă; audit numai cu numere', async () => {
    const before = await snapshot();
    const [blk] = await q<{ id: string; email_hash: string }>('SELECT id, email_hash FROM citizen_blocks WHERE account_id IS NOT NULL');
    assert.equal(blk!.email_hash, hmacHex(deriveKey(OLD_KEY, 'email-hash'), BLOCKED));
    const consumedBefore = await count('SELECT COUNT(*) AS n FROM citizen_login_codes WHERE consumed_at IS NOT NULL');
    assert.ok(consumedBefore >= 1);

    const res = cli(['rotate:totp-key']);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /cheia a fost schimbată/);
    assert.match(res.stdout, /secrete TOTP recriptate: 2; blocări cu amprenta recalculată: 1; coduri de recuperare șterse: 20; coduri de cetățean șterse: 1/);
    assert.match(res.stdout, /reporniți aplicația/);
    assert.ok(!/[0-9a-f]{64}/i.test(res.stdout + res.stderr), 'nicio valoare de cheie în ieșire');

    // fișierul: același număr de rânduri, diferă numai rândul cheii; drepturi 600; niciun fișier temporar rămas
    const oldLines = before.file.split('\n');
    const newLines = readFileSync(file, 'utf8').split('\n');
    assert.equal(newLines.length, oldLines.length);
    const changed = newLines.map((l, i) => (l === oldLines[i] ? -1 : i)).filter((i) => i >= 0);
    assert.deepEqual(changed.map((i) => oldLines[i]), [`TOTP_ENC_KEY=${OLD_HEX}`]);
    assert.match(newLines[changed[0]!]!, /^TOTP_ENC_KEY=[0-9a-f]{64}$/);
    assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(dir), ['civic.env']);
    newKey = fileKey();
    assert.ok(!newKey.equals(OLD_KEY));

    // secretele TOTP: aceleași, citibile numai cu cheia nouă
    for (const who of [SA1, SA2]) {
      const [u] = await q<{ s: Buffer }>('SELECT totp_secret_enc AS s FROM admin_users WHERE email = ?', [who.email]);
      assert.equal(decryptSecret(newKey, u!.s), who.secret);
      assert.throws(() => decryptSecret(OLD_KEY, u!.s));
    }
    // blocarea cu cont: amprenta recalculată; blocarea expirată fără cont: neatinsă
    const blocks = await q<{ id: string; email_hash: string }>('SELECT id, email_hash FROM citizen_blocks ORDER BY account_id IS NULL');
    assert.deepEqual(blocks.map((x) => x.email_hash), [hmacHex(deriveKey(newKey, 'email-hash'), BLOCKED), ORPHAN_HASH]);
    // ce nu poate fi mutat: șters; codurile deja folosite rămân
    assert.equal(await count('SELECT COUNT(*) AS n FROM admin_recovery_codes'), 0);
    assert.equal(await count('SELECT COUNT(*) AS n FROM citizen_login_codes WHERE consumed_at IS NULL'), 0);
    assert.equal(await count('SELECT COUNT(*) AS n FROM citizen_login_codes WHERE consumed_at IS NOT NULL'), consumedBefore);
    // audit: un rând, numai cu numere
    const audit = await q<{ actor_type: string; target_id: string; details: unknown }>(
      "SELECT actor_type, target_id, details FROM audit_log WHERE action = 'system.keys.rotate_totp'",
    );
    assert.equal(audit.length, 1);
    assert.equal(audit[0]!.actor_type, 'system');
    const details = typeof audit[0]!.details === 'string' ? JSON.parse(audit[0]!.details) : audit[0]!.details;
    assert.deepEqual(details, { totpSecrets: 2, blocks: 1, recoveryCodes: 20, citizenCodes: 1, via: 'cli' });
    assert.equal(await count('SELECT COUNT(*) AS n FROM audit_log'), before.audit + 1);
    assert.equal(cli(['migrate:status']).status, 0, 'configurația cu cheia nouă este validă');
  });

  it('până la Restart, aplicația cu cheia veche nu mai acceptă codul TOTP; după Restart, ambele conturi intră cu aceeași aplicație de autentificare', async () => {
    assert.notEqual((await secondStep(appOld, SA1)).status, 200);
    appNew = await appFromFile();
    for (const who of [SA1, SA2]) {
      const { c, status } = await secondStep(appNew, who);
      assert.equal(status, 200, who.email);
      assert.equal((await c.get(`${V1}/auth/me`)).statusCode, 200);
    }
  });

  it('codurile de recuperare vechi sunt respinse; cele generate după rotire sunt acceptate', async () => {
    assert.equal((await secondStep(appNew, SA1, SA1.codes[0])).status, 401);
    const { c } = await secondStep(appNew, SA1);
    const regen = await c.post(`${V1}/auth/mfa/recovery-codes/regenerate`);
    assert.equal(regen.statusCode, 200);
    const fresh: string[] = regen.json().recoveryCodes;
    assert.equal(fresh.length, 10);
    assert.equal((await secondStep(appNew, SA1, fresh[0])).status, 200);
  });

  it('codul de cetățean cerut înainte de rotire este respins; unul nou funcționează', async () => {
    assert.equal((await client(appNew).post(`${V1}/citizen/auth/verify`, { email: PENDING, code: pendingCode })).statusCode, 401);
    const { c, code } = await citizenStart(appNew, PENDING);
    assert.equal((await c.post(`${V1}/citizen/auth/verify`, { email: PENDING, code })).statusCode, 200);
  });

  it('redenumirea eșuată după confirmare: fișierul temporar are cheia nouă; după redenumirea de mână și Restart, autentificarea merge', async () => {
    const envBefore = readFileSync(file, 'utf8');
    let err: unknown;
    try {
      await rotateTotpKey({
        file, pool: h.pool, currentKey: newKey, now: clock.now(),
        hooks: { rename: () => { throw new Error('disc plin'); } },
      });
    } catch (e) {
      err = e;
    }
    assert.ok(err instanceof RotateTotpKeyRenameError);
    assert.equal(err.envFile, file);
    assert.ok(existsSync(err.tmpFile) && basename(err.tmpFile).startsWith('.civic.env.'));
    assert.equal(statSync(err.tmpFile).mode & 0o777, 0o600);
    assert.equal(readFileSync(file, 'utf8'), envBefore, 'fișierul de setări a rămas cel vechi');
    const tmpKey = parseTotpKey(readFileSync(err.tmpFile, 'utf8').split('\n').find((l) => l.startsWith('TOTP_ENC_KEY='))!.slice(13))!;
    assert.ok(!tmpKey.equals(newKey));
    const [u] = await q<{ s: Buffer }>('SELECT totp_secret_enc AS s FROM admin_users WHERE email = ?', [SA1.email]);
    assert.equal(decryptSecret(tmpKey, u!.s), SA1.secret, 'baza de date este deja pe cheia din fișierul temporar');
    // o nouă rulare cu fișierul vechi nu poate strica nimic: secretele nu se mai citesc cu cheia veche → refuz
    await assert.rejects(rotateTotpKey({ file, pool: h.pool, currentKey: newKey, now: clock.now(), dryRun: true }), RotateTotpKeyError);

    renameSync(err.tmpFile, file); // pasul de mână indicat de comandă
    assert.deepEqual(readdirSync(dir), ['civic.env']);
    newKey = fileKey();
    assert.ok(newKey.equals(tmpKey));
    appNew = await appFromFile();
    for (const who of [SA1, SA2]) assert.equal((await secondStep(appNew, who)).status, 200, who.email);
  });

  it('blocarea definitivă rezistă rotirii: sesiunea cetățeanului rămâne validă, iar după ștergerea contului adresa nu poate fi refolosită', async () => {
    const c = client(appNew);
    c.cookie = blockedCitizen.cookie; // sesiunea creată înainte de rotiri
    const me = await c.get(`${V1}/citizen/me`);
    assert.equal(me.statusCode, 200);
    assert.deepEqual(me.json().blocked, { active: true, kind: 'permanent' });
    assert.equal((await c.send('DELETE', `${V1}/citizen/account`)).statusCode, 204);
    // contul nu mai există: blocarea se regăsește numai prin amprenta e-mailului, calculată cu cheia nouă
    const again = await citizenStart(appNew, BLOCKED);
    assert.equal(again.code, undefined, 'niciun cod nou pentru adresa blocată');
    assert.equal(await count('SELECT COUNT(*) AS n FROM citizen_accounts WHERE email_normalized = ?', [BLOCKED]), 0);
    assert.equal(await count("SELECT COUNT(*) AS n FROM email_outbox WHERE kind = 'citizen_account_blocked' AND recipient = ?", [BLOCKED]), 1);
    // această blocare este acum „fără cont”: o nouă rotire se oprește și spune câte sunt
    const res = cli(['rotate:totp-key', '--check']);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /există 1 blocări active/);
  });
});

// V3 (propunerea r4, aprobată la 05.11.2026): restaurarea de probă pe o bază și un director de TEST, cu ținta din
// `restore-target.env`, prin comenzile reale `restore-target:*`, fiecare într-un proces separat, ca pe găzduire
// („Run JS script” → node server/dist/app.js <comandă>; setările active din fișierul numit de CIVIC_ENV_FILE).
//
// Cere două baze: cea de test obișnuită (CIVIC_TEST_DATABASE_URL, aici „activă”) și o a doua, cu alt utilizator
// (CIVIC_TEST_TARGET_DATABASE_URL, ținta). În CI ambele există (pasul „DB țintă pentru V3”); local, fără a doua bază,
// suita se omite explicit, iar în CI lipsa ei este o eroare.
//
// Ce verifică (propunerea §2.0, §2.4, §4): `process.env` neschimbat (O1); `status` și `--check` nu scriu nimic;
// `migrate` și `--confirm` ating numai ținta; baza, fișierele și marcajele active rămân identice după fiecare comandă;
// a doua rulare `--confirm` este refuzată, iar ținta rămâne neschimbată (V3-5); refuzurile principale, fără scriere.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { generateX25519Identity, identityToRecipient } from 'age-encryption';
import { createBackup } from '../../src/db/backup.ts';
import { decryptCopy } from '../../src/db/backupCrypto.ts';
import { createDb, type DbHandle } from '../../src/db/client.ts';
import { recordReportCounter } from '../../src/db/markers.ts';
import { migrate } from '../../src/db/migrations.ts';
import {
  RESTORE_TARGET_FILE,
  RESTORE_TARGET_MIGRATE_COMMAND,
  RESTORE_TARGET_RESTORE_COMMAND,
  RESTORE_TARGET_STATUS_COMMAND,
} from '../../src/db/restoreTarget.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { runRestoreTargetCommand } from '../../src/cli.ts';
import { loadConfig } from '../../src/config.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';

const TARGET_URL = process.env.CIVIC_TEST_TARGET_DATABASE_URL;
if (!TARGET_URL && process.env.CI) throw new Error('CIVIC_TEST_TARGET_DATABASE_URL lipsește în CI (pasul „DB țintă pentru V3”).');
const skip = TARGET_URL ? false : 'CIVIC_TEST_TARGET_DATABASE_URL lipsește (a doua bază, cu alt utilizator)';

const DAY = 86_400_000;
const NOW = new Date('2026-11-06T08:00:00.000Z');
const id = (n: number) => `01V3RT${String(n).padStart(20, '0')}`;
const TARGET_PASSWORD = TARGET_URL ? decodeURIComponent(new URL(TARGET_URL).password) : '';

let h: DbHandle;
let t: DbHandle;
let root: string;
let dataDir: string;
let envFile: string;
let storageDir: string;
let backupDir: string;
let targetStorage: string;
let restoreCopyName: string;

const q = async (pool: DbHandle, sql: string) => (await pool.pool.query(sql))[0] as Array<Record<string, unknown>>;

/** numărul de rânduri pe tabel (toate tabelele bazei) */
async function counts(db: DbHandle): Promise<Record<string, number>> {
  const tables = (await q(db, "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME")).map((r) => String(r.t));
  const out: Record<string, number> = {};
  for (const name of tables) out[name] = Number((await q(db, `SELECT COUNT(*) AS n FROM \`${name}\``))[0]!.n);
  return out;
}
function listing(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(`${relative(dir, p)}:${createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16)}`);
    }
  };
  walk(dir);
  return files.sort();
}
/**
 * Conținutul integral al unei baze, determinist: pentru fiecare tabel, toate rândurile, fiecare serializat JSON
 * (valorile, cu datele ca text UTC), sortate. O schimbare a oricărei valori din orice tabel schimbă amprenta.
 */
async function dbContent(db: DbHandle): Promise<Record<string, string[]>> {
  const tables = (await q(db, "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME")).map((r) => String(r.t));
  const out: Record<string, string[]> = {};
  for (const name of tables) {
    const rows = await q(db, `SELECT * FROM \`${name}\``);
    out[name] = rows
      .map((r) => JSON.stringify(Object.keys(r).sort().map((k) => [k, r[k] instanceof Date ? (r[k] as Date).toISOString() : r[k]])))
      .sort();
  }
  return out;
}
/** starea activă: conținutul integral al bazei, fișierele, marcajele și BACKUP_DIR (fără copia decriptată) */
async function activeState(): Promise<string> {
  const backups = listing(backupDir).filter((f) => !f.startsWith('civic-restore-'));
  return createHash('sha256').update(JSON.stringify([await dbContent(h), listing(storageDir), backups])).digest('hex');
}
async function targetState(): Promise<string> {
  return createHash('sha256').update(JSON.stringify([await dbContent(t), listing(targetStorage)])).digest('hex');
}
function writeTarget(lines: string[], mode = 0o600): void {
  const f = join(dataDir, RESTORE_TARGET_FILE);
  rmSync(f, { force: true });
  writeFileSync(f, lines.join('\n') + '\n');
  chmodSync(f, mode);
}
const goodTarget = () => writeTarget([`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${targetStorage}`]);

/**
 * Comanda în același proces, cu „cârligul” de test care schimbă fișierul țintei ÎNTRE verificarea inițială și
 * reverificarea dinaintea primei scrieri (simulează o modificare făcută între timp).
 */
async function inProcess(command: Parameters<typeof runRestoreTargetCommand>[0], args: string[], change: () => void) {
  const config = loadConfig(testEnv({ DATABASE_URL: testDatabaseUrl(), STORAGE_DIR: storageDir, BACKUP_DIR: backupDir }));
  const lines: string[] = [];
  const code = await runRestoreTargetCommand(command, config, { log: (m) => lines.push(m), error: (m) => lines.push(m) }, args, { CIVIC_ENV_FILE: envFile }, { beforeRecheck: change });
  return { code, all: lines.join('\n') };
}
const otherDbUrl = () => {
  const u = new URL(TARGET_URL!);
  u.pathname = '/civic_test_target_alt';
  return u.toString();
};
const otherPasswordUrl = () => {
  const u = new URL(TARGET_URL!);
  u.password = 'alta-parola';
  return u.toString();
};

/** comanda reală, într-un proces separat, numai cu CIVIC_ENV_FILE (ca pe găzduire) */
function run(command: string, args: string[] = []) {
  const r = spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), command, ...args], {
    env: { PATH: process.env.PATH ?? '', CIVIC_ENV_FILE: envFile },
    encoding: 'utf8',
    timeout: 120_000,
  });
  const all = `${r.stdout}\n${r.stderr}`;
  assert.ok(!TARGET_PASSWORD || !all.includes(TARGET_PASSWORD), `${command}: ieșirea conține parola țintei`);
  return { code: r.status, out: r.stdout, err: r.stderr, all };
}

describe('V3: restaurarea de probă pe țintă (restore-target:*)', { skip }, () => {
  before(async () => {
    h = openTestDb();
    t = createDb(TARGET_URL!, { connectionLimit: 2 });
    root = mkdtempSync(join(tmpdir(), 'civic-v3-'));
    dataDir = join(root, 'civic-test-data');
    storageDir = join(dataDir, 'storage');
    backupDir = join(dataDir, 'backups');
    targetStorage = join(root, 'v3-storage');
    mkdirSync(storageDir, { recursive: true });
    mkdirSync(backupDir, { recursive: true });

    // baza activă: config, un cont, două sesizări cu fotografii, contorul TM = 2
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    await seedConfig(h.pool, SEEDS_DIR);
    await h.pool.query(
      "INSERT INTO citizen_accounts (id, email, email_normalized, status, policy_version, policy_accepted_at, created_at) VALUES (?, 'v3@exemplu.test', 'v3@exemplu.test', 'active', 'v1', ?, ?)",
      [id(1), new Date(NOW.getTime() - 30 * DAY), new Date(NOW.getTime() - 30 * DAY)],
    );
    for (const [k, ref] of [[10, 'TM-001'], [11, 'TM-002']] as const) {
      const at = new Date(NOW.getTime() - (k - 9) * DAY);
      await h.pool.query(
        "INSERT INTO reports (id, author_account_id, reference_number, category_id, description, location_text, lat, lng, location_source, created_at, updated_at) VALUES (?, ?, ?, 'drumuri', ?, 'Str. Test', 43.75, 24.87, 'pin', ?, ?)",
        [id(k), id(1), ref, `Sesizare V3 ${ref}`, at, at],
      );
      const key = `r/${id(k)}.webp`;
      mkdirSync(join(storageDir, 'r'), { recursive: true });
      writeFileSync(join(storageDir, key), `foto-${ref}`);
      await h.pool.query(
        "INSERT INTO report_photos (id, report_id, ordinal, storage_key, mime, size_bytes, width, height, sha256, created_at) VALUES (?, ?, 1, ?, 'image/webp', 10, 1, 1, REPEAT('e', 64), ?)",
        [id(k + 100), id(k), key, at],
      );
    }
    await h.pool.query('UPDATE report_counter SET `last_value` = 2 WHERE id = 1');
    recordReportCounter(backupDir, 2);

    // copia criptată, apoi decriptată „pe calculator” și urcată direct în BACKUP_DIR (drumul E4.11)
    const identity = await generateX25519Identity();
    const recipient = await identityToRecipient(identity);
    const enc = await createBackup({
      databaseUrl: testDatabaseUrl(), backupDir, storageDir, migrationsDir: MIGRATIONS_DIR,
      retentionDays: 45, adminRetentionMonths: 6, now: NOW, recipient,
    });
    const dec = await decryptCopy(enc.dir, identity, backupDir, new Date(NOW.getTime() + 60_000));
    assert.ok(dec.out, 'copia decriptată');
    restoreCopyName = relative(backupDir, dec.out!);

    // setările active (ca civic.env de pe găzduire) și ținta goală
    const env = testEnv({ DATABASE_URL: testDatabaseUrl(), STORAGE_DIR: storageDir, BACKUP_DIR: backupDir });
    envFile = join(dataDir, 'civic.env');
    writeFileSync(envFile, Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
    chmodSync(envFile, 0o600);
    assert.ok(/test/i.test(new URL(TARGET_URL!).pathname), 'ținta de test trebuie să conțină „test” în nume');
    await resetTestDb(t.pool); // golește numai baza conexiunii date (ținta de test)
    goodTarget();
  });

  after(async () => {
    await h?.close();
    await t?.close();
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it('O1: comanda nu atinge process.env și nici setările active (apel în același proces)', async () => {
    const config = loadConfig(testEnv({ DATABASE_URL: testDatabaseUrl(), STORAGE_DIR: storageDir, BACKUP_DIR: backupDir }));
    const configBefore = JSON.stringify(config);
    const envBefore = JSON.stringify(process.env);
    const lines: string[] = [];
    const code = await runRestoreTargetCommand(RESTORE_TARGET_STATUS_COMMAND, config, { log: (m) => lines.push(m), error: (m) => lines.push(m) }, [], {
      CIVIC_ENV_FILE: envFile,
    });
    assert.equal(code, 0, lines.join('\n'));
    assert.equal(JSON.stringify(process.env), envBefore);
    assert.equal(JSON.stringify(config), configBefore);
  });

  it('amprenta stării detectează schimbarea unei singure valori (de exemplu contorul TM), nu numai a numărului de rânduri', async () => {
    const a0 = await activeState();
    await h.pool.query('UPDATE report_counter SET `last_value` = `last_value` + 1 WHERE id = 1');
    assert.notEqual(await activeState(), a0);
    await h.pool.query('UPDATE report_counter SET `last_value` = `last_value` - 1 WHERE id = 1');
    assert.equal(await activeState(), a0);
  });

  it('status: ținta identificată, fără parolă, numai citire; baza activă neschimbată', async () => {
    const a0 = await activeState();
    const t0 = await targetState();
    const r = run('restore-target:status');
    assert.equal(r.code, 0, r.all);
    assert.match(r.out, new RegExp(`baza: ${new URL(TARGET_URL!).pathname.slice(1)} `));
    assert.match(r.out, /parola nu se afișează/);
    assert.match(r.out, new RegExp(`copia sursă: ${restoreCopyName}`));
    assert.match(r.out, /cu rânduri \(în afara schema_migrations\): niciuna/);
    assert.equal(await activeState(), a0);
    assert.equal(await targetState(), t0);
  });

  it('--check înaintea migrării: refuzat (schema), nimic scris', async () => {
    const a0 = await activeState();
    const t0 = await targetState();
    const r = run('restore-target:restore', ['--check']);
    assert.equal(r.code, 1, r.all);
    assert.match(r.all, /REFUZATĂ/);
    assert.equal(await activeState(), a0);
    assert.equal(await targetState(), t0);
    assert.ok(existsSync(join(backupDir, restoreCopyName)), 'copia rămâne');
  });

  it('migrate: ținta schimbată între verificare și prima scriere (bază, director, drepturi) — refuz, nimic scris', async () => {
    const a0 = await activeState();
    const t0 = await targetState();
    const changes: Array<[() => void, RegExp]> = [
      [() => writeTarget([`DATABASE_URL=${otherDbUrl()}`, `STORAGE_DIR=${targetStorage}`]), /DATABASE_URL din fișierul țintei s-a schimbat/],
      [() => writeTarget([`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${join(root, 'v3-altul')}`]), /STORAGE_DIR din fișierul țintei s-a schimbat/],
      [() => writeTarget([`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${targetStorage}`], 0o644), /drepturi 644/],
      [() => writeTarget([`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${storageDir}`]), /nu mai trece verificarea/],
    ];
    for (const [change, re] of changes) {
      goodTarget();
      const r = await inProcess(RESTORE_TARGET_MIGRATE_COMMAND, [], change);
      assert.equal(r.code, 1, r.all);
      assert.match(r.all, re);
      assert.match(r.all, /REFUZ, nimic scris/);
      assert.equal(await targetState(), t0, 'ținta neschimbată (nicio migrare)');
    }
    goodTarget();
    assert.equal(await activeState(), a0);
  });

  it('migrate: numai pe țintă', async () => {
    const a0 = await activeState();
    const r = run('restore-target:migrate');
    assert.equal(r.code, 0, r.all);
    assert.match(r.out, /schema bazei țintă la versiunea \d+/);
    assert.ok((await counts(t)).schema_migrations! > 0);
    assert.equal(await activeState(), a0);
  });

  it('--check după migrare: „PERMISĂ”, nimic scris', async () => {
    const a0 = await activeState();
    const t0 = await targetState();
    const r = run('restore-target:restore', ['--check']);
    assert.equal(r.code, 0, r.all);
    assert.match(r.all, /PERMISĂ/);
    assert.equal(await activeState(), a0);
    assert.equal(await targetState(), t0);
  });

  it('--confirm: ținta schimbată între verificare și prima scriere (bază, parolă, director) — refuz, copia rămâne, nimic scris', async () => {
    const a0 = await activeState();
    const t0 = await targetState();
    const changes: Array<[() => void, RegExp]> = [
      [() => writeTarget([`DATABASE_URL=${otherDbUrl()}`, `STORAGE_DIR=${targetStorage}`]), /DATABASE_URL din fișierul țintei s-a schimbat/],
      [() => writeTarget([`DATABASE_URL=${otherPasswordUrl()}`, `STORAGE_DIR=${targetStorage}`]), /DATABASE_URL din fișierul țintei s-a schimbat/],
      [() => writeTarget([`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${join(root, 'v3-altul')}`]), /STORAGE_DIR din fișierul țintei s-a schimbat/],
      [() => rmSync(join(dataDir, RESTORE_TARGET_FILE)), /nu există/],
    ];
    for (const [change, re] of changes) {
      for (const mode of ['--check', '--confirm']) {
        goodTarget();
        const r = await inProcess(RESTORE_TARGET_RESTORE_COMMAND, [mode], change);
        assert.equal(r.code, 1, r.all);
        assert.match(r.all, re);
        assert.match(r.all, /REFUZ, nimic scris/);
        assert.ok(!r.all.includes('alta-parola'), 'fără parolă în ieșire');
        assert.ok(existsSync(join(backupDir, restoreCopyName)), 'copia rămâne');
        assert.equal(await targetState(), t0, 'ținta neschimbată');
      }
    }
    goodTarget();
    assert.ok(!existsSync(join(root, 'v3-altul')));
    assert.equal(await activeState(), a0);
  });

  it('--confirm: ținta primește datele copiei; copia decriptată ștearsă; baza activă neschimbată', async () => {
    const a0 = await activeState();
    const r = run('restore-target:restore', ['--confirm']);
    assert.equal(r.code, 0, r.all);
    const ca = await counts(h);
    const ct = await counts(t);
    for (const table of ['reports', 'report_photos', 'citizen_accounts', 'report_counter']) assert.equal(ct[table], ca[table], table);
    assert.deepEqual(
      (await q(t, 'SELECT reference_number FROM reports ORDER BY reference_number')).map((x) => x.reference_number),
      ['TM-001', 'TM-002'],
    );
    assert.equal(listing(join(targetStorage)).length, 2);
    assert.ok(!existsSync(join(backupDir, restoreCopyName)), 'copia decriptată a fost ștearsă');
    assert.match(r.out, /a fost ștearsă/);
    assert.equal(await activeState(), a0);
  });

  it('V3-5: a doua rulare --confirm este refuzată (copia lipsește), iar ținta rămâne neschimbată', async () => {
    const a0 = await activeState();
    const t0 = await targetState();
    const r = run('restore-target:restore', ['--confirm']);
    assert.equal(r.code, 1, r.all);
    assert.match(r.err, /nu există nicio copie decriptată/);
    assert.equal(await targetState(), t0);
    assert.equal(await activeState(), a0);
  });

  it('migrate pe o țintă cu date: refuzat, nimic scris', async () => {
    const t0 = await targetState();
    const r = run('restore-target:migrate');
    assert.equal(r.code, 1, r.all);
    assert.match(r.err, /are deja date/);
    assert.equal(await targetState(), t0);
  });

  it('refuzuri fără scriere: baza activă ca țintă, același utilizator, directorul activ, drepturi, variabile în plus', async () => {
    const a0 = await activeState();
    const active = new URL(testDatabaseUrl());
    const cases: Array<[string[], number, RegExp]> = [
      [[`DATABASE_URL=${testDatabaseUrl()}`, `STORAGE_DIR=${join(root, 'v3-alt')}`], 0o600, /același nume ca baza activă/],
      [[`DATABASE_URL=mysql://${active.username}:x@${active.host}/alt_test_v3`, `STORAGE_DIR=${join(root, 'v3-alt')}`], 0o600, /același utilizator/],
      [[`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${storageDir}`], 0o600, /STORAGE_DIR activ/],
      [[`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${join(backupDir, 'v3')}`], 0o600, /BACKUP_DIR/],
      [[`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${join(dataDir, 'v3')}`], 0o600, /fișierului de setări activ/],
      [[`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${targetStorage}`], 0o644, /drepturi 644/],
      [[`DATABASE_URL=${TARGET_URL}`, `STORAGE_DIR=${targetStorage}`, `BACKUP_DIR=${backupDir}`], 0o600, /se acceptă numai/],
    ];
    for (const [lines, mode, re] of cases) {
      writeTarget(lines, mode);
      for (const cmd of [['restore-target:status'], ['restore-target:migrate'], ['restore-target:restore', '--confirm']]) {
        const r = run(cmd[0]!, cmd.slice(1));
        assert.equal(r.code, 1, `${cmd.join(' ')}: ${r.all}`);
        assert.match(r.err, re, cmd.join(' '));
        assert.match(r.err, /REFUZ/);
      }
    }
    goodTarget();
    assert.equal(await activeState(), a0);
    assert.ok(!existsSync(join(root, 'v3-alt')), 'niciun director creat');
    assert.ok(statSync(storageDir).isDirectory());
  });

  it('argumente necunoscute sau lipsă: refuz (Run JS script nu trimite argumente)', () => {
    assert.equal(run('restore-target:restore').code, 2);
    assert.equal(run('restore-target:restore', ['--check', '--confirm']).code, 2);
    assert.equal(run('restore-target:status', ['--x']).code, 2);
  });
});

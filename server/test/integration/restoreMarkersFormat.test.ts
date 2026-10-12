// Faza 6, lacunele G1 și G3 (decizia proprietarului din 11.10.2026).
//
// G1: `restore:db --allow-missing-markers` cere obligatoriu `--at-least N` (cel mai mare număr TM comunicat)
//     și reface marcajele lipsă înainte de COMMIT, în ordinea inițializării (întâi marcajul contorului,
//     apoi `deletions/`). Aplicația nu le mai poate inițializa „în tăcere” din contorul copiei.
// G3: copiile noi au formatul `civic-backup/2`; copiile `civic-backup/1` (dinaintea marcajelor) sunt
//     refuzate la restaurare, fără ocolire. Refuzul copiilor `/2` de către versiunea veche (`08f4dc3`)
//     este verificat separat, pe o copie a codului vechi (raportul de predare).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { BACKUP_FORMAT, LEGACY_BACKUP_FORMAT, RestoreRefusedError, createBackup, inspectRestore, restoreBackup, type RestoreOptions } from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { allocateReportNumber, initBackupMarkers } from '../../src/db/reportCounter.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';
import { V1, WEBP, reportFlow, rowCounts, snapshotDir, watermarkOnDisk, type Flow } from '../helpers/reportFlow.ts';

const WATERMARK = 'report-counter-watermark.json';
let h: DbHandle;
let app: FastifyInstance;
let root: string;
let storage: string;
let backupDir: string;
let flow: Flow;
let source: string;
let deletedRep: Awaited<ReturnType<Flow['submitOk']>>; // în copie, ștearsă DUPĂ copie
let keptRep: Awaited<ReturnType<Flow['submitOk']>>;
let backupCounter: number;
let afterCopy: number[]; // numerele emise (comunicate) DUPĂ copie
let lastNumber: number;
let seq = 0;
const clock = new Clock();

const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
const target = () => join(root, `restaurat-${++seq}`);
const baseOpts = (): RestoreOptions => ({
  databaseUrl: testDatabaseUrl(),
  backupDir,
  storageDir: storage,
  migrationsDir: MIGRATIONS_DIR,
  retentionDays: 45,
  adminRetentionMonths: 6,
  now: clock.now(),
  source,
});
const restoreOpts = (over: Partial<RestoreOptions> = {}): RestoreOptions => ({ ...baseOpts(), storageDir: target(), ...over });

/** O copie a întregului BACKUP_DIR (copia + marcajele ei), modificată pentru un singur caz. */
function variant(mutate: (dir: string, src: string) => void): { backupDir: string; source: string } {
  const dir = join(root, `varianta-${++seq}`);
  cpSync(backupDir, dir, { recursive: true });
  const src = join(dir, basename(source));
  mutate(dir, src);
  return { backupDir: dir, source: src };
}
const noWatermark = (dir: string) => rmSync(join(dir, WATERMARK));
const noDeletions = (dir: string) => rmSync(join(dir, 'deletions'), { recursive: true });

async function emptyTarget(): Promise<void> {
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  assert.equal(sum(await rowCounts(h.pool)), 0);
}

async function assertRefusedWithoutWrites(opts: RestoreOptions, reason: RegExp): Promise<void> {
  const dirBefore = snapshotDir(opts.backupDir);
  await assert.rejects(restoreBackup(opts), (err: unknown) => {
    assert.ok(err instanceof RestoreRefusedError, String(err));
    assert.match(err.message, /nu s-a scris nimic/);
    assert.match(err.message, reason);
    return true;
  });
  assert.equal(sum(await rowCounts(h.pool)), 0, 'baza țintă a rămas goală');
  assert.deepEqual(snapshotDir(opts.backupDir), dirBefore, 'BACKUP_DIR neschimbat (niciun marcaj creat)');
  assert.equal(existsSync(opts.storageDir), false, 'directorul de fișiere țintă nu a fost creat');
}

/** Următorul număr pe care l-ar emite aplicația cu marcajele din `dir` (rezervarea este anulată). */
async function nextNumber(dir: string): Promise<number> {
  const conn = await h.pool.getConnection();
  try {
    await conn.beginTransaction();
    return await allocateReportNumber(conn, dir);
  } finally {
    await conn.rollback();
    conn.release();
  }
}

const runCli = (args: string[], env: Record<string, string>) =>
  spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), ...args], {
    env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), ...env }), PATH: process.env.PATH ?? '' },
    encoding: 'utf8',
    timeout: 60_000,
  });

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-g1g3-'));
  storage = join(root, 'storage');
  backupDir = join(root, 'backups');
  mkdirSync(storage, { recursive: true });
  await initBackupMarkers(h.pool, backupDir);
  ({ app } = await makeApp(h, clock, { STORAGE_DIR: storage, BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);
  const a = await flow.citizen('g1-a@exemplu.test');
  const b = await flow.citizen('g1-b@exemplu.test');
  deletedRep = await flow.submitOk(a, [WEBP]);
  keptRep = await flow.submitOk(b, [WEBP]);
  source = (await createBackup(baseOpts())).dir;
  backupCounter = await flow.counter();
  assert.equal((await a.send('DELETE', `${V1}/citizen/reports/${deletedRep.ref}`)).statusCode, 204);
  afterCopy = [(await flow.submitOk(b)).number, (await flow.submitOk(b)).number];
  lastNumber = afterCopy[afterCopy.length - 1]!;
  assert.ok(lastNumber > backupCounter);
});

after(async () => {
  await app?.close();
  await h?.close();
  rmSync(root, { recursive: true, force: true });
});

describe('G1: --allow-missing-markers cere --at-least N și reface marcajele', () => {
  it('lipsește numai marcajul contorului: fără N → refuz fără scriere; cu N → contorul și marcajul = N, ștergerile aplicate, pornirea nu refuză', async () => {
    await emptyTarget();
    const v = variant((dir) => noWatermark(dir));
    await assertRefusedWithoutWrites(restoreOpts({ ...v, allowMissingMarkers: true }), /cere --at-least <N>/);
    const res = await restoreBackup(restoreOpts({ ...v, allowMissingMarkers: true, atLeast: lastNumber }));
    assert.equal(res.reportCounter, lastNumber);
    assert.deepEqual(res.markersWritten, [`${WATERMARK} = ${lastNumber}`]);
    assert.equal(watermarkOnDisk(v.backupDir), lastNumber);
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [deletedRep.id])).length, 0, 'ștergerea din marcaje este aplicată');
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [keptRep.id])).length, 1);
    // pornirea (aceeași funcție ca main.ts) nu refuză și nu inițializează nimic din contorul copiei
    assert.deepEqual(await initBackupMarkers(h.pool, v.backupDir), { counter: lastNumber, watermark: lastNumber, counterRaisedFrom: null });
    const next = await nextNumber(v.backupDir);
    assert.equal(next, lastNumber + 1);
    assert.ok(!afterCopy.includes(next), 'niciun număr comunicat după copie nu este emis din nou');
  });

  it('lipsește numai `deletions/`: cu N sub marcaj → contorul = marcajul (nu coboară); `deletions/` refăcut; consecința (sesizarea ștearsă revine) este anunțată', async () => {
    await emptyTarget();
    const v = variant((dir) => noDeletions(dir));
    const opts = restoreOpts({ ...v, allowMissingMarkers: true, atLeast: backupCounter });
    const i = await inspectRestore(opts);
    assert.deepEqual(i.problems, []);
    assert.match(i.warnings.join('\n'), /ștergerile făcute după copie NU mai pot fi garantate/);
    const res = await restoreBackup(opts);
    assert.equal(res.reportCounter, lastNumber, 'marcajul existent (mai mare decât N) este păstrat');
    assert.deepEqual(res.markersWritten, ['deletions/ (gol)']);
    assert.equal(existsSync(join(v.backupDir, 'deletions')), true);
    assert.equal(watermarkOnDisk(v.backupDir), lastNumber);
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [deletedRep.id])).length, 1, 'consecința anunțată');
    await initBackupMarkers(h.pool, v.backupDir);
    assert.equal(await nextNumber(v.backupDir), lastNumber + 1);
  });

  it('lipsesc amândouă: cu N → marcajul contorului, apoi `deletions/`; pornirea nu inițializează „în tăcere” din copie; niciun număr refolosit', async () => {
    await emptyTarget();
    const v = variant((dir) => {
      noWatermark(dir);
      noDeletions(dir);
    });
    const res = await restoreBackup(restoreOpts({ ...v, allowMissingMarkers: true, atLeast: lastNumber }));
    assert.deepEqual(res.markersWritten, [`${WATERMARK} = ${lastNumber}`, 'deletions/ (gol)']);
    assert.deepEqual(readdirSync(v.backupDir).filter((n) => !n.startsWith('civic-backup-')).sort(), ['deletions', WATERMARK]);
    assert.equal(await flow.counter(), lastNumber);
    assert.deepEqual(await initBackupMarkers(h.pool, v.backupDir), { counter: lastNumber, watermark: lastNumber, counterRaisedFrom: null });
    const next = await nextNumber(v.backupDir);
    assert.ok(next > lastNumber && !afterCopy.includes(next) && next > backupCounter + 1, `numărul ${next} nu a mai fost emis`);
  });

  it('valori N invalide sau combinații greșite → refuz, fără nicio scriere (bază, BACKUP_DIR, fișiere)', async () => {
    await emptyTarget();
    const v = variant((dir) => {
      noWatermark(dir);
      noDeletions(dir);
    });
    for (const bad of [Number.NaN, -1, 1.5, Number.MAX_SAFE_INTEGER + 2]) {
      await assertRefusedWithoutWrites(restoreOpts({ ...v, allowMissingMarkers: true, atLeast: bad }), /--at-least trebuie să fie un număr întreg pozitiv/);
    }
    await assertRefusedWithoutWrites(restoreOpts({ ...v, allowMissingMarkers: true, atLeast: backupCounter - 1 }), /este sub contorul din copie/);
    await assertRefusedWithoutWrites(restoreOpts({ ...v, atLeast: lastNumber }), /numai împreună cu --allow-missing-markers/);
    // marcajele sunt prezente: opțiunea nu este necesară și este refuzată
    const full = variant(() => {});
    await assertRefusedWithoutWrites(restoreOpts({ ...full, allowMissingMarkers: true, atLeast: lastNumber }), /Marcajele sunt prezente/);
  });

  it('comanda reală: fără N sau cu N nenumeric → cod 1, nimic scris; `--check` cu N valid → PERMISĂ, nimic scris; `--confirm` → marcaje refăcute', async () => {
    await emptyTarget();
    const v = variant((dir) => {
      noWatermark(dir);
      noDeletions(dir);
    });
    const before_ = snapshotDir(v.backupDir);
    const env = (s: string) => ({ BACKUP_DIR: v.backupDir, STORAGE_DIR: s });
    let s = target();
    const noN = runCli(['restore:db', v.source, '--confirm', '--allow-missing-markers'], env(s));
    assert.equal(noN.status, 1, noN.stderr);
    assert.match(noN.stderr, /cere --at-least <N>/);
    for (const raw of ['abc', '-3', '--confirm']) {
      const r = runCli(['restore:db', v.source, '--allow-missing-markers', '--at-least', raw, '--confirm'], env(s));
      assert.equal(r.status, 1, `${raw}: ${r.stderr}`);
      assert.match(r.stderr, /--at-least trebuie să fie un număr întreg pozitiv/);
    }
    const check = runCli(['restore:db', v.source, '--check', '--allow-missing-markers', '--at-least', String(lastNumber)], env(s));
    assert.equal(check.status, 0, check.stderr + check.stdout);
    assert.match(check.stdout, /Rezultat: restaurarea ar fi PERMISĂ\./);
    assert.deepEqual(snapshotDir(v.backupDir), before_, 'nimic scris de comenzile refuzate și de --check');
    assert.equal(sum(await rowCounts(h.pool)), 0);
    assert.equal(existsSync(s), false);
    s = target();
    const ok = runCli(['restore:db', v.source, '--confirm', '--allow-missing-markers', '--at-least', String(lastNumber)], env(s));
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, new RegExp(`contorul TM restaurat: ${lastNumber}`));
    assert.match(ok.stdout, /marcaje refăcute în BACKUP_DIR: report-counter-watermark\.json = \d+; deletions\/ \(gol\)/);
    assert.equal(watermarkOnDisk(v.backupDir), lastNumber);
  });
});

describe('decizia B (12.10.2026): pornirea cu marcajele absente', () => {
  it('bază fără sesizări, dar cu contorul peste 0 → refuz; contorul 0 și nicio sesizare → inițializare automată', async () => {
    await emptyTarget();
    const dir = join(root, `pornire-b-${++seq}`);
    await h.pool.query('INSERT INTO report_counter (id, `last_value`) VALUES (1, 5)');
    await assert.rejects(initBackupMarkers(h.pool, dir), /baza are deja numere TM emise \(contorul 5\)/);
    assert.equal(watermarkOnDisk(dir), null);
    await h.pool.query('UPDATE report_counter SET `last_value` = 0 WHERE id = 1');
    assert.deepEqual(await initBackupMarkers(h.pool, dir), { counter: 0, watermark: 0, counterRaisedFrom: null });
    assert.equal(existsSync(join(dir, 'deletions')), true);
  });
});

describe('G3: formatul copiilor', () => {
  it('copiile noi au formatul „civic-backup/2”', () => {
    const m = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
    assert.equal(m.format, 'civic-backup/2');
    assert.equal(BACKUP_FORMAT, 'civic-backup/2');
    assert.equal(LEGACY_BACKUP_FORMAT, 'civic-backup/1');
  });

  it('o copie „civic-backup/1” (dinaintea marcajelor) → refuz explicit, fără ocolire (nici cu --allow-missing-markers --at-least)', async () => {
    await emptyTarget();
    const v = variant((_dir, src) => {
      const file = join(src, 'manifest.json');
      writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), format: 'civic-backup/1' }));
    });
    await assertRefusedWithoutWrites(restoreOpts(v), /formatul vechi „civic-backup\/1”[\s\S]*procedurii de migrare/);
    const both = variant((dir, src) => {
      noWatermark(dir);
      noDeletions(dir);
      const file = join(src, 'manifest.json');
      writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), format: 'civic-backup/1' }));
    });
    await assertRefusedWithoutWrites(restoreOpts({ ...both, allowMissingMarkers: true, atLeast: lastNumber }), /formatul vechi „civic-backup\/1”/);
  });

  it('un format necunoscut → refuz', async () => {
    await emptyTarget();
    const v = variant((_dir, src) => {
      const file = join(src, 'manifest.json');
      writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, 'utf8')), format: 'civic-backup/3' }));
    });
    await assertRefusedWithoutWrites(restoreOpts(v), /Format de backup necunoscut: civic-backup\/3/);
  });
});

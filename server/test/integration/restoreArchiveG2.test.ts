// Faza 6, lacuna G2 (decizia proprietarului din 11.10.2026: „soluția minimă”).
//
// Fiecare copie „civic-backup/2” poartă fotografia marcajelor din momentul copiei (`markers.json`).
// La restaurare, marcajele efective sunt cele mai noi cunoscute: cel mai mare marcaj al contorului și
// reuniunea ștergerilor neexpirate, din BACKUP_DIR și din toate copiile `/2` aflate acolo. Dacă o copie
// cunoaște numere sau ștergeri lipsă din marcajele curente, restaurarea cere --at-least N și aduce
// marcajele curente la zi înainte de COMMIT.
//
// Scenariul din raport: copie la contorul 10 → TM-011…TM-015 emise → o sesizare din copie este ștearsă →
// arhiva (copia + marcajele ei vechi) este restaurată.

import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { RestoreRefusedError, createBackup, inspectRestore, restoreBackup, type RestoreOptions } from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { deletionListIds, recordReportCounter, recordReportDeletions } from '../../src/db/markers.ts';
import { migrate } from '../../src/db/migrations.ts';
import { allocateReportNumber, initBackupMarkers } from '../../src/db/reportCounter.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { V1, WEBP, reportFlow, rowCounts, snapshotDir, watermarkOnDisk, type Flow } from '../helpers/reportFlow.ts';

const DAY = 86_400_000;
const WATERMARK = 'report-counter-watermark.json';
let h: DbHandle;
let app: FastifyInstance;
let root: string;
let storage: string;
let backupDir: string;
let archivedMarkers: string; // marcajele de la momentul copiei B1, arhivate împreună cu ea
let flow: Flow;
let b1: string; // copia de la contorul 10
let b2: string; // copia de a doua zi (după TM-011…015 și ștergere)
let deletedRep: Awaited<ReturnType<Flow['submitOk']>>; // TM-010, în B1, ștearsă după B1
let lateDeleted: Awaited<ReturnType<Flow['submitOk']>>; // TM-009, în B1, cu intrarea de ștergere în fotografia lui B1
const afterCopy: number[] = []; // TM-011…TM-015, comunicate după B1
let seq = 0;
const clock = new Clock();
const t0 = () => clock.now();

const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
const baseOpts = (): RestoreOptions => ({
  databaseUrl: testDatabaseUrl(),
  backupDir,
  storageDir: storage,
  migrationsDir: MIGRATIONS_DIR,
  retentionDays: 45,
  adminRetentionMonths: 6,
  now: new Date(t0().getTime() + 2 * DAY),
  source: b1,
});
const restoreOpts = (over: Partial<RestoreOptions> = {}): RestoreOptions => ({ ...baseOpts(), storageDir: join(root, `restaurat-${++seq}`), ...over });

/**
 * BACKUP_DIR după accident: marcajele curente au fost înlocuite cu cele arhivate odată cu B1.
 * `keepB2`: copia mai nouă B2 mai este în director (rotația păstrează 7 zile) sau s-a pierdut și ea.
 */
function archiveRestored(keepB2: boolean): { backupDir: string; source: string } {
  const dir = join(root, `accident-${++seq}`);
  cpSync(backupDir, dir, { recursive: true });
  rmSync(join(dir, WATERMARK));
  rmSync(join(dir, 'deletions'), { recursive: true });
  cpSync(archivedMarkers, dir, { recursive: true });
  if (!keepB2) rmSync(join(dir, basename(b2)), { recursive: true });
  return { backupDir: dir, source: join(dir, basename(b1)) };
}

async function emptyTarget(): Promise<void> {
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  assert.equal(sum(await rowCounts(h.pool)), 0);
}

const exists = async (id: string) => (await flow.q('SELECT id FROM reports WHERE id = ?', [id])).length === 1;

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

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-g2-'));
  storage = join(root, 'storage');
  backupDir = join(root, 'backups');
  archivedMarkers = join(root, 'arhiva-marcaje');
  mkdirSync(storage, { recursive: true });
  await initBackupMarkers(h.pool, backupDir);
  ({ app } = await makeApp(h, clock, { STORAGE_DIR: storage, BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);
  // contorul ajunge la 10: TM-009 și TM-010 sunt sesizări reale, prin rută
  await h.pool.query('UPDATE report_counter SET `last_value` = 8 WHERE id = 1');
  recordReportCounter(backupDir, 8);
  const a = await flow.citizen('g2-autor@exemplu.test');
  lateDeleted = await flow.submitOk(a);
  deletedRep = await flow.submitOk(a, [WEBP]);
  assert.deepEqual([lateDeleted.number, deletedRep.number], [9, 10]);
  // TM-009: intrarea de ștergere există deja când se face B1, dar rândul este încă în bază (ca o ștergere
  // confirmată între instantaneul bazei și fotografia marcajelor): fotografia lui B1 o cunoaște
  recordReportDeletions(backupDir, [{ id: lateDeleted.id, createdAt: t0() }], t0());
  b1 = (await createBackup({ ...baseOpts(), now: t0() })).dir;
  assert.equal(await flow.counter(), 10);
  // arhiva: marcajele de la momentul lui B1
  mkdirSync(archivedMarkers);
  cpSync(join(backupDir, WATERMARK), join(archivedMarkers, WATERMARK));
  cpSync(join(backupDir, 'deletions'), join(archivedMarkers, 'deletions'), { recursive: true });
  // după B1: TM-011…TM-015 comunicate, TM-010 ștearsă de autor
  for (let i = 0; i < 5; i++) afterCopy.push((await flow.submitOk(await flow.citizen(`g2-${i}@exemplu.test`))).number);
  assert.deepEqual(afterCopy, [11, 12, 13, 14, 15]);
  assert.equal((await a.send('DELETE', `${V1}/citizen/reports/${deletedRep.ref}`)).statusCode, 204);
  b2 = (await createBackup({ ...baseOpts(), now: new Date(t0().getTime() + DAY) })).dir;
  assert.notEqual(basename(b1), basename(b2));
});

after(async () => {
  await app?.close();
  await h?.close();
  rmSync(root, { recursive: true, force: true });
});

describe('G2: arhiva restaurată cu marcajele ei vechi, iar o copie mai nouă este în BACKUP_DIR', () => {
  it('fără N → refuz explicit, fără nicio scriere; `--check` numește copia mai nouă', async () => {
    await emptyTarget();
    const v = archiveRestored(true);
    const opts = restoreOpts(v);
    const i = await inspectRestore(opts);
    assert.deepEqual(i.markers.staleAgainst, [basename(b2)]);
    assert.equal(i.markers.watermark, 10, 'marcajul arhivat');
    assert.equal(i.markers.snapshotWatermark, 15, 'copia B2 cunoaște TM-015');
    const before_ = snapshotDir(v.backupDir);
    await assert.rejects(restoreBackup(opts), (err: unknown) => {
      assert.ok(err instanceof RestoreRefusedError, String(err));
      assert.match(err.message, /nu s-a scris nimic/);
      assert.match(err.message, /Marcajele din BACKUP_DIR sunt mai vechi decât copia civic-backup-/);
      assert.match(err.message, /--at-least/);
      return true;
    });
    assert.equal(sum(await rowCounts(h.pool)), 0);
    assert.deepEqual(snapshotDir(v.backupDir), before_);
  });

  it('cu N = 15: sesizarea ștearsă nu reapare; contorul = 15; următorul număr 16; marcajele curente aduse la zi', async () => {
    await emptyTarget();
    const v = archiveRestored(true);
    const res = await restoreBackup(restoreOpts({ ...v, atLeast: 15 }));
    assert.equal(await exists(deletedRep.id), false, 'TM-010, ștearsă după copie, nu reapare (știută din fotografia lui B2)');
    assert.equal(await exists(lateDeleted.id), false, 'TM-009 nu reapare');
    assert.equal(res.reportCounter, 15);
    assert.deepEqual(res.markersWritten, [`${WATERMARK} = 15`, '1 intrări de ștergere din fotografiile copiilor']);
    assert.equal(watermarkOnDisk(v.backupDir), 15);
    assert.ok(deletionListIds(v.backupDir).includes(deletedRep.id), 'intrarea TM-010 este acum și în marcajele curente');
    await initBackupMarkers(h.pool, v.backupDir); // pornirea: nu refuză
    const next = await nextNumber(v.backupDir);
    assert.equal(next, 16);
    assert.ok(!afterCopy.includes(next), 'niciun număr comunicat după copie nu este emis din nou');
  });

  it('cu N mai mic decât știe o copie (N = 12): contorul tot 15 — fotografia lui B2 acoperă numerele', async () => {
    await emptyTarget();
    const v = archiveRestored(true);
    const res = await restoreBackup(restoreOpts({ ...v, atLeast: 12 }));
    assert.equal(res.reportCounter, 15);
    assert.equal(await exists(deletedRep.id), false);
    assert.equal(await nextNumber(v.backupDir), 16);
  });
});

describe('G2: fotografia copiei sursă și fotografii nefolosibile', () => {
  it('marcajele curente fără intrarea pe care o are fotografia copiei sursă → cerere de N; cu N, sesizarea nu reapare', async () => {
    await emptyTarget();
    // fără B2: singura sursă a intrării TM-009 este fotografia lui B1 însuși
    const v = archiveRestored(false);
    rmSync(join(v.backupDir, 'deletions', `${lateDeleted.id}.json`));
    const i = await inspectRestore(restoreOpts(v));
    assert.deepEqual(i.markers.staleAgainst, [basename(b1)]);
    const res = await restoreBackup(restoreOpts({ ...v, atLeast: 10 }));
    assert.equal(await exists(lateDeleted.id), false, 'TM-009 nu reapare');
    assert.ok(res.markersWritten.includes('1 intrări de ștergere din fotografiile copiilor'));
  });

  it('fotografia unei copii /2 coruptă sau cu suma greșită → refuz (sursa și o copie vecină)', async () => {
    await emptyTarget();
    const bad = (target: string, mutate: (file: string) => void) => {
      const dir = join(root, `fotografie-${++seq}`);
      cpSync(backupDir, dir, { recursive: true });
      mutate(join(dir, basename(target), 'markers.json'));
      return { backupDir: dir, source: join(dir, basename(b1)) };
    };
    for (const [target, mutate, re] of [
      [b1, (f: string) => writeFileSync(f, '{'), /copia „civic-backup-[^”]+” nu poate fi folosită[\s\S]*Copia sursă nu poate fi restaurată/],
      [b2, (f: string) => writeFileSync(f, readFileSync(f, 'utf8').replace('"watermark":15', '"watermark":14')), /suma SHA-256 nu corespunde/],
      [b2, (f: string) => rmSync(f), /Mutați copia în afara BACKUP_DIR/],
    ] as const) {
      const v = bad(target, mutate);
      const before_ = snapshotDir(v.backupDir);
      await assert.rejects(restoreBackup(restoreOpts({ ...v })), (err: unknown) => {
        assert.ok(err instanceof RestoreRefusedError, String(err));
        assert.match(err.message, re);
        return true;
      });
      assert.equal(sum(await rowCounts(h.pool)), 0);
      assert.deepEqual(snapshotDir(v.backupDir), before_);
    }
  });

  it('un director fără manifest în BACKUP_DIR → numai avertisment (nu se știe dacă este o copie)', async () => {
    await emptyTarget();
    const dir = join(root, `cu-gunoi-${++seq}`);
    cpSync(backupDir, dir, { recursive: true });
    mkdirSync(join(dir, 'civic-backup-20260101T000000000Z'));
    const i = await inspectRestore(restoreOpts({ backupDir: dir, source: join(dir, basename(b2)) }));
    assert.deepEqual(i.problems, []);
    assert.match(i.warnings.join('\n'), /nu are un manifest lizibil și a fost ignorat/);
  });

  it('o intrare din fotografie deja expirată (depunere + 46 de zile) nu face marcajele „mai vechi”', async () => {
    await emptyTarget();
    const dir = join(root, `expirare-${++seq}`);
    await initBackupMarkers(h.pool, dir);
    const oldId = '01EXPIRAT0000000000000000A';
    recordReportDeletions(dir, [{ id: oldId, createdAt: new Date(t0().getTime() - 47 * DAY) }], new Date(t0().getTime() - 40 * DAY));
    const copy = (await createBackup({ ...baseOpts(), backupDir: dir, now: t0() })).dir; // curățarea de după copie elimină intrarea
    assert.ok(!deletionListIds(dir).includes(oldId), 'intrarea a fost curățată din marcajele curente');
    assert.ok(readFileSync(join(copy, 'markers.json'), 'utf8').includes(oldId), 'dar este în fotografia copiei');
    const i = await inspectRestore(restoreOpts({ backupDir: dir, source: copy, now: t0() }));
    assert.deepEqual(i.markers.staleAgainst, []);
    assert.deepEqual(i.problems, []);
  });
});

describe('G2: limita rămasă (documentată), numai arhiva în BACKUP_DIR', () => {
  it('fără nicio copie mai nouă, marcajele vechi nu pot fi recunoscute: TM-010 reapare și TM-011 ar fi emis din nou — se evită numai prin procedură', async () => {
    await emptyTarget();
    const v = archiveRestored(false);
    const i = await inspectRestore(restoreOpts(v));
    assert.deepEqual(i.problems, [], 'nimic de detectat');
    assert.deepEqual(i.markers.staleAgainst, []);
    await restoreBackup(restoreOpts(v));
    assert.equal(await exists(deletedRep.id), true, 'LIMITĂ: ștergerea de după arhivă nu este cunoscută nicăieri');
    assert.equal(await exists(lateDeleted.id), false, 'ce cunoaște arhiva se aplică');
    assert.equal(await nextNumber(v.backupDir), 11, 'LIMITĂ: TM-011 ar fi emis din nou');
    assert.ok(existsSync(v.source));
  });
});

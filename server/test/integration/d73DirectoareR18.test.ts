// Etapa 7, 7A — auditul static D7-3 (16.10.2026): directoarele R18 nu se mai recreează în tăcere.
//
// Trei stări, deosebite fiabil:
//  1. instalare nouă / BACKUP_DIR de dinaintea R18 (niciun martor, nicio copie „civic-markers/2”) → creare automată;
//  2. directoare R18 inițializate (martorul `account-markers-initialized.json`, copii `/2`) → funcționare normală;
//  3. directoare pierdute după inițializare → pornirea și backup-ul refuză (fără nicio scriere); restaurarea refuză,
//     cu refacere numai la cerere explicită (`--allow-missing-markers --at-least N`); comanda de refacere explicită
//     aduce intrările cunoscute din fotografiile copiilor.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { RestoreRefusedError, createBackup, inspectRestore, recreateAccountMarkers, restoreBackup, type RestoreOptions } from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import {
  ACCOUNT_DELETIONS_DIR,
  ACCOUNT_DELETIONS_PENDING_DIR,
  ACCOUNT_MARKERS_WITNESS,
  RECREATE_ACCOUNT_MARKERS_COMMAND,
  promoteAccountDeletionIntent,
  readReportCounterWatermark,
  recordReportCounter,
  readAccountDeletionMarkers,
  recordAccountDeletionIntent,
} from '../../src/db/markers.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers } from '../../src/db/reportCounter.ts';
import { readFileSync } from 'node:fs';
import { seedConfig } from '../../src/db/seeds.ts';
import { newId } from '../../src/ids.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';
import { rowCounts, snapshotDir } from '../helpers/reportFlow.ts';

const DAY = 86_400_000;
const T0 = new Date('2026-10-01T09:00:00.000Z');
let h: DbHandle;
let root: string;
let seq = 0;
const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
const dir = () => join(root, `bd-${++seq}`);
const hasAccountDirs = (d: string) => existsSync(join(d, ACCOUNT_DELETIONS_DIR)) && existsSync(join(d, ACCOUNT_DELETIONS_PENDING_DIR));
const opts = (backupDir: string, over: Partial<RestoreOptions> = {}): RestoreOptions => ({
  databaseUrl: testDatabaseUrl(),
  backupDir,
  storageDir: join(root, `restaurat-${++seq}`),
  migrationsDir: MIGRATIONS_DIR,
  retentionDays: 45,
  adminRetentionMonths: 6,
  now: new Date(T0.getTime() + DAY),
  source: '',
  ...over,
});
/** Procesul real al aplicației (fără argumente: pornirea; cu argumente: o comandă CLI). */
const run = (args: string[], backupDir: string) =>
  spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), ...args], {
    env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), BACKUP_DIR: backupDir, STORAGE_DIR: join(root, 'storage'), PORT: '39871' }), PATH: process.env.PATH ?? '' },
    encoding: 'utf8',
    timeout: 60_000,
  });

/** Un BACKUP_DIR R18 inițializat, cu o copie `/2` care cunoaște ștergerea contului `deletedId`. */
async function initialized(): Promise<{ d: string; copy: string; deletedId: string }> {
  const d = dir();
  await initBackupMarkers(h.pool, d);
  const deletedId = newId(T0);
  recordAccountDeletionIntent(d, deletedId, T0);
  promoteAccountDeletionIntent(d, deletedId);
  const copy = (await createBackup({ ...opts(d), now: T0 })).dir;
  return { d, copy, deletedId };
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-d73d-'));
  mkdirSync(join(root, 'storage'));
});

after(async () => {
  await h?.close();
  rmSync(root, { recursive: true, force: true });
});

describe('starea 1: instalare nouă și BACKUP_DIR de dinaintea R18 — creare automată', () => {
  it('D1: instalare nouă → directoarele și martorul (scris după ele); a doua inițializare nu schimbă nimic', async () => {
    const d = dir();
    await initBackupMarkers(h.pool, d);
    assert.ok(hasAccountDirs(d));
    assert.ok(existsSync(join(d, ACCOUNT_MARKERS_WITNESS)));
    const snap = snapshotDir(d);
    await initBackupMarkers(h.pool, d);
    assert.deepEqual(snapshotDir(d), snap, 'idempotentă');
  });

  it('D2: BACKUP_DIR de dinaintea R18 (fără directoare de conturi, fără martor, fără copii /2) → pornirea reală și backup-ul le creează', async () => {
    const d = dir();
    await initBackupMarkers(h.pool, d);
    rmSync(join(d, ACCOUNT_DELETIONS_DIR), { recursive: true });
    rmSync(join(d, ACCOUNT_DELETIONS_PENDING_DIR), { recursive: true });
    rmSync(join(d, ACCOUNT_MARKERS_WITNESS));
    const b = run(['backup:db'], d); // comanda reală: aceeași inițializare ca pornirea (`initBackupMarkers`)
    assert.equal(b.status, 0, b.stderr);
    assert.ok(hasAccountDirs(d) && existsSync(join(d, ACCOUNT_MARKERS_WITNESS)));
  });
});

describe('starea 2: directoare R18 existente — comportamentul neschimbat', () => {
  it('D4: inițializarea și backup-ul păstrează intrările existente; restaurarea le aplică', async () => {
    const { d, copy, deletedId } = await initialized();
    await initBackupMarkers(h.pool, d);
    assert.deepEqual(readAccountDeletionMarkers(d).entries.map((e) => e.accountId), [deletedId]);
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    const i = await inspectRestore(opts(d, { source: copy }));
    assert.deepEqual(i.problems, []);
    assert.equal(i.markers.accountMarkersLost, false);
    await restoreBackup(opts(d, { source: copy }));
  });
});

describe('starea 3: directoare R18 pierdute după inițializare — pierderea nu este ascunsă', () => {
  const variants: Array<[string, (d: string) => void]> = [
    ['`account-deletions/` pierdut', (d) => rmSync(join(d, ACCOUNT_DELETIONS_DIR), { recursive: true })],
    ['`account-deletions-pending/` pierdut', (d) => rmSync(join(d, ACCOUNT_DELETIONS_PENDING_DIR), { recursive: true })],
    ['ambele directoare și martorul pierdute (dovada: copia /2)', (d) => {
      rmSync(join(d, ACCOUNT_DELETIONS_DIR), { recursive: true });
      rmSync(join(d, ACCOUNT_DELETIONS_PENDING_DIR), { recursive: true });
      rmSync(join(d, ACCOUNT_MARKERS_WITNESS));
    }],
  ];
  for (const [label, lose] of variants) {
    it(`D3: ${label} → inițializarea (pornire) și backup-ul refuză, fără nicio scriere în BACKUP_DIR`, async () => {
      await resetTestDb(h.pool);
      await migrate(h.pool, MIGRATIONS_DIR);
      await seedConfig(h.pool, SEEDS_DIR);
      const { d } = await initialized();
      lose(d);
      const snap = snapshotDir(d);
      await assert.rejects(initBackupMarkers(h.pool, d), /Marcajele de ștergere a conturilor lipsesc/);
      await assert.rejects(createBackup({ ...opts(d), now: new Date(T0.getTime() + 60_000) }), /Marcajele de ștergere a conturilor lipsesc/);
      assert.deepEqual(snapshotDir(d), snap, 'nimic recreat, nicio copie nouă, nicio rotație');
    });
  }

  const counterCases: Array<[string, number, number]> = [
    ['contorul din bază MAI MARE decât marcajul', 7, 3],
    ['marcajul MAI MARE decât contorul din bază', 3, 9],
  ];
  for (const [label, dbCounter, watermark] of counterCases) {
    it(`D6: directoare pierdute, ${label} → refuz ÎNAINTEA sincronizării: contorul, marcajul și directoarele neschimbate`, async () => {
      await resetTestDb(h.pool);
      await migrate(h.pool, MIGRATIONS_DIR);
      await seedConfig(h.pool, SEEDS_DIR);
      const { d } = await initialized();
      await h.pool.query('UPDATE report_counter SET `last_value` = ? WHERE id = 1', [dbCounter]);
      rmSync(join(d, 'report-counter-watermark.json'));
      recordReportCounter(d, watermark); // marcajul ales de test (poate fi și sub contor)
      rmSync(join(d, ACCOUNT_DELETIONS_DIR), { recursive: true });
      const fileBefore = readFileSync(join(d, 'report-counter-watermark.json'), 'utf8');
      const snap = snapshotDir(d); // include conținutul și data modificării fișierului marcajului
      await assert.rejects(initBackupMarkers(h.pool, d), /Marcajele de ștergere a conturilor lipsesc/);
      const [[row]] = (await h.pool.query('SELECT `last_value` AS v FROM report_counter WHERE id = 1')) as unknown as [[{ v: number }]];
      assert.equal(Number(row.v), dbCounter, 'contorul din bază neschimbat');
      assert.equal(readReportCounterWatermark(d), watermark, 'marcajul neschimbat');
      assert.equal(readFileSync(join(d, 'report-counter-watermark.json'), 'utf8'), fileBefore);
      assert.deepEqual(snapshotDir(d), snap, 'BACKUP_DIR neschimbat (fișierul marcajului, data lui, directoarele)');
      assert.ok(!existsSync(join(d, ACCOUNT_DELETIONS_DIR)), 'directorul pierdut nu a fost recreat');
    });
  }

  it('D3b: pornirea reală a aplicației (proces) refuză, cu mesaj explicit și comanda de refacere', async () => {
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    await seedConfig(h.pool, SEEDS_DIR);
    const { d } = await initialized();
    rmSync(join(d, ACCOUNT_DELETIONS_DIR), { recursive: true });
    const r = run([], d);
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /Aplicația nu pornește: marcajele din BACKUP_DIR nu pot fi folosite/);
    assert.match(r.stderr, new RegExp(RECREATE_ACCOUNT_MARKERS_COMMAND));
    assert.ok(!existsSync(join(d, ACCOUNT_DELETIONS_DIR)), 'nu a fost recreat');
  });

  it('D3c: restaurarea refuză înainte de orice scriere; cu --allow-missing-markers --at-least N reface directoarele și intrările din copii', async () => {
    const { d, copy, deletedId } = await initialized();
    rmSync(join(d, ACCOUNT_DELETIONS_DIR), { recursive: true });
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    const snap = snapshotDir(d);
    const o = opts(d, { source: copy });
    const i = await inspectRestore(o);
    assert.equal(i.markers.accountMarkersLost, true);
    assert.ok(i.problems.some((p) => p.includes('marcajele de ștergere a conturilor')), i.problems.join('\n'));
    await assert.rejects(restoreBackup(o), RestoreRefusedError);
    assert.equal(sum(await rowCounts(h.pool)), 0, 'baza țintă goală');
    assert.deepEqual(snapshotDir(d), snap, 'BACKUP_DIR neschimbat');
    const res = await restoreBackup({ ...o, allowMissingMarkers: true, atLeast: i.source.reportCounter ?? 0 });
    assert.ok(res.markersWritten.some((m) => m.includes('refăcute')), res.markersWritten.join('; '));
    assert.ok(hasAccountDirs(d));
    assert.deepEqual(readAccountDeletionMarkers(d).entries.map((e) => e.accountId), [deletedId], 'intrarea din fotografia copiei');
  });

  it('D5: comanda de refacere (proces real) aduce intrările din copii; apoi backup-ul merge; refuză dacă nu lipsește nimic', async () => {
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    await seedConfig(h.pool, SEEDS_DIR);
    const { d, deletedId } = await initialized();
    rmSync(join(d, ACCOUNT_DELETIONS_DIR), { recursive: true });
    const r = run([RECREATE_ACCOUNT_MARKERS_COMMAND], d);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /1 marcaje aduse din 1 copii/);
    assert.doesNotMatch(r.stdout, /[0-9A-HJKMNP-TV-Z]{26}/, 'fără ID-uri în ieșire');
    assert.deepEqual(readAccountDeletionMarkers(d).entries.map((e) => e.accountId), [deletedId]);
    const b = run(['backup:db'], d);
    assert.equal(b.status, 0, b.stderr);
    assert.throws(() => recreateAccountMarkers(d), /nu este nimic de refăcut/);
    const again = run([RECREATE_ACCOUNT_MARKERS_COMMAND], d);
    assert.equal(again.status, 1);
    assert.ok(readdirSync(d).includes(ACCOUNT_MARKERS_WITNESS));
  });
});

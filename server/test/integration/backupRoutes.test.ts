// Marcajele de lângă backup-uri, verificate PRIN RUTELE REALE (Faza 6, R1–R4):
// depunerea scrie marcajul contorului TM, ștergerea (autor / super_admin) scrie marcajul de ștergere,
// iar o restaurare făcută după aceea nu readuce sesizarea ștearsă și nu refolosește niciun număr TM.
//
// Fișierul folosește numai rutele și funcțiile care există și la commitul de referință `d23ddd5`.
// Rulat acolo (probă de control), demonstrează defectele: marcajele nu erau scrise de nicio rută.

import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { bootstrapAdmin } from '../../src/accounts.ts';
import { createBackup, restoreBackup } from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers } from '../../src/db/reportCounter.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { V1, WEBP, deletionMarkedOnDisk, reportFlow, snapshotDir, watermarkOnDisk, type Flow } from '../helpers/reportFlow.ts';

let h: DbHandle;
let app: FastifyInstance;
let root: string;
let storage: string;
let backupDir: string;
let flow: Flow;
let superAdmin: Client;
const clock = new Clock();

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-backup-routes-'));
  storage = join(root, 'storage');
  backupDir = join(root, 'backups');
  // marcajele există de la pornirea aplicației: aceeași funcție ca la pornire (main.ts). A1: pornirea scrie
  // întâi marcajul contorului și abia apoi creează `deletions/` (un `deletions/` creat direct, fără marcaj,
  // este acum starea „marcaj pierdut”, refuzată)
  await initBackupMarkers(h.pool, backupDir);
  mkdirSync(storage, { recursive: true });
  ({ app } = await makeApp(h, clock, { STORAGE_DIR: storage, BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);
  const b = await bootstrapAdmin(h.pool, clock.now(), 'sa@exemplu.test', 'Super Admin');
  superAdmin = await flow.adminFirstLogin('sa@exemplu.test', b.temporaryPassword, 'parola-super-admin-2026');
});

after(async () => {
  await app.close();
  await h.close();
  rmSync(root, { recursive: true, force: true });
});

describe('marcajul contorului TM, prin ruta de depunere (R2)', () => {
  it('depunere reală → marcajul există și este egal cu numărul confirmat', async () => {
    const c = await flow.citizen('unu@exemplu.test');
    const r = await flow.submitOk(c);
    assert.equal(r.ref, 'TM-001');
    assert.equal(watermarkOnDisk(backupDir), 1, 'marcajul = numărul emis');
    const r2 = await flow.submitOk(c);
    assert.equal(r2.number, 2);
    assert.equal(watermarkOnDisk(backupDir), 2);
    assert.equal(await flow.counter(), 2);
  });

  it('depuneri simultane → numere distincte și consecutive; marcajul = contorul din bază = cel mai mare număr', async () => {
    const start = (await flow.counter()) + 1;
    const clients = await Promise.all(Array.from({ length: 8 }, (_, i) => flow.citizen(`sim${i}@exemplu.test`)));
    const tokens = await Promise.all(clients.map(flow.formToken));
    clock.advanceMinutes(0.2);
    const results = await Promise.all(clients.map((c, i) => flow.submit(c, { token: tokens[i], wait: false })));
    for (const r of results) assert.equal(r.statusCode, 201, r.body);
    const nums = results.map((r) => Number(r.json().referenceNumber.slice(3))).sort((a, b) => a - b);
    assert.deepEqual(nums, Array.from({ length: 8 }, (_, i) => start + i));
    assert.equal(await flow.counter(), start + 7);
    assert.equal(watermarkOnDisk(backupDir), start + 7);
  });

  it('cheie de idempotență repetată → aceeași sesizare; nici contorul, nici marcajul nu avansează', async () => {
    const c = await flow.citizen('idem@exemplu.test');
    const token = await flow.formToken(c);
    clock.advanceMinutes(0.2);
    const key = '6f1f7c0e-3d7b-4b63-9d25-1c1f0c0f6a11';
    const a = await flow.submit(c, { token, wait: false, key });
    const before_ = await flow.counter();
    const b = await flow.submit(c, { token, wait: false, key });
    assert.equal(a.statusCode, 201, a.body);
    assert.equal(b.statusCode, 201, b.body);
    assert.equal(a.json().referenceNumber, b.json().referenceNumber);
    assert.equal(await flow.counter(), before_);
    assert.equal(watermarkOnDisk(backupDir), before_);
  });
});

describe('marcajul de ștergere, prin rutele de ștergere (R1)', () => {
  it('ștergerea de către autor → 204 și marcaj cu ID-ul intern al sesizării', async () => {
    const c = await flow.citizen('autor@exemplu.test');
    const r = await flow.submitOk(c, [WEBP]);
    assert.equal(deletionMarkedOnDisk(backupDir, r.id), false);
    assert.equal((await c.send('DELETE', `${V1}/citizen/reports/${r.ref}`)).statusCode, 204);
    assert.equal(deletionMarkedOnDisk(backupDir, r.id), true, 'ștergerea autorului este notată lângă backup-uri');
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [r.id])).length, 0);
  });

  it('ștergerea de către super_admin → 204 și marcaj cu ID-ul intern al sesizării', async () => {
    const c = await flow.citizen('altul@exemplu.test');
    const r = await flow.submitOk(c);
    assert.equal((await superAdmin.send('DELETE', `${V1}/admin/reports/${r.id}`)).statusCode, 204);
    assert.equal(deletionMarkedOnDisk(backupDir, r.id), true, 'ștergerea super_admin este notată lângă backup-uri');
    // a doua cerere: 404, marcajul rămâne
    assert.equal((await superAdmin.send('DELETE', `${V1}/admin/reports/${r.id}`)).statusCode, 404);
    assert.equal(deletionMarkedOnDisk(backupDir, r.id), true);
  });

  it('ștergeri simultane (autori diferiți și super_admin) → nicio intrare pierdută', async () => {
    const clients = await Promise.all(Array.from({ length: 6 }, (_, i) => flow.citizen(`conc${i}@exemplu.test`)));
    const reports: Array<Awaited<ReturnType<Flow['submitOk']>>> = [];
    for (const c of clients) reports.push(await flow.submitOk(c));
    const results = await Promise.all([
      ...clients.slice(0, 4).map((c, i) => c.send('DELETE', `${V1}/citizen/reports/${reports[i]!.ref}`)),
      superAdmin.send('DELETE', `${V1}/admin/reports/${reports[4]!.id}`),
      // aceeași sesizare, cerută simultan de autor și de super_admin
      clients[5]!.send('DELETE', `${V1}/citizen/reports/${reports[5]!.ref}`),
      superAdmin.send('DELETE', `${V1}/admin/reports/${reports[5]!.id}`),
    ]);
    for (const r of results.slice(0, 5)) assert.equal(r.statusCode, 204, r.body);
    assert.ok(results.slice(5).some((r) => r.statusCode === 204), 'cel puțin una dintre cele două cereri pe aceeași sesizare reușește');
    for (const r of reports) {
      assert.equal(deletionMarkedOnDisk(backupDir, r.id), true, `marcaj pentru ${r.ref}`);
      assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [r.id])).length, 0);
    }
  });
});

describe('restaurare după operații făcute prin rute (R3, R4)', () => {
  it('sesizarea ștearsă nu reapare; cea păstrată revine cu fotografia, în directorul separat; numerele TM nu se refolosesc; sursele rămân neatinse', async () => {
    const a = await flow.citizen('a@exemplu.test');
    const b = await flow.citizen('b@exemplu.test');
    const repA = await flow.submitOk(a, [WEBP]);
    const repB = await flow.submitOk(b, [WEBP]);

    // backup: conține A și B
    const backup = await createBackup({
      databaseUrl: testDatabaseUrl(), backupDir, storageDir: storage, migrationsDir: MIGRATIONS_DIR,
      retentionDays: 45, adminRetentionMonths: 6, now: clock.now(),
    });
    assert.ok(backup.manifest.counts.reports! >= 2);

    // DUPĂ backup: A este ștearsă de autor, iar C primește un număr nou
    assert.equal((await a.send('DELETE', `${V1}/citizen/reports/${repA.ref}`)).statusCode, 204);
    const repC = await flow.submitOk(b);
    assert.equal(repC.number, repB.number + 1);

    // „incidentul”: baza se pierde; restaurare într-un DB nou, cu un director de fișiere nou
    const restoredStorage = join(root, 'storage-restored');
    const sourceBefore = snapshotDir(backup.dir);
    const markersBefore = snapshotDir(backupDir);
    const storageBefore = snapshotDir(storage);
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    const res = await restoreBackup({
      databaseUrl: testDatabaseUrl(), backupDir, storageDir: restoredStorage, migrationsDir: MIGRATIONS_DIR,
      retentionDays: 45, adminRetentionMonths: 6, source: backup.dir, now: clock.now(),
    });

    // R3: sesizarea ștearsă NU reapare (nici fotografia ei)
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [repA.id])).length, 0, `${repA.ref} a fost ștearsă de autor și nu are voie să reapară`);
    assert.ok(res.deletedFromList >= 1);
    assert.equal(existsSync(join(restoredStorage, repA.photoKeys[0]!)), false);
    // sesizarea păstrată există, cu fotografia recuperată în directorul separat
    const [rowB] = await flow.q<{ r: string }>('SELECT reference_number AS r FROM reports WHERE id = ?', [repB.id]);
    assert.equal(rowB?.r, repB.ref);
    assert.equal(existsSync(join(restoredStorage, repB.photoKeys[0]!)), true);
    // C a fost depusă după backup: se pierde, dar numărul ei rămâne consumat
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [repC.id])).length, 0);
    assert.equal(await flow.counter(), repC.number, 'contorul restaurat = ultimul număr emis, nu cel din backup');

    // copia sursă, marcajele și directorul de fișiere inițial: neschimbate
    assert.deepEqual(snapshotDir(backup.dir), sourceBefore);
    assert.deepEqual(snapshotDir(backupDir), markersBefore);
    assert.deepEqual(snapshotDir(storage), storageBefore);

    // aplicația pornită pe baza restaurată: următoarea depunere, prin rută, primește un număr NOU
    const again = await flow.citizen('b@exemplu.test');
    const repD = await flow.submitOk(again);
    assert.equal(repD.number, repC.number + 1, `${repC.ref} nu se refolosește după restaurare`);
    const map = (await new Client(app).get(`${V1}/public/map-reports`)).json() as Array<{ referenceNumber: string }>;
    assert.ok(map.some((m) => m.referenceNumber === repB.ref));
    assert.ok(!map.some((m) => m.referenceNumber === repA.ref), 'sesizarea ștearsă nu este publică după restaurare');
  });
});

// Siguranța marcajelor și a restaurării (Faza 6, R1–R5):
// - un marcaj care nu poate fi scris oprește depunerea / ștergerea (nimic confirmat fals);
// - tranzacție căzută după scrierea marcajului: stare recuperabilă, comportament documentat;
// - datele demo, pornirea aplicației și backup-ul țin marcajul contorului la zi;
// - BACKUP_DIR lipsă sau nefolosibil → refuz controlat;
// - curățarea nu elimină un marcaj cât timp o copie mai poate readuce sesizarea;
// - restaurarea verifică totul înainte de prima scriere (`inspectRestore`, `restore:db --check`),
//   refuză un director de fișiere activ și marcaje lipsă / corupte / străine, și este „totul sau nimic”.

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { bootstrapAdmin } from '../../src/accounts.ts';
import { RestoreRefusedError, createBackup, formatRestoreInspection, inspectRestore, restoreBackup, type RestoreOptions } from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import {
  MarkerError,
  deletionListIds,
  initMarkerDirs,
  pruneDeletionList,
  readReportCounterWatermark,
  recordReportCounter,
  recordReportDeletions,
} from '../../src/db/markers.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers, syncReportCounterWatermark } from '../../src/db/reportCounter.ts';
import { seedConfig, seedDemo } from '../../src/db/seeds.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';
import { V1, WEBP, deletionMarkedOnDisk, reportFlow, rowCounts, snapshotDir, watermarkOnDisk, type Flow } from '../helpers/reportFlow.ts';

const DAY = 86_400_000;
let h: DbHandle;
let app: FastifyInstance;
let root: string;
let storage: string;
let backupDir: string;
let flow: Flow;
let superAdmin: Client;
const clock = new Clock();

const backupOpts = (over: Partial<RestoreOptions> = {}) => ({
  databaseUrl: testDatabaseUrl(),
  backupDir,
  storageDir: storage,
  migrationsDir: MIGRATIONS_DIR,
  retentionDays: 45,
  adminRetentionMonths: 6,
  now: clock.now(),
  ...over,
});

/** Un proces real al aplicației / al CLI-ului, cu un mediu de test complet. */
const run = (args: string[], env: Record<string, string | undefined>) =>
  spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), ...args], {
    env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), ...env }), PATH: process.env.PATH ?? '' },
    encoding: 'utf8',
    timeout: 60_000,
  });

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as { port: number }).port;
      srv.close(() => resolve(p));
    });
  });

/** Așteaptă până când procesul aplicației răspunde la `/api/v1/health`. */
async function waitForHealth(port: number, child: { exitCode: number | null }, output: () => string): Promise<void> {
  let health = 0;
  for (let i = 0; i < 150 && health !== 200 && child.exitCode === null; i++) {
    await new Promise((r) => setTimeout(r, 200));
    health = await fetch(`http://127.0.0.1:${port}/api/v1/health`).then((r) => r.status, () => 0);
  }
  assert.equal(health, 200, `aplicația nu a pornit: ${output()}`);
}

const countFiles = (dir: string) => Object.entries(snapshotDir(dir)).filter(([, v]) => v !== 'dir').length;
const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-backup-safety-'));
  storage = join(root, 'storage');
  backupDir = join(root, 'backups');
  mkdirSync(storage, { recursive: true });
  // ca la pornirea aplicației (main.ts): directoarele marcajelor, proba de scriere, contorul adus la zi
  const init = await initBackupMarkers(h.pool, backupDir);
  assert.deepEqual(init, { counter: 0, watermark: 0, counterRaisedFrom: null });
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

/** BACKUP_DIR devine nefolosibil pe durata lui `fn`: înlocuit de un fișier obișnuit sau dispărut cu totul. */
async function withBrokenBackupDir(kind: 'file' | 'missing', fn: () => Promise<void>): Promise<void> {
  const off = `${backupDir}.off`;
  renameSync(backupDir, off);
  if (kind === 'file') writeFileSync(backupDir, 'nu este un director');
  try {
    await fn();
  } finally {
    rmSync(backupDir, { recursive: true, force: true });
    renameSync(off, backupDir);
  }
}

describe('marcajul nu poate fi scris → operația nu se confirmă', () => {
  for (const kind of ['file', 'missing'] as const) {
    it(`depunere cu BACKUP_DIR nefolosibil (${kind === 'file' ? 'este un fișier' : 'a dispărut'}) → 500; niciun număr emis, nicio sesizare, niciun fișier`, async () => {
      const c = await flow.citizen(`fara-marcaj-${kind}@exemplu.test`);
      const counter0 = await flow.counter();
      const reports0 = (await rowCounts(h.pool)).reports;
      const watermark0 = watermarkOnDisk(backupDir);
      await withBrokenBackupDir(kind, async () => {
        const res = await flow.submit(c, { photos: [WEBP] });
        assert.equal(res.statusCode, 500, res.body);
        assert.ok(!res.body.includes(root), 'răspunsul nu conține calea directorului');
      });
      assert.equal(await flow.counter(), counter0, 'contorul nu a avansat');
      assert.equal((await rowCounts(h.pool)).reports, reports0, 'nicio sesizare salvată');
      assert.equal(countFiles(storage), countFiles(join(storage, 'photos')), 'niciun fișier temporar rămas');
      assert.equal(watermarkOnDisk(backupDir), watermark0, 'marcajul existent nu a fost atins');
      assert.equal(existsSync(join(backupDir, 'deletions')), true, 'directorul marcajelor nu a fost recreat gol');
      // după repararea directorului, aceeași persoană depune normal și primește numărul următor
      const ok = await flow.submitOk(c);
      assert.equal(ok.number, counter0 + 1);
      assert.equal(watermarkOnDisk(backupDir), counter0 + 1);
    });
  }

  it('ștergere (autor, apoi super_admin) cu BACKUP_DIR nefolosibil → 500; sesizarea și fotografia rămân', async () => {
    const c = await flow.citizen('sterge-fara-marcaj@exemplu.test');
    const r = await flow.submitOk(c, [WEBP]);
    await withBrokenBackupDir('file', async () => {
      const own = await c.send('DELETE', `${V1}/citizen/reports/${r.ref}`);
      assert.equal(own.statusCode, 500, own.body);
      const adm = await superAdmin.send('DELETE', `${V1}/admin/reports/${r.id}`);
      assert.equal(adm.statusCode, 500, adm.body);
      assert.ok(!own.body.includes(root) && !adm.body.includes(root));
    });
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [r.id])).length, 1, 'sesizarea nu a fost ștearsă');
    assert.equal((await c.get(`${V1}/citizen/reports/${r.ref}`)).statusCode, 200, 'autorul o vede în continuare');
    assert.equal(existsSync(join(storage, r.photoKeys[0]!)), true, 'fotografia este pe disc');
    assert.equal(deletionMarkedOnDisk(backupDir, r.id), false);
    // după reparare: ștergerea reușește și este notată
    assert.equal((await c.send('DELETE', `${V1}/citizen/reports/${r.ref}`)).statusCode, 204);
    assert.equal(deletionMarkedOnDisk(backupDir, r.id), true);
    assert.equal(existsSync(join(storage, r.photoKeys[0]!)), false);
  });
});

// Decizia proprietarului (11.10.2026): un număr TM nu se reutilizează niciodată, chiar dacă rămân goluri în
// numerotare după o eroare, o cădere sau o restaurare. Un număr ajuns în marcajul durabil nu se mai emite.
describe('numerotarea TM: un număr rezervat durabil nu se mai emite (golurile sunt acceptate)', () => {
  const refs = async () => (await flow.q<{ r: string }>('SELECT reference_number AS r FROM reports')).map((x) => x.r);
  const ref = (n: number) => `TM-${String(n).padStart(3, '0')}`;
  const serverSrc = join(APP_ROOT, 'server', 'src');

  it('rezervare urmată de anularea tranzacției → numărul rămâne rezervat; următoarea depunere primește numărul de după el', async () => {
    const c = await flow.citizen('anulare@exemplu.test');
    const v0 = await flow.counter();
    assert.equal(watermarkOnDisk(backupDir), v0);
    // eșec forțat în tranzacție, după rezervarea numărului: tabelul fotografiilor lipsește temporar
    await h.pool.query('RENAME TABLE report_photos TO report_photos_off');
    try {
      assert.equal((await flow.submit(c, { photos: [WEBP] })).statusCode, 500);
    } finally {
      await h.pool.query('RENAME TABLE report_photos_off TO report_photos');
    }
    assert.equal(await flow.counter(), v0, 'tranzacția anulată a readus contorul din bază');
    assert.equal(watermarkOnDisk(backupDir), v0 + 1, 'numărul a fost rezervat durabil înainte de COMMIT');
    const ok = await flow.submitOk(c);
    assert.equal(ok.number, v0 + 2, 'numărul rezervat nu se mai emite: rămâne un gol');
    assert.ok(!(await refs()).includes(ref(v0 + 1)), 'nicio sesizare nu poartă numărul rezervat și anulat');
    assert.equal(await flow.counter(), v0 + 2);
    assert.equal(watermarkOnDisk(backupDir), v0 + 2);
  });

  it('cădere a procesului după scrierea marcajului, înainte de COMMIT → numărul rezervat nu reapare', async () => {
    const v0 = await flow.counter();
    // un proces separat rezervă un număr într-o tranzacție și este oprit brusc (SIGKILL), fără COMMIT
    const script = `
      const { createDb } = await import(${JSON.stringify(join(serverSrc, 'db', 'client.ts'))});
      const { allocateReportNumber } = await import(${JSON.stringify(join(serverSrc, 'db', 'reportCounter.ts'))});
      const { writeSync } = await import('node:fs');
      const h = createDb(process.env.DBURL, { connectionLimit: 1 });
      const conn = await h.pool.getConnection();
      await conn.beginTransaction();
      const n = await allocateReportNumber(conn, process.env.MARKERS);
      writeSync(1, String(n));
      process.kill(process.pid, 'SIGKILL');
    `;
    const crashed = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
      env: { PATH: process.env.PATH ?? '', DBURL: testDatabaseUrl(), MARKERS: backupDir },
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.equal(crashed.signal, 'SIGKILL', crashed.stderr);
    assert.equal(Number(crashed.stdout), v0 + 1, 'procesul căzut rezervase numărul următor');
    assert.equal(watermarkOnDisk(backupDir), v0 + 1, 'marcajul a supraviețuit căderii');
    assert.equal(await flow.counter(), v0, 'tranzacția neconfirmată nu a ajuns în bază');
    const c = await flow.citizen('dupa-cadere@exemplu.test');
    const ok = await flow.submitOk(c);
    assert.equal(ok.number, v0 + 2);
    assert.ok(!(await refs()).includes(ref(v0 + 1)));
  });

  it('marcaj mai mare decât contorul din bază (bază readusă la o stare mai veche) → emiterea pornește de la marcaj, fără repornire', async () => {
    const w = watermarkOnDisk(backupDir)!;
    assert.equal(await flow.counter(), w);
    // contorul din bază coboară în afara aplicației (ca după readucerea bazei dintr-o copie mai veche)
    await h.pool.query('UPDATE report_counter SET `last_value` = `last_value` - 3 WHERE id = 1');
    const c = await flow.citizen('baza-veche@exemplu.test');
    const ok = await flow.submitOk(c);
    assert.equal(ok.number, w + 1, 'nu contorul coborât + 1, ci marcajul + 1');
    assert.equal(await flow.counter(), w + 1, 'contorul din bază a fost adus peste marcaj');
    assert.equal(watermarkOnDisk(backupDir), w + 1);
    assert.equal(new Set(await refs()).size, (await refs()).length, 'niciun număr dublat');
  });

  it('sincronizarea (pornire / backup) cu marcajul peste contor → contorul din bază este ridicat la marcaj; nimic nu coboară', async () => {
    const w = watermarkOnDisk(backupDir)!;
    await h.pool.query('UPDATE report_counter SET `last_value` = `last_value` - 2 WHERE id = 1');
    assert.deepEqual(await syncReportCounterWatermark(h.pool, backupDir), { counter: w, watermark: w, counterRaisedFrom: w - 2 });
    assert.equal(await flow.counter(), w);
    // a doua rulare: nimic de făcut
    assert.deepEqual(await syncReportCounterWatermark(h.pool, backupDir), { counter: w, watermark: w, counterRaisedFrom: null });
    // același lucru la backup: contorul coborât este ridicat înainte de instantaneu, deci copia îl conține la zi
    await h.pool.query('UPDATE report_counter SET `last_value` = `last_value` - 4 WHERE id = 1');
    const res = await createBackup(backupOpts());
    assert.equal(await flow.counter(), w);
    const inspection = await inspectRestore({ ...backupOpts({ storageDir: join(root, 'nicaieri-1') }), source: res.dir });
    assert.equal(inspection.source.reportCounter, w, 'copia nu conține un contor sub marcaj');
    const ok = await flow.submitOk(await flow.citizen('dupa-sincronizare@exemplu.test'));
    assert.equal(ok.number, w + 1);
  });

  it('repornirea reală a aplicației (proces) cu marcajul peste contor → contorul din bază este ridicat; depunerea următoare primește marcaj + 1', async () => {
    const w = watermarkOnDisk(backupDir)!;
    await h.pool.query('UPDATE report_counter SET `last_value` = `last_value` - 2 WHERE id = 1');
    const port = await freePort();
    const child = spawn(process.execPath, ['--import', 'tsx', join(serverSrc, 'main.ts')], {
      env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), BACKUP_DIR: backupDir, STORAGE_DIR: storage, PORT: String(port), LOG_LEVEL: 'warn' }), PATH: process.env.PATH ?? '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    try {
      await waitForHealth(port, child, () => output);
      assert.equal(await flow.counter(), w, 'pornirea a ridicat contorul din bază la marcaj');
      assert.equal(watermarkOnDisk(backupDir), w);
      assert.match(output, /Contorul TM din baza de date era sub marcajul durabil/, 'ridicarea este consemnată în jurnal');
    } finally {
      child.kill('SIGTERM');
      if (child.exitCode === null) await once(child, 'exit');
    }
    const ok = await flow.submitOk(await flow.citizen('dupa-repornire@exemplu.test'));
    assert.equal(ok.number, w + 1);
  });

  it('procese concurente, cu tranzacții confirmate și anulate amestecate → fiecare rezervare primește un număr diferit', async () => {
    const start = watermarkOnDisk(backupDir)!;
    const PROCS = 5;
    const EACH = 12;
    const script = `
      const { createDb } = await import(${JSON.stringify(join(serverSrc, 'db', 'client.ts'))});
      const { allocateReportNumber } = await import(${JSON.stringify(join(serverSrc, 'db', 'reportCounter.ts'))});
      const p = Number(process.env.P);
      const h = createDb(process.env.DBURL, { connectionLimit: 1 });
      const out = [];
      for (let i = 0; i < ${EACH}; i++) {
        const conn = await h.pool.getConnection();
        await conn.beginTransaction();
        const n = await allocateReportNumber(conn, process.env.MARKERS);
        const commit = (i + p) % 3 !== 0;
        if (commit) await conn.commit(); else await conn.rollback();
        conn.release();
        out.push([n, commit]);
      }
      console.log(JSON.stringify(out));
      await h.close();
    `;
    const children = Array.from({ length: PROCS }, (_, p) =>
      spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
        env: { PATH: process.env.PATH ?? '', DBURL: testDatabaseUrl(), MARKERS: backupDir, P: String(p) },
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
    const all: Array<[number, boolean]> = [];
    await Promise.all(
      children.map(async (child) => {
        let out = '';
        let err = '';
        child.stdout.on('data', (d) => (out += d));
        child.stderr.on('data', (d) => (err += d));
        const [code] = await once(child, 'exit');
        assert.equal(code, 0, err);
        all.push(...(JSON.parse(out) as Array<[number, boolean]>));
      }),
    );
    const numbers = all.map(([n]) => n);
    assert.equal(numbers.length, PROCS * EACH);
    assert.equal(new Set(numbers).size, numbers.length, 'niciun număr dat de două ori, nici măcar unui proces a cărui tranzacție a fost anulată');
    assert.ok(numbers.every((n) => n > start));
    const top = Math.max(...numbers);
    assert.equal(watermarkOnDisk(backupDir), top);
    assert.ok(all.some(([, committed]) => !committed) && all.some(([, committed]) => committed));
    // contorul din bază poate fi sub marcaj (ultima tranzacție anulată); următoarea depunere pornește oricum de la marcaj
    assert.ok((await flow.counter()) <= top);
    const ok = await flow.submitOk(await flow.citizen('dupa-procese@exemplu.test'));
    assert.equal(ok.number, top + 1);
    assert.equal(await flow.counter(), top + 1);
  });
});

describe('tranzacție de ștergere căzută DUPĂ scrierea marcajului → stare recuperabilă', () => {
  it('ștergere: marcajul există deja când ștergerea din bază eșuează; sesizarea rămâne, iar reîncercarea reușește', async () => {
    const c = await flow.citizen('stergere-cazuta@exemplu.test');
    const r = await flow.submitOk(c, [WEBP]);
    // eșec forțat în tranzacția de ștergere, DUPĂ blocarea rândului: tabelul cozii e-mail lipsește temporar
    await h.pool.query('RENAME TABLE email_outbox TO email_outbox_off');
    try {
      assert.equal((await c.send('DELETE', `${V1}/citizen/reports/${r.ref}`)).statusCode, 500);
      assert.equal((await superAdmin.send('DELETE', `${V1}/admin/reports/${r.id}`)).statusCode, 500);
    } finally {
      await h.pool.query('RENAME TABLE email_outbox_off TO email_outbox');
    }
    // marcajul a fost persistat ÎNAINTE ca ștergerea să poată fi confirmată (dovada ordinii)
    assert.equal(deletionMarkedOnDisk(backupDir, r.id), true);
    // compromisul documentat: intrarea rămâne, deși sesizarea nu a fost ștearsă
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [r.id])).length, 1);
    assert.equal(existsSync(join(storage, r.photoKeys[0]!)), true);
    assert.equal((await c.send('DELETE', `${V1}/citizen/reports/${r.ref}`)).statusCode, 204);
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [r.id])).length, 0);
    assert.equal(deletionMarkedOnDisk(backupDir, r.id), true);
  });
});

describe('datele demo, pornirea și backup-ul țin marcajul contorului la zi', () => {
  it('seed:demo (funcția și comanda CLI): sesizările demo primesc numere TM, iar marcajul = contorul', async () => {
    const v0 = await flow.counter();
    const res = await seedDemo(h.pool, SEEDS_DIR, 'development', backupDir);
    assert.equal(res.reports, 4);
    assert.equal(await flow.counter(), v0 + 4);
    assert.equal(watermarkOnDisk(backupDir), v0 + 4);
    // comanda reală: după ștergerea sesizărilor demo, `seed:demo` le recreează cu numere NOI și notează marcajul
    await h.pool.query('DELETE FROM reports WHERE is_demo = TRUE');
    const cli = run(['seed:demo'], { BACKUP_DIR: backupDir, STORAGE_DIR: storage });
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(await flow.counter(), v0 + 8);
    assert.equal(watermarkOnDisk(backupDir), v0 + 8);
    await h.pool.query('DELETE FROM reports WHERE is_demo = TRUE');
    // cu două numere rezervate durabil și neconfirmate (marcaj peste contor): datele demo pornesc de după ele
    recordReportCounter(backupDir, v0 + 10);
    await seedDemo(h.pool, SEEDS_DIR, 'development', backupDir);
    const demo = (await flow.q<{ r: string }>('SELECT reference_number AS r FROM reports WHERE is_demo = TRUE ORDER BY r')).map((x) => Number(x.r.slice(3)));
    assert.deepEqual(demo, [v0 + 11, v0 + 12, v0 + 13, v0 + 14], 'numerele rezervate (v0+9, v0+10) nu sunt date sesizărilor demo');
    assert.equal(await flow.counter(), v0 + 14);
    assert.equal(watermarkOnDisk(backupDir), v0 + 14);
    await h.pool.query('DELETE FROM reports WHERE is_demo = TRUE');
    // o depunere nouă, prin rută, continuă de la ultimul număr
    const ok = await flow.submitOk(await flow.citizen('dupa-demo@exemplu.test'));
    assert.equal(ok.number, v0 + 15);
  });

  it('contor existent și marcaj absent sau rămas în urmă → inițializarea aduce marcajul la contor; contorul nu coboară', async () => {
    const fresh = join(root, 'backups-fara-marcaj');
    const counter = await flow.counter();
    assert.ok(counter > 0);
    assert.deepEqual(await initBackupMarkers(h.pool, fresh), { counter, watermark: counter, counterRaisedFrom: null });
    assert.equal(watermarkOnDisk(fresh), counter);
    assert.equal(existsSync(join(fresh, 'deletions')), true);
    assert.deepEqual(readdirSync(fresh).sort(), ['deletions', 'report-counter-watermark.json'], 'fără fișiere de probă sau temporare rămase');
    // un marcaj mai mic decât contorul este ridicat; contorul nu coboară
    writeFileSync(join(fresh, 'report-counter-watermark.json'), JSON.stringify({ lastValue: counter - 1 }));
    assert.deepEqual(await initBackupMarkers(h.pool, fresh), { counter, watermark: counter, counterRaisedFrom: null });
    assert.equal(await flow.counter(), counter);
  });

  it('backup într-un BACKUP_DIR fără marcaje → după backup marcajul = contorul, iar copia nu are contorul peste marcaj', async () => {
    const fresh = join(root, 'backups-noi');
    const counter = await flow.counter();
    const res = await createBackup(backupOpts({ backupDir: fresh }));
    assert.equal(watermarkOnDisk(fresh), counter);
    assert.equal(existsSync(join(fresh, 'deletions')), true);
    const inspection = await inspectRestore({ ...backupOpts({ backupDir: fresh, storageDir: join(root, 'nicaieri') }), source: res.dir });
    assert.equal(inspection.source.reportCounter, counter);
    assert.ok(inspection.markers.watermark! >= inspection.source.reportCounter!);
  });

  it('pornirea reală a aplicației (proces) cu un BACKUP_DIR nou → marcajul apare și este egal cu contorul', async () => {
    const fresh = join(root, 'backups-la-pornire');
    const port = await freePort();
    const child = spawn(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts')], {
      env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), BACKUP_DIR: fresh, STORAGE_DIR: storage, PORT: String(port) }), PATH: process.env.PATH ?? '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    try {
      await waitForHealth(port, child, () => output);
      assert.equal(watermarkOnDisk(fresh), await flow.counter());
      assert.equal(existsSync(join(fresh, 'deletions')), true);
    } finally {
      child.kill('SIGTERM');
      if (child.exitCode === null) await once(child, 'exit');
    }
  });
});

describe('BACKUP_DIR absent sau nefolosibil → refuz controlat', () => {
  for (const appEnv of ['staging', 'production'] as const) {
    it(`APP_ENV=${appEnv} fără BACKUP_DIR → procesul se oprește la configurare, înainte de baza de date`, () => {
      const res = run([], { APP_ENV: appEnv, PUBLIC_BASE_URL: 'https://exemplu.test', BACKUP_DIR: undefined });
      assert.equal(res.status, 1, res.stderr);
      assert.match(res.stderr, /Configurare invalidă; aplicația nu pornește/);
      assert.match(res.stderr, /BACKUP_DIR: este obligatorie pe staging și în producție/);
      assert.doesNotMatch(res.stderr, /Baza de date|date demo/);
    });
  }

  it('BACKUP_DIR care nu poate fi folosit (calea trece printr-un fișier) → aplicația nu pornește, cu mesaj explicit', () => {
    const blocker = join(root, 'fisier-obisnuit');
    writeFileSync(blocker, 'x');
    const res = run([], { BACKUP_DIR: join(blocker, 'backups'), STORAGE_DIR: storage, PORT: '39874' });
    assert.equal(res.status, 1, res.stderr);
    assert.match(res.stderr, /Aplicația nu pornește: marcajele din BACKUP_DIR nu pot fi folosite/);
    assert.match(res.stderr, /BACKUP_DIR nu poate fi folosit/);
  });

  it('BACKUP_DIR identic cu STORAGE_DIR sau în interiorul lui → configurare refuzată', () => {
    for (const dir of [storage, join(storage, 'backups')]) {
      const res = run([], { BACKUP_DIR: dir, STORAGE_DIR: storage });
      assert.equal(res.status, 1, res.stderr);
      assert.match(res.stderr, /BACKUP_DIR: nu poate fi același director cu STORAGE_DIR/);
    }
  });
});

describe('curățarea marcajelor de ștergere', () => {
  const id = (n: number) => `01SAFE${String(n).padStart(20, '0')}`;
  const ago = (days: number) => new Date(clock.now().getTime() - days * DAY);

  it('backup-ul nu elimină o intrare cât timp o copie mai poate readuce sesizarea (depunere + 45 de zile + 1 zi)', async () => {
    const dir = join(root, 'backups-curatare');
    await initBackupMarkers(h.pool, dir); // A1: ca la pornire (marcajul contorului, apoi `deletions/`)
    recordReportDeletions(dir, [{ id: id(1), createdAt: ago(10) }], ago(9)); // ștearsă acum 9 zile: regula veche (7 zile) ar fi eliminat-o
    recordReportDeletions(dir, [{ id: id(2), createdAt: ago(44) }], ago(30));
    recordReportDeletions(dir, [{ id: id(3), createdAt: ago(45.5) }], ago(1)); // în ziua de rezervă
    recordReportDeletions(dir, [{ id: id(4), createdAt: ago(47) }], ago(20)); // nicio copie nu o mai poate readuce
    await createBackup(backupOpts({ backupDir: dir }));
    assert.deepEqual(deletionListIds(dir).sort(), [id(1), id(2), id(3)]);
    // și peste încă o săptămână, cu backup-urile vechi deja rotite, intrarea sesizării recente rămâne
    assert.equal(pruneDeletionList(dir, new Date(clock.now().getTime() + 7 * DAY)), 2);
    assert.deepEqual(deletionListIds(dir), [id(1)]);
  });

  it('o intrare care nu poate fi înțeleasă nu este ștearsă de curățare și oprește citirea listei', () => {
    const dir = join(root, 'backups-corupt');
    initMarkerDirs(dir);
    recordReportDeletions(dir, [{ id: id(5), createdAt: ago(60) }], ago(50));
    writeFileSync(join(dir, 'deletions', `${id(6)}.json`), '{"reportId": "trunchiat');
    assert.equal(pruneDeletionList(dir, clock.now()), 1);
    assert.equal(existsSync(join(dir, 'deletions', `${id(6)}.json`)), true);
    assert.throws(() => deletionListIds(dir), MarkerError);
  });

  it('marcajul contorului: fișier corupt → eroare explicită la citire și la scriere (nu „0”)', () => {
    const dir = join(root, 'backups-contor-corupt');
    initMarkerDirs(dir);
    writeFileSync(join(dir, 'report-counter-watermark.json'), '{"lastValue": "șapte"}');
    assert.throws(() => readReportCounterWatermark(dir), /corupt/);
    assert.throws(() => recordReportCounter(dir, 9), MarkerError);
  });
});

describe('gardă statică: un singur loc emite numere TM', () => {
  it('`UPDATE report_counter` apare numai în reportCounter.ts (emiterea) și în backup.ts (restaurarea)', () => {
    const src = join(APP_ROOT, 'server', 'src');
    const hits: string[] = [];
    const walk = (dir: string, rel: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) walk(join(dir, e.name), r);
        else if (e.name.endsWith('.ts') && /UPDATE\s+report_counter/i.test(readFileSync(join(dir, e.name), 'utf8'))) hits.push(r);
      }
    };
    walk(src, '');
    assert.deepEqual(hits.sort(), ['db/backup.ts', 'db/reportCounter.ts']);
  });
});

// ——— restaurarea ———

describe('restaurarea: verificări înainte de orice scriere, „totul sau nimic”', () => {
  let source: string; // copia folosită
  let deletedRep: Awaited<ReturnType<Flow['submitOk']>>; // ștearsă DUPĂ backup
  let keptRep: Awaited<ReturnType<Flow['submitOk']>>;
  let lastNumber: number; // ultimul număr TM emis (după backup)
  let backupCounter: number;
  let seq = 0;
  const target = () => join(root, `restaurat-${++seq}`);
  const restoreOpts = (over: Partial<RestoreOptions> = {}): RestoreOptions => ({ ...backupOpts(), source, storageDir: target(), ...over });

  /** O copie a întregului BACKUP_DIR (copia + marcajele ei), modificată pentru un singur caz. */
  function variant(mutate: (dir: string, src: string) => void): { backupDir: string; source: string } {
    const dir = join(root, `varianta-${++seq}`);
    cpSync(backupDir, dir, { recursive: true });
    const src = join(dir, basename(source));
    mutate(dir, src);
    return { backupDir: dir, source: src };
  }

  async function assertRefusedWithoutWrites(opts: RestoreOptions, reason: RegExp) {
    const dbBefore = await rowCounts(h.pool);
    const dirsBefore = [snapshotDir(opts.backupDir), snapshotDir(storage)];
    await assert.rejects(restoreBackup(opts), (err: unknown) => {
      assert.ok(err instanceof RestoreRefusedError, String(err));
      assert.match(err.message, /nu s-a scris nimic/);
      assert.match(err.message, reason);
      return true;
    });
    assert.deepEqual(await rowCounts(h.pool), dbBefore, 'baza țintă neschimbată');
    assert.equal(sum(await rowCounts(h.pool)), 0, 'baza țintă a rămas goală');
    assert.deepEqual([snapshotDir(opts.backupDir), snapshotDir(storage)], dirsBefore, 'marcajele și fișierele active neschimbate');
    if (opts.storageDir !== storage) assert.equal(countFiles(opts.storageDir), 0, 'nimic copiat în directorul țintă');
  }

  before(async () => {
    const a = await flow.citizen('restaurare-a@exemplu.test');
    const b = await flow.citizen('restaurare-b@exemplu.test');
    deletedRep = await flow.submitOk(a, [WEBP]);
    keptRep = await flow.submitOk(b, [WEBP]);
    const res = await createBackup(backupOpts());
    source = res.dir;
    backupCounter = await flow.counter();
    assert.equal((await a.send('DELETE', `${V1}/citizen/reports/${deletedRep.ref}`)).statusCode, 204);
    lastNumber = (await flow.submitOk(b)).number;
    assert.ok(lastNumber > backupCounter);
    // baza țintă: nouă, goală, cu schema la zi
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    assert.equal(sum(await rowCounts(h.pool)), 0);
  });

  it('--check (funcția): raportează țintele, starea bazei, marcajele și integritatea; nu scrie nimic', async () => {
    const opts = restoreOpts();
    const snapshots = () => [snapshotDir(backupDir), snapshotDir(storage), snapshotDir(opts.storageDir)];
    const before_ = snapshots();
    const i = await inspectRestore(opts);
    assert.deepEqual(i.problems, []);
    assert.equal(i.database.reachable && i.database.schemaOk, true);
    assert.deepEqual(i.database.nonEmptyTables, []);
    assert.equal(i.database.name, new URL(testDatabaseUrl()).pathname.slice(1));
    assert.equal(i.storage.exists, false);
    assert.equal(i.storage.files, 0);
    assert.equal(i.source.reportCounter, backupCounter);
    assert.equal(i.markers.watermark, lastNumber);
    assert.ok(i.markers.deletionIds.includes(deletedRep.id));
    const text = formatRestoreInspection(i).join('\n');
    assert.match(text, /Rezultat: restaurarea ar fi PERMISĂ\./);
    const url = new URL(testDatabaseUrl());
    assert.ok(!JSON.stringify(i).includes(url.password) && !text.includes(url.password), 'fără parola bazei de date');
    assert.ok(!text.includes(`${url.username}:`), 'fără utilizatorul bazei de date');
    assert.deepEqual(snapshots(), before_, 'niciun fișier creat, modificat sau șters');
    assert.equal(existsSync(opts.storageDir), false, 'directorul țintă nu a fost creat');
    assert.equal(sum(await rowCounts(h.pool)), 0, 'baza țintă neschimbată');
  });

  it('restore:db <copie> --check (comanda): cod 0 și „PERMISĂ”; cu directorul activ: cod 1 și „REFUZATĂ”; nimic scris nici cu --confirm alături', async () => {
    const fresh = target();
    const snapshots = () => [snapshotDir(backupDir), snapshotDir(storage), snapshotDir(fresh)];
    const before_ = snapshots();
    const ok = run(['restore:db', source, '--check'], { BACKUP_DIR: backupDir, STORAGE_DIR: fresh });
    assert.equal(ok.status, 0, ok.stderr + ok.stdout);
    assert.match(ok.stdout, /numai verificare, nu se scrie nimic/);
    assert.match(ok.stdout, /Rezultat: restaurarea ar fi PERMISĂ\./);
    const both = run(['restore:db', source, '--check', '--confirm'], { BACKUP_DIR: backupDir, STORAGE_DIR: fresh });
    assert.equal(both.status, 0, both.stderr);
    assert.match(both.stdout, /numai verificare/);
    const active = run(['restore:db', source, '--check'], { BACKUP_DIR: backupDir, STORAGE_DIR: storage });
    assert.equal(active.status, 1, active.stdout);
    assert.match(active.stdout, /PROBLEMĂ: STORAGE_DIR nu este gol/);
    assert.match(active.stdout, /Rezultat: restaurarea ar fi REFUZATĂ\./);
    assert.deepEqual(snapshots(), before_);
    assert.equal(sum(await rowCounts(h.pool)), 0);
    // fără --check și fără --confirm: numai instrucțiunile de utilizare
    const usage = run(['restore:db', source], { BACKUP_DIR: backupDir, STORAGE_DIR: fresh });
    assert.equal(usage.status, 2);
    assert.match(usage.stderr, /--check/);
  });

  it('configurație care indică directorul de fișiere activ → refuz înainte de orice scriere', async () => {
    await assertRefusedWithoutWrites(restoreOpts({ storageDir: storage }), /STORAGE_DIR nu este gol \(\d+ fișiere\): este tratat ca directorul activ/);
  });

  it('director de fișiere în interiorul BACKUP_DIR, sau copie aflată în afara BACKUP_DIR → refuz', async () => {
    const v = variant(() => {});
    await assertRefusedWithoutWrites(restoreOpts({ ...v, storageDir: join(v.backupDir, 'fisiere') }), /STORAGE_DIR se suprapune cu BACKUP_DIR/);
    // copia este într-un alt director decât marcajele: nu se poate ști că marcajele sunt ale ei
    await assertRefusedWithoutWrites(restoreOpts({ source: v.source }), /Copia sursă nu se află direct în BACKUP_DIR/);
    await assertRefusedWithoutWrites(restoreOpts({ backupDir: join(root, 'nu-exista'), source: v.source }), /BACKUP_DIR nu există/);
  });

  it('marcaje absente → refuz explicit (marcajul contorului; marcajele de ștergere)', async () => {
    const noWatermark = variant((dir) => rmSync(join(dir, 'report-counter-watermark.json')));
    await assertRefusedWithoutWrites(restoreOpts(noWatermark), /Lipsesc din BACKUP_DIR: marcajul contorului TM\./);
    const noDeletions = variant((dir) => rmSync(join(dir, 'deletions'), { recursive: true }));
    await assertRefusedWithoutWrites(restoreOpts(noDeletions), /Lipsesc din BACKUP_DIR: marcajele de ștergere\./);
  });

  it('marcaje corupte → refuz explicit, și cu --allow-missing-markers', async () => {
    const badWatermark = variant((dir) => writeFileSync(join(dir, 'report-counter-watermark.json'), '{"lastValue": '));
    // G1: cu N valid, refuzul rămâne numai din cauza corupției (nu a lui --at-least)
    await assertRefusedWithoutWrites(restoreOpts({ ...badWatermark, allowMissingMarkers: true, atLeast: lastNumber }), /Marcajul contorului TM .* este corupt/);
    const badEntry = variant((dir) => writeFileSync(join(dir, 'deletions', `${deletedRep.id}.json`), 'nu este JSON'));
    await assertRefusedWithoutWrites(restoreOpts({ ...badEntry, allowMissingMarkers: true, atLeast: lastNumber }), /Marcaje de ștergere corupte/);
    // intrare al cărei conținut indică altă sesizare decât numele fișierului
    const mismatched = variant((dir) =>
      writeFileSync(join(dir, 'deletions', `${deletedRep.id}.json`), JSON.stringify({ reportId: keptRep.id, reportCreatedAt: clock.now().toISOString(), deletedAt: clock.now().toISOString() })),
    );
    await assertRefusedWithoutWrites(restoreOpts(mismatched), /Marcaje de ștergere corupte/);
  });

  it('marcaje incompatibile (ale altei instalări: marcajul contorului sub contorul din copie) → refuz', async () => {
    const foreign = variant((dir) => writeFileSync(join(dir, 'report-counter-watermark.json'), JSON.stringify({ lastValue: backupCounter - 1 })));
    await assertRefusedWithoutWrites(restoreOpts(foreign), new RegExp(`Marcaj incompatibil: marcajul contorului TM \\(${backupCounter - 1}\\) este sub contorul din copie \\(${backupCounter}\\)`));
  });

  it('eroare în timpul restaurării (număr de rânduri diferit de manifest) → tranzacție anulată: baza țintă rămâne goală', async () => {
    const v = variant((_dir, src) => {
      const m = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
      m.counts.reports += 1;
      writeFileSync(join(src, 'manifest.json'), JSON.stringify(m));
    });
    const opts = restoreOpts(v);
    await assert.rejects(restoreBackup(opts), /Restaurare eșuată: Restaurare incompletă: reports[\s\S]*baza de date țintă a rămas goală/);
    assert.equal(sum(await rowCounts(h.pool)), 0);
    assert.equal(countFiles(opts.storageDir), 0);
  });

  it('eroare târzie (o fotografie nu poate fi copiată, după încărcare și ștergeri) → tot nimic confirmat în bază', async () => {
    const v = variant((_dir, src) => {
      // fotografia sesizării păstrate devine director: copierea ei eșuează
      const photo = join(src, 'photos', keptRep.photoKeys[0]!);
      rmSync(photo);
      mkdirSync(photo);
    });
    const opts = restoreOpts(v);
    await assert.rejects(restoreBackup(opts), /Restaurare eșuată:[\s\S]*trebuie golit înaintea unei noi încercări/);
    assert.equal(sum(await rowCounts(h.pool)), 0, 'nici rândurile încărcate, nici contorul, nici ștergerile nu au rămas');
  });

  it('copie mai veche de 7 zile, cu marcajele curățate între timp → restaurarea rămâne permisă, iar sesizarea ștearsă tot nu reapare', async () => {
    const later = new Date(clock.now().getTime() + 9 * DAY);
    const v = variant((dir) => {
      // curățarea rulată în cele 9 zile (la fiecare backup): intrarea nu dispare după 7 zile
      for (let d = 1; d <= 9; d++) pruneDeletionList(dir, new Date(clock.now().getTime() + d * DAY));
    });
    assert.ok(deletionListIds(v.backupDir).includes(deletedRep.id));
    const opts = restoreOpts({ ...v, now: later });
    const res = await restoreBackup(opts);
    assert.ok(res.deletedFromList >= 1);
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [deletedRep.id])).length, 0, 'sesizarea ștearsă nu reapare');
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [keptRep.id])).length, 1);
    assert.equal(existsSync(join(opts.storageDir, keptRep.photoKeys[0]!)), true);
    assert.equal(existsSync(join(opts.storageDir, deletedRep.photoKeys[0]!)), false, 'fotografia sesizării șterse nu este copiată');
    assert.equal(countFiles(opts.storageDir), res.photosRestored);
    assert.ok(backupCounter < lastNumber, 'copia are un contor mai vechi decât marcajul');
    assert.equal(await flow.counter(), lastNumber, 'contorul restaurat = marcajul, nu contorul din copie');
    // a doua rulare pe aceeași țintă: refuz (baza și directorul nu mai sunt goale)
    await assert.rejects(restoreBackup(opts), /nu este gol/);
    // aplicația pe baza restaurată: o depunere nouă, prin rută, primește un număr care nu a mai fost emis
    const ok = await flow.submitOk(await flow.citizen('restaurare-b@exemplu.test'));
    assert.equal(ok.number, lastNumber + 1);
  });

  it('--allow-missing-markers --at-least N: restaurarea continuă numai la cerere explicită, cu avertisment; consecința este cea anunțată', async () => {
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    const v = variant((dir) => {
      rmSync(join(dir, 'report-counter-watermark.json'));
      rmSync(join(dir, 'deletions'), { recursive: true });
    });
    // G1 (11.10.2026): opțiunea cere N; fără el, refuz fără nicio scriere
    await assertRefusedWithoutWrites(restoreOpts({ ...v, allowMissingMarkers: true }), /cere --at-least <N>/);
    const opts = restoreOpts({ ...v, allowMissingMarkers: true, atLeast: lastNumber });
    const i = await inspectRestore(opts);
    assert.deepEqual(i.problems, []);
    assert.match(i.warnings.join('\n'), /NU mai pot fi garantate/);
    const res = await restoreBackup(opts);
    // fără marcaje de ștergere, sesizarea ștearsă după copie revine (de aceea refuzul este implicit) ...
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [deletedRep.id])).length, 1);
    // ... dar contorul pornește de la N, nu de la copie, iar marcajele sunt refăcute (G1)
    assert.ok(backupCounter < lastNumber);
    assert.equal(await flow.counter(), lastNumber);
    assert.equal(res.reportCounter, lastNumber);
    assert.equal(watermarkOnDisk(v.backupDir), lastNumber);
    assert.equal(existsSync(join(v.backupDir, 'deletions')), true);
  });

  it('A6: marcaj de ștergere expirat (curățat) + copie care conține sesizarea → restaurarea tot nu o readuce (retenția)', async () => {
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    // restaurare la „depunere + 47 de zile”: intrarea expiră la „depunere + 46 de zile” și este curățată
    const later = new Date(clock.now().getTime() + 47 * DAY);
    const v = variant((dir) => {
      assert.ok(pruneDeletionList(dir, later) >= 1);
    });
    assert.ok(!deletionListIds(v.backupDir).includes(deletedRep.id), 'intrarea de ștergere a dispărut');
    const opts = restoreOpts({ ...v, now: later });
    const res = await restoreBackup(opts);
    assert.equal(res.deletedFromList, 0, 'nu lista de ștergeri a eliminat-o');
    assert.ok(res.purgedByRetention >= 2, 'retenția a eliminat sesizările mai vechi de 45 de zile');
    assert.equal((await flow.q('SELECT id FROM reports WHERE id = ?', [deletedRep.id])).length, 0, 'sesizarea ștearsă nu reapare');
    assert.equal(existsSync(join(opts.storageDir, deletedRep.photoKeys[0]!)), false, 'nici fotografia ei');
    const w = watermarkOnDisk(v.backupDir)!;
    assert.ok(w >= lastNumber);
    assert.equal(await flow.counter(), w, 'contorul = marcajul curent: numerele TM nu se refolosesc');
  });
});

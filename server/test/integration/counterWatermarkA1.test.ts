// Faza 6, punctul de audit A1 (decizia proprietarului din 11.10.2026: „întăresc acum”).
//
// Marcajul contorului TM pierdut NU se mai reface automat din contorul bazei:
// - setul de marcaje este „inițializat” dacă există `deletions/`; inițializarea scrie ÎNTÂI marcajul
//   contorului și abia apoi creează `deletions/`;
// - `deletions/` fără marcajul contorului → refuz la pornire, la backup, la `seed:demo` și la emitere;
// - la emitere, marcajul lipsă oprește emiterea în orice situație;
// - refacerea numai explicit: `markers:rebuild-counter --at-least <N>` sau `--from-db`;
// - crearea automată rămâne numai la prima inițializare (lipsesc amândouă).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import mysql from 'mysql2/promise';
import { createBackup } from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { MarkerError } from '../../src/db/markers.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers, rebuildReportCounterWatermark } from '../../src/db/reportCounter.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';
import { reportFlow, rowCounts, watermarkOnDisk, type Flow } from '../helpers/reportFlow.ts';

const WATERMARK = 'report-counter-watermark.json';
let h: DbHandle;
let app: FastifyInstance;
let root: string;
let storage: string;
let backupDir: string;
let flow: Flow;
const clock = new Clock();

/** Un proces real al aplicației / al CLI-ului, cu un mediu de test complet. */
const run = (args: string[], env: Record<string, string | undefined> = {}) =>
  spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), ...args], {
    env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), BACKUP_DIR: backupDir, STORAGE_DIR: storage, ...env }), PATH: process.env.PATH ?? '' },
    encoding: 'utf8',
    timeout: 60_000,
  });

/** Marcajul contorului dispare, `deletions/` rămâne: starea „marcaj pierdut”. */
const loseWatermark = (dir = backupDir) => rmSync(join(dir, WATERMARK));
const backupsIn = (dir: string) => readdirSync(dir).filter((n) => n.startsWith('civic-backup-'));

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-a1-'));
  storage = join(root, 'storage');
  backupDir = join(root, 'backups');
  mkdirSync(storage, { recursive: true });
  await initBackupMarkers(h.pool, backupDir); // ca la pornire (main.ts)
  ({ app } = await makeApp(h, clock, { STORAGE_DIR: storage, BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);
});

after(async () => {
  // robust și când pregătirea a eșuat (de exemplu, într-o probă de control): fără blocarea rulării
  await app?.close();
  await h?.close();
  rmSync(root, { recursive: true, force: true });
});

describe('A1: emiterea cu marcajul contorului absent → oprită', () => {
  it('după inițializare (`deletions/` există, marcajul lipsește): depunerea → 500; nimic emis, marcajul nu este refăcut', async () => {
    const c = await flow.citizen('a1-absent@exemplu.test');
    const first = await flow.submitOk(c);
    loseWatermark();
    const counter0 = await flow.counter();
    const reports0 = (await rowCounts(h.pool)).reports;
    const res = await flow.submit(c);
    assert.equal(res.statusCode, 500, res.body);
    assert.ok(!res.body.includes(root), 'răspunsul nu conține calea directorului');
    assert.equal(await flow.counter(), counter0, 'contorul nu a avansat');
    assert.equal((await rowCounts(h.pool)).reports, reports0, 'nicio sesizare salvată');
    assert.equal(watermarkOnDisk(backupDir), null, 'emiterea NU reface marcajul din contorul bazei');
    // refacerea explicită (din bază), apoi depunerea continuă de la numărul următor
    const rb = await rebuildReportCounterWatermark(h.pool, backupDir, null);
    assert.equal(rb.watermark, first.number);
    assert.equal((await flow.submitOk(c)).number, first.number + 1);
  });

  it('tot BACKUP_DIR golit în timpul funcționării (lipsesc amândouă): depunerea → 500; emiterea nu creează un set nou', async () => {
    const c = await flow.citizen('a1-golit@exemplu.test');
    await flow.submitOk(c);
    const counter0 = await flow.counter();
    rmSync(backupDir, { recursive: true });
    mkdirSync(backupDir);
    const res = await flow.submit(c);
    assert.equal(res.statusCode, 500, res.body);
    assert.equal(await flow.counter(), counter0);
    assert.deepEqual(readdirSync(backupDir), [], 'nimic creat de emitere');
    // limita documentată: o nouă inițializare (pornire) creează un set nou, de la contorul din bază
    await initBackupMarkers(h.pool, backupDir);
    assert.equal(watermarkOnDisk(backupDir), counter0);
    assert.equal((await flow.submitOk(c)).number, counter0 + 1);
  });
});

describe('A1: `deletions/` fără marcajul contorului → refuz la pornire, backup și seed:demo', () => {
  it('inițializarea (funcția de pornire) și backup-ul refuză; contorul și directorul rămân neatinse', async () => {
    await flow.submitOk(await flow.citizen('a1-incoerent@exemplu.test'));
    loseWatermark();
    const counter0 = await flow.counter();
    await assert.rejects(initBackupMarkers(h.pool, backupDir), (err: unknown) => {
      assert.ok(err instanceof MarkerError);
      assert.match(err.message, /lipsește, deși marcajele au fost inițializate/);
      assert.match(err.message, /markers:rebuild-counter/);
      return true;
    });
    const before = backupsIn(backupDir);
    await assert.rejects(
      createBackup({ databaseUrl: testDatabaseUrl(), backupDir, storageDir: storage, migrationsDir: MIGRATIONS_DIR, retentionDays: 45, adminRetentionMonths: 6, now: clock.now() }),
      MarkerError,
    );
    assert.deepEqual(backupsIn(backupDir), before, 'nicio copie nouă');
    assert.equal(watermarkOnDisk(backupDir), null, 'marcajul nu a fost refăcut automat');
    assert.equal(await flow.counter(), counter0);
    await rebuildReportCounterWatermark(h.pool, backupDir, null);
  });

  it('pornirea reală a aplicației (proces) refuză, cu mesaj explicit; `seed:demo` refuză și nu inserează nimic', async () => {
    loseWatermark();
    const start = run([], { PORT: '39875' });
    assert.equal(start.status, 1, start.stderr);
    assert.match(start.stderr, /Aplicația nu pornește: marcajele din BACKUP_DIR nu pot fi folosite/);
    assert.match(start.stderr, /markers:rebuild-counter/);
    const demo0 = (await flow.q<{ n: number }>('SELECT COUNT(*) AS n FROM reports WHERE is_demo = TRUE'))[0]!.n;
    const seed = run(['seed:demo']);
    assert.equal(seed.status, 1, seed.stderr);
    assert.match(seed.stderr, /lipsește, deși marcajele au fost inițializate/);
    assert.equal((await flow.q<{ n: number }>('SELECT COUNT(*) AS n FROM reports WHERE is_demo = TRUE'))[0]!.n, demo0);
    assert.equal(watermarkOnDisk(backupDir), null);
    await rebuildReportCounterWatermark(h.pool, backupDir, null);
  });
});

describe('A1: prima inițializare rămâne automată, iar ordinea ei nu poate produce o stare „pierdută”', () => {
  it('prima inițializare eșuată (baza inaccesibilă) nu lasă `deletions/` în urmă; următoarea reușește', async () => {
    const fresh = join(root, 'backups-prima');
    const url = new URL(testDatabaseUrl());
    url.pathname = '/civic_test_nu_exista_a1';
    const bad = mysql.createPool({ uri: url.toString(), connectionLimit: 1 });
    try {
      await assert.rejects(initBackupMarkers(bad, fresh));
    } finally {
      await bad.end();
    }
    assert.equal(existsSync(join(fresh, 'deletions')), false, '`deletions/` apare numai după marcajul contorului');
    const counter = await flow.counter();
    assert.deepEqual(await initBackupMarkers(h.pool, fresh), { counter, watermark: counter, counterRaisedFrom: null });
    assert.deepEqual(readdirSync(fresh).sort(), ['deletions', WATERMARK]);
  });

  it('`seed:demo` (comanda) pe o instalare nouă, înainte de prima pornire: inițializează complet și emite', async () => {
    const fresh = join(root, 'backups-seed-nou');
    const res = run(['seed:demo'], { BACKUP_DIR: fresh });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(watermarkOnDisk(fresh), await flow.counter());
    assert.equal(existsSync(join(fresh, 'deletions')), true);
    await h.pool.query('DELETE FROM reports WHERE is_demo = TRUE');
  });

  it('`seed:demo` în producție: refuzul (cod 2) vine înaintea oricărei atingeri a BACKUP_DIR', () => {
    const fresh = join(root, 'backups-productie');
    const res = run(['seed:demo'], { APP_ENV: 'production', PUBLIC_BASE_URL: 'https://exemplu.test', BACKUP_DIR: fresh });
    assert.equal(res.status, 2, res.stderr);
    assert.match(res.stderr, /refuzat în producție/);
    assert.equal(existsSync(fresh), false, 'BACKUP_DIR nu a fost creat');
  });

  it('bază nouă, înainte de `seed:config` (fără rândul contorului): marcajul 0 este scris, iar repornirea nu refuză', async () => {
    const fresh = join(root, 'backups-fara-rand');
    const counter = await flow.counter();
    await h.pool.query('DELETE FROM report_counter WHERE id = 1');
    try {
      assert.deepEqual(await initBackupMarkers(h.pool, fresh), { counter: null, watermark: 0, counterRaisedFrom: null });
      assert.equal(watermarkOnDisk(fresh), 0);
      assert.equal(existsSync(join(fresh, 'deletions')), true);
      await initBackupMarkers(h.pool, fresh); // nu refuză: setul este complet
    } finally {
      await h.pool.query('INSERT INTO report_counter (id, `last_value`) VALUES (1, ?)', [counter]);
    }
  });
});

describe('A1: refacerea explicită, `markers:rebuild-counter`', () => {
  it('bază readusă la o stare mai veche + marcaj pierdut: fără --at-least numerele comunicate s-ar repeta; cu --at-least nu', async () => {
    const c = await flow.citizen('a1-readusa@exemplu.test');
    const a = await flow.submitOk(c);
    const b = await flow.submitOk(c);
    const last = await flow.submitOk(c); // TM comunicate: a, b, last
    // „baza readusă dintr-o copie” în care exista numai `a`; marcajul s-a pierdut
    await h.pool.query('DELETE FROM reports WHERE id IN (?, ?)', [b.id, last.id]);
    await h.pool.query('UPDATE report_counter SET `last_value` = ? WHERE id = 1', [a.number]);
    loseWatermark();
    // fără alegere explicită: refuz, nimic scris
    const none = run(['markers:rebuild-counter']);
    assert.equal(none.status, 2, none.stderr);
    assert.match(none.stderr, /--at-least <N>/);
    assert.match(none.stderr, /--from-db/);
    for (const badArgs of [['--at-least'], ['--at-least', 'x'], ['--at-least', '-3'], ['--from-db', '--at-least', '5'], ['--altceva']]) {
      assert.equal(run(['markers:rebuild-counter', ...badArgs]).status, 2, badArgs.join(' '));
    }
    assert.equal(watermarkOnDisk(backupDir), null);
    // cu ultimul număr comunicat: marcajul și contorul ajung la el
    const ok = run(['markers:rebuild-counter', '--at-least', String(last.number)]);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, new RegExp(`marcaj scris: ${last.number}\\.`));
    assert.match(ok.stdout, new RegExp(`Următorul număr emis: TM-${String(last.number + 1).padStart(3, '0')}`));
    assert.equal(watermarkOnDisk(backupDir), last.number);
    assert.equal(await flow.counter(), last.number, 'contorul din bază a fost ridicat');
    // pornirea nu mai refuză, iar depunerea nu repetă niciun număr comunicat
    await initBackupMarkers(h.pool, backupDir);
    assert.equal((await flow.submitOk(c)).number, last.number + 1);
    // a doua rulare: marcajul există → refuz, marcajul neschimbat
    const again = run(['markers:rebuild-counter', '--at-least', '1']);
    assert.equal(again.status, 1, again.stderr);
    assert.match(again.stderr, /există deja/);
    assert.equal(watermarkOnDisk(backupDir), last.number + 1);
  });

  it('--from-db ia maximul dintre contorul din bază și cel mai mare număr din sesizări; marcajul corupt nu este suprascris', async () => {
    const c = await flow.citizen('a1-din-baza@exemplu.test');
    const top = await flow.submitOk(c);
    await h.pool.query('UPDATE report_counter SET `last_value` = ? WHERE id = 1', [top.number - 2]); // contor rămas în urmă
    loseWatermark();
    const res = run(['markers:rebuild-counter', '--from-db']);
    assert.equal(res.status, 0, res.stderr);
    assert.equal(watermarkOnDisk(backupDir), top.number, 'numărul cel mai mare din sesizări, nu contorul');
    assert.equal(await flow.counter(), top.number);
    // --at-least sub ceea ce se vede în bază nu coboară nimic
    loseWatermark();
    assert.equal((await rebuildReportCounterWatermark(h.pool, backupDir, 1)).watermark, top.number);
    // marcaj corupt: refuz, fișierul rămâne pentru cercetare
    writeFileSync(join(backupDir, WATERMARK), '{"lastValue": "x"}');
    const corrupt = run(['markers:rebuild-counter', '--from-db']);
    assert.equal(corrupt.status, 1, corrupt.stderr);
    assert.match(corrupt.stderr, /corupt/);
    assert.equal(readFileSync(join(backupDir, WATERMARK), 'utf8'), '{"lastValue": "x"}');
    writeFileSync(join(backupDir, WATERMARK), JSON.stringify({ lastValue: top.number }) + '\n');
  });

  it('fără BACKUP_DIR configurat → cod 2, nimic scris', () => {
    const res = run(['markers:rebuild-counter', '--from-db'], { BACKUP_DIR: undefined });
    assert.equal(res.status, 2, res.stderr);
    assert.match(res.stderr, /BACKUP_DIR nu este configurat/);
  });
});

// ——— testele lipsă din auditul local (`06`, A2 și A8), aprobate la 11.10.2026 ———

describe('A2: marcajul contorului corupt → refuz la depunere și la pornire; fișierul rămâne neatins', () => {
  it('depunerea prin rută → 500; nimic emis; fișierul corupt neschimbat', async () => {
    const c = await flow.citizen('a2-corupt@exemplu.test');
    const good = await flow.submitOk(c);
    const file = join(backupDir, WATERMARK);
    const bad = '{"lastValue": "șapte"}';
    writeFileSync(file, bad);
    try {
      const counter0 = await flow.counter();
      const reports0 = (await rowCounts(h.pool)).reports;
      const res = await flow.submit(c);
      assert.equal(res.statusCode, 500, res.body);
      assert.ok(!res.body.includes(root), 'răspunsul nu conține calea directorului');
      assert.equal(await flow.counter(), counter0, 'contorul nu a avansat');
      assert.equal((await rowCounts(h.pool)).reports, reports0, 'nicio sesizare salvată');
      assert.equal(readFileSync(file, 'utf8'), bad, 'fișierul corupt nu a fost suprascris');
    } finally {
      writeFileSync(file, JSON.stringify({ lastValue: good.number }) + '\n');
    }
    assert.equal((await flow.submitOk(c)).number, good.number + 1, 'după repararea fișierului, numerotarea continuă');
  });

  it('pornirea reală a aplicației (proces) → refuz cu mesaj explicit; fișierul corupt neschimbat', async () => {
    const file = join(backupDir, WATERMARK);
    const original = readFileSync(file, 'utf8');
    writeFileSync(file, 'nu este JSON');
    try {
      const start = run([], { PORT: '39876' });
      assert.equal(start.status, 1, start.stderr);
      assert.match(start.stderr, /Aplicația nu pornește: marcajele din BACKUP_DIR nu pot fi folosite/);
      assert.match(start.stderr, /este corupt/);
      assert.equal(readFileSync(file, 'utf8'), 'nu este JSON');
    } finally {
      writeFileSync(file, original);
    }
  });
});

describe('A8: ridicarea contorului de către backup este consemnată în ieșirea comenzii', () => {
  it('backup:db cu contorul sub marcaj → linie explicită, contor ridicat; fără ridicare → nicio linie', async () => {
    const w = watermarkOnDisk(backupDir)!;
    await h.pool.query('UPDATE report_counter SET `last_value` = ? WHERE id = 1', [w - 2]);
    const res = run(['backup:db']);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, new RegExp(`contorul TM din bază \\(${w - 2}\\) era sub marcajul durabil; a fost ridicat la ${w} înainte de copie`));
    assert.equal(await flow.counter(), w);
    const again = run(['backup:db']);
    assert.equal(again.status, 0, again.stderr);
    assert.doesNotMatch(again.stdout, /era sub marcajul durabil/);
  });
});

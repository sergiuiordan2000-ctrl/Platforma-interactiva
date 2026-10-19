// Etapa 7, 7A — auditul D7-3 (16.10.2026): intențiile de ștergere a conturilor și reconcilierea.
//
// Înainte de COMMIT se scrie numai o INTENȚIE (`account-deletions-pending/`); după COMMIT, intenția devine
// marcaj definitiv (`account-deletions/`). O intenție rămasă este rezolvată de reconciliere: contul există
// (creat înaintea intenției) → tranzacția nu a fost confirmată → intenția se elimină; contul lipsește →
// marcaj definitiv; contul creat după intenție → rămâne, raportat; eroare → intenția rămâne neschimbată.
// La restaurare, intențiile nereconciliate NU se aplică (decizia B), se raportează; una coruptă → refuz
// înaintea oricărei scrieri. R19: gardă statică pentru filtrele interogării UPDATE.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import mysql from 'mysql2/promise';
import { deleteCitizenAccountRows, reconcileAccountDeletionIntents } from '../../src/db/accountDeletion.ts';
import { R18_UNRECONCILED_WARNING, RestoreRefusedError, createBackup, formatRestoreAftercare, inspectRestore, restoreBackup, type RestoreOptions } from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { ACCOUNT_DELETIONS_DIR, ACCOUNT_DELETIONS_PENDING_DIR, promoteAccountDeletionIntent, recordAccountDeletionIntent } from '../../src/db/markers.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers } from '../../src/db/reportCounter.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { newId } from '../../src/ids.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { reportFlow, rowCounts, snapshotDir, type Flow } from '../helpers/reportFlow.ts';

const DAY = 86_400_000;
let h: DbHandle;
let app: FastifyInstance;
let root: string;
let backupDir: string;
let flow: Flow;
let copyDir: string; // copia folosită de testele de restaurare
const clock = new Clock();
let seq = 0;

const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
const pending = (id: string) => join(backupDir, ACCOUNT_DELETIONS_PENDING_DIR, `${id}.json`);
const final = (id: string) => join(backupDir, ACCOUNT_DELETIONS_DIR, `${id}.json`);
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const accountExists = async (id: string) => ((await h.pool.query('SELECT id FROM citizen_accounts WHERE id = ?', [id]))[0] as unknown[]).length === 1;
const marker = () => ({ backupDir, now: clock.now() });
/** Decizia B: niciun ID intern (ULID) în mesajele pentru operator. */
const ULID_RE = /[0-9A-HJKMNP-TV-Z]{26}/;

/** Un cont real (prin ruta de autentificare); întoarce ID-ul intern. */
async function account(label: string): Promise<string> {
  const email = `d73i-${label}@exemplu.test`;
  await flow.citizen(email);
  clock.advanceMinutes(1);
  const [rows] = await h.pool.query('SELECT id FROM citizen_accounts WHERE email_normalized = ?', [email]);
  return (rows as Array<{ id: string }>)[0]!.id;
}

/** Pornește o ștergere în tranzacție și o lasă deschisă (blocarea și intenția sunt deja luate / scrise). */
async function openDeletion(id: string): Promise<mysql.PoolConnection> {
  const conn = await h.pool.getConnection();
  try {
    await conn.beginTransaction();
    assert.equal(await deleteCitizenAccountRows(conn, id, { marker: marker() }), 'deleted');
    assert.ok(existsSync(pending(id)), 'intenția este scrisă înainte de COMMIT');
    assert.ok(!existsSync(final(id)), 'niciun marcaj definitiv înainte de COMMIT');
  } catch (err) {
    // un eșec aici nu lasă blocarea rândului deschisă (testele următoare ar aștepta la nesfârșit)
    await conn.rollback().catch(() => {});
    conn.release();
    throw err;
  }
  return conn;
}

async function settledWithin(p: Promise<unknown>, ms: number): Promise<boolean> {
  let done = false;
  void p.then(() => (done = true), () => (done = true));
  await new Promise((r) => setTimeout(r, ms));
  return done;
}

const restoreOpts = (over: Partial<RestoreOptions> = {}): RestoreOptions => ({
  databaseUrl: testDatabaseUrl(),
  backupDir,
  storageDir: join(root, `restaurat-${++seq}`),
  migrationsDir: MIGRATIONS_DIR,
  retentionDays: 45,
  adminRetentionMonths: 6,
  now: new Date(clock.now().getTime() + DAY),
  source: copyDir,
  ...over,
});

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-d73i-'));
  const storage = join(root, 'storage');
  backupDir = join(root, 'backups');
  mkdirSync(storage, { recursive: true });
  await initBackupMarkers(h.pool, backupDir);
  ({ app } = await makeApp(h, clock, { STORAGE_DIR: storage, BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);
});

after(async () => {
  await app?.close();
  await h?.close();
  rmSync(root, { recursive: true, force: true });
});

describe('intenția de ștergere și reconcilierea', { timeout: 120_000 }, () => {
  it('I1: eroare reală a bazei după scrierea intenției (așteptare de blocare depășită) → rollback; reconcilierea elimină intenția; nimic definitiv', async () => {
    const id = await account('i1');
    const block = newId(clock.now());
    await h.pool.query("INSERT INTO citizen_blocks (id, account_id, kind, starts_at, ends_at, email_hash) VALUES (?, ?, 'permanent', ?, NULL, ?)", [block, id, clock.now(), 'b'.repeat(64)]);
    const holder = await h.pool.getConnection();
    const conn = await h.pool.getConnection();
    try {
      await holder.beginTransaction();
      await holder.query('SELECT id FROM citizen_blocks WHERE id = ? FOR UPDATE', [block]); // ștergerea va aștepta aici
      await conn.query('SET SESSION innodb_lock_wait_timeout = 1');
      await conn.beginTransaction();
      await assert.rejects(deleteCitizenAccountRows(conn, id, { marker: marker() }), (err: { code?: string }) => err.code === 'ER_LOCK_WAIT_TIMEOUT');
      await conn.rollback(); // ca ruta
    } finally {
      await holder.rollback();
      holder.release();
      await conn.query('SET SESSION innodb_lock_wait_timeout = DEFAULT').catch(() => {});
      conn.release();
    }
    assert.ok(await accountExists(id), 'contul a rămas');
    assert.ok(existsSync(pending(id)), 'intenția a rămas pe disc');
    assert.ok(!existsSync(final(id)), 'niciun marcaj definitiv');
    const r = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.deepEqual(r, { confirmed: 0, discarded: 1, keptCreatedAfter: 0, errors: 0, invalid: 0 });
    assert.ok(!existsSync(pending(id)) && !existsSync(final(id)));
    assert.ok(await accountExists(id));
  });

  it('I2: oprire bruscă înainte de COMMIT (conexiunea distrusă) → baza anulează; reconcilierea elimină intenția', async () => {
    const id = await account('i2');
    const conn = await openDeletion(id);
    conn.destroy(); // procesul „moare”: serverul anulează tranzacția deschisă
    await new Promise((r) => setTimeout(r, 200));
    assert.ok(await accountExists(id), 'ștergerea nu a fost confirmată');
    const r = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.equal(r.discarded, 1, JSON.stringify(r));
    assert.ok(!existsSync(pending(id)) && !existsSync(final(id)));
  });

  it('I3: oprire după COMMIT, înainte de mutare → reconcilierea confirmă: marcaj definitiv exact; repetată, nu mai face nimic', async () => {
    const id = await account('i3');
    const conn = await openDeletion(id);
    await conn.commit(); // fără mutarea intenției: procesul se oprește aici
    conn.release();
    assert.ok(!(await accountExists(id)));
    const r1 = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.deepEqual(r1, { confirmed: 1, discarded: 0, keptCreatedAfter: 0, errors: 0, invalid: 0 });
    assert.ok(!existsSync(pending(id)));
    const entry = JSON.parse(readFileSync(final(id), 'utf8')) as Record<string, unknown>;
    assert.deepEqual(Object.keys(entry).sort(), ['accountId', 'deletedAt']);
    assert.equal(entry.accountId, id);
    const r2 = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.deepEqual(r2, { confirmed: 0, discarded: 0, keptCreatedAfter: 0, errors: 0, invalid: 0 }, 'idempotentă');
    assert.ok(existsSync(final(id)));
  });

  it('I3b: mutarea întreruptă (intenția și marcajul definitiv prezente amândouă) → reconcilierea lasă un singur marcaj definitiv', async () => {
    const id = await account('i3b');
    const conn = await openDeletion(id);
    await conn.commit();
    conn.release();
    writeFileSync(final(id), readFileSync(pending(id))); // starea unei mutări neterminate (copie fără ștergerea sursei)
    const r = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.equal(r.confirmed, 1);
    assert.ok(!existsSync(pending(id)) && existsSync(final(id)));
  });

  it('I4: erori (baza inaccesibilă; mutarea imposibilă) → intenția rămâne neschimbată și nu devine definitivă; reîncercarea reușește', async () => {
    const id = await account('i4');
    const conn = await openDeletion(id);
    await conn.commit();
    conn.release();
    const before = sha(pending(id));
    // a) baza inaccesibilă
    const dead = mysql.createPool({ uri: 'mysql://nimeni:x@127.0.0.1:1/nu', connectionLimit: 1, connectTimeout: 1000 });
    try {
      const r = await reconcileAccountDeletionIntents(dead, backupDir);
      assert.equal(r.errors, 1, JSON.stringify(r));
      assert.equal(r.confirmed + r.discarded, 0);
    } finally {
      await dead.end().catch(() => {});
    }
    assert.equal(sha(pending(id)), before, 'intenția neschimbată');
    assert.ok(!existsSync(final(id)));
    // b) mutarea imposibilă: în locul marcajului definitiv se află un director
    mkdirSync(final(id));
    const r2 = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.equal(r2.errors, 1, JSON.stringify(r2));
    assert.equal(sha(pending(id)), before, 'intenția neschimbată');
    rmSync(final(id), { recursive: true });
    assert.ok(!existsSync(final(id)));
    // c) reîncercarea
    const r3 = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.equal(r3.confirmed, 1, JSON.stringify(r3));
    assert.ok(existsSync(final(id)) && !existsSync(pending(id)));
  });

  for (const outcome of ['commit', 'rollback'] as const) {
    it(`I5: reconcilierea pornită în timpul unei ștergeri deschise AȘTEAPTĂ blocarea; după ${outcome.toUpperCase()} decide corect`, async () => {
      const id = await account(`i5${outcome}`);
      const conn = await openDeletion(id);
      const rec = reconcileAccountDeletionIntents(h.pool, backupDir);
      assert.equal(await settledWithin(rec, 400), false, 'reconcilierea așteaptă blocarea rândului');
      assert.ok(existsSync(pending(id)) && !existsSync(final(id)), 'intenția neatinsă cât timp ștergerea este deschisă');
      if (outcome === 'commit') await conn.commit();
      else await conn.rollback();
      conn.release();
      const r = await rec;
      if (outcome === 'commit') {
        assert.equal(r.confirmed, 1, JSON.stringify(r));
        assert.ok(existsSync(final(id)) && !existsSync(pending(id)));
      } else {
        assert.equal(r.discarded, 1, JSON.stringify(r));
        assert.ok(!existsSync(final(id)) && !existsSync(pending(id)));
        assert.ok(await accountExists(id));
      }
    });
  }

  it('I5b: două reconcilieri concurente pe aceeași intenție → un singur marcaj definitiv, nicio eroare', async () => {
    const id = await account('i5b');
    const conn = await openDeletion(id);
    await conn.commit();
    conn.release();
    const [a, b] = await Promise.all([reconcileAccountDeletionIntents(h.pool, backupDir), reconcileAccountDeletionIntents(h.pool, backupDir)]);
    assert.equal(a.confirmed + b.confirmed, 1, JSON.stringify([a, b]));
    assert.equal(a.errors + b.errors, 0, JSON.stringify([a, b]));
    assert.ok(existsSync(final(id)) && !existsSync(pending(id)));
  });

  it('I8: contul există, dar a fost creat DUPĂ data intenției → nu se șterge, intenția rămâne, cazul se raportează', async () => {
    const id = await account('i8');
    recordAccountDeletionIntent(backupDir, id, new Date(clock.now().getTime() - 30 * DAY)); // intenție „mai veche” decât contul
    const r = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.equal(r.keptCreatedAfter, 1, JSON.stringify(r));
    assert.ok(await accountExists(id));
    assert.ok(existsSync(pending(id)) && !existsSync(final(id)));
    rmSync(pending(id)); // curățenie pentru testele următoare
  });

  it('I9: backup refuzat la o intenție ilizibilă — înaintea oricărei scrieri: copiile existente și rotația neatinse; mesajul fără ID', async () => {
    await createBackup({ ...restoreOpts(), now: clock.now() }); // o copie existentă
    const old = join(backupDir, 'civic-backup-20260901T030000000Z'); // o copie de peste 7 zile: rotația ar șterge-o
    mkdirSync(old);
    const bad = newId(clock.now());
    writeFileSync(join(backupDir, ACCOUNT_DELETIONS_PENDING_DIR, `${bad}.json`), '{ilizibil');
    const before = snapshotDir(backupDir);
    clock.advanceMinutes(5);
    await assert.rejects(createBackup({ ...restoreOpts(), now: clock.now() }), (err: Error) => {
      assert.match(err.message, /Backup refuzat: 1 intenții de ștergere a conturilor ilizibile/);
      assert.doesNotMatch(err.message, ULID_RE, 'fără ID în mesaj');
      return true;
    });
    assert.deepEqual(snapshotDir(backupDir), before, 'BACKUP_DIR neschimbat: nicio copie nouă, niciun temporar, rotația neexecutată');
    rmSync(join(backupDir, ACCOUNT_DELETIONS_PENDING_DIR, `${bad}.json`));
    rmSync(old, { recursive: true });
  });

  it('I9b: eroare temporară de reconciliere (așteptare de blocare depășită, ~50 s) → backup-ul continuă; intenția păstrată; copia coerentă', async () => {
    const id = await account('i9b');
    recordAccountDeletionIntent(backupDir, id, clock.now()); // ștergere începută, neconfirmată
    const before = sha(pending(id));
    const holder = await h.pool.getConnection();
    let res: Awaited<ReturnType<typeof createBackup>>;
    try {
      await holder.beginTransaction();
      await holder.query('SELECT id FROM citizen_accounts WHERE id = ? FOR UPDATE', [id]); // reconcilierea va aștepta aici
      clock.advanceMinutes(5);
      res = await createBackup({ ...restoreOpts(), now: clock.now() });
    } finally {
      await holder.rollback();
      holder.release();
    }
    assert.equal(res.accountIntents.errors, 1, JSON.stringify(res.accountIntents));
    assert.equal(sha(pending(id)), before, 'intenția păstrată neschimbată');
    assert.ok(!existsSync(final(id)), 'niciun marcaj definitiv fără confirmare');
    assert.ok(gunzipSync(readFileSync(join(res.dir, 'db.jsonl.gz'))).toString('utf8').includes(id), 'copia: contul (neșters) este în ea, ca în bază');
    const snap = JSON.parse(readFileSync(join(res.dir, 'markers.json'), 'utf8')) as { accountDeletions: Array<{ accountId: string }> };
    assert.ok(!snap.accountDeletions.some((e) => e.accountId === id), 'fotografia nu conține intenția ca marcaj');
    const r = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.equal(r.discarded, 1, 'rulare ulterioară: intenția rezolvată');
    assert.ok(!existsSync(pending(id)) && (await accountExists(id)));
  });

  it('I11: ruta — mutarea intenției după COMMIT eșuează → 204; intenția rămâne; reconcilierea o promovează; mesajul de eroare fără ID', async () => {
    const email = 'd73i-ruta-esec@exemplu.test';
    const c = await flow.citizen(email);
    const [rows] = await h.pool.query('SELECT id FROM citizen_accounts WHERE email_normalized = ?', [email]);
    const id = (rows as Array<{ id: string }>)[0]!.id;
    mkdirSync(final(id)); // mutarea va eșua
    assert.equal((await c.send('DELETE', '/api/v1/citizen/account')).statusCode, 204, 'ștergerea confirmată rămâne confirmată');
    assert.ok(!(await accountExists(id)));
    assert.ok(existsSync(pending(id)), 'intenția rămâne disponibilă');
    // mesajul erorii de mutare (jurnalizat de rută numai prin cod) nu conține ID-ul
    assert.throws(() => promoteAccountDeletionIntent(backupDir, id), (err: Error) => !ULID_RE.test(err.message));
    rmSync(final(id), { recursive: true });
    const r = await reconcileAccountDeletionIntents(h.pool, backupDir);
    assert.equal(r.confirmed, 1, JSON.stringify(r));
    assert.ok(existsSync(final(id)) && !existsSync(pending(id)));
    const entry = JSON.parse(readFileSync(final(id), 'utf8')) as Record<string, unknown>;
    assert.deepEqual(Object.keys(entry).sort(), ['accountId', 'deletedAt']);
  });

  it('ruta: ștergerea confirmată → marcaj definitiv, nicio intenție rămasă', async () => {
    const email = 'd73i-ruta@exemplu.test';
    const c = await flow.citizen(email);
    const [rows] = await h.pool.query('SELECT id FROM citizen_accounts WHERE email_normalized = ?', [email]);
    const id = (rows as Array<{ id: string }>)[0]!.id;
    assert.equal((await c.send('DELETE', '/api/v1/citizen/account')).statusCode, 204);
    assert.ok(existsSync(final(id)) && !existsSync(pending(id)));
  });
});

describe('restaurarea cu intenții nereconciliate (decizia B) și intenții corupte', { timeout: 120_000 }, () => {
  let keptId: string;

  before(async () => {
    keptId = await account('restaurare');
    copyDir = (await createBackup({ ...restoreOpts(), now: clock.now() })).dir;
    // după copie: o ștergere începută și întreruptă înainte de reconciliere (baza se pierde înainte de backup)
    recordAccountDeletionIntent(backupDir, keptId, clock.now());
  });

  it('I6: intenția nereconciliată NU se aplică: contul rămâne; cazul se raportează separat; fișierul rămâne neatins', async () => {
    const before = sha(pending(keptId));
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    const o = restoreOpts();
    const i = await inspectRestore(o);
    assert.deepEqual(i.problems, []);
    assert.deepEqual(i.markers.unreconciledIntentIds, [keptId]);
    assert.equal(i.markers.unreconciledIntentsInCopy, 1);
    assert.ok(i.warnings.some((w) => w.includes(R18_UNRECONCILED_WARNING)), i.warnings.join('\n'));
    assert.equal(
      R18_UNRECONCILED_WARNING,
      'Starea ștergerii este necunoscută: poate fi o ștergere anulată sau o ștergere confirmată înainte de reconciliere. Contul rămâne în baza de date; administratorul trebuie să investigheze situația și să decidă ce urmează.',
    );
    assert.ok(!i.warnings.join('\n').match(ULID_RE), 'fără ID în avertismente');
    const res = await restoreBackup(o);
    assert.equal(res.unreconciledIntents, 1);
    assert.equal(res.accountsKeptUnreconciled, 1);
    const report = formatRestoreAftercare(res).join('\n');
    assert.ok(report.includes(R18_UNRECONCILED_WARNING), report);
    assert.doesNotMatch(report, ULID_RE, 'fără ID în raport');
    assert.ok(await accountExists(keptId), 'contul NU a fost șters');
    assert.equal(sha(pending(keptId)), before, 'restaurarea nu atinge intenția');
    const [[s]] = (await h.pool.query("SELECT details FROM audit_log WHERE action = 'restore.completed'")) as unknown as [[{ details: Record<string, unknown> }]];
    assert.equal(s.details.unreconciledIntents, 1);
    assert.equal(s.details.accountsKeptUnreconciled, 1);
    assert.ok(!JSON.stringify(s.details).includes('@'));
  });

  it('I7: o intenție coruptă → refuz explicit, înaintea oricărei scrieri (bază, fișiere, BACKUP_DIR)', async () => {
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    writeFileSync(join(backupDir, ACCOUNT_DELETIONS_PENDING_DIR, `${newId(clock.now())}.json`), '{corupt');
    const snap = snapshotDir(backupDir);
    const o = restoreOpts();
    const i = await inspectRestore(o);
    assert.ok(i.problems.some((p) => p.includes(ACCOUNT_DELETIONS_PENDING_DIR) && p.includes('1 fișiere')), i.problems.join('\n'));
    assert.doesNotMatch(i.problems.join('\n'), ULID_RE, 'fără ID în mesaje (decizia B)');
    await assert.rejects(restoreBackup(o), RestoreRefusedError);
    assert.equal(sum(await rowCounts(h.pool)), 0, 'baza țintă a rămas goală');
    assert.ok(!existsSync(o.storageDir), 'directorul de fișiere nu a fost creat');
    assert.deepEqual(snapshotDir(backupDir), snap, 'BACKUP_DIR neschimbat');
  });
});

describe('R19: gardă statică pentru interogarea UPDATE a mesajelor reținute', () => {
  it('I10: UPDATE … status = \'failed\' filtrează explicit tipurile și stările permise', () => {
    const src = readFileSync(join(import.meta.dirname, '..', '..', 'src', 'db', 'backup.ts'), 'utf8');
    const updates = [...src.matchAll(/`(UPDATE email_outbox SET status = 'failed'[\s\S]*?)`/g)].map((m) => m[1]!.replace(/\s+/g, ' '));
    assert.equal(updates.length, 1, 'o singură interogare de reținere');
    const where = updates[0]!.slice(updates[0]!.indexOf(' WHERE '));
    const list = (col: string) => {
      const m = new RegExp(`\\b${col} IN \\(([^)]*)\\)`).exec(where);
      return m ? m[1]!.split(',').map((x) => x.trim().replace(/'/g, '')).sort() : null;
    };
    assert.deepEqual(list('kind'), ['citizen_status_update', 'registry_notification'], `filtrul de tip: ${where}`);
    assert.deepEqual(list('status'), ['on_hold', 'queued', 'sending'], `filtrul de stare: ${where}`);
    assert.doesNotMatch(where, /\bOR\b/i, 'fără ramuri care ar ocoli filtrele');
  });
});

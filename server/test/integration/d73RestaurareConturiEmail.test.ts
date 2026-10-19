// Etapa 7, 7A — D7-3 (R18 + R19), decizii ale proprietarului din 16.10.2026:
//
// R18 (A) + D7-3a (A): contul de cetățean șters de titular nu reapare după o restaurare. Marcajul
// `account-deletions/<ID>.json` are numai `accountId` și `deletedAt`, se scrie înainte de COMMIT și nu
// expiră. Restaurarea repetă ștergerea (aceeași funcție ca ruta), numai după ID și numai pentru un cont
// creat înaintea ștergerii notate. `civic-markers/1` rămâne restaurabil; un marcaj corupt → refuz, fără
// nicio scriere (validarea integrală se face înaintea primei scrieri).
//
// R19 (B): la restaurare, codurile de autentificare și anunțurile de blocare neplecate → `cancelled`;
// mesajele sesizărilor `queued` / `sending` / `on_hold` → `failed` cu motivul aprobat, fără nicio
// retrimitere automată; numai reîncercarea unui super_admin le trimite.
//
// Scenariul: copia B1 (conturile A, B, X; coada în toate stările) → A își șterge contul → A se
// înregistrează din nou cu aceeași adresă (cont nou, alt ID) → copia B2.

import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { bootstrapAdmin } from '../../src/accounts.ts';
import type { AppContext } from '../../src/context.ts';
import {
  R19_CANCELLED_REASON,
  R19_HELD_REASON,
  RestoreRefusedError,
  createBackup,
  formatRestoreAftercare,
  inspectRestore,
  restoreBackup,
  type RestoreOptions,
  type RestoreResult,
} from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { ACCOUNT_DELETIONS_DIR, ACCOUNT_DELETIONS_PENDING_DIR, promoteAccountDeletionIntent, recordAccountDeletionIntent } from '../../src/db/markers.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers } from '../../src/db/reportCounter.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { newId } from '../../src/ids.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { processDue, processOne, releaseOnHold } from '../../src/reports/outbox.ts';
import { setSetting } from '../../src/settings.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { V1, reportFlow, rowCounts, snapshotDir, type Flow } from '../helpers/reportFlow.ts';

const DAY = 86_400_000;
const SRC = join(import.meta.dirname, '..', '..', 'src');
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
let root: string;
let storage: string;
let backupDir: string;
let flow: Flow;
let b1: string;
let b2: string;
let seq = 0;
const clock = new Clock();

const EMAIL_A = 'd73-a@exemplu.test';
const EMAIL_B = 'd73-b@exemplu.test';
const EMAIL_X = 'd73-x@exemplu.test';
let idA: string; // contul șters de titular după B1
let idA2: string; // contul nou al aceleiași persoane, după ștergere
let idB: string; // cont neatins
let idX: string; // cont cu ID-ul unui marcaj, dar creat DUPĂ ștergerea notată (T12)
let repA: { id: string; ref: string };
const repB: Array<{ id: string; ref: string }> = [];
let blockA: string;
/** ID-urile mesajelor puse în coadă înainte de B1, după rol */
const mail: Record<string, string> = {};

const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
const accountId = async (email: string) => (await q<{ id: string }>('SELECT id FROM citizen_accounts WHERE email_normalized = ?', [email]))[0]?.id;
const restoreNow = () => new Date(clock.now().getTime() + DAY);
const opts = (over: Partial<RestoreOptions> = {}): RestoreOptions => ({
  databaseUrl: testDatabaseUrl(),
  backupDir,
  storageDir: join(root, `restaurat-${++seq}`),
  migrationsDir: MIGRATIONS_DIR,
  retentionDays: 45,
  adminRetentionMonths: 6,
  now: restoreNow(),
  source: b1,
  ...over,
});

async function emptyTarget(): Promise<void> {
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  assert.equal(sum(await rowCounts(h.pool)), 0);
}

async function enqueue(
  role: string,
  f: { kind: string; reportId?: string | null; recipient: string; status: string; dedupe?: string; lockedUntil?: Date; lastError?: string; nextAttemptAt?: Date; attempts?: number },
) {
  const id = newId(clock.now());
  await h.pool.query(
    `INSERT INTO email_outbox (id, kind, report_id, dedupe_key, recipient, subject, body_text, status, attempts, next_attempt_at, locked_until, last_error, mode_at_send, created_at)
     VALUES (?, ?, ?, ?, ?, 'Subiect', 'corp', ?, ?, ?, ?, ?, 'simulated', ?)`,
    [id, f.kind, f.reportId ?? null, f.dedupe ?? null, f.recipient, f.status, f.attempts ?? 0, f.nextAttemptAt ?? null, f.lockedUntil ?? null, f.lastError ?? null, clock.now()],
  );
  mail[role] = id;
}

/** T15: rândul complet al unui mesaj (câmpurile pe care restaurarea le-ar putea schimba). */
const fullMailRow = async (id: string) =>
  (await q('SELECT id, kind, report_id, dedupe_key, recipient, subject, body_text, status, attempts, next_attempt_at, locked_until, last_error, mode_at_send, created_at, sent_at FROM email_outbox WHERE id = ?', [id]))[0];
let offTypeBefore: unknown; // T15: rândul mesajului de alt tip, citit înainte de copie

const mailRow = async (id: string) =>
  (await q<{ status: string; last_error: string | null; locked_until: Date | null }>('SELECT status, last_error, locked_until FROM email_outbox WHERE id = ?', [id]))[0];

/** Un BACKUP_DIR de lucru, copie a celui real (pentru variantele „după accident”). */
function workDir(): string {
  const dir = join(root, `bd-${++seq}`);
  cpSync(backupDir, dir, { recursive: true });
  return dir;
}

/** Rescrie `markers.json` dintr-o copie și suma lui din manifest (fotografie validă, conținut ales de test). */
function rewriteSnapshot(copyDir: string, content: unknown): void {
  const text = JSON.stringify(content) + '\n';
  writeFileSync(join(copyDir, 'markers.json'), text);
  const m = JSON.parse(readFileSync(join(copyDir, 'manifest.json'), 'utf8')) as Record<string, unknown>;
  m.markersSha256 = createHash('sha256').update(text).digest('hex');
  writeFileSync(join(copyDir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-d73-'));
  storage = join(root, 'storage');
  backupDir = join(root, 'backups');
  mkdirSync(storage, { recursive: true });
  await initBackupMarkers(h.pool, backupDir);
  ({ app, ctx } = await makeApp(h, clock, { STORAGE_DIR: storage, BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);

  const a = await flow.citizen(EMAIL_A);
  repA = await flow.submitOk(a);
  const b = await flow.citizen(EMAIL_B);
  for (let i = 0; i < 3; i++) repB.push(await flow.submitOk(b));
  idA = (await accountId(EMAIL_A))!;
  idB = (await accountId(EMAIL_B))!;
  await processDue(ctx, 500); // codurile de autentificare ale testului: plecate (simulat) înainte de copie
  assert.equal((await q("SELECT id FROM email_outbox WHERE status IN ('queued', 'sending', 'on_hold')")).length, 0);

  // blocarea definitivă a lui A (în copie, cu notă internă)
  blockA = newId(clock.now());
  await h.pool.query(
    "INSERT INTO citizen_blocks (id, account_id, kind, starts_at, ends_at, note, email_hash) VALUES (?, ?, 'permanent', ?, NULL, 'notă internă', ?)",
    [blockA, idA, clock.now(), 'a'.repeat(64)],
  );
  // coada lui A: stadiu neplecat + anunț de blocare neplecat
  await enqueue('aStatus', { kind: 'citizen_status_update', reportId: repA.id, recipient: EMAIL_A, status: 'queued', dedupe: `status:${repA.id}:in_analysis` });
  await enqueue('aBlocked', { kind: 'citizen_account_blocked', recipient: EMAIL_A, status: 'queued' });
  // coada lui B, în toate stările (R19)
  const past = new Date(clock.now().getTime() - 60_000);
  await enqueue('bCodeQueued', { kind: 'citizen_login_code', recipient: EMAIL_B, status: 'queued' });
  await enqueue('bCodeSending', { kind: 'citizen_login_code', recipient: EMAIL_B, status: 'sending', lockedUntil: past });
  await enqueue('bBlockedQueued', { kind: 'citizen_account_blocked', recipient: EMAIL_B, status: 'queued' });
  await enqueue('regQueued', { kind: 'registry_notification', reportId: repB[0]!.id, recipient: 'primarie@exemplu.test', status: 'queued', dedupe: `registry:${repB[0]!.id}` });
  await enqueue('regSending', { kind: 'registry_notification', reportId: repB[1]!.id, recipient: 'primarie@exemplu.test', status: 'sending', lockedUntil: past, dedupe: `registry:${repB[1]!.id}` });
  await enqueue('regOnHold', { kind: 'registry_notification', reportId: repB[2]!.id, recipient: 'primarie@exemplu.test', status: 'on_hold', dedupe: `registry:${repB[2]!.id}` });
  await enqueue('statusQueued', { kind: 'citizen_status_update', reportId: repB[0]!.id, recipient: EMAIL_B, status: 'queued', dedupe: `status:${repB[0]!.id}:in_analysis` });
  // T11: stări finale, neatinse
  await enqueue('statusSent', { kind: 'citizen_status_update', reportId: repB[1]!.id, recipient: EMAIL_B, status: 'sent', dedupe: `status:${repB[1]!.id}:in_analysis` });
  await enqueue('statusFailed', { kind: 'citizen_status_update', reportId: repB[2]!.id, recipient: EMAIL_B, status: 'failed', lastError: 'eroare SMTP 550', dedupe: `status:${repB[2]!.id}:in_analysis` });
  await enqueue('statusCancelled', { kind: 'citizen_status_update', reportId: repB[0]!.id, recipient: EMAIL_B, status: 'cancelled', lastError: 'plafon D9-4 depășit', dedupe: `status:${repB[0]!.id}:resolved` });
  await enqueue('codeSimulated', { kind: 'citizen_login_code', recipient: EMAIL_B, status: 'simulated' });
  // T15: un mesaj cu `report_id` completat, de alt tip decât cele două permise de D7-3 / R19, în starea `queued`.
  // `next_attempt_at` în viitor (procesarea din T8 nu îl atinge) și o încercare anterioară, ca să se vadă că nu se golesc.
  await enqueue('offTypeWithReport', {
    kind: 'citizen_account_blocked',
    reportId: repB[0]!.id,
    recipient: EMAIL_B,
    status: 'queued',
    attempts: 1,
    lastError: 'eroare anterioară',
    nextAttemptAt: new Date(clock.now().getTime() + 30 * DAY),
  });
  offTypeBefore = await fullMailRow(mail.offTypeWithReport!);

  // T12: un marcaj pentru ID-ul X, notat ÎNAINTE de crearea contului X (cont distinct, creat după „ștergere”)
  idX = newId(clock.now());
  recordAccountDeletionIntent(backupDir, idX, new Date(clock.now().getTime() - DAY));
  promoteAccountDeletionIntent(backupDir, idX); // marcaj definitiv
  await h.pool.query(
    "INSERT INTO citizen_accounts (id, email, email_normalized, status, policy_version, policy_accepted_at, confirmed_at, created_at) VALUES (?, ?, ?, 'active', 'v1', ?, ?, ?)",
    [idX, EMAIL_X, EMAIL_X, clock.now(), clock.now(), clock.now()],
  );

  clock.advanceMinutes(1);
  b1 = (await createBackup({ ...opts(), now: clock.now() })).dir;

  // după B1: blocarea lui A ridicată în baza vie (ruta de ștergere nu este testată aici), apoi A își șterge contul
  await h.pool.query('DELETE FROM citizen_blocks WHERE id = ?', [blockA]);
  clock.advanceMinutes(60);
  const del = await a.send('DELETE', `${V1}/citizen/account`);
  assert.equal(del.statusCode, 204, del.body);
  assert.equal(await accountId(EMAIL_A), undefined);

  // T13: aceeași persoană revine cu aceeași adresă → cont nou, cu alt ID
  clock.advanceMinutes(60);
  await flow.citizen(EMAIL_A);
  idA2 = (await accountId(EMAIL_A))!;
  await processDue(ctx, 500);
  clock.advanceMinutes(1);
  b2 = (await createBackup({ ...opts(), now: clock.now() })).dir;
  assert.notEqual(basename(b1), basename(b2));
});

after(async () => {
  await app?.close();
  await h?.close();
  rmSync(root, { recursive: true, force: true });
});

describe('R18: marcajul de ștergere a contului (ruta)', () => {
  it('T2: marcajul conține numai `accountId` și `deletedAt` (fără adresă de e-mail)', () => {
    const file = join(backupDir, ACCOUNT_DELETIONS_DIR, `${idA}.json`);
    assert.ok(existsSync(file), 'marcajul există');
    const text = readFileSync(file, 'utf8');
    const entry = JSON.parse(text) as Record<string, unknown>;
    assert.deepEqual(Object.keys(entry).sort(), ['accountId', 'deletedAt']);
    assert.equal(entry.accountId, idA);
    assert.ok(!Number.isNaN(Date.parse(String(entry.deletedAt))));
    assert.ok(!text.includes('@'), 'nicio adresă în marcaj');
    assert.ok(!text.toLowerCase().includes('d73-a'), 'nicio parte a adresei în marcaj');
  });

  it('T13: noul cont al aceleiași persoane are alt ID și niciun marcaj', () => {
    assert.ok(idA2);
    assert.notEqual(idA2, idA);
    assert.ok(!existsSync(join(backupDir, ACCOUNT_DELETIONS_DIR, `${idA2}.json`)));
  });

  it('T3: intenția nu poate fi scrisă → 500; contul rămâne, niciun marcaj', async () => {
    const c = await flow.citizen('d73-c@exemplu.test');
    const idC = (await accountId('d73-c@exemplu.test'))!;
    const dir = join(backupDir, ACCOUNT_DELETIONS_PENDING_DIR);
    const away = join(root, 'account-deletions-pending-mutat');
    renameSync(dir, away); // BACKUP_DIR fără directorul intențiilor: nu se creează din mers
    try {
      const res = await c.send('DELETE', `${V1}/citizen/account`);
      assert.equal(res.statusCode, 500, res.body);
      assert.equal(await accountId('d73-c@exemplu.test'), idC, 'contul a rămas');
      assert.ok(!existsSync(dir), 'directorul nu a fost creat din mers');
    } finally {
      renameSync(away, dir);
    }
    assert.ok(!existsSync(join(dir, `${idC}.json`)), 'nicio intenție');
    assert.ok(!existsSync(join(backupDir, ACCOUNT_DELETIONS_DIR, `${idC}.json`)), 'niciun marcaj definitiv');
    // curățenie: contul C nu trebuie să intre în copiile următoare (B1, B2 sunt deja făcute)
    await h.pool.query('DELETE FROM citizen_accounts WHERE id = ?', [idC]);
  });
});

describe('R18 + R19: restaurarea copiei B1', () => {
  let res: RestoreResult;

  before(async () => {
    await emptyTarget();
    const o = opts();
    const i = await inspectRestore(o);
    assert.deepEqual(i.problems, []);
    assert.equal(i.markers.accountsToDelete, 1, '--check: contul A');
    assert.equal(i.markers.accountsKeptCreatedAfter, 1, '--check: contul X');
    res = await restoreBackup(o);
  });

  it('T1: contul șters după copie nu reapare; blocarea rămâne anonimizată; sesizarea rămâne fără autor; e-mailurile lui de cont lipsesc', async () => {
    assert.equal(res.accountsDeleted, 1);
    assert.equal((await q('SELECT id FROM citizen_accounts WHERE id = ?', [idA])).length, 0);
    const [blk] = await q<{ account_id: string | null; note: string | null; created_by: string | null; starts_at: Date | null; kind: string }>(
      'SELECT account_id, note, created_by, starts_at, kind FROM citizen_blocks WHERE id = ?',
      [blockA],
    );
    assert.deepEqual(blk, { account_id: null, note: null, created_by: null, starts_at: null, kind: 'permanent' }, 'blocarea redusă la datele minime');
    const [rep] = await q<{ a: string | null }>('SELECT author_account_id AS a FROM reports WHERE id = ?', [repA.id]);
    assert.equal(rep!.a, null, 'sesizarea rămâne, fără autor');
    assert.equal((await q("SELECT id FROM email_outbox WHERE report_id IS NULL AND recipient = ?", [EMAIL_A])).length, 0);
    // stadiul neplecat al sesizării lui A: anulat de ștergerea contului (nu „reținut” de R19)
    assert.equal((await mailRow(mail.aStatus!))!.status, 'cancelled');
  });

  it('T6: un cont fără marcaj rămâne neatins (B)', async () => {
    const [b] = await q<{ email: string; status: string }>('SELECT email_normalized AS email, status FROM citizen_accounts WHERE id = ?', [idB]);
    assert.deepEqual(b, { email: EMAIL_B, status: 'active' });
    assert.equal((await q('SELECT id FROM reports WHERE author_account_id = ?', [idB])).length, 3);
  });

  it('T12: contul cu ID-ul unui marcaj, dar creat după ștergerea notată, rămâne (și este raportat)', async () => {
    assert.equal(res.accountsKeptCreatedAfter, 1);
    const [x] = await q<{ email: string }>('SELECT email_normalized AS email FROM citizen_accounts WHERE id = ?', [idX]);
    assert.equal(x?.email, EMAIL_X);
  });

  it('T7: codurile de autentificare (queued, sending) și anunțurile de blocare neplecate → cancelled, cu motivul', async () => {
    for (const role of ['bCodeQueued', 'bCodeSending', 'bBlockedQueued']) {
      const r = (await mailRow(mail[role]!))!;
      assert.equal(r.status, 'cancelled', role);
      assert.equal(r.last_error, R19_CANCELLED_REASON, role);
      assert.equal(r.locked_until, null, role);
    }
    assert.equal(res.emailsCancelled, 3);
  });

  it('T8: mesajele sesizărilor queued / sending / on_hold → failed cu motivul exact; nimic nu pleacă, nici după reactivarea fluxului', async () => {
    const held = ['regQueued', 'regSending', 'regOnHold', 'statusQueued'];
    for (const role of held) {
      const r = (await mailRow(mail[role]!))!;
      assert.equal(r.status, 'failed', role);
      assert.equal(r.last_error, R19_HELD_REASON, role);
      assert.equal(r.locked_until, null, role);
    }
    assert.equal(R19_HELD_REASON, 'reținut la restaurare (R19): verificați dacă a plecat înainte de reîncercare');
    // procesarea cozii nu le atinge
    const out = await processDue(ctx, 500);
    assert.equal(sum(out), 0, `nimic de procesat: ${JSON.stringify(out)}`);
    for (const role of held) assert.equal((await mailRow(mail[role]!))!.status, 'failed', role);
    // reactivarea fluxului către Primărie (2.13): reia numai rândurile `on_hold`; un rând nou `on_hold`
    // (martor, creat după restaurare) este reluat, cele reținute nu
    await setSetting(h.pool, 'registry.recipient_email', 'primarie@exemplu.test', clock.now(), null);
    await setSetting(h.pool, 'registry.flow_enabled', true, clock.now(), null);
    await enqueue('martorOnHold', { kind: 'registry_notification', reportId: repA.id, recipient: 'primarie@exemplu.test', status: 'on_hold', dedupe: `registry:${repA.id}` });
    const conn = await h.pool.getConnection();
    try {
      assert.equal(await releaseOnHold(ctx, conn), 1, 'numai martorul');
    } finally {
      conn.release();
    }
    for (const role of held) assert.equal((await mailRow(mail[role]!))!.status, 'failed', role);
    await h.pool.query('DELETE FROM email_outbox WHERE id = ?', [mail.martorOnHold]);
  });

  it('T15: un mesaj cu sesizare, dar de alt tip decât registry_notification / citizen_status_update, în starea queued, rămâne neatins', async () => {
    const after = await fullMailRow(mail.offTypeWithReport!);
    assert.deepEqual(after, offTypeBefore, 'rândul complet este identic cu cel de dinaintea copiei');
    assert.equal((after as { status: string }).status, 'queued');
    assert.ok(!res.emailsHeld.some((m) => m.emailId === mail.offTypeWithReport), 'nu apare printre mesajele reținute');
    const audit = await q("SELECT id FROM audit_log WHERE action = 'email.held_on_restore' AND JSON_UNQUOTE(JSON_EXTRACT(details, '$.emailId')) = ?", [mail.offTypeWithReport]);
    assert.equal(audit.length, 0, 'nicio intrare de audit pentru el');
  });

  it('T11: mesajele deja în stări finale (sent, failed, cancelled, simulated) nu se schimbă', async () => {
    assert.deepEqual(await mailRow(mail.statusSent!), { status: 'sent', last_error: null, locked_until: null });
    assert.deepEqual(await mailRow(mail.statusFailed!), { status: 'failed', last_error: 'eroare SMTP 550', locked_until: null });
    assert.deepEqual(await mailRow(mail.statusCancelled!), { status: 'cancelled', last_error: 'plafon D9-4 depășit', locked_until: null });
    assert.deepEqual(await mailRow(mail.codeSimulated!), { status: 'simulated', last_error: null, locked_until: null });
  });

  it('T10: raportul listează mesajele reținute cu numărul TM, fără destinatar; auditul are câte o intrare pe mesaj și sinteza', async () => {
    assert.deepEqual(
      res.emailsHeld.map((m) => [m.emailId, m.kind, m.previousStatus, m.referenceNumber]).sort(),
      [
        [mail.regQueued, 'registry_notification', 'queued', repB[0]!.ref],
        [mail.regSending, 'registry_notification', 'sending', repB[1]!.ref],
        [mail.regOnHold, 'registry_notification', 'on_hold', repB[2]!.ref],
        [mail.statusQueued, 'citizen_status_update', 'queued', repB[0]!.ref],
      ].sort(),
    );
    const text = formatRestoreAftercare(res).join('\n');
    for (const m of res.emailsHeld) {
      assert.ok(text.includes(m.referenceNumber) && text.includes(m.emailId), m.emailId);
    }
    assert.ok(!text.includes('@'), 'nicio adresă de e-mail în raport');
    assert.match(text, /NU arată dacă aceste mesaje au plecat/);
    assert.match(text, /DUPLICAT/);
    const audit = await q<{ target_id: string; details: { emailId: string; kind: string; previousStatus: string } }>(
      "SELECT target_id, details FROM audit_log WHERE action = 'email.held_on_restore' AND target_type = 'report' ORDER BY id",
    );
    assert.equal(audit.length, 4);
    for (const a of audit) {
      const m = res.emailsHeld.find((x) => x.emailId === a.details.emailId)!;
      assert.ok(m, a.details.emailId);
      assert.deepEqual(Object.keys(a.details).sort(), ['emailId', 'kind', 'previousStatus']);
      assert.equal(a.details.previousStatus, m.previousStatus);
    }
    const [summary] = await q<{ details: Record<string, unknown> }>("SELECT details FROM audit_log WHERE action = 'restore.completed'");
    assert.deepEqual(summary!.details, {
      source: basename(b1),
      deletedFromList: 0,
      purgedByRetention: 0,
      accountsDeleted: 1,
      accountsKeptCreatedAfter: 1,
      unreconciledIntents: 0,
      accountsKeptUnreconciled: 0,
      emailsHeld: 4,
      emailsCancelled: 3,
    });
    assert.ok(!JSON.stringify(summary).includes('@'));
  });

  it('T9: reîncercarea din Admin a unui mesaj reținut îl trimite o singură dată și se auditează', async () => {
    const created = await bootstrapAdmin(h.pool, clock.now(), 'd73-admin@exemplu.test', 'Admin D73');
    const admin = await flow.adminFirstLogin('d73-admin@exemplu.test', created.temporaryPassword, 'Parola-Noua-D73-lunga!');
    const url = `${V1}/admin/reports/${repB[0]!.id}/emails/${mail.statusQueued}/retry`;
    const r1 = await admin.send('POST', url);
    assert.equal(r1.statusCode, 202, r1.body); // ruta pune mesajul în coadă și pornește singură procesarea (kickOutbox)
    // procesarea pornită de rută este asincronă: se așteaptă rezultatul ei (cel mult ~5 s)
    let status = '';
    for (let i = 0; i < 250 && status !== 'simulated'; i++) {
      status = (await mailRow(mail.statusQueued!))!.status;
      if (status !== 'simulated') await new Promise((r) => setTimeout(r, 20));
    }
    assert.equal(status, 'simulated', 'trimis (modul simulat) o dată');
    // a doua reîncercare: mesajul nu mai este „failed” → refuz; nimic nu mai pleacă
    assert.equal((await admin.send('POST', url)).statusCode, 409);
    assert.equal(await processOne(ctx, mail.statusQueued!), 'skipped');
    const audit = await q<{ details: { emailId?: string } | null }>("SELECT details FROM audit_log WHERE action = 'email.retry' AND target_id = ?", [repB[0]!.id]);
    assert.equal(audit.length, 1);
    // celelalte mesaje reținute rămân reținute
    for (const role of ['regQueued', 'regSending', 'regOnHold']) assert.equal((await mailRow(mail[role]!))!.status, 'failed', role);
  });
});

describe('R18: restaurarea copiei B2 (după reînregistrarea cu aceeași adresă)', () => {
  it('T13: contul nou (alt ID, aceeași adresă) rămâne neatins; marcajul vechi nu îl privește', async () => {
    await emptyTarget();
    const res = await restoreBackup(opts({ source: b2 }));
    assert.equal(res.accountsDeleted, 0, 'contul vechi nu este în B2');
    const [acc] = await q<{ id: string }>('SELECT id FROM citizen_accounts WHERE email_normalized = ?', [EMAIL_A]);
    assert.equal(acc?.id, idA2);
    assert.equal((await q('SELECT id FROM citizen_accounts WHERE id = ?', [idA])).length, 0);
  });
});

describe('R18: marcajele curente mai vechi decât o copie, formatul 1, marcaje corupte', () => {
  it('T4: G2 — intrarea lipsește din marcajele curente, dar fotografia lui B2 o are → cerere de N; cu N, contul nu reapare, iar marcajul este refăcut', async () => {
    await emptyTarget();
    const dir = workDir();
    rmSync(join(dir, ACCOUNT_DELETIONS_DIR, `${idA}.json`));
    const o = opts({ backupDir: dir, source: join(dir, basename(b1)) });
    const i = await inspectRestore(o);
    assert.deepEqual(i.markers.staleAgainst, [basename(b2)]);
    assert.equal(i.markers.snapshotOnlyAccountEntries.length, 1);
    assert.ok(i.problems.some((p) => p.includes('mai vechi decât copia')), i.problems.join('\n'));
    await assert.rejects(restoreBackup(o), RestoreRefusedError);
    assert.equal(sum(await rowCounts(h.pool)), 0);
    const counter = i.source.reportCounter!;
    const res = await restoreBackup({ ...o, atLeast: counter });
    assert.equal(res.accountsDeleted, 1);
    assert.equal((await q('SELECT id FROM citizen_accounts WHERE id = ?', [idA])).length, 0);
    assert.ok(existsSync(join(dir, ACCOUNT_DELETIONS_DIR, `${idA}.json`)), 'marcajul adus la zi');
    assert.ok(res.markersWritten.some((m) => m.includes('conturilor')));
  });

  it('T5: copie cu fotografie `civic-markers/1` și BACKUP_DIR fără `account-deletions/` → permisă, cu avertisment', async () => {
    await emptyTarget();
    const dir = workDir();
    rmSync(join(dir, basename(b2)), { recursive: true });
    rmSync(join(dir, ACCOUNT_DELETIONS_DIR), { recursive: true });
    // adaptare (auditul static, directoarele R18): un BACKUP_DIR de dinaintea R18 nu are nici directorul
    // intențiilor, nici martorul; altfel lipsa directorului este o pierdere și restaurarea refuză (d73DirectoareR18)
    rmSync(join(dir, ACCOUNT_DELETIONS_PENDING_DIR), { recursive: true });
    rmSync(join(dir, 'account-markers-initialized.json'));
    const src = join(dir, basename(b1));
    const snap = JSON.parse(readFileSync(join(src, 'markers.json'), 'utf8')) as Record<string, unknown>;
    delete snap.accountDeletions;
    rewriteSnapshot(src, { ...snap, format: 'civic-markers/1' });
    const o = opts({ backupDir: dir, source: src });
    const i = await inspectRestore(o);
    assert.deepEqual(i.problems, []);
    assert.ok(i.warnings.some((w) => w.includes(`„${ACCOUNT_DELETIONS_DIR}/” lipsește`)), i.warnings.join('\n'));
    const res = await restoreBackup(o);
    // consecința anunțată: fără marcaje de cont, nicio ștergere de cont nu este cunoscută
    assert.equal(res.accountsDeleted, 0);
    assert.equal((await q('SELECT id FROM citizen_accounts WHERE id = ?', [idA])).length, 1);
  });

  const corrupt: Array<[string, (dir: string) => void]> = [
    ['fișier cu conținut neînțeles', (dir) => writeFileSync(join(dir, ACCOUNT_DELETIONS_DIR, `${idA}.json`), '{nu este json')],
    ['marcaj cu un câmp în plus (adresă)', (dir) => writeFileSync(join(dir, ACCOUNT_DELETIONS_DIR, `${idA}.json`), JSON.stringify({ accountId: idA, deletedAt: new Date().toISOString(), email: EMAIL_A }))],
    ['nume de fișier care nu este un ID', (dir) => writeFileSync(join(dir, ACCOUNT_DELETIONS_DIR, 'nu-este-id.json'), '{}')],
    ['fotografia unei copii vecine cu o intrare de cont invalidă (suma corectă)', (dir) => {
      const copy = join(dir, basename(b2));
      const snap = JSON.parse(readFileSync(join(copy, 'markers.json'), 'utf8')) as Record<string, unknown>;
      rewriteSnapshot(copy, { ...snap, accountDeletions: [{ accountId: 'X', deletedAt: 'ieri' }] });
    }],
  ];
  for (const [label, damage] of corrupt) {
    it(`T6: ${label} → refuz explicit, înaintea oricărei scrieri (bază, fișiere, marcaje)`, async () => {
      await emptyTarget();
      const dir = workDir();
      damage(dir);
      const before = snapshotDir(dir);
      const o = opts({ backupDir: dir, source: join(dir, basename(b1)) });
      const i = await inspectRestore(o);
      assert.ok(i.problems.length > 0, label);
      await assert.rejects(restoreBackup(o), (err: unknown) => err instanceof RestoreRefusedError);
      assert.equal(sum(await rowCounts(h.pool)), 0, 'baza țintă a rămas goală');
      assert.ok(!existsSync(o.storageDir), 'directorul de fișiere nu a fost creat');
      assert.deepEqual(snapshotDir(dir), before, 'BACKUP_DIR neschimbat');
      // și cu --at-least (calea care scrie marcaje): tot refuz, tot nimic scris
      await assert.rejects(restoreBackup({ ...o, atLeast: i.source.reportCounter ?? 0 }), RestoreRefusedError);
      assert.equal(sum(await rowCounts(h.pool)), 0);
      assert.deepEqual(snapshotDir(dir), before);
    });
  }
});

describe('R18: gărzi statice', () => {
  const read = (p: string) => readFileSync(join(SRC, p), 'utf8');

  it('T14: conturile se șterg numai după ID; adresa nu este criteriu de alegere a contului', () => {
    const fn = read('db/accountDeletion.ts');
    const deletes = fn.match(/DELETE FROM citizen_accounts[^`'"]*/g) ?? [];
    assert.deepEqual(deletes, ['DELETE FROM citizen_accounts WHERE id = ?'], 'un singur DELETE, după ID');
    assert.match(fn, /FROM citizen_accounts WHERE id = \? FOR UPDATE/, 'contul se alege după ID');
    // condiția WHERE a fiecărei interogări pe citizen_accounts (până la sfârșitul textului SQL) nu conține adresa
    const wheres = [...fn.matchAll(/FROM citizen_accounts WHERE ([^'`]*)/g)].map((m) => m[1]!);
    // 3 interogări: alegerea contului de șters, DELETE și (auditul D7-3) citirea cu blocare a reconcilierii — toate după ID
    assert.equal(wheres.length, 3, wheres.join(' | '));
    for (const w of wheres) assert.doesNotMatch(w, /email/, `niciun criteriu de adresă: ${w}`);
    // în toată aplicația, `DELETE FROM citizen_accounts` există numai aici și în retenția conturilor pending (D7-5)
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.ts')) files.push(p);
      }
    };
    walk(SRC);
    const users = files.filter((f) => /DELETE FROM citizen_accounts/.test(readFileSync(f, 'utf8'))).map((f) => f.slice(SRC.length + 1)).sort();
    assert.deepEqual(users, ['db/accountDeletion.ts', 'maintenance.ts']);
    // restaurarea aplică marcajele prin funcția comună, cu ID-ul și garda datei
    const backup = read('db/backup.ts');
    assert.match(backup, /deleteCitizenAccountRows\(conn, e\.accountId, \{ guard: \{ createdBefore: new Date\(e\.deletedAt\) \} \}\)/);
    // ruta folosește aceeași funcție (fără o a doua implementare)
    const route = read('routes/citizens.ts');
    assert.match(route, /deleteCitizenAccountRows\(conn, account\.id, \{ marker \}\)/);
    assert.doesNotMatch(route, /DELETE FROM citizen_accounts/);
  });

  it('T14b: restaurarea nu citește marcajele în afara inspecției (validare integrală înainte de prima scriere)', () => {
    const backup = read('db/backup.ts');
    const restore = backup.slice(backup.indexOf('export async function restoreBackup'));
    for (const reader of ['readAccountDeletionMarkers', 'readDeletionMarkers', 'deletionListIds', 'parseMarkerSnapshot', 'readFileSync(join(']) {
      assert.ok(!restore.includes(reader), `restoreBackup nu apelează ${reader}`);
    }
  });
});

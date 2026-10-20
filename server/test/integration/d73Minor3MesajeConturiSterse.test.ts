// Etapa 7, 7A — MINOR-3 (auditul final R18–R19; decizia proprietarului B, 20.10.2026).
//
// Un mesaj de stadiu către cetățean (`citizen_status_update`) al unei sesizări fără autor (contul autorului a fost
// șters: `author_account_id IS NULL`) nu mai poate fi retrimis:
//  - la restaurare și la recuperarea R20, dacă era neplecat, devine `cancelled` (nu `failed` / reținut);
//  - ruta de reîncercare din Admin îl refuză (409, „contul autorului a fost șters”).
// Mesajele cetățenilor cu autor existent și notificările către Primărie se comportă ca înainte.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { bootstrapAdmin } from '../../src/accounts.ts';
import type { AppContext } from '../../src/context.ts';
import { R19_AUTHOR_DELETED_REASON, R19_HELD_REASON, createBackup, restoreBackup } from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { recoverAfterHostRestore } from '../../src/db/hostRestore.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers } from '../../src/db/reportCounter.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { newId } from '../../src/ids.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { processDue } from '../../src/reports/outbox.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Clock, makeApp, type Client } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { V1, reportFlow, type Flow } from '../helpers/reportFlow.ts';

const DAY = 86_400_000;
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
let root: string;
let backupDir: string;
let flow: Flow;
let repA: { id: string; ref: string }; // autorul A își șterge contul după copie
let repB: { id: string; ref: string }; // autorul B rămâne
const mail: Record<string, string> = {};
const clock = new Clock();

const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
const row = async (id: string) =>
  (await q<{ s: string; e: string | null }>('SELECT status AS s, last_error AS e FROM email_outbox WHERE id = ?', [id]))[0]!;
async function enqueue(role: string, kind: string, reportId: string, status: string) {
  const id = newId(clock.now());
  await h.pool.query(
    `INSERT INTO email_outbox (id, kind, report_id, recipient, subject, body_text, status, attempts, mode_at_send, created_at)
     VALUES (?, ?, ?, 'destinatar@exemplu.test', 'Subiect', 'corp', ?, 0, 'simulated', ?)`,
    [id, kind, reportId, status, clock.now()],
  );
  mail[role] = id;
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-m3-'));
  backupDir = join(root, 'backups');
  mkdirSync(join(root, 'storage'));
  await initBackupMarkers(h.pool, backupDir);
  ({ app, ctx } = await makeApp(h, clock, { STORAGE_DIR: join(root, 'storage'), BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);
});

after(async () => {
  await app?.close();
  await h?.close();
  rmSync(root, { recursive: true, force: true });
});

describe('MINOR-3: restaurarea (restore:db)', () => {
  it('M1: mesajul de stadiu neplecat al unui cont șters după copie → cancelled; cel al unui autor existent și notificarea către Primărie → reținute (failed), ca înainte', async () => {
    const a = await flow.citizen('m3-a@exemplu.test');
    repA = await flow.submitOk(a);
    repB = await flow.submitOk(await flow.citizen('m3-b@exemplu.test'));
    await processDue(ctx, 500);
    await enqueue('statusA', 'citizen_status_update', repA.id, 'sending');
    await enqueue('statusB', 'citizen_status_update', repB.id, 'sending');
    await enqueue('registryA', 'registry_notification', repA.id, 'sending');
    clock.advanceMinutes(1);
    const copy = (await createBackup({
      databaseUrl: testDatabaseUrl(), backupDir, storageDir: join(root, 'storage'), migrationsDir: MIGRATIONS_DIR,
      retentionDays: 45, adminRetentionMonths: 6, now: clock.now(),
    })).dir;
    clock.advanceMinutes(10);
    assert.equal((await a.send('DELETE', `${V1}/citizen/account`)).statusCode, 204); // marcajul R18
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    const res = await restoreBackup({
      databaseUrl: testDatabaseUrl(), backupDir, storageDir: join(root, 'restaurat'), migrationsDir: MIGRATIONS_DIR,
      retentionDays: 45, adminRetentionMonths: 6, now: new Date(clock.now().getTime() + DAY), source: copy,
    });
    assert.equal(res.accountsDeleted, 1);
    assert.deepEqual(await row(mail.statusA!), { s: 'cancelled', e: R19_AUTHOR_DELETED_REASON }, 'cont șters: anulat');
    assert.deepEqual(await row(mail.statusB!), { s: 'failed', e: R19_HELD_REASON }, 'autor existent: reținut, ca înainte');
    assert.deepEqual(await row(mail.registryA!), { s: 'failed', e: R19_HELD_REASON }, 'Primăria: reținută, ca înainte');
    assert.deepEqual(res.emailsHeld.map((m) => m.emailId).sort(), [mail.statusB!, mail.registryA!].sort());
    assert.ok(!res.emailsHeld.some((m) => m.emailId === mail.statusA), 'nu apare printre cele reținute');
    assert.equal((await q("SELECT id FROM audit_log WHERE action = 'email.held_on_restore' AND JSON_UNQUOTE(JSON_EXTRACT(details, '$.emailId')) = ?", [mail.statusA])).length, 0);
  });
});

describe('MINOR-3: ruta de reîncercare din Admin', () => {
  let admin: Client;
  before(async () => {
    const created = await bootstrapAdmin(h.pool, clock.now(), 'm3-admin@exemplu.test', 'Admin M3');
    admin = await flow.adminFirstLogin('m3-admin@exemplu.test', created.temporaryPassword, 'parola-admin-m3-2026');
  });
  const retry = (reportId: string, emailId: string) => admin.send('POST', `${V1}/admin/reports/${reportId}/emails/${emailId}/retry`);

  it('M3: mesaj de stadiu eșuat, sesizare fără autor → 409 „contul autorului a fost șters”; mesajul rămâne failed; fără audit', async () => {
    await enqueue('failedStatusA', 'citizen_status_update', repA.id, 'failed');
    const r = await retry(repA.id, mail.failedStatusA!);
    assert.equal(r.statusCode, 409, r.body);
    assert.equal(r.json().error.message, 'contul autorului a fost șters');
    assert.equal((await row(mail.failedStatusA!)).s, 'failed');
    assert.equal((await q("SELECT id FROM audit_log WHERE action = 'email.retry' AND JSON_UNQUOTE(JSON_EXTRACT(details, '$.emailId')) = ?", [mail.failedStatusA])).length, 0);
  });

  it('M3b: autor existent → reîncercarea merge, ca înainte (202)', async () => {
    const r = await retry(repB.id, mail.statusB!);
    assert.equal(r.statusCode, 202, r.body);
    assert.notEqual((await row(mail.statusB!)).s, 'failed');
  });

  it('M3c: notificarea către Primărie a unei sesizări fără autor rămâne reîncercabilă (202)', async () => {
    const r = await retry(repA.id, mail.registryA!);
    assert.equal(r.statusCode, 202, r.body);
    assert.notEqual((await row(mail.registryA!)).s, 'failed');
  });
});

describe('MINOR-3: recuperarea R20 (host-restore:recover)', () => {
  it('M2: pe baza vie, mesajul de stadiu neplecat fără autor → cancelled; cel cu autor și Primăria → reținute; a doua rulare: numai încă o intrare de audit', async () => {
    await processDue(ctx, 500);
    await enqueue('hostStatusA', 'citizen_status_update', repA.id, 'queued');
    await enqueue('hostStatusB', 'citizen_status_update', repB.id, 'queued');
    await enqueue('hostRegistryA', 'registry_notification', repA.id, 'on_hold');
    const n = Number((await q<{ v: number }>('SELECT `last_value` AS v FROM report_counter WHERE id = 1'))[0]!.v);
    const check = await recoverAfterHostRestore(ctx, { backupDir, atLeast: n, check: true });
    // (notificarea reîncercată în M3c a revenit corect la on_hold — fluxul către Primărie nu este configurat aici — și este reținută și ea)
    const heldIds = (r: { emailsHeld: Array<{ emailId: string }> }) => r.emailsHeld.map((m) => m.emailId);
    assert.ok(heldIds(check).includes(mail.hostStatusB!) && heldIds(check).includes(mail.hostRegistryA!), '--check: cel cu autor și Primăria');
    assert.ok(!heldIds(check).includes(mail.hostStatusA!), '--check: cel fără autor nu este reținut');
    assert.equal((await row(mail.hostStatusA!)).s, 'queued', '--check nu scrie');
    const r1 = await recoverAfterHostRestore(ctx, { backupDir, atLeast: n, check: false });
    assert.deepEqual(await row(mail.hostStatusA!), { s: 'cancelled', e: R19_AUTHOR_DELETED_REASON });
    assert.deepEqual(await row(mail.hostStatusB!), { s: 'failed', e: R19_HELD_REASON });
    assert.deepEqual(await row(mail.hostRegistryA!), { s: 'failed', e: R19_HELD_REASON });
    assert.ok(heldIds(r1).includes(mail.hostStatusB!) && heldIds(r1).includes(mail.hostRegistryA!) && !heldIds(r1).includes(mail.hostStatusA!));
    // idempotentă în privința datelor funcționale; numai auditul se repetă
    const outbox = await q('SELECT id, status, last_error, locked_until, next_attempt_at, attempts FROM email_outbox ORDER BY id');
    const counter = await q('SELECT `last_value` AS v FROM report_counter WHERE id = 1');
    const reports = await q('SELECT id FROM reports ORDER BY id');
    const audits = (await q("SELECT id FROM audit_log WHERE action = 'host_restore.recovered'")).length;
    const r2 = await recoverAfterHostRestore(ctx, { backupDir, atLeast: n, check: false });
    assert.equal(r2.emailsHeld.length, 0);
    assert.equal(r2.emailsCancelled, 0);
    assert.deepEqual(await q('SELECT id, status, last_error, locked_until, next_attempt_at, attempts FROM email_outbox ORDER BY id'), outbox);
    assert.deepEqual(await q('SELECT `last_value` AS v FROM report_counter WHERE id = 1'), counter);
    assert.deepEqual(await q('SELECT id FROM reports ORDER BY id'), reports);
    assert.equal((await q("SELECT id FROM audit_log WHERE action = 'host_restore.recovered'")).length, audits + 1, 'numai o intrare de audit în plus');
  });
});

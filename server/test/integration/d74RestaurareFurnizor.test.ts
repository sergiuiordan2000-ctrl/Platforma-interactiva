// Etapa 7, 7A — R20 (decizia D7-4 = B, 19.10.2026): recuperarea după restaurarea ÎNTREGULUI cont de către furnizor.
//
// Starea simulată „după restaurarea contului”: baza, coada de e-mail și marcajele readuse împreună la o stare veche
// (contorul și marcajul TM = 2), deși s-au comunicat numere până la TM-012. `host-restore:recover --at-least 12`
// ridică contorul și marcajul la 12, aplică R19 pe baza vie, reconciliază intențiile R18 și aplică retenția.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../../src/context.ts';
import { R19_CANCELLED_REASON, R19_HELD_REASON } from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { HOST_RESTORE_COMMAND, formatHostRecovery, recoverAfterHostRestore } from '../../src/db/hostRestore.ts';
import { ACCOUNT_DELETIONS_DIR, ACCOUNT_DELETIONS_PENDING_DIR, readReportCounterWatermark } from '../../src/db/markers.ts';
import { migrate } from '../../src/db/migrations.ts';
import { initBackupMarkers } from '../../src/db/reportCounter.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { newId } from '../../src/ids.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { processDue } from '../../src/reports/outbox.ts';
import { loadUatBoundary } from '../../src/uat.ts';
import { Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';
import { reportFlow, snapshotDir, type Flow } from '../helpers/reportFlow.ts';

const DAY = 86_400_000;
const EMAIL_B = 'd74-b@exemplu.test';
let h: DbHandle;
let app: FastifyInstance;
let ctx: AppContext;
let root: string;
let backupDir: string;
let flow: Flow;
let idB: string;
const reps: Array<{ id: string; ref: string; number: number }> = [];
let oldReport: string; // sesizare mai veche de 45 de zile (readusă de copia contului)
const mail: Record<string, string> = {};
const clock = new Clock();

const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];
const counter = async () => Number((await q<{ v: number }>('SELECT `last_value` AS v FROM report_counter WHERE id = 1'))[0]!.v);
const status = async (id: string) => (await q<{ s: string; e: string | null; l: Date | null; n: Date | null }>(
  'SELECT status AS s, last_error AS e, locked_until AS l, next_attempt_at AS n FROM email_outbox WHERE id = ?', [id]))[0]!;
/** Amprenta stării (bază + BACKUP_DIR) pentru „nimic scris”. */
async function fingerprint(): Promise<string> {
  const outbox = await q('SELECT id, status, last_error, locked_until, next_attempt_at, attempts FROM email_outbox ORDER BY id');
  const audit = await q<{ n: number }>('SELECT COUNT(*) AS n FROM audit_log');
  const reports = await q<{ n: number }>('SELECT COUNT(*) AS n FROM reports');
  return createHash('sha256').update(JSON.stringify([await counter(), outbox, audit, reports, snapshotDir(backupDir)])).digest('hex');
}
async function enqueue(role: string, f: { kind: string; reportId?: string | null; recipient: string; status: string; lockedUntil?: Date }) {
  const id = newId(clock.now());
  await h.pool.query(
    `INSERT INTO email_outbox (id, kind, report_id, recipient, subject, body_text, status, attempts, locked_until, mode_at_send, created_at)
     VALUES (?, ?, ?, ?, 'Subiect', 'corp', ?, 0, ?, 'simulated', ?)`,
    [id, f.kind, f.reportId ?? null, f.recipient, f.status, f.lockedUntil ?? null, clock.now()],
  );
  mail[role] = id;
}
const recover = (atLeast: number, check: boolean) => recoverAfterHostRestore(ctx, { backupDir, atLeast, check });
const run = (args: string[]) =>
  spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), HOST_RESTORE_COMMAND, ...args], {
    env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), BACKUP_DIR: backupDir, STORAGE_DIR: join(root, 'storage') }), PATH: process.env.PATH ?? '' },
    encoding: 'utf8',
    timeout: 60_000,
  });

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  root = mkdtempSync(join(tmpdir(), 'civic-d74-'));
  backupDir = join(root, 'backups');
  mkdirSync(join(root, 'storage'));
  await initBackupMarkers(h.pool, backupDir);
  ({ app, ctx } = await makeApp(h, clock, { STORAGE_DIR: join(root, 'storage'), BACKUP_DIR: backupDir }, { uat: loadUatBoundary() }));
  flow = reportFlow(() => app, () => h.pool, clock);
  const b = await flow.citizen(EMAIL_B);
  for (let i = 0; i < 3; i++) reps.push(await flow.submitOk(b));
  idB = (await q<{ id: string }>('SELECT id FROM citizen_accounts WHERE email_normalized = ?', [EMAIL_B]))[0]!.id;
  await processDue(ctx, 500);
  // sesizarea 3 devine „veche” (52 de zile): o copie a contului de până la 3 luni o readuce
  oldReport = reps[2]!.id;
  await h.pool.query('UPDATE reports SET created_at = ? WHERE id = ?', [new Date(clock.now().getTime() - 52 * DAY), oldReport]);
  assert.equal(await counter(), 3);
  assert.equal(readReportCounterWatermark(backupDir), 3);
  // coada din starea restaurată
  const past = new Date(clock.now().getTime() - 60_000);
  await enqueue('regQueued', { kind: 'registry_notification', reportId: reps[0]!.id, recipient: 'primarie@exemplu.test', status: 'queued' });
  await enqueue('regSending', { kind: 'registry_notification', reportId: reps[1]!.id, recipient: 'primarie@exemplu.test', status: 'sending', lockedUntil: past });
  await enqueue('statusOnHold', { kind: 'citizen_status_update', reportId: reps[0]!.id, recipient: EMAIL_B, status: 'on_hold' });
  await enqueue('codeQueued', { kind: 'citizen_login_code', recipient: EMAIL_B, status: 'queued' });
  await enqueue('blockedSending', { kind: 'citizen_account_blocked', recipient: EMAIL_B, status: 'sending', lockedUntil: past });
  await enqueue('offType', { kind: 'citizen_account_blocked', reportId: reps[1]!.id, recipient: EMAIL_B, status: 'queued' });
  await enqueue('statusSent', { kind: 'citizen_status_update', reportId: reps[1]!.id, recipient: EMAIL_B, status: 'sent' });
});

after(async () => {
  await app?.close();
  await h?.close();
  rmSync(root, { recursive: true, force: true });
});

describe('R20: verificare și refuzuri, înaintea oricărei scrieri', () => {
  it('F4: --check raportează ce s-ar schimba și nu scrie nimic (bază, coadă, audit, BACKUP_DIR)', async () => {
    const fp = await fingerprint();
    const r = await recover(12, true);
    assert.equal(r.checkOnly, true);
    assert.deepEqual([r.counterBefore, r.watermarkBefore, r.counterAfter], [3, 3, 12]);
    assert.equal(r.emailsHeld.length, 3);
    assert.equal(r.emailsCancelled, 2);
    assert.equal(r.intents, null);
    assert.equal(r.retention, null);
    assert.equal(await fingerprint(), fp, 'nimic schimbat');
  });

  const refusals: Array<[string, () => () => void, number, RegExp]> = [
    ['N invalid (negativ)', () => () => {}, -1, /--at-least/],
    ['marcajul contorului corupt', () => {
      const f = join(backupDir, 'report-counter-watermark.json');
      const keep = readFileSync(f);
      writeFileSync(f, '{corupt');
      return () => writeFileSync(f, keep);
    }, 12, /corupt/],
    ['marcajul contorului lipsă', () => {
      const f = join(backupDir, 'report-counter-watermark.json');
      renameSync(f, `${f}.mutat`);
      return () => renameSync(`${f}.mutat`, f);
    }, 12, /markers:rebuild-counter/],
    ['directoarele R18 pierdute', () => {
      const d = join(backupDir, ACCOUNT_DELETIONS_DIR);
      renameSync(d, join(root, 'ad-mutat'));
      return () => renameSync(join(root, 'ad-mutat'), d);
    }, 12, /Marcajele de ștergere a conturilor lipsesc/],
    ['o intenție R18 ilizibilă', () => {
      const f = join(backupDir, ACCOUNT_DELETIONS_PENDING_DIR, `${newId(clock.now())}.json`);
      writeFileSync(f, '{ilizibil');
      return () => rmSync(f);
    }, 12, /ilizibile/],
  ];
  for (const [label, damage, n, re] of refusals) {
    it(`F6: ${label} → refuz, nimic scris (bază, coadă, audit, BACKUP_DIR)`, async () => {
      const restore = damage();
      try {
        const fp = await fingerprint();
        await assert.rejects(recover(n, false), re);
        assert.equal(await fingerprint(), fp, 'nimic schimbat');
      } finally {
        restore();
      }
    });
  }
});

describe('R20: aplicarea (--confirm)', () => {
  it('F1 + F3 + F7: contorul și marcajul = N; R19 pe baza vie; nicio trimitere automată; retenția; auditul; următorul număr N+1', async () => {
    const r = await recover(12, false);
    assert.deepEqual([r.counterBefore, r.counterAfter], [3, 12]);
    assert.equal(await counter(), 12);
    assert.equal(readReportCounterWatermark(backupDir), 12);
    // R19: mesajele sesizărilor reținute, cu motivul și blocajele golite
    for (const role of ['regQueued', 'regSending', 'statusOnHold']) {
      const s = await status(mail[role]!);
      assert.deepEqual([s.s, s.e, s.l, s.n], ['failed', R19_HELD_REASON, null, null], role);
    }
    for (const role of ['codeQueued', 'blockedSending']) {
      const s = await status(mail[role]!);
      assert.deepEqual([s.s, s.e], ['cancelled', R19_CANCELLED_REASON], role);
    }
    assert.equal((await status(mail.offType!)).s, 'queued', 'alt tip, cu sesizare: neatins');
    assert.equal((await status(mail.statusSent!)).s, 'sent', 'stare finală: neatinsă');
    // nicio trimitere automată a celor reținute
    await processDue(ctx, 500);
    for (const role of ['regQueued', 'regSending', 'statusOnHold']) assert.equal((await status(mail[role]!)).s, 'failed', role);
    // retenția: sesizarea de 52 de zile a dispărut
    assert.equal((await q('SELECT id FROM reports WHERE id = ?', [oldReport])).length, 0);
    assert.ok(r.retention, 'retenția a rulat');
    assert.ok(r.intents, 'reconcilierea a rulat');
    // auditul
    const [a] = await q<{ details: Record<string, unknown> }>("SELECT details FROM audit_log WHERE action = 'host_restore.recovered'");
    assert.deepEqual(a!.details, { counterBefore: 3, watermarkBefore: 3, atLeast: 12, counterAfter: 12, emailsHeld: 3, emailsCancelled: 2 });
    assert.equal((await q("SELECT id FROM audit_log WHERE action = 'email.held_on_restore'")).length, 3);
    // raportul: numere TM, fără adrese și fără ID-ul contului
    const text = formatHostRecovery(r).join('\n');
    assert.match(text, /TM-013/);
    assert.ok(!text.includes('@') && !text.includes(idB), 'fără adrese și fără ID de cont');
    // următoarea sesizare primește TM-013
    const next = await flow.submitOk(await flow.citizen('d74-c@exemplu.test'));
    assert.equal(next.number, 13);
  });

  it('F5: a doua rulare --confirm nu mai schimbă nimic (în afara auditului ei)', async () => {
    await processDue(ctx, 500); // codul de autentificare al cetățeanului din F1 (o operație normală, nu o stare restaurată)
    const outbox = await q('SELECT id, status, last_error FROM email_outbox ORDER BY id');
    const before = await counter();
    const r = await recover(12, false);
    assert.equal(r.counterAfter, before, 'contorul nu se schimbă (13 ≥ 12)');
    assert.equal(r.emailsHeld.length, 0);
    assert.equal(r.emailsCancelled, 0);
    assert.deepEqual(await q('SELECT id, status, last_error FROM email_outbox ORDER BY id'), outbox);
  });

  it('F2: N sub contorul actual → nimic nu coboară', async () => {
    const before = await counter();
    const r = await recover(1, false);
    assert.equal(r.counterAfter, before);
    assert.equal(await counter(), before);
    assert.equal(readReportCounterWatermark(backupDir), before);
  });
});

describe('R20: comanda reală (proces)', () => {
  it('F8: --check prin CLI: cod 0, numere TM, fără adrese și fără ID de cont; utilizare greșită → cod 2, nimic scris', async () => {
    const fp = await fingerprint();
    const ok = run(['--at-least', '20', '--check']);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /TM-021/);
    assert.match(ok.stdout, /numai verificare, nu se scrie nimic/);
    assert.ok(!ok.stdout.includes('@') && !ok.stdout.includes(idB));
    for (const args of [['--check'], ['--at-least', '20'], ['--at-least', '20', '--check', '--confirm'], ['--at-least', 'x', '--check']]) {
      const bad = run(args);
      assert.equal(bad.status, 2, `${args.join(' ')}: ${bad.stderr}`);
    }
    assert.equal(await fingerprint(), fp, 'nimic schimbat de --check sau de utilizarea greșită');
  });
});

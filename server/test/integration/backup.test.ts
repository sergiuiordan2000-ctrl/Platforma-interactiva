// Backup / restaurare (T-D1): fereastra de 38 de zile, rotația de 7 zile, lista de ștergeri,
// contorul TM, retenția aplicată la restaurare. Ceas simulat (NOW).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { after, before, describe, it } from 'node:test';
import {
  BACKUP_ROTATION_DAYS,
  createBackup,
  deletionListIds,
  listBackups,
  pruneDeletionList,
  recordReportCounter,
  recordReportDeletions,
  restoreBackup,
} from '../../src/db/backup.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig, seedDemo } from '../../src/db/seeds.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';

const DAY = 86_400_000;
const NOW = new Date('2026-09-29T03:00:00.000Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const id = (n: number) => `01BKUP${String(n).padStart(20, '0')}`;

let h: DbHandle;
let backupDir: string;
let storageDir: string;
let restoreStorageDir: string;
let backupPath: string;
const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await h.pool.query(sql, params))[0] as T[];
const n = async (sql: string, params: unknown[] = []) => Number(((await q<{ n: number }>(sql, params))[0]!).n);

const CHECKSUM_TABLES = [
  'admin_users', 'settings', 'report_categories', 'citizen_accounts', 'citizen_blocks', 'announcements',
  'directory_institution', 'directory_departments', 'directory_services', 'directory_links',
  'quickdial_categories', 'quickdial_contacts', 'surveys', 'survey_questions', 'survey_options',
];
let checksumsBefore: Record<string, string> = {};

async function checksums(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const t of CHECKSUM_TABLES) {
    const [r] = await q<{ Checksum: string }>(`CHECKSUM TABLE \`${t}\``);
    out[t] = String(r!.Checksum);
  }
  return out;
}

const opts = () => ({
  databaseUrl: testDatabaseUrl(),
  backupDir,
  storageDir,
  migrationsDir: MIGRATIONS_DIR,
  retentionDays: 45,
  adminRetentionMonths: 6,
});

async function addReport(n: number, ref: string, createdAt: Date) {
  await h.pool.query(
    "INSERT INTO reports (id, author_account_id, reference_number, category_id, description, location_text, lat, lng, location_source, created_at, updated_at) VALUES (?, ?, ?, 'drumuri', 'Descriere de test suficient de lungă', 'Str. Test', 43.75, 24.87, 'pin', ?, ?)",
    [id(n), id(1), ref, createdAt, createdAt],
  );
  const key = `r/${id(n)}.webp`;
  mkdirSync(join(storageDir, 'r'), { recursive: true });
  writeFileSync(join(storageDir, key), `foto-${ref}`);
  await h.pool.query("INSERT INTO report_photos (id, report_id, ordinal, storage_key, mime, size_bytes, width, height, sha256, created_at) VALUES (?, ?, 1, ?, 'image/webp', 10, 1, 1, REPEAT('e', 64), ?)", [id(n + 100), id(n), key, createdAt]);
  await h.pool.query('INSERT INTO report_responses (id, report_id, message, author_user_id, created_at) VALUES (?, ?, ?, ?, ?)', [id(n + 200), id(n), `notă ${ref}`, id(2), createdAt]);
  await h.pool.query("INSERT INTO email_outbox (id, kind, report_id, dedupe_key, recipient, subject, body_text, status, created_at) VALUES (?, 'registry_notification', ?, ?, 'primarie@exemplu.test', ?, 'corp', 'simulated', ?)", [id(n + 300), id(n), `registry:${id(n)}`, ref, createdAt]);
  await h.pool.query("INSERT INTO audit_log (occurred_at, actor_type, actor_user_id, action, target_type, target_id) VALUES (?, 'admin', ?, 'report.location.correct', 'report', ?)", [createdAt, id(2), id(n)]);
}

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  await seedDemo(h.pool, SEEDS_DIR, 'development');
  const root = mkdtempSync(join(tmpdir(), 'civic-backup-test-'));
  backupDir = join(root, 'backups');
  storageDir = join(root, 'storage');
  restoreStorageDir = join(root, 'storage-restored');
  mkdirSync(storageDir, { recursive: true });

  await h.pool.query("INSERT INTO citizen_accounts (id, email, email_normalized, status, policy_version, policy_accepted_at, created_at) VALUES (?, 'cetatean@exemplu.test', 'cetatean@exemplu.test', 'active', 'v1', ?, ?)", [id(1), ago(60), ago(60)]);
  await h.pool.query("INSERT INTO admin_users (id, email, display_name, role, password_hash, totp_secret_enc, created_at, updated_at) VALUES (?, 'admin@exemplu.test', 'Admin', 'super_admin', 'scrypt$x', UNHEX('00FF10'), ?, ?)", [id(2), ago(90), ago(90)]);
  await h.pool.query("INSERT INTO citizen_blocks (id, kind, email_hash) VALUES (?, 'permanent', REPEAT('f', 64))", [id(3)]);
  await addReport(10, 'TM-001', ago(40)); // în afara ferestrei (> 38 de zile): nu intră în backup
  await addReport(11, 'TM-002', ago(37)); // în fereastră; la restaurarea din NOW + 9 zile are 46 de zile
  await addReport(12, 'TM-003', ago(1)); // rămâne
  await addReport(13, 'TM-004', ago(2)); // ștearsă după backup (lista de ștergeri)
  await h.pool.query('UPDATE report_counter SET `last_value` = 4 WHERE id = 1');
  // e-mailuri de cont: corpul numai în fereastră (N3-8)
  await h.pool.query("INSERT INTO email_outbox (id, kind, recipient, subject, body_text, status, created_at) VALUES (?, 'citizen_login_code', 'cetatean@exemplu.test', 'Cod', 'COD-VECHI', 'simulated', ?)", [id(20), ago(40)]);
  await h.pool.query("INSERT INTO email_outbox (id, kind, recipient, subject, body_text, status, created_at) VALUES (?, 'citizen_login_code', 'cetatean@exemplu.test', 'Cod', 'COD-NOU', 'simulated', ?)", [id(21), ago(1)]);
  // audit administrativ: 6 luni − 7 zile
  const sixMonths = new Date(NOW.getTime());
  sixMonths.setUTCMonth(sixMonths.getUTCMonth() - 6);
  await h.pool.query("INSERT INTO audit_log (occurred_at, actor_type, action, target_type, target_id) VALUES (?, 'system', 'settings.old', 'settings', 'x')", [new Date(sixMonths.getTime() + 3 * DAY)]);
  await h.pool.query("INSERT INTO audit_log (occurred_at, actor_type, action, target_type, target_id) VALUES (?, 'system', 'settings.recent', 'settings', 'y')", [ago(10)]);
  // sondaj închis de peste 6 luni, cu răspuns liber; și unul închis recent
  for (const [sid, end, text] of [[30, new Date(sixMonths.getTime() - DAY), 'TEXT-VECHI'], [31, ago(5), 'TEXT-NOU']] as const) {
    await h.pool.query("INSERT INTO surveys (id, title, description, start_at, end_at, status, created_at, updated_at) VALUES (?, 't', 'd', ?, ?, 'closed', ?, ?)", [id(sid), new Date((end as Date).getTime() - 30 * DAY), end, NOW, NOW]);
    await h.pool.query("INSERT INTO survey_questions (id, survey_id, ordinal, text, type) VALUES (?, ?, 1, 'q', 'free_text')", [id(sid + 10), id(sid)]);
    await h.pool.query("INSERT INTO survey_submissions (id, survey_id, participation_fingerprint, submitted_at) VALUES (?, ?, REPEAT('a', 64), ?)", [id(sid + 20), id(sid), NOW]);
    await h.pool.query('INSERT INTO survey_answers (submission_id, question_id, text_value) VALUES (?, ?, ?)', [id(sid + 20), id(sid + 10), text]);
  }
  // o sesiune (efemeră): nu intră în backup
  await h.pool.query("INSERT INTO sessions (id, principal_type, user_id, created_at, last_seen_at, idle_expires_at, absolute_expires_at, mfa_state) VALUES (REPEAT('s', 64), 'admin', ?, ?, ?, ?, ?, 'verified')", [id(2), NOW, NOW, NOW, NOW]);
  checksumsBefore = await checksums();
});

after(async () => {
  await h.close();
});

describe('backup:db (T-D1)', () => {
  it('backup-urile mai vechi de 7 zile se șterg la rotație; cele mai noi rămân', async () => {
    mkdirSync(join(backupDir, 'civic-backup-20260920T030000000Z'), { recursive: true }); // 9 zile
    mkdirSync(join(backupDir, 'civic-backup-20260924T030000000Z'), { recursive: true }); // 5 zile
    const res = await createBackup({ ...opts(), now: NOW });
    backupPath = res.dir;
    assert.deepEqual(res.removed, ['civic-backup-20260920T030000000Z']);
    assert.deepEqual(listBackups(backupDir), ['civic-backup-20260924T030000000Z', 'civic-backup-20260929T030000000Z']);
    assert.equal(BACKUP_ROTATION_DAYS, 7);
  });

  it('sesizarea mai veche de 38 de zile lipsește din backup, cu toate datele ei', () => {
    const text = gunzipSync(readFileSync(join(backupPath, 'db.jsonl.gz'))).toString('utf8');
    assert.ok(!text.includes(id(10)), 'nici un rând al sesizării TM-001');
    assert.ok(!text.includes('TM-001'));
    assert.ok(text.includes('TM-002') && text.includes('TM-003') && text.includes('TM-004'));
    assert.ok(!existsSync(join(backupPath, 'photos', 'r', `${id(10)}.webp`)));
    assert.ok(existsSync(join(backupPath, 'photos', 'r', `${id(12)}.webp`)));
    const manifest = JSON.parse(readFileSync(join(backupPath, 'manifest.json'), 'utf8'));
    assert.equal(manifest.counts.reports, 3);
    assert.equal(manifest.photos, 3);
    assert.equal(manifest.reportsFrom, ago(38).toISOString());
  });

  it('corpul e-mailurilor de cont, auditul administrativ și textele libere respectă aceeași fereastră', () => {
    const text = gunzipSync(readFileSync(join(backupPath, 'db.jsonl.gz'))).toString('utf8');
    assert.ok(!text.includes('COD-VECHI'));
    assert.ok(text.includes('COD-NOU'));
    assert.ok(!text.includes('settings.old'));
    assert.ok(text.includes('settings.recent'));
    assert.ok(!text.includes('TEXT-VECHI'));
    assert.ok(text.includes('TEXT-NOU'));
  });

  it('datele efemere (sesiunile) nu intră în backup; blocarea definitivă intră', () => {
    const text = gunzipSync(readFileSync(join(backupPath, 'db.jsonl.gz'))).toString('utf8');
    assert.ok(!text.includes('"name":"sessions"'));
    assert.ok(!text.includes('s'.repeat(64)));
    assert.ok(text.includes('f'.repeat(64)));
  });
});

describe('lista de ștergeri (numai ID-uri, 7 zile)', () => {
  it('conține numai ID-ul intern și data; intrările mai vechi de 7 zile dispar', () => {
    recordReportDeletions(backupDir, [id(99)], ago(8));
    recordReportDeletions(backupDir, [id(13)], new Date(NOW.getTime() + DAY));
    const raw = readFileSync(join(backupDir, 'deletion-list.jsonl'), 'utf8').trim().split('\n');
    for (const line of raw) assert.deepEqual(Object.keys(JSON.parse(line)).sort(), ['deletedAt', 'reportId']);
    assert.deepEqual(deletionListIds(backupDir), [id(13)]);
    assert.equal(pruneDeletionList(backupDir, new Date(NOW.getTime() + 9 * DAY)), 1);
    recordReportDeletions(backupDir, [id(13)], new Date(NOW.getTime() + DAY));
  });
});

describe('restore:db (T-D1)', () => {
  it('refuzată într-un DB care nu este gol', async () => {
    await assert.rejects(restoreBackup({ ...opts(), source: backupPath, storageDir: restoreStorageDir }), /nu este gol/);
  });

  it('refuzată pentru un backup cu suma de control greșită', async () => {
    const bad = mkdtempSync(join(tmpdir(), 'civic-bad-'));
    writeFileSync(join(bad, 'db.jsonl.gz'), 'x');
    writeFileSync(join(bad, 'manifest.json'), readFileSync(join(backupPath, 'manifest.json')));
    await assert.rejects(restoreBackup({ ...opts(), source: bad }), /corupt/);
  });

  it('într-un DB nou: datele identice în fereastră; lista de ștergeri și retenția aplicate; contorul nu coboară', async () => {
    recordReportCounter(backupDir, 5); // TM-005 a fost emis după backup
    await resetTestDb(h.pool);
    await migrate(h.pool, MIGRATIONS_DIR);
    const restoreAt = new Date(NOW.getTime() + 9 * DAY);
    const res = await restoreBackup({ ...opts(), source: backupPath, storageDir: restoreStorageDir, now: restoreAt });

    // conținutul copiat integral este identic, rând cu rând
    assert.deepEqual(await checksums(), checksumsBefore);
    // JSON null (setare nesetată) rămâne JSON null, nu NULL SQL
    assert.equal(await n("SELECT COUNT(*) AS n FROM settings WHERE `key` = 'registry.recipient_email' AND value = CAST('null' AS JSON)"), 1);
    // datele binare (secretul TOTP criptat) rămân identice
    assert.equal(await n("SELECT COUNT(*) AS n FROM admin_users WHERE totp_secret_enc = UNHEX('00FF10')"), 1);

    // TM-001: niciodată în backup; TM-002: 46 de zile la restaurare → eliminată; TM-004: în lista de ștergeri
    const refs = (await q<{ r: string }>('SELECT reference_number AS r FROM reports ORDER BY r')).map((x) => x.r);
    assert.deepEqual(refs, ['TM-003']);
    assert.equal(res.deletedFromList, 1);
    assert.equal(res.purgedByRetention, 1);
    for (const t of ['report_photos', 'report_responses', 'email_outbox']) {
      assert.equal(await n(`SELECT COUNT(*) AS n FROM \`${t}\` WHERE report_id IS NOT NULL AND report_id <> ?`, [id(12)]), 0, t);
    }
    assert.equal(await n("SELECT COUNT(*) AS n FROM audit_log WHERE target_type = 'report' AND target_id <> ?", [id(12)]), 0);
    // fotografiile: numai ale sesizării rămase
    assert.ok(existsSync(join(restoreStorageDir, 'r', `${id(12)}.webp`)));
    assert.ok(!existsSync(join(restoreStorageDir, 'r', `${id(11)}.webp`)));
    assert.ok(!existsSync(join(restoreStorageDir, 'r', `${id(13)}.webp`)));
    // D25–D26: contorul = max(backup 4, emis 5)
    assert.equal(await n('SELECT `last_value` AS n FROM report_counter WHERE id = 1'), 5);
    // sesiunile nu se restaurează; blocarea definitivă da
    assert.equal(await n('SELECT COUNT(*) AS n FROM sessions'), 0);
    assert.equal(await n("SELECT COUNT(*) AS n FROM citizen_blocks WHERE kind = 'permanent'"), 1);
    // contul cetățeanului nu este atins de retenție (A04-2)
    assert.equal(await n('SELECT COUNT(*) AS n FROM citizen_accounts'), 1);
  });
});

describe('CLI backup:db / restore:db', () => {
  const run = (args: string[], env: Record<string, string | undefined>) =>
    spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), ...args], {
      env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), ...env }), PATH: process.env.PATH ?? '' },
      encoding: 'utf8',
      timeout: 60_000,
    });

  it('fără BACKUP_DIR → refuz', () => {
    const res = run(['backup:db'], {});
    assert.equal(res.status, 1);
    assert.match(res.stderr, /BACKUP_DIR/);
  });

  it('restore:db fără --confirm → cod 2, cu lista backup-urilor', () => {
    const res = run(['restore:db', backupPath], { BACKUP_DIR: backupDir });
    assert.equal(res.status, 2);
    assert.match(res.stderr, /--confirm/);
    assert.match(res.stderr, /civic-backup-20260929T030000000Z/);
  });

  it('backup:db prin CLI creează un backup nou', () => {
    const res = run(['backup:db'], { BACKUP_DIR: backupDir, STORAGE_DIR: restoreStorageDir });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /backup:db: civic-backup-/);
  });
});

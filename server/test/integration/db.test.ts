// Integrare DB (B10 §1): migrații pe DB gol + idempotente, constrângeri, seed-uri, check:no-demo,
// verificarea versiunii schemei la pornire (DN-20). Cer MySQL real (CIVIC_TEST_DATABASE_URL).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import type { DbHandle } from '../../src/db/client.ts';
import { MIGRATIONS_TABLE, migrate, schemaStatus } from '../../src/db/migrations.ts';
import { checkNoDemo } from '../../src/db/noDemo.ts';
import { SeedRefusedError, seedConfig, seedDemo } from '../../src/db/seeds.ts';
import { APP_ROOT, MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { openTestDb, resetTestDb, testDatabaseUrl } from '../helpers/db.ts';
import { testEnv } from '../helpers/env.ts';
import { drizzleTables } from '../helpers/schema.ts';

let h: DbHandle;
const q = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await h.pool.query(sql, params))[0] as T[];
const count = async (table: string) => Number((await q<{ n: number }>(`SELECT COUNT(*) AS n FROM \`${table}\``))[0]!.n);
const now = new Date();
const ulid = (n: number) => `01TEST${String(n).padStart(20, '0')}`;

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
});
after(async () => {
  await h.close();
});

describe('migrații pe DB gol (DN-20)', () => {
  it('DB gol → schema nu e la versiune', async () => {
    const st = await schemaStatus(h.pool, MIGRATIONS_DIR);
    assert.equal(st.ok, false);
    assert.equal(st.currentVersion, 0);
  });

  it('prima rulare aplică 0001; a doua nu schimbă nimic', async () => {
    const first = await migrate(h.pool, MIGRATIONS_DIR);
    assert.deepEqual(first.applied, ['0001_initial_schema.sql']);
    const before2 = await q('SELECT TABLE_NAME, UPDATE_TIME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME');
    const second = await migrate(h.pool, MIGRATIONS_DIR);
    assert.deepEqual(second.applied, []);
    assert.deepEqual(await q('SELECT TABLE_NAME, UPDATE_TIME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME'), before2);
    assert.equal((await schemaStatus(h.pool, MIGRATIONS_DIR)).ok, true);
  });

  it('DB-ul are exact cele 30 de tabele + tabelul tehnic al migrațiilor, InnoDB utf8mb4_0900_ai_ci', async () => {
    const rows = await q<{ t: string; e: string; c: string }>(
      "SELECT TABLE_NAME AS t, ENGINE AS e, TABLE_COLLATION AS c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME",
    );
    const names = rows.map((r) => r.t).filter((t) => t !== MIGRATIONS_TABLE);
    assert.deepEqual(names, drizzleTables().map((t) => getTableConfig(t).name).sort());
    assert.equal(names.length, 30);
    for (const r of rows) {
      assert.equal(r.e, 'InnoDB', r.t);
      assert.equal(r.c, 'utf8mb4_0900_ai_ci', r.t);
    }
  });

  it('coloanele din DB corespund schemei Drizzle (nume, NULL / NOT NULL)', async () => {
    for (const t of drizzleTables()) {
      const cfg = getTableConfig(t);
      const cols = await q<{ n: string; nullable: string }>(
        'SELECT COLUMN_NAME AS n, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
        [cfg.name],
      );
      assert.deepEqual(cols.map((c) => c.n).sort(), cfg.columns.map((c) => c.name).sort(), cfg.name);
      for (const c of cfg.columns) {
        const db = cols.find((x) => x.n === c.name)!;
        const notNull = c.notNull || c.primary;
        assert.equal(db.nullable === 'NO', notNull, `${cfg.name}.${c.name}`);
      }
    }
  });

  it('cheile străine: 34, cu CASCADE / SET NULL numai unde prevede B1', async () => {
    const fks = await q<{ t: string; c: string; r: string }>(
      `SELECT k.TABLE_NAME AS t, k.COLUMN_NAME AS c, r.DELETE_RULE AS r
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
       WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
    );
    assert.equal(fks.length, 34);
    const nonRestrict = fks.filter((f) => f.r !== 'RESTRICT').map((f) => `${f.t}.${f.c}:${f.r}`).sort();
    assert.deepEqual(nonRestrict, [
      'citizen_blocks.account_id:SET NULL',
      'citizen_login_codes.account_id:CASCADE',
      'email_outbox.report_id:CASCADE',
      'report_assignees.report_id:CASCADE',
      'report_photos.report_id:CASCADE',
      'report_responses.report_id:CASCADE',
      'reports.author_account_id:SET NULL',
      'sessions.citizen_account_id:CASCADE',
      'survey_options.question_id:CASCADE',
      'survey_questions.survey_id:CASCADE',
    ]);
  });

  it('o migrație modificată după aplicare oprește pornirea', async () => {
    await h.pool.query(`UPDATE \`${MIGRATIONS_TABLE}\` SET checksum = REPEAT('0', 64) WHERE version = 1`);
    const st = await schemaStatus(h.pool, MIGRATIONS_DIR);
    assert.equal(st.ok, false);
    await assert.rejects(migrate(h.pool, MIGRATIONS_DIR), /modificată/);
    // restaurare
    const { readMigrationFiles } = await import('../../src/db/migrations.ts');
    await h.pool.query(`UPDATE \`${MIGRATIONS_TABLE}\` SET checksum = ? WHERE version = 1`, [readMigrationFiles(MIGRATIONS_DIR)[0]!.checksum]);
    assert.equal((await schemaStatus(h.pool, MIGRATIONS_DIR)).ok, true);
  });
});

describe('seed-uri (B1 §5.3, D10)', () => {
  it('seed:config creează categoriile, setările și contorul; a doua rulare nu dublează', async () => {
    await seedConfig(h.pool, SEEDS_DIR);
    await seedConfig(h.pool, SEEDS_DIR);
    assert.equal(await count('report_categories'), 8);
    assert.equal(await count('settings'), 4);
    assert.equal(await count('report_counter'), 1);
    const ids = (await q<{ id: string }>('SELECT id FROM report_categories ORDER BY sort_order')).map((r) => r.id);
    assert.deepEqual(ids, ['iluminat', 'drumuri', 'trotuare', 'apa_canal', 'salubritate', 'spatii_verzi', 'semnalizare', 'altele']);
    const mode = await q<{ v: string }>("SELECT JSON_UNQUOTE(value) AS v FROM settings WHERE `key` = 'registry.primaria_mode'");
    assert.equal(mode[0]!.v, 'none');
    const flow = await q<{ v: number }>("SELECT value = CAST('false' AS JSON) AS v FROM settings WHERE `key` = 'registry.flow_enabled'");
    assert.equal(Number(flow[0]!.v), 1);
  });

  it('seed:config nu suprascrie o setare schimbată de administrator', async () => {
    await h.pool.query("UPDATE settings SET value = CAST('\"platform\"' AS JSON) WHERE `key` = 'registry.primaria_mode'");
    await seedConfig(h.pool, SEEDS_DIR);
    const mode = await q<{ v: string }>("SELECT JSON_UNQUOTE(value) AS v FROM settings WHERE `key` = 'registry.primaria_mode'");
    assert.equal(mode[0]!.v, 'platform');
    await h.pool.query("UPDATE settings SET value = CAST('\"none\"' AS JSON) WHERE `key` = 'registry.primaria_mode'");
  });

  it('seed:demo este refuzat în producție (D10-4), fără nicio scriere', async () => {
    await assert.rejects(seedDemo(h.pool, SEEDS_DIR, 'production'), SeedRefusedError);
    assert.equal(await count('announcements'), 0);
  });

  it('check:no-demo: fără date demo → ok', async () => {
    assert.equal((await checkNoDemo(h.pool)).ok, true);
  });

  it('seed:demo: totul marcat is_demo; a doua rulare nu adaugă nimic', async () => {
    const first = await seedDemo(h.pool, SEEDS_DIR, 'staging');
    assert.ok((first.announcements ?? 0) > 0);
    const second = await seedDemo(h.pool, SEEDS_DIR, 'development');
    assert.deepEqual(second, {});
    for (const t of ['announcements', 'directory_institution', 'directory_departments', 'directory_services', 'directory_links', 'quickdial_categories', 'quickdial_contacts', 'surveys']) {
      const notDemo = await q<{ n: number }>(`SELECT COUNT(*) AS n FROM \`${t}\` WHERE is_demo = FALSE`);
      assert.equal(Number(notDemo[0]!.n), 0, t);
    }
    const ext = await q<{ n: number }>("SELECT COUNT(*) AS n FROM announcements WHERE image_url IS NOT NULL");
    assert.equal(Number(ext[0]!.n), 0, 'DN-19: fără URL-uri externe de imagini');
  });

  it('check:no-demo: cu date demo → refuz, cu tabelele numite', async () => {
    const res = await checkNoDemo(h.pool);
    assert.equal(res.ok, false);
    assert.ok(res.demoRows.announcements! > 0);
    assert.ok(res.demoRows.surveys! > 0);
  });
});

describe('constrângeri (B1 §4)', () => {
  const citizen = async (n: number, email: string) =>
    h.pool.query(
      "INSERT INTO citizen_accounts (id, email, email_normalized, status, policy_version, policy_accepted_at, created_at) VALUES (?, ?, ?, 'active', 'v1', ?, ?)",
      [ulid(n), email, email.toLowerCase(), now, now],
    );
  const report = async (n: number, ref: string, author: string | null, lat: number | null, lng: number | null) =>
    h.pool.query(
      "INSERT INTO reports (id, author_account_id, reference_number, category_id, description, location_text, lat, lng, location_source, created_at, updated_at) VALUES (?, ?, ?, 'iluminat', 'Descriere de test suficient de lungă', 'Str. Test 1', ?, ?, 'pin', ?, ?)",
      [ulid(n), author, ref, lat, lng, now, now],
    );

  it('un e-mail = un cont (UNIQUE email_normalized, D30)', async () => {
    await citizen(1, 'Ion@Exemplu.test');
    await assert.rejects(citizen(2, 'ion@exemplu.test'), /Duplicate/);
  });

  it('coordonatele: ambele sau niciuna (CHECK)', async () => {
    await report(10, 'TM-001', ulid(1), 43.75, 24.87);
    await report(11, 'TM-002', ulid(1), null, null);
    await assert.rejects(report(12, 'TM-003', ulid(1), 43.75, null), /chk_reports_lat_lng_pair/);
  });

  it('TM-XXX unic (UNIQUE reference_number)', async () => {
    await assert.rejects(report(13, 'TM-001', null, null, null), /Duplicate/);
  });

  it('contorul TM are un singur rând (CHECK id = 1)', async () => {
    await assert.rejects(h.pool.query('INSERT INTO report_counter (`id`, `last_value`) VALUES (2, 0)'), /chk_report_counter_single_row/);
  });

  it('blocare temporară fără ends_at → refuz; definitivă cu ends_at → refuz (K-A02-4)', async () => {
    await assert.rejects(
      h.pool.query("INSERT INTO citizen_blocks (id, kind, starts_at, ends_at, email_hash) VALUES (?, 'temporary', ?, NULL, REPEAT('a', 64))", [ulid(20), now]),
      /chk_citizen_blocks_kind_ends/,
    );
    await assert.rejects(
      h.pool.query("INSERT INTO citizen_blocks (id, kind, starts_at, ends_at, email_hash) VALUES (?, 'permanent', ?, ?, REPEAT('a', 64))", [ulid(21), now, now]),
      /chk_citizen_blocks_kind_ends/,
    );
    await h.pool.query("INSERT INTO citizen_blocks (id, account_id, kind, starts_at, ends_at, email_hash) VALUES (?, ?, 'permanent', ?, NULL, REPEAT('b', 64))", [ulid(22), ulid(1), now]);
  });

  it('ștergerea unei sesizări șterge fotografiile, notele, responsabilii și jurnalul e-mail (CASCADE, A05-4)', async () => {
    await h.pool.query(
      "INSERT INTO admin_users (id, email, display_name, role, password_hash, created_at, updated_at) VALUES (?, 'admin@exemplu.test', 'Admin', 'super_admin', 'x', ?, ?)",
      [ulid(30), now, now],
    );
    await h.pool.query("INSERT INTO report_photos (id, report_id, ordinal, storage_key, mime, size_bytes, width, height, sha256, created_at) VALUES (?, ?, 1, 'k1', 'image/webp', 10, 1, 1, REPEAT('c', 64), ?)", [ulid(31), ulid(10), now]);
    await h.pool.query('INSERT INTO report_responses (id, report_id, message, author_user_id, created_at) VALUES (?, ?, ?, ?, ?)', [ulid(32), ulid(10), 'notă', ulid(30), now]);
    await h.pool.query('INSERT INTO report_assignees (report_id, user_id, assigned_at) VALUES (?, ?, ?)', [ulid(10), ulid(30), now]);
    await h.pool.query("INSERT INTO email_outbox (id, kind, report_id, recipient, subject, status, created_at) VALUES (?, 'registry_notification', ?, 'r@exemplu.test', 'TM-001', 'sent', ?)", [ulid(33), ulid(10), now]);
    await assert.rejects(
      h.pool.query("INSERT INTO report_photos (id, report_id, ordinal, storage_key, mime, size_bytes, width, height, sha256, created_at) VALUES (?, ?, 5, 'k2', 'image/webp', 10, 1, 1, REPEAT('c', 64), ?)", [ulid(34), ulid(10), now]),
      /chk_report_photos_ordinal/,
    );
    await h.pool.query('DELETE FROM reports WHERE id = ?', [ulid(10)]);
    for (const t of ['report_photos', 'report_responses', 'report_assignees', 'email_outbox']) {
      assert.equal(await count(t), 0, t);
    }
    // D25–D26: contorul nu este atins de ștergere
    assert.equal(await count('report_counter'), 1);
  });

  it('ștergerea contului: sesizările rămân fără autor, blocarea rămâne cu email_hash (2.7, SET NULL)', async () => {
    await h.pool.query('DELETE FROM citizen_accounts WHERE id = ?', [ulid(1)]);
    const r = await q<{ a: string | null }>('SELECT author_account_id AS a FROM reports WHERE id = ?', [ulid(11)]);
    assert.equal(r[0]!.a, null);
    const b = await q<{ a: string | null; e: string }>('SELECT account_id AS a, email_hash AS e FROM citizen_blocks WHERE id = ?', [ulid(22)]);
    assert.equal(b[0]!.a, null);
    assert.equal(b[0]!.e, 'b'.repeat(64));
  });

  it('un sondaj cu voturi nu se șterge (RESTRICT); un vot per jeton per sondaj (UNIQUE)', async () => {
    const [survey] = await q<{ id: string }>('SELECT id FROM surveys LIMIT 1');
    await h.pool.query('INSERT INTO survey_submissions (id, survey_id, participation_fingerprint, submitted_at) VALUES (?, ?, REPEAT(\'d\', 64), ?)', [ulid(40), survey!.id, now]);
    await assert.rejects(
      h.pool.query('INSERT INTO survey_submissions (id, survey_id, participation_fingerprint, submitted_at) VALUES (?, ?, REPEAT(\'d\', 64), ?)', [ulid(41), survey!.id, now]),
      /Duplicate/,
    );
    await assert.rejects(h.pool.query('DELETE FROM surveys WHERE id = ?', [survey!.id]), /foreign key/);
  });

  it('categoria Apel rapid cu contacte nu se șterge (RESTRICT)', async () => {
    const [c] = await q<{ id: string }>('SELECT category_id AS id FROM quickdial_contacts LIMIT 1');
    await assert.rejects(h.pool.query('DELETE FROM quickdial_categories WHERE id = ?', [c!.id]), /foreign key/);
  });

  it('sondaj cu end_at ≤ start_at → refuz (CHECK)', async () => {
    await assert.rejects(
      h.pool.query("INSERT INTO surveys (id, title, description, start_at, end_at, created_at, updated_at) VALUES (?, 't', 'd', ?, ?, ?, ?)", [ulid(50), now, now, now, now]),
      /chk_surveys_period/,
    );
  });
});

describe('pornirea aplicației (DN-20, D10-3)', () => {
  const run = (args: string[], env: Record<string, string>) =>
    spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), ...args], {
      env: { ...testEnv({ DATABASE_URL: testDatabaseUrl(), ...env }), PATH: process.env.PATH ?? '' },
      encoding: 'utf8',
      timeout: 30_000,
    });

  it('producție cu date demo → aplicația refuză să pornească', () => {
    const res = run([], { APP_ENV: 'production', PUBLIC_BASE_URL: 'https://exemplu.test', PORT: '39871' });
    assert.equal(res.status, 1, res.stderr);
    assert.match(res.stderr, /date demo/);
  });

  it('CLI: seed:demo în producție → cod 2; check:no-demo cu date demo → cod 1', () => {
    const prod = { APP_ENV: 'production', PUBLIC_BASE_URL: 'https://exemplu.test' };
    assert.equal(run(['seed:demo'], prod).status, 2);
    assert.equal(run(['check:no-demo'], prod).status, 1);
  });

  it('fără un secret → refuz la pornire, fără valoarea secretelor în mesaj', () => {
    const env = testEnv({ DATABASE_URL: testDatabaseUrl(), TOTP_ENC_KEY: undefined });
    const res = spawnSync(process.execPath, ['--import', 'tsx', join(APP_ROOT, 'server', 'src', 'main.ts'), 'migrate:status'], {
      env: { ...env, PATH: process.env.PATH ?? '' },
      encoding: 'utf8',
    });
    assert.equal(res.status, 1);
    assert.match(res.stderr, /TOTP_ENC_KEY/);
    assert.ok(!res.stderr.includes(env.IP_HASH_SECRET!));
  });

  it('schemă sub versiunea așteptată → aplicația refuză să pornească', async () => {
    await h.pool.query(`DELETE FROM \`${MIGRATIONS_TABLE}\``);
    const res = run([], { APP_ENV: 'development', PORT: '39871' });
    assert.equal(res.status, 1, res.stderr);
    assert.match(res.stderr, /versiunea așteptată/);
  });
});

// Backup și restaurare „cu fereastră” (T-D1, decizia tehnică aprobată la 5.1):
//
// 1. backup-urile se păstrează R = 7 zile (rotație zilnică);
// 2. fiecare backup EXCLUDE sesizările mai vechi de 45 − 7 = 38 de zile și toate datele lor
//    (fotografii, note, responsabili, jurnalul e-mail, rândurile audit_log ale sesizării);
//    astfel nicio copie nu conține date de sesizare mai vechi de 45 de zile;
// 3. aceeași fereastră pentru celelalte termene: corpul e-mailurilor de cont (N3-8, 45 de zile),
//    auditul administrativ (6 luni, A04-4), textele libere din sondajele închise (6 luni, A06-1);
// 4. lista de ștergeri: numai ID-urile interne ale sesizărilor șterse de autor / super_admin,
//    păstrate 7 zile, reaplicate la restaurare (o sesizare ștearsă nu reapare);
// 5. restaurarea se face într-un DB nou, după `migrate`; după încărcare se aplică lista de ștergeri
//    și retenția (sesizările ajunse între timp la 45 de zile dispar), apoi pornește aplicația;
// 6. blocările definitive (citizen_blocks) intră normal în backup: nu au termen de retenție.
//
// Nu intră în backup datele efemere: sesiunile, codurile de autentificare, limitele de rată,
// provocările proof-of-work folosite (după o restaurare, utilizatorii se autentifică din nou).
//
// Format: un director `civic-backup-<UTC>` cu `db.jsonl.gz` (rândurile, ca JSON), `manifest.json`
// (versiunea schemei, numărul de rânduri, SHA-256) și `photos/` (fișierele sesizărilor păstrate).
// Directorul de backup trebuie să fie în afara oricărui docroot (G3, condiția 6).

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync, copyFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createGunzip, createGzip } from 'node:zlib';
import mysql from 'mysql2/promise';
import { storagePath } from '../storage.ts';
import { deleteReportsHard, expiredReportIds } from './reportDeletion.ts';
import { SESSION_SQL_MODE } from './client.ts';
import { readMigrationFiles, schemaStatus } from './migrations.ts';

export const BACKUP_FORMAT = 'civic-backup/1';
/** R: zilele de păstrare a backup-urilor și a listei de ștergeri (T-D1). */
export const BACKUP_ROTATION_DAYS = 7;
const DAY = 86_400_000;
const NAME_RE = /^civic-backup-(\d{8}T\d{6}\d{3}Z)$/;
export const DELETION_LIST_FILE = 'deletion-list.jsonl';
export const COUNTER_WATERMARK_FILE = 'report-counter-watermark.json';

/** Tabelele efemere, excluse din backup. */
export const EPHEMERAL_TABLES = ['sessions', 'citizen_login_codes', 'rate_limits', 'used_pow_challenges'] as const;

/** Ordinea de încărcare (părinții înaintea copiilor). */
export const TABLE_ORDER = [
  'admin_users', 'admin_recovery_codes', 'settings', 'audit_log',
  'citizen_accounts', 'citizen_blocks',
  'report_categories', 'report_counter', 'reports', 'report_assignees', 'report_photos', 'report_responses',
  'announcements', 'directory_institution', 'directory_departments', 'directory_services', 'directory_links',
  'quickdial_categories', 'quickdial_contacts',
  'surveys', 'survey_questions', 'survey_options', 'survey_submissions', 'survey_answers',
  'email_outbox', 'rejected_attempts',
] as const;

export type BackupWindows = {
  /** sesizările cu created_at ≥ reportsFrom intră în backup (38 de zile). */
  reportsFrom: Date;
  /** auditul administrativ și textele libere: 6 luni − 7 zile. */
  adminFrom: Date;
};

export function backupWindows(now: Date, retentionDays: number, adminRetentionMonths: number): BackupWindows {
  const reportsFrom = new Date(now.getTime() - (retentionDays - BACKUP_ROTATION_DAYS) * DAY);
  const months = new Date(now.getTime());
  months.setUTCMonth(months.getUTCMonth() - adminRetentionMonths);
  const adminFrom = new Date(months.getTime() + BACKUP_ROTATION_DAYS * DAY);
  return { reportsFrom, adminFrom };
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:.]/g, '').replace(/(\d{8}T\d{6})(\d{3})Z/, '$1$2Z');
}

function parseStamp(s: string): Date {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\d{3})Z$/.exec(s)!;
  return new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!, +m[7]!));
}

const sqlDate = (d: Date) => d.toISOString().replace('T', ' ').replace('Z', '');

type ColumnInfo = { name: string; type: string };

/**
 * MariaDB: `JSON` este un alias pentru LONGTEXT cu o constrângere `CHECK (json_valid(col))`, iar
 * information_schema raportează „longtext”. Coloanele acestea se recunosc după constrângere și se tratează
 * ca JSON, la fel ca pe MySQL (unde DATA_TYPE = „json”). Pe MySQL, funcția întoarce o mulțime goală.
 */
async function mariadbJsonColumns(conn: mysql.Connection, table: string): Promise<Set<string>> {
  const [v] = await conn.query('SELECT VERSION() AS v');
  if (!/mariadb/i.test(String((v as Array<{ v: string }>)[0]!.v))) return new Set();
  const [rows] = await conn.query(
    'SELECT CHECK_CLAUSE AS clause FROM information_schema.CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table],
  );
  const out = new Set<string>();
  for (const { clause } of rows as Array<{ clause: string }>) {
    const m = /^json_valid\(`([^`]+)`\)$/i.exec(String(clause).trim());
    if (m) out.add(m[1]!);
  }
  return out;
}

async function tableColumns(conn: mysql.Connection, table: string): Promise<ColumnInfo[]> {
  const [rows] = await conn.query(
    'SELECT COLUMN_NAME AS name, DATA_TYPE AS type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
    [table],
  );
  const json = await mariadbJsonColumns(conn, table);
  return (rows as ColumnInfo[]).map((c) => (json.has(c.name) ? { name: c.name, type: 'json' } : c));
}

/** SELECT-ul fiecărui tabel, cu fereastra aplicată. `?` = reportsFrom, `??` înlocuit mai jos. */
function selectFor(table: string, cols: ColumnInfo[], w: BackupWindows): { sql: string; params: unknown[] } {
  const rf = sqlDate(w.reportsFrom);
  const af = sqlDate(w.adminFrom);
  const kept = 'SELECT id FROM reports WHERE created_at >= ?';
  const expr = cols.map((c) => {
    const q = `\`${c.name}\``;
    if (c.type === 'json') return `CAST(${q} AS CHAR) AS ${q}`;
    if (table === 'email_outbox' && c.name === 'body_text') {
      // corpul e-mailurilor de cont (fără sesizare): numai în fereastră (N3-8)
      return `CASE WHEN report_id IS NULL AND created_at < ? THEN NULL ELSE ${q} END AS ${q}`;
    }
    if (table === 'survey_answers' && c.name === 'text_value') {
      // textele libere: numai pentru sondajele închise de mai puțin de 6 luni − 7 zile (A06-1)
      return `CASE WHEN (SELECT s.end_at FROM survey_questions q JOIN surveys s ON s.id = q.survey_id WHERE q.id = survey_answers.question_id) < ? THEN NULL ELSE ${q} END AS ${q}`;
    }
    return q;
  });
  const params: unknown[] = [];
  if (table === 'email_outbox') params.push(rf);
  if (table === 'survey_answers') params.push(af);
  let where = '';
  switch (table) {
    case 'reports':
      where = 'WHERE created_at >= ?';
      params.push(rf);
      break;
    case 'report_assignees':
    case 'report_photos':
    case 'report_responses':
      where = `WHERE report_id IN (${kept})`;
      params.push(rf);
      break;
    case 'email_outbox':
      where = `WHERE report_id IS NULL OR report_id IN (${kept})`;
      params.push(rf);
      break;
    case 'audit_log':
      where = `WHERE (target_type = 'report' AND target_id IN (${kept})) OR ((target_type IS NULL OR target_type <> 'report') AND occurred_at >= ?)`;
      params.push(rf, af);
      break;
  }
  return { sql: `SELECT ${expr.join(', ')} FROM \`${table}\` ${where}`, params };
}

function encodeValue(v: unknown): unknown {
  if (Buffer.isBuffer(v)) return { $b64: v.toString('base64') };
  return v;
}

function decodeValue(v: unknown): unknown {
  if (v !== null && typeof v === 'object' && '$b64' in (v as Record<string, unknown>)) {
    return Buffer.from((v as { $b64: string }).$b64, 'base64');
  }
  return v;
}

export type BackupManifest = {
  format: string;
  name: string;
  createdAt: string;
  schemaVersion: number;
  retentionDays: number;
  rotationDays: number;
  reportsFrom: string;
  adminFrom: string;
  counts: Record<string, number>;
  photos: number;
  dbSha256: string;
};

export type BackupOptions = {
  databaseUrl: string;
  backupDir: string;
  storageDir: string;
  migrationsDir: string;
  retentionDays: number;
  adminRetentionMonths: number;
  now?: Date;
};

/** Conexiune dedicată: datele calendaristice ca text (UTC exact), fără conversii. */
async function rawConnection(databaseUrl: string): Promise<mysql.Connection> {
  const conn = await mysql.createConnection({ uri: databaseUrl, dateStrings: true, timezone: 'Z', charset: 'utf8mb4_0900_ai_ci', supportBigNumbers: true, bigNumberStrings: true });
  await conn.query(`SET time_zone = '+00:00', sql_mode = '${SESSION_SQL_MODE}'`);
  return conn;
}

export async function createBackup(opts: BackupOptions): Promise<{ dir: string; manifest: BackupManifest; removed: string[] }> {
  const now = opts.now ?? new Date();
  const w = backupWindows(now, opts.retentionDays, opts.adminRetentionMonths);
  mkdirSync(opts.backupDir, { recursive: true });
  const name = `civic-backup-${stamp(now)}`;
  const finalDir = join(opts.backupDir, name);
  const tmpDir = join(opts.backupDir, `.tmp-${name}`);
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(join(tmpDir, 'photos'), { recursive: true });

  const pool = mysql.createPool({ uri: opts.databaseUrl, connectionLimit: 1 });
  const status = await schemaStatus(pool, opts.migrationsDir).finally(() => pool.end());
  if (!status.ok) throw new Error('Backup refuzat: schema DB nu este la versiunea așteptată.');

  const conn = await rawConnection(opts.databaseUrl);
  const counts: Record<string, number> = {};
  const photoKeys: string[] = [];
  const lines: string[] = [];
  try {
    await conn.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    for (const table of TABLE_ORDER) {
      const cols = await tableColumns(conn, table);
      const { sql, params } = selectFor(table, cols, w);
      const [rows] = await conn.query({ sql, values: params, rowsAsArray: true });
      lines.push(JSON.stringify({ type: 'table', name: table, columns: cols.map((c) => c.name), json: cols.filter((c) => c.type === 'json').map((c) => c.name) }));
      for (const r of rows as unknown[][]) lines.push(JSON.stringify({ t: table, v: r.map(encodeValue) }));
      counts[table] = (rows as unknown[]).length;
      if (table === 'report_photos') {
        const keyIdx = cols.findIndex((c) => c.name === 'storage_key');
        for (const r of rows as unknown[][]) photoKeys.push(String(r[keyIdx]));
      }
    }
    await conn.query('COMMIT');
  } finally {
    await conn.end();
  }

  const dbFile = join(tmpDir, 'db.jsonl.gz');
  await pipeline(Readable.from(lines.map((l) => l + '\n')), createGzip(), createWriteStream(dbFile));
  const dbSha256 = createHash('sha256').update(readFileSync(dbFile)).digest('hex');

  let photos = 0;
  for (const key of photoKeys) {
    const src = storagePath(opts.storageDir, key);
    if (!existsSync(src)) continue; // fișier lipsă: se raportează la restaurare
    const dst = storagePath(join(tmpDir, 'photos'), key);
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
    photos++;
  }

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT,
    name,
    createdAt: now.toISOString(),
    schemaVersion: status.currentVersion,
    retentionDays: opts.retentionDays,
    rotationDays: BACKUP_ROTATION_DAYS,
    reportsFrom: w.reportsFrom.toISOString(),
    adminFrom: w.adminFrom.toISOString(),
    counts,
    photos,
    dbSha256,
  };
  writeFileSync(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  renameSync(tmpDir, finalDir);

  const removed = rotateBackups(opts.backupDir, now);
  pruneDeletionList(opts.backupDir, now);
  return { dir: finalDir, manifest, removed };
}

/** Șterge backup-urile mai vechi de R = 7 zile. */
export function rotateBackups(backupDir: string, now: Date): string[] {
  if (!existsSync(backupDir)) return [];
  const limit = now.getTime() - BACKUP_ROTATION_DAYS * DAY;
  const removed: string[] = [];
  for (const entry of readdirSync(backupDir)) {
    const m = NAME_RE.exec(entry);
    if (m && parseStamp(m[1]!).getTime() < limit) {
      rmSync(join(backupDir, entry), { recursive: true, force: true });
      removed.push(entry);
    }
    // directoarele temporare rămase de la o rulare întreruptă
    if (entry.startsWith('.tmp-civic-backup-')) rmSync(join(backupDir, entry), { recursive: true, force: true });
  }
  return removed;
}

export function listBackups(backupDir: string): string[] {
  if (!existsSync(backupDir)) return [];
  return readdirSync(backupDir).filter((e) => NAME_RE.test(e)).sort();
}

// ---- lista de ștergeri (numai ID-uri interne, 7 zile) ----

type DeletionEntry = { reportId: string; deletedAt: string };

function readDeletionList(backupDir: string): DeletionEntry[] {
  const file = join(backupDir, DELETION_LIST_FILE);
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as DeletionEntry);
}

/** Apelată la ștergerea definitivă de către autor / super_admin (din 5.4). */
export function recordReportDeletions(backupDir: string, reportIds: string[], now: Date = new Date()): void {
  if (reportIds.length === 0) return;
  mkdirSync(backupDir, { recursive: true });
  appendFileSync(
    join(backupDir, DELETION_LIST_FILE),
    reportIds.map((id) => JSON.stringify({ reportId: id, deletedAt: now.toISOString() }) + '\n').join(''),
  );
  pruneDeletionList(backupDir, now);
}

export function pruneDeletionList(backupDir: string, now: Date): number {
  const file = join(backupDir, DELETION_LIST_FILE);
  if (!existsSync(file)) return 0;
  const limit = now.getTime() - BACKUP_ROTATION_DAYS * DAY;
  const all = readDeletionList(backupDir);
  const keep = all.filter((e) => Date.parse(e.deletedAt) >= limit);
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, keep.map((e) => JSON.stringify(e) + '\n').join(''));
  renameSync(tmp, file);
  return all.length - keep.length;
}

export function deletionListIds(backupDir: string): string[] {
  return [...new Set(readDeletionList(backupDir).map((e) => e.reportId))];
}

// ---- contorul TM (D25–D26: un număr TM-XXX nu se refolosește niciodată) ----
// Sesizările depuse după ultimul backup se pierd la o restaurare; numerele lor au fost însă deja
// comunicate. Valoarea maximă emisă se ține în afara DB-ului, lângă backup-uri, iar restaurarea
// pornește contorul de la maximul dintre backup și această valoare.

/** Apelată la crearea unei sesizări (din 5.4), cu noua valoare a contorului. */
export function recordReportCounter(backupDir: string, value: number): void {
  mkdirSync(backupDir, { recursive: true });
  const current = readReportCounterWatermark(backupDir);
  if (value <= current) return;
  const file = join(backupDir, COUNTER_WATERMARK_FILE);
  writeFileSync(`${file}.tmp`, JSON.stringify({ lastValue: value }) + '\n');
  renameSync(`${file}.tmp`, file);
}

export function readReportCounterWatermark(backupDir: string): number {
  const file = join(backupDir, COUNTER_WATERMARK_FILE);
  if (!existsSync(file)) return 0;
  return Number((JSON.parse(readFileSync(file, 'utf8')) as { lastValue: number }).lastValue) || 0;
}

// ---- restaurare ----

export type RestoreOptions = BackupOptions & { source: string };

export type RestoreResult = {
  rows: Record<string, number>;
  photosRestored: number;
  photosMissing: number;
  deletedFromList: number;
  purgedByRetention: number;
};

export async function restoreBackup(opts: RestoreOptions): Promise<RestoreResult> {
  const now = opts.now ?? new Date();
  const manifest = JSON.parse(readFileSync(join(opts.source, 'manifest.json'), 'utf8')) as BackupManifest;
  if (manifest.format !== BACKUP_FORMAT) throw new Error(`Format de backup necunoscut: ${manifest.format}`);
  const dbFile = join(opts.source, 'db.jsonl.gz');
  if (createHash('sha256').update(readFileSync(dbFile)).digest('hex') !== manifest.dbSha256) {
    throw new Error('Backup corupt: suma SHA-256 a db.jsonl.gz nu corespunde manifestului.');
  }
  const expected = readMigrationFiles(opts.migrationsDir).length;
  if (manifest.schemaVersion !== expected) {
    throw new Error(`Backup-ul are schema ${manifest.schemaVersion}, aplicația cere ${expected}. Restaurați cu versiunea aplicației care a făcut backup-ul.`);
  }

  const pool = mysql.createPool({ uri: opts.databaseUrl, connectionLimit: 2, timezone: 'Z' });
  try {
    const status = await schemaStatus(pool, opts.migrationsDir);
    if (!status.ok) throw new Error('Restaurare refuzată: rulați întâi „migrate” pe DB-ul nou.');
    for (const table of [...TABLE_ORDER, ...EPHEMERAL_TABLES]) {
      const [r] = await pool.query(`SELECT COUNT(*) AS n FROM \`${table}\``);
      if (Number((r as Array<{ n: number }>)[0]!.n) > 0) {
        throw new Error(`Restaurare refuzată: tabelul ${table} nu este gol. Restaurarea se face numai într-un DB nou, după „migrate”.`);
      }
    }

    // 1. încărcarea rândurilor, într-o singură tranzacție
    const conn = await rawConnection(opts.databaseUrl);
    const rows: Record<string, number> = {};
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.beginTransaction();
      let current: { name: string; columns: string[] } | null = null;
      let batch: unknown[][] = [];
      const flush = async () => {
        if (!current || batch.length === 0) return;
        const cols = current.columns.map((c) => `\`${c}\``).join(', ');
        await conn.query(`INSERT INTO \`${current.name}\` (${cols}) VALUES ?`, [batch]);
        rows[current.name] = (rows[current.name] ?? 0) + batch.length;
        batch = [];
      };
      const rl = createInterface({ input: createReadStream(dbFile).pipe(createGunzip()), crlfDelay: Infinity });
      for await (const line of rl) {
        if (line.trim() === '') continue;
        const rec = JSON.parse(line) as { type?: string; name?: string; columns?: string[]; t?: string; v?: unknown[] };
        if (rec.type === 'table') {
          await flush();
          if (!(TABLE_ORDER as readonly string[]).includes(rec.name!)) throw new Error(`Tabel neașteptat în backup: ${rec.name}`);
          current = { name: rec.name!, columns: rec.columns! };
          rows[current.name] = 0;
        } else if (rec.t) {
          batch.push(rec.v!.map(decodeValue));
          if (batch.length >= 200) await flush();
        }
      }
      await flush();
      await conn.commit();
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (err) {
      await conn.rollback().catch(() => {});
      throw err;
    } finally {
      await conn.end();
    }
    for (const [t, n] of Object.entries(manifest.counts)) {
      if ((rows[t] ?? 0) !== n) throw new Error(`Restaurare incompletă: ${t} are ${rows[t] ?? 0} rânduri, manifestul ${n}.`);
    }
    await verifyForeignKeys(pool);

    // 2. fotografiile
    let photosRestored = 0;
    let photosMissing = 0;
    const [photoRows] = await pool.query('SELECT storage_key AS k FROM report_photos');
    for (const { k } of photoRows as Array<{ k: string }>) {
      const src = storagePath(join(opts.source, 'photos'), k);
      if (!existsSync(src)) {
        photosMissing++;
        continue;
      }
      const dst = storagePath(opts.storageDir, k);
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst);
      photosRestored++;
    }

    // contorul TM nu coboară sub ultima valoare emisă (D25–D26)
    await pool.query('UPDATE report_counter SET `last_value` = GREATEST(`last_value`, ?) WHERE id = 1', [
      readReportCounterWatermark(opts.backupDir),
    ]);

    // 3. lista de ștergeri: sesizările șterse după backup nu reapar
    const deleted = await deleteReportsHard(pool, deletionListIds(opts.backupDir), opts.storageDir);

    // 4. retenția: sesizările ajunse între timp la 45 de zile de la depunere dispar
    const expired = await deleteReportsHard(pool, await expiredReportIds(pool, opts.retentionDays, now), opts.storageDir);

    return {
      rows,
      photosRestored,
      photosMissing,
      deletedFromList: deleted.reportIds.length,
      purgedByRetention: expired.reportIds.length,
    };
  } finally {
    await pool.end();
  }
}

/** După încărcarea cu FOREIGN_KEY_CHECKS = 0: nicio referință fără părinte. */
async function verifyForeignKeys(pool: mysql.Pool): Promise<void> {
  const [fks] = await pool.query(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, REFERENCED_TABLE_NAME AS rt, REFERENCED_COLUMN_NAME AS rc
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`,
  );
  for (const fk of fks as Array<{ t: string; c: string; rt: string; rc: string }>) {
    const [r] = await pool.query(
      `SELECT COUNT(*) AS n FROM \`${fk.t}\` ch LEFT JOIN \`${fk.rt}\` p ON p.\`${fk.rc}\` = ch.\`${fk.c}\`
       WHERE ch.\`${fk.c}\` IS NOT NULL AND p.\`${fk.rc}\` IS NULL`,
    );
    const n = Number((r as Array<{ n: number }>)[0]!.n);
    if (n > 0) throw new Error(`Restaurare invalidă: ${n} rânduri din ${fk.t}.${fk.c} fără părinte în ${fk.rt}.`);
  }
}

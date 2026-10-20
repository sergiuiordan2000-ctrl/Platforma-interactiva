// Backup și restaurare „cu fereastră” (T-D1, decizia tehnică aprobată la 5.1):
//
// 1. backup-urile se păstrează R = 7 zile (rotație zilnică);
// 2. fiecare backup EXCLUDE sesizările mai vechi de 45 − 7 = 38 de zile și toate datele lor
//    (fotografii, note, responsabili, jurnalul e-mail, rândurile audit_log ale sesizării);
//    astfel nicio copie nu conține date de sesizare mai vechi de 45 de zile;
// 3. aceeași fereastră pentru celelalte termene: corpul e-mailurilor de cont (N3-8, 45 de zile),
//    auditul administrativ (6 luni, A04-4), textele libere din sondajele închise (6 luni, A06-1);
// 4. marcajele de ștergere (`markers.ts`): numai ID-urile interne ale sesizărilor șterse de autor /
//    super_admin, scrise de rute ÎNAINTE de confirmarea ștergerii și reaplicate la restaurare (o
//    sesizare ștearsă nu reapare). O intrare se păstrează cât timp o copie o mai poate readuce: până la
//    „data depunerii + 45 de zile” (după aceea, retenția aplicată la restaurare o elimină oricum);
// 5. restaurarea se face într-un DB nou, după `migrate`, și într-un director de fișiere nou, gol; totul
//    se verifică înainte de prima scriere (`inspectRestore`, folosit și de `restore:db --check`);
//    încărcarea, marcajul contorului TM, ștergerile și retenția (sesizările ajunse între timp la 45 de
//    zile dispar) se confirmă într-o singură tranzacție, apoi pornește aplicația;
// 6. blocările definitive (citizen_blocks) intră normal în backup: nu au termen de retenție;
// 7. marcajul contorului TM (`markers.ts`, `reportCounter.ts`): scris de fiecare emitere înainte de
//    COMMIT; la pornire și la fiecare backup, contorul din bază și marcajul sunt aduse la maximul
//    dintre ele; restaurarea nu coboară contorul sub marcaj. Un număr rezervat nu se mai emite.
// 8. R18 (D7-3, D7-3a): marcajele de ștergere a conturilor (`account-deletions/<ID>.json`, fără termen).
//    Restaurarea repetă ștergerea făcută de titular (`accountDeletion.ts`), numai după ID și numai pentru
//    un cont creat înaintea ștergerii notate. Un `account-deletions/` absent (BACKUP_DIR de dinaintea
//    R18) produce numai un avertisment; un marcaj corupt oprește restaurarea înainte de orice scriere.
// 9. R19 (D7-3): starea cozii de e-mail din copie nu arată dacă un mesaj a plecat după copie. La
//    restaurare: codurile de autentificare și anunțurile de blocare neplecate → `cancelled`; mesajele
//    sesizărilor neplecate (`queued`, `sending`, `on_hold`) → `failed`, cu motivul în `last_error`, fără
//    nicio retrimitere automată: le reîncearcă numai un `super_admin`, după verificare (risc de duplicat).
//
// Toate marcajele (cele curente și fotografiile din copii) se citesc și se validează în `inspectRestore`,
// ÎNAINTE de prima scriere; restaurarea folosește numai rezultatul inspecției, nu le mai citește din nou.
//
// Nu intră în backup datele efemere: sesiunile, codurile de autentificare, limitele de rată,
// provocările proof-of-work folosite (după o restaurare, utilizatorii se autentifică din nou).
//
// Format: un director `civic-backup-<UTC>` cu `db.jsonl.gz` (rândurile, ca JSON), `manifest.json`
// (versiunea schemei, numărul de rânduri, SHA-256) și `photos/` (fișierele sesizărilor păstrate).
// Lângă backup-uri, în același director: `report-counter-watermark.json` și `deletions/<ID>.json`.
// Directorul de backup trebuie să fie în afara oricărui docroot (G3, condiția 6).
// Restaurarea NU scrie nimic în directorul de backup și nici în copia sursă: sunt date de intrare.

import { createHash } from 'node:crypto';
import { constants as fsConstants, createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync, copyFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createGunzip, createGzip } from 'node:zlib';
import mysql from 'mysql2/promise';
import { storagePath } from '../storage.ts';
import { deleteReportRows, expiredReportIds } from './reportDeletion.ts';
import { dbDate, deleteCitizenAccountRows, reconcileAccountDeletionIntents, type IntentReconciliation } from './accountDeletion.ts';
import { writeAudit } from '../audit.ts';
import { SESSION_SQL_MODE } from './client.ts';
import { MIGRATIONS_TABLE, compare, readApplied, readMigrationFiles, schemaStatus } from './migrations.ts';
import {
  ACCOUNT_DELETIONS_DIR,
  ACCOUNT_DELETIONS_PENDING_DIR,
  COUNTER_WATERMARK_FILE,
  DELETIONS_DIR,
  MARKER_SNAPSHOT_FILE,
  MarkerError,
  accountMarkersLost,
  readAccountDeletionIntents,
  readAccountDeletionMarkers,
  writeMissingAccountDeletionEntries,
  type AccountDeletionEntry,
  deletionMarkerExpiry,
  initMarkerDirs,
  parseMarkerSnapshot,
  takeMarkerSnapshot,
  writeMissingDeletionEntries,
  type DeletionEntry,
  pruneDeletionList,
  readDeletionMarkers,
  readReportCounterWatermark,
  recordReportCounter,
} from './markers.ts';
import { initBackupMarkers, type CounterSync } from './reportCounter.ts';

// Marcajele au modulul lor; se reexportă aici pentru codul și testele care le importau din backup.ts.
export {
  COUNTER_WATERMARK_FILE,
  DELETIONS_DIR,
  deletionListIds,
  pruneDeletionList,
  readReportCounterWatermark,
  recordReportCounter,
  recordReportDeletions,
} from './markers.ts';

// G3 (11.10.2026): copiile făcute de versiunea cu marcaje au formatul 2. Versiunea veche (`08f4dc3`, care
// acceptă numai formatul 1) refuză singură să le restaureze, deci nu le poate restaura fără marcaje.
export const BACKUP_FORMAT = 'civic-backup/2';
/** Copiile făcute înaintea remedierii (fără marcaje): refuzate la restaurare, fără ocolire. */
export const LEGACY_BACKUP_FORMAT = 'civic-backup/1';
/** R: zilele de păstrare a backup-urilor (T-D1). Marcajele de ștergere au regula lor (`markers.ts`). */
export const BACKUP_ROTATION_DAYS = 7;
const DAY = 86_400_000;
const NAME_RE = /^civic-backup-(\d{8}T\d{6}\d{3}Z)$/;

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
  /** G2 (formatul 2): suma SHA-256 a fotografiei marcajelor (`markers.json`) din copie */
  markersSha256?: string;
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

export async function createBackup(
  opts: BackupOptions,
): Promise<{ dir: string; manifest: BackupManifest; removed: string[]; markers: CounterSync; accountIntents: IntentReconciliation }> {
  const now = opts.now ?? new Date();
  const w = backupWindows(now, opts.retentionDays, opts.adminRetentionMonths);
  mkdirSync(opts.backupDir, { recursive: true });
  const name = `civic-backup-${stamp(now)}`;
  const finalDir = join(opts.backupDir, name);
  const tmpDir = join(opts.backupDir, `.tmp-${name}`);
  // decizia A (16.10.2026): intențiile ilizibile opresc backup-ul înaintea oricărei scrieri în BACKUP_DIR (copie
  // nouă, rotație, curățare); copiile existente rămân neatinse. Numai numărul, fără nume de fișiere (decizia B).
  const unreadable = readAccountDeletionIntents(opts.backupDir).invalid.length;
  if (unreadable > 0) {
    throw new MarkerError(
      `Backup refuzat: ${unreadable} intenții de ștergere a conturilor ilizibile în „${ACCOUNT_DELETIONS_PENDING_DIR}/”. ` +
        'Copiile existente nu au fost atinse. Cercetați fișierele, apoi repetați backup-ul.',
    );
  }

  const pool = mysql.createPool({ uri: opts.databaseUrl, connectionLimit: 1 });
  let status: Awaited<ReturnType<typeof schemaStatus>>;
  let markers: CounterSync;
  let accountIntents: IntentReconciliation;
  try {
    status = await schemaStatus(pool, opts.migrationsDir);
    if (!status.ok) throw new Error('Backup refuzat: schema DB nu este la versiunea așteptată.');
    // Marcajele, ÎNAINTE de instantaneu: directoarele există și se poate scrie în ele, iar contorul TM
    // din bază și marcajul lui sunt aduse la maximul dintre ele (singura scriere în bază făcută de
    // backup: ridicarea contorului rămas sub marcaj). Astfel nicio copie nu are contorul diferit de marcaj.
    // A8: ridicarea contorului (singura scriere în bază) este întoarsă apelantului, care o consemnează
    markers = await initBackupMarkers(pool, opts.backupDir);
    // R18: intențiile rămase se rezolvă înaintea fotografiei marcajelor (o ștergere confirmată intră în copie)
    accountIntents = await reconcileAccountDeletionIntents(pool, opts.backupDir);
  } finally {
    await pool.end();
  }
  // directorul temporar abia după verificarea marcajelor: un refuz nu lasă nimic în BACKUP_DIR (auditul D7-3)
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(join(tmpDir, 'photos'), { recursive: true });

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

  // G2: fotografia marcajelor, luată DUPĂ instantaneul bazei: o ștergere confirmată între cele două
  // momente are deja intrarea aici, iar sesizarea, încă în copie, este eliminată la restaurare
  const markersText = JSON.stringify(takeMarkerSnapshot(opts.backupDir)) + '\n';
  writeFileSync(join(tmpDir, MARKER_SNAPSHOT_FILE), markersText);
  const markersSha256 = createHash('sha256').update(markersText).digest('hex');

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
    markersSha256,
  };
  writeFileSync(join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  renameSync(tmpDir, finalDir);

  const removed = rotateBackups(opts.backupDir, now);
  pruneDeletionList(opts.backupDir, now);
  return { dir: finalDir, manifest, removed, markers, accountIntents };
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

// ---- restaurare ----

export type RestoreOptions = BackupOptions & {
  source: string;
  /**
   * Acceptă explicit lipsa marcajelor (set pierdut definitiv). Fără marcaje, ștergerile făcute după copie
   * nu mai pot fi garantate; implicit, restaurarea refuză. G1: cere obligatoriu `atLeast`.
   */
  allowMissingMarkers?: boolean;
  /**
   * G1: cel mai mare număr TM comunicat vreodată (de proprietar). Obligatoriu cu `allowMissingMarkers`,
   * interzis fără el. Contorul restaurat și marcajul refăcut sunt cel puțin această valoare.
   */
  atLeast?: number | null;
};

export type RestoreResult = {
  rows: Record<string, number>;
  photosRestored: number;
  photosMissing: number;
  deletedFromList: number;
  purgedByRetention: number;
  /** contorul TM din baza restaurată */
  reportCounter: number;
  /** G1: marcajele refăcute de restaurare (numai cu `allowMissingMarkers`) */
  markersWritten: string[];
  /** R18: conturile șterse din nou conform marcajelor */
  accountsDeleted: number;
  /** R18: conturi cu ID-ul unui marcaj, dar create după ștergerea notată: păstrate */
  accountsKeptCreatedAfter: number;
  /** auditul D7-3 (decizia B): intenții nereconciliate (neaplicate) și conturile lor rămase în baza restaurată */
  unreconciledIntents: number;
  accountsKeptUnreconciled: number;
  /** R19: codurile de autentificare și anunțurile de blocare neplecate, anulate */
  emailsCancelled: number;
  /** R19: mesajele sesizărilor neplecate, reținute (`failed`) pentru decizia unui super_admin */
  emailsHeld: HeldEmail[];
};

/** R19: un mesaj reținut la restaurare, cu datele necesare găsirii lui în Admin (fără destinatar). */
export type HeldEmail = { emailId: string; kind: string; previousStatus: string; referenceNumber: string; createdAt: string };

/** R19: motivul scris în `last_error` (aprobat de proprietar la 16.10.2026). */
export const R19_HELD_REASON = 'reținut la restaurare (R19): verificați dacă a plecat înainte de reîncercare';
export const R19_CANCELLED_REASON = 'anulat la restaurare (R19)';
/** MINOR-3 (decizia B, 20.10.2026): mesajele de stadiu ale sesizărilor fără autor (contul autorului șters). */
export const R19_AUTHOR_DELETED_REASON = 'anulat la restaurare (R19): contul autorului a fost șters';
/** Avertismentul pentru intențiile nereconciliate (decizia D, 16.10.2026, text aprobat). */
export const R18_UNRECONCILED_WARNING =
  'Starea ștergerii este necunoscută: poate fi o ștergere anulată sau o ștergere confirmată înainte de reconciliere. ' +
  'Contul rămâne în baza de date; administratorul trebuie să investigheze situația și să decidă ce urmează.';

/** Verificările dinaintea restaurării au găsit probleme. Până aici nu s-a scris nimic, nicăieri. */
export class RestoreRefusedError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super('Restaurare refuzată (nu s-a scris nimic):\n' + problems.map((p) => `  - ${p}`).join('\n'));
    this.name = 'RestoreRefusedError';
    this.problems = problems;
  }
}

/** Tot ce ar folosi o restaurare, citit fără nicio scriere (`restore:db --check` și pasul 0 al restaurării). */
export type RestoreInspection = {
  source: { path: string; manifest: BackupManifest | null; reportCounter: number | null };
  /** ținta: fără utilizator și fără parolă */
  database: { host: string; port: string; name: string; reachable: boolean; schemaOk: boolean; nonEmptyTables: string[] };
  storage: { path: string; exists: boolean; files: number };
  backupDir: { path: string; exists: boolean };
  markers: {
    watermark: number | null;
    deletionsDirExists: boolean;
    legacyListExists: boolean;
    deletionIds: string[];
    /** G2: cel mai mare marcaj al contorului din fotografiile copiilor din BACKUP_DIR (sursa inclusă) */
    snapshotWatermark: number | null;
    /** G2: copiile ale căror fotografii au fost citite */
    snapshotCopies: string[];
    /** G2: copiile care cunosc numere sau ștergeri lipsă din marcajele curente (marcaje mai vechi) */
    staleAgainst: string[];
    /** G2: intrările de ștergere cunoscute numai din fotografii (încă neexpirate) */
    snapshotOnlyEntries: DeletionEntry[];
    /** R18: `account-deletions/` există în BACKUP_DIR */
    accountDeletionsDirExists: boolean;
    /** R18: ștergerile de conturi efective (curente + fotografiile copiilor), validate integral */
    accountDeletions: AccountDeletionEntry[];
    /** R18: intrări cunoscute numai din fotografii (se aduc în BACKUP_DIR împreună cu celelalte marcaje) */
    snapshotOnlyAccountEntries: AccountDeletionEntry[];
    /** R18: în copia sursă — conturi care vor fi șterse din nou / conturi cu ID marcat, create după ștergere */
    accountsToDelete: number | null;
    accountsKeptCreatedAfter: number | null;
    /** auditul D7-3 (decizia B): intențiile nereconciliate — validate, raportate, NEaplicate */
    unreconciledIntentIds: string[];
    /** R18: directoarele de conturi pierdute după inițializare (refacerea numai cu --allow-missing-markers) */
    accountMarkersLost: boolean;
    /** câte dintre conturile vizate de intenții sunt în copie (rămân după restaurare) */
    unreconciledIntentsInCopy: number | null;
  };
  warnings: string[];
  /** lista goală = restaurarea ar fi permisă */
  problems: string[];
};

/** Calea reală (legăturile simbolice rezolvate), și pentru un director care nu există încă. */
function realPath(p: string): string {
  let current = resolve(p);
  const rest: string[] = [];
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) break;
    rest.unshift(basename(current));
    current = parent;
  }
  return join(realpathSync(current), ...rest);
}

const overlaps = (a: string, b: string) => a === b || a.startsWith(b + sep) || b.startsWith(a + sep);

/** Numărul intrărilor care nu sunt directoare (fișiere, legături), recursiv. Director lipsă → 0. */
function countFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}

/** Contorul TM salvat în copie (rândul `report_counter`), fără a încărca nimic în bază. */
async function readBackupCounter(dbFile: string): Promise<number | null> {
  const rl = createInterface({ input: createReadStream(dbFile).pipe(createGunzip()), crlfDelay: Infinity });
  let idx = -1;
  let value: number | null = null;
  for await (const line of rl) {
    if (!line.includes('report_counter')) continue;
    const rec = JSON.parse(line) as { type?: string; name?: string; columns?: string[]; t?: string; v?: unknown[] };
    if (rec.type === 'table' && rec.name === 'report_counter') idx = rec.columns!.indexOf('last_value');
    else if (rec.t === 'report_counter' && idx >= 0) value = Number(rec.v![idx]);
  }
  return value;
}

/** R18: ID-ul și data creării fiecărui cont din copie (pentru `--check`), fără a încărca nimic în bază. */
async function readBackupAccounts(dbFile: string): Promise<Map<string, Date>> {
  const rl = createInterface({ input: createReadStream(dbFile).pipe(createGunzip()), crlfDelay: Infinity });
  let idIdx = -1;
  let createdIdx = -1;
  const out = new Map<string, Date>();
  for await (const line of rl) {
    if (!line.includes('citizen_accounts')) continue;
    const rec = JSON.parse(line) as { type?: string; name?: string; columns?: string[]; t?: string; v?: unknown[] };
    if (rec.type === 'table' && rec.name === 'citizen_accounts') {
      idIdx = rec.columns!.indexOf('id');
      createdIdx = rec.columns!.indexOf('created_at');
    } else if (rec.t === 'citizen_accounts' && idIdx >= 0 && createdIdx >= 0) {
      out.set(String(rec.v![idIdx]), dbDate(rec.v![createdIdx]));
    }
  }
  return out;
}

/**
 * Verifică, fără nicio scriere, tot ce ar folosi restaurarea: copia sursă, căile, marcajele și baza
 * țintă. Interogările rulează într-o tranzacție READ ONLY (serverul însuși ar refuza o scriere).
 *
 * Reguli (o problemă = restaurarea se oprește înainte de prima scriere):
 * - copia este întreagă (manifest, SHA-256) și are schema acestei versiuni a aplicației;
 * - copia se află direct în BACKUP_DIR, lângă marcajele ei; BACKUP_DIR există (nu se creează);
 * - marcajele există, se pot citi și sunt ale acestei copii (marcajul contorului ≥ contorul din copie);
 * - G2: fotografiile marcajelor din copiile `/2` din BACKUP_DIR se pot citi; dacă una cunoaște numere sau
 *   ștergeri lipsă din marcajele curente, restaurarea cere --at-least N și folosește marcajele cele mai noi;
 * - directorul de fișiere este gol sau inexistent și nu se suprapune cu BACKUP_DIR: un director cu
 *   fișiere este tratat ca directorul activ al aplicației;
 * - baza țintă are schema la zi și niciun rând în niciun tabel (în afara evidenței migrațiilor).
 */
export async function inspectRestore(opts: RestoreOptions): Promise<RestoreInspection> {
  const problems: string[] = [];
  const warnings: string[] = [];
  const sourcePath = realPath(opts.source);
  const backupPath = realPath(opts.backupDir);
  const storagePathReal = realPath(opts.storageDir);

  // 1. copia sursă
  let manifest: BackupManifest | null = null;
  let backupCounter: number | null = null;
  let backupAccounts: Map<string, Date> | null = null;
  const manifestFile = join(opts.source, 'manifest.json');
  const dbFile = join(opts.source, 'db.jsonl.gz');
  if (!existsSync(manifestFile) || !existsSync(dbFile)) {
    problems.push('Copia sursă nu conține „manifest.json” și „db.jsonl.gz”.');
  } else {
    try {
      manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as BackupManifest;
    } catch {
      problems.push('Backup corupt: „manifest.json” nu poate fi citit.');
    }
    if (manifest && manifest.format === LEGACY_BACKUP_FORMAT) {
      problems.push(
        `Copia are formatul vechi „${LEGACY_BACKUP_FORMAT}”: a fost făcută înaintea marcajelor (fără evidența ștergerilor și a numerelor TM). ` +
          'Conform procedurii de migrare, copiile dinaintea instalării remedierii nu se folosesc pentru nicio restaurare; folosiți o copie în formatul ' +
          `„${BACKUP_FORMAT}”.`,
      );
    } else if (manifest && manifest.format !== BACKUP_FORMAT) {
      problems.push(`Format de backup necunoscut: ${manifest.format}`);
    } else if (manifest) {
      if (createHash('sha256').update(readFileSync(dbFile)).digest('hex') !== manifest.dbSha256) {
        problems.push('Backup corupt: suma SHA-256 a db.jsonl.gz nu corespunde manifestului.');
      } else {
        backupCounter = await readBackupCounter(dbFile);
        backupAccounts = await readBackupAccounts(dbFile);
      }
      const expected = readMigrationFiles(opts.migrationsDir).length;
      if (manifest.schemaVersion !== expected) {
        problems.push(`Backup-ul are schema ${manifest.schemaVersion}, aplicația cere ${expected}. Restaurați cu versiunea aplicației care a făcut backup-ul.`);
      }
    }
  }

  // 2. căile
  const backupDirExists = existsSync(opts.backupDir) && statSync(opts.backupDir).isDirectory();
  if (!backupDirExists) {
    problems.push('BACKUP_DIR nu există. Restaurarea nu îl creează: copia și marcajele sunt date de intrare.');
  } else if (dirname(sourcePath) !== backupPath) {
    problems.push('Copia sursă nu se află direct în BACKUP_DIR. Marcajele (contorul TM, ștergerile) se citesc din BACKUP_DIR și trebuie să fie cele ale copiei: puneți copia și marcajele ei în același director.');
  }
  const storageExists = existsSync(opts.storageDir);
  let storageFiles = 0;
  if (storageExists && !statSync(opts.storageDir).isDirectory()) {
    problems.push('STORAGE_DIR există, dar nu este un director.');
  } else {
    storageFiles = countFiles(opts.storageDir);
    if (storageFiles > 0) {
      problems.push(`STORAGE_DIR nu este gol (${storageFiles} fișiere): este tratat ca directorul activ al aplicației. Restaurarea se face numai într-un director de fișiere nou, gol.`);
    }
  }
  if (overlaps(storagePathReal, backupPath) || overlaps(storagePathReal, sourcePath)) {
    problems.push('STORAGE_DIR se suprapune cu BACKUP_DIR sau cu copia sursă: directorul de fișiere trebuie să fie separat.');
  }

  // 3. marcajele (numai citire)
  let accountMarkersWereLost = false;
  let watermark: number | null = null;
  let deletionsDirExists = false;
  let legacyListExists = false;
  let deletionIds: string[] = [];
  if (backupDirExists) {
    let watermarkReadable = true;
    try {
      watermark = readReportCounterWatermark(opts.backupDir);
    } catch (err) {
      watermarkReadable = false;
      problems.push(err instanceof MarkerError ? err.message : String(err));
    }
    const del = readDeletionMarkers(opts.backupDir);
    deletionsDirExists = del.dirExists;
    legacyListExists = del.legacyFileExists;
    deletionIds = [...new Set([...del.entries.map((e) => e.reportId), ...del.legacyIds])];
    if (del.invalid.length > 0) problems.push(`Marcaje de ștergere corupte în „deletions/”: ${del.invalid.join(', ')}`);
    if (del.legacyInvalid) problems.push('Lista veche de ștergeri („deletion-list.jsonl”) este coruptă.');
    const missing: string[] = [];
    if (watermarkReadable && watermark === null) missing.push('marcajul contorului TM');
    if (!del.dirExists && !del.legacyFileExists) missing.push('marcajele de ștergere');
    // R18 (auditul static): directoarele de conturi lipsă, deși inițializate (martor / copie „civic-markers/2”) = pierdere
    accountMarkersWereLost = accountMarkersLost(opts.backupDir);
    if (accountMarkersWereLost) missing.push(`marcajele de ștergere a conturilor („${ACCOUNT_DELETIONS_DIR}/”, „${ACCOUNT_DELETIONS_PENDING_DIR}/”)`);
    if (missing.length > 0) {
      const what = missing.join(' și ');
      if (opts.allowMissingMarkers) {
        warnings.push(
          `Lipsesc din BACKUP_DIR: ${what}. Restaurarea continuă la cerere explicită (--allow-missing-markers --at-least ${opts.atLeast ?? 'N'}): ` +
            'ștergerile făcute după copie NU mai pot fi garantate (sesizările respective pot reapărea până la expirarea retenției); ' +
            'contorul TM pornește de la cel puțin N, iar marcajele lipsă sunt refăcute înainte de confirmare.',
        );
      } else {
        problems.push(`Lipsesc din BACKUP_DIR: ${what}. Fără ele, o sesizare ștearsă poate reapărea, iar un număr TM poate fi refolosit. Aduceți marcajele lângă copie; numai dacă s-au pierdut definitiv, repetați cu --allow-missing-markers --at-least <ultimul număr TM comunicat>.`);
      }
    } else if (opts.allowMissingMarkers && watermarkReadable && del.invalid.length === 0 && !del.legacyInvalid) {
      problems.push('Marcajele sunt prezente în BACKUP_DIR: --allow-missing-markers nu este necesar și nu se folosește. Repetați fără el.');
    }
    if (watermark !== null && backupCounter !== null && watermark < backupCounter) {
      problems.push(`Marcaj incompatibil: marcajul contorului TM (${watermark}) este sub contorul din copie (${backupCounter}). Marcajele din BACKUP_DIR nu aparțin acestei copii.`);
    }
  }

  // 3a. R18: marcajele de ștergere a conturilor (numai citire, validare integrală înainte de orice scriere)
  let accountDeletionsDirExists = false;
  let unreconciledIntentIds: string[] = [];
  const currentAccountEntries = new Map<string, AccountDeletionEntry>();
  if (backupDirExists) {
    const acc = readAccountDeletionMarkers(opts.backupDir);
    accountDeletionsDirExists = acc.dirExists;
    for (const e of acc.entries) currentAccountEntries.set(e.accountId, e);
    if (acc.invalid.length > 0) {
      problems.push(`Marcaje de ștergere a conturilor corupte în „${ACCOUNT_DELETIONS_DIR}/”: ${acc.invalid.length} fișiere. Un cont șters ar putea reapărea: cercetați fișierele înainte de restaurare.`);
    }
    // intențiile nereconciliate (auditul D7-3, decizia B): validate înainte de prima scriere, NU aplicate
    const intents = readAccountDeletionIntents(opts.backupDir);
    unreconciledIntentIds = intents.entries.map((x) => x.accountId);
    if (intents.invalid.length > 0) {
      problems.push(`Intenții de ștergere a conturilor corupte în „${ACCOUNT_DELETIONS_PENDING_DIR}/”: ${intents.invalid.length} fișiere. Cercetați fișierele înainte de restaurare.`);
    }
    if (intents.entries.length > 0) {
      warnings.push(
        `${intents.entries.length} intenții de ștergere a conturilor nereconciliate (NU se aplică). ` +
          R18_UNRECONCILED_WARNING,
      );
    }
    if (!acc.dirExists && !accountMarkersWereLost) {
      // fără nicio dovadă de inițializare: BACKUP_DIR de dinaintea R18 (compatibil)
      warnings.push(
        `„${ACCOUNT_DELETIONS_DIR}/” lipsește din BACKUP_DIR: nu se cunoaște nicio ștergere de cont (marcajele sunt de dinaintea R18: ` +
          'niciun martor de inițializare și nicio copie „civic-markers/2”).',
      );
    }
  }

  // 3b. G2: fotografiile marcajelor din copiile aflate în BACKUP_DIR (numai citire). Marcajele efective
  // sunt cele mai noi cunoscute: cel mai mare marcaj al contorului și reuniunea ștergerilor neexpirate.
  // Dacă o copie cunoaște numere sau ștergeri pe care marcajele curente nu le au, marcajele curente sunt
  // mai vechi (de exemplu, aduse dintr-o arhivă): restaurarea cere --at-least N și le aduce la zi.
  let snapshotWatermark: number | null = null;
  const snapshotCopies: string[] = [];
  const staleAgainst: string[] = [];
  const snapshotEntries = new Map<string, DeletionEntry>();
  const legacySnapshotIds = new Set<string>();
  const snapshotAccountEntries = new Map<string, AccountDeletionEntry>();
  const nowForExpiry = opts.now ?? new Date();
  if (backupDirExists) {
    const sourceName = basename(sourcePath);
    const names = new Set(listBackups(opts.backupDir));
    if (dirname(sourcePath) === backupPath) names.add(sourceName);
    const currentIds = new Set(deletionIds);
    const currentPresent = deletionsDirExists || legacyListExists;
    for (const name of [...names].sort()) {
      const dir = join(opts.backupDir, name);
      let m: BackupManifest;
      try {
        m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as BackupManifest;
      } catch {
        if (name === sourceName) continue; // raportat deja la pasul 1
        // nu se poate ști nici măcar dacă este o copie (de exemplu, un director gol sau o copiere întreruptă)
        warnings.push(`Directorul „${name}” din BACKUP_DIR nu are un manifest lizibil și a fost ignorat. Dacă este o copie reală, reparați-o înainte de restaurare: ar putea conține marcaje mai noi.`);
        continue;
      }
      if (m.format !== BACKUP_FORMAT) continue; // copiile „/1” nu au fotografii (și nu se restaurează)
      let snap;
      try {
        const text = readFileSync(join(dir, MARKER_SNAPSHOT_FILE), 'utf8');
        if (!m.markersSha256 || createHash('sha256').update(text).digest('hex') !== m.markersSha256) {
          throw new MarkerError('suma SHA-256 nu corespunde manifestului');
        }
        snap = parseMarkerSnapshot(text);
      } catch (err) {
        const why = err instanceof MarkerError ? err.message : 'fișierul lipsește sau nu poate fi citit';
        problems.push(
          `Fotografia marcajelor din copia „${name}” nu poate fi folosită (${why}). ` +
            (name === sourceName ? 'Copia sursă nu poate fi restaurată.' : 'Mutați copia în afara BACKUP_DIR sau reparați-o.'),
        );
        continue;
      }
      snapshotCopies.push(name);
      if (snap.watermark !== null) snapshotWatermark = Math.max(snapshotWatermark ?? 0, snap.watermark);
      let stale = watermark !== null && snap.watermark !== null && snap.watermark > watermark;
      for (const e of snap.deletions) {
        if (nowForExpiry.getTime() >= deletionMarkerExpiry(e).getTime()) continue; // nicio copie nu o mai poate readuce
        if (!snapshotEntries.has(e.reportId)) snapshotEntries.set(e.reportId, e);
        if (currentPresent && !currentIds.has(e.reportId)) stale = true;
      }
      for (const id of snap.legacyIds) {
        legacySnapshotIds.add(id);
        if (currentPresent && !currentIds.has(id)) stale = true;
      }
      // R18: ștergerile de conturi nu expiră; una cunoscută numai de copie înseamnă marcaje curente mai vechi
      for (const e of snap.accountDeletions) {
        if (!snapshotAccountEntries.has(e.accountId)) snapshotAccountEntries.set(e.accountId, e);
        if (!currentAccountEntries.has(e.accountId)) stale = true;
      }
      if (stale) staleAgainst.push(name);
    }
  }
  const snapshotOnlyEntries = [...snapshotEntries.values()].filter((e) => !deletionIds.includes(e.reportId));
  const effectiveDeletionIds = [...new Set([...deletionIds, ...snapshotEntries.keys(), ...legacySnapshotIds])];
  // R18: intrarea curentă are prioritate (este ștergerea notată de rută); fotografiile completează
  const snapshotOnlyAccountEntries = [...snapshotAccountEntries.values()].filter((e) => !currentAccountEntries.has(e.accountId));
  const accountDeletions = [...currentAccountEntries.values(), ...snapshotOnlyAccountEntries];
  let accountsToDelete: number | null = null;
  let accountsKeptCreatedAfter: number | null = null;
  if (backupAccounts) {
    accountsToDelete = 0;
    accountsKeptCreatedAfter = 0;
    for (const e of accountDeletions) {
      const created = backupAccounts.get(e.accountId);
      if (!created) continue;
      if (created.getTime() < Date.parse(e.deletedAt)) accountsToDelete++;
      else accountsKeptCreatedAfter++;
    }
    if (accountsKeptCreatedAfter > 0) {
      warnings.push(
        `${accountsKeptCreatedAfter} conturi din copie au ID-ul unui marcaj de ștergere, dar au fost create după ștergerea notată: ` +
          'nu sunt conturile șterse și se păstrează (R18).',
      );
    }
  }
  const isStale = staleAgainst.length > 0;

  // G1 / G2: --at-least este obligatoriu cu --allow-missing-markers și cu marcaje mai vechi decât o copie;
  // în rest este interzis
  const atLeast = opts.atLeast ?? null;
  if (atLeast !== null && (!Number.isSafeInteger(atLeast) || atLeast < 0)) {
    problems.push('--at-least trebuie să fie un număr întreg pozitiv (cel mai mare număr TM comunicat vreodată).');
  } else if (opts.allowMissingMarkers && atLeast === null) {
    problems.push('--allow-missing-markers cere --at-least <N>, unde N este cel mai mare număr TM comunicat vreodată (de exemplu, din e-mailuri sau din Admin).');
  } else if (isStale && atLeast === null) {
    problems.push(
      `Marcajele din BACKUP_DIR sunt mai vechi decât copia ${staleAgainst.join(', ')}: lipsesc numere TM sau ștergeri pe care copia le cunoaște ` +
        '(marcaje aduse dintr-o arhivă sau readuse la o stare mai veche). Restaurarea folosește cele mai noi marcaje cunoscute și le aduce la zi, ' +
        'dar evenimentele de după cea mai nouă copie nu se văd nicăieri: repetați cu --at-least <cel mai mare număr TM comunicat vreodată>.',
    );
  } else if (!opts.allowMissingMarkers && !isStale && atLeast !== null) {
    problems.push('--at-least se folosește numai împreună cu --allow-missing-markers sau când marcajele din BACKUP_DIR sunt mai vechi decât o copie.');
  } else if (atLeast !== null && backupCounter !== null && atLeast < backupCounter) {
    problems.push(`--at-least ${atLeast} este sub contorul din copie (${backupCounter}): numerele până la ${backupCounter} au fost deja emise. N trebuie să fie cel mai mare număr TM comunicat vreodată.`);
  }
  if (isStale && atLeast !== null) {
    warnings.push(
      `Marcajele din BACKUP_DIR sunt mai vechi decât copia ${staleAgainst.join(', ')}; se folosesc cele mai noi marcaje cunoscute ` +
        `(contor ${Math.max(watermark ?? 0, snapshotWatermark ?? 0, atLeast)}, ${effectiveDeletionIds.length} ștergeri), iar marcajele curente sunt aduse la zi înainte de confirmare. ` +
        'Ștergerile făcute după cea mai nouă copie, dacă există, nu pot fi cunoscute.',
    );
  }

  // 4. baza țintă (numai citire)
  const url = new URL(opts.databaseUrl);
  const database: RestoreInspection['database'] = {
    host: url.hostname,
    port: url.port || '3306',
    name: decodeURIComponent(url.pathname.replace(/^\//, '')),
    reachable: false,
    schemaOk: false,
    nonEmptyTables: [],
  };
  let conn: mysql.Connection | undefined;
  try {
    conn = await mysql.createConnection({ uri: opts.databaseUrl, timezone: 'Z' });
    await conn.query('SET SESSION TRANSACTION READ ONLY');
    await conn.query('START TRANSACTION READ ONLY');
    database.reachable = true;
  } catch (err) {
    // numai codul erorii: mesajul serverului poate conține utilizatorul bazei de date
    problems.push(`Baza de date țintă nu este accesibilă (${(err as { code?: string }).code ?? 'eroare de conectare'}).`);
  }
  if (conn && database.reachable) {
    try {
      const status = compare(readMigrationFiles(opts.migrationsDir), await readApplied(conn as unknown as mysql.PoolConnection));
      database.schemaOk = status.ok;
      if (!status.ok) problems.push('Schema bazei țintă nu este la versiunea așteptată: rulați întâi „migrate” pe DB-ul nou.');
      const [tables] = await conn.query(
        "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
      );
      for (const { t } of tables as Array<{ t: string }>) {
        if (t === MIGRATIONS_TABLE) continue;
        const [r] = await conn.query(`SELECT 1 FROM \`${t}\` LIMIT 1`);
        if ((r as unknown[]).length > 0) database.nonEmptyTables.push(t);
      }
      if (database.nonEmptyTables.length > 0) {
        problems.push(`Baza de date țintă are deja date: tabelul ${database.nonEmptyTables[0]} nu este gol (${database.nonEmptyTables.length} tabele cu rânduri). Restaurarea se face numai într-un DB nou, după „migrate”.`);
      }
      await conn.query('ROLLBACK');
    } finally {
      await conn.end().catch(() => {});
    }
  } else if (conn) {
    await conn.end().catch(() => {});
  }

  return {
    source: { path: sourcePath, manifest, reportCounter: backupCounter },
    database,
    storage: { path: storagePathReal, exists: storageExists, files: storageFiles },
    backupDir: { path: backupPath, exists: backupDirExists },
    markers: {
      watermark,
      deletionsDirExists,
      legacyListExists,
      deletionIds: effectiveDeletionIds,
      snapshotWatermark,
      snapshotCopies,
      staleAgainst,
      snapshotOnlyEntries,
      accountDeletionsDirExists,
      accountDeletions,
      snapshotOnlyAccountEntries,
      accountsToDelete,
      accountsKeptCreatedAfter,
      unreconciledIntentIds,
      accountMarkersLost: accountMarkersWereLost,
      unreconciledIntentsInCopy: backupAccounts ? unreconciledIntentIds.filter((id) => backupAccounts!.has(id)).length : null,
    },
    warnings,
    problems,
  };
}

/** Raportul lui `restore:db --check`, linie cu linie (fără utilizator, parolă sau alte secrete). */
export function formatRestoreInspection(i: RestoreInspection): string[] {
  const m = i.source.manifest;
  const lines = [
    `copia sursă: ${i.source.path}`,
    m
      ? `  creată la ${m.createdAt}; schema ${m.schemaVersion}; sesizări ${m.counts.reports ?? 0}; fotografii ${m.photos}; contorul TM din copie: ${i.source.reportCounter ?? 'necunoscut'}`
      : '  manifestul nu a putut fi citit',
    `baza de date țintă: ${i.database.name} pe ${i.database.host}:${i.database.port}`,
    !i.database.reachable
      ? '  inaccesibilă'
      : `  schema ${i.database.schemaOk ? 'la zi' : 'NU este la zi'}; tabele cu rânduri: ${i.database.nonEmptyTables.length === 0 ? 'niciunul' : i.database.nonEmptyTables.join(', ')}`,
    `directorul de fișiere țintă (STORAGE_DIR): ${i.storage.path}`,
    `  ${i.storage.exists ? `există; fișiere: ${i.storage.files}` : 'nu există încă (va fi creat la restaurare)'}`,
    `directorul marcajelor (BACKUP_DIR, numai citire): ${i.backupDir.path}`,
    `  ${i.backupDir.exists ? 'există' : 'NU există'}; marcajul contorului TM: ${i.markers.watermark ?? 'lipsește'}; marcaje de ștergere: ${
      i.markers.deletionsDirExists || i.markers.legacyListExists ? `${i.markers.deletionIds.length} sesizări` : 'lipsesc'
    }`,
    `fotografiile marcajelor din copii (G2): ${i.markers.snapshotCopies.length} copii citite; cel mai mare marcaj al contorului: ${
      i.markers.snapshotWatermark ?? 'niciunul'
    }; ștergeri cunoscute numai din copii: ${i.markers.snapshotOnlyEntries.length}; marcaje curente mai vechi decât: ${
      i.markers.staleAgainst.length === 0 ? 'nicio copie' : i.markers.staleAgainst.join(', ')
    }`,
    // R18: numai numere (fără ID-uri, fără adrese)
    `ștergerile de conturi (R18): ${i.markers.accountDeletionsDirExists ? 'marcaje prezente' : 'directorul lipsește'}; ${
      i.markers.accountDeletions.length
    } marcaje cunoscute (din care ${i.markers.snapshotOnlyAccountEntries.length} numai din copii); conturi din copie de șters din nou: ${
      i.markers.accountsToDelete ?? 'necunoscut'
    }; păstrate (create după ștergere): ${i.markers.accountsKeptCreatedAfter ?? 'necunoscut'}; intenții nereconciliate (NEaplicate): ${
      i.markers.unreconciledIntentIds.length
    }, din care conturi în copie: ${i.markers.unreconciledIntentsInCopy ?? 'necunoscut'}`,
  ];
  for (const w of i.warnings) lines.push(`AVERTISMENT: ${w}`);
  for (const p of i.problems) lines.push(`PROBLEMĂ: ${p}`);
  lines.push(i.problems.length === 0 ? 'Rezultat: restaurarea ar fi PERMISĂ.' : 'Rezultat: restaurarea ar fi REFUZATĂ.');
  return lines;
}

/**
 * R18 (auditul static): `markers:recreate-account-deletions` — refacerea explicită a directoarelor de conturi
 * pierdute. Refuză dacă nu lipsesc. Intrările se iau din fotografiile copiilor `/2` din BACKUP_DIR (cu suma
 * SHA-256 verificată; o fotografie nefolosibilă oprește comanda înainte de orice scriere). Ștergerile de după
 * cea mai nouă copie nu pot fi cunoscute: pe baza vie conturile respective sunt deja șterse; riscul rămâne
 * numai pentru o restaurare ulterioară a unei copii mai vechi decât ștergerea.
 */
export function recreateAccountMarkers(backupDir: string): { entries: number; copiesRead: number } {
  if (!accountMarkersLost(backupDir)) {
    const both = existsSync(join(backupDir, ACCOUNT_DELETIONS_DIR)) && existsSync(join(backupDir, ACCOUNT_DELETIONS_PENDING_DIR));
    throw new MarkerError(both ? 'Directoarele de conturi există: nu este nimic de refăcut.' : 'Nicio dovadă de inițializare R18: directoarele se creează la pornire, fără această comandă.');
  }
  const entries = new Map<string, AccountDeletionEntry>();
  let copiesRead = 0;
  for (const name of listBackups(backupDir)) {
    const dir = join(backupDir, name);
    let m: BackupManifest;
    try {
      m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as BackupManifest;
    } catch {
      continue;
    }
    if (m.format !== BACKUP_FORMAT) continue;
    const text = readFileSync(join(dir, MARKER_SNAPSHOT_FILE), 'utf8');
    if (!m.markersSha256 || createHash('sha256').update(text).digest('hex') !== m.markersSha256) {
      throw new MarkerError(`Fotografia marcajelor din copia „${name}” nu corespunde manifestului: refacerea este oprită.`);
    }
    for (const e of parseMarkerSnapshot(text).accountDeletions) if (!entries.has(e.accountId)) entries.set(e.accountId, e);
    copiesRead++;
  }
  initMarkerDirs(backupDir, { recoverAccountMarkers: true });
  return { entries: writeMissingAccountDeletionEntries(backupDir, [...entries.values()]), copiesRead };
}

/** R19: condiția anulării mesajelor de cont (restaurarea `restore:db` și recuperarea după restaurarea contului, R20). */
const R19_CANCEL_WHERE =
  "report_id IS NULL AND kind IN ('citizen_login_code', 'citizen_account_blocked') AND status IN ('queued', 'sending')";
/** MINOR-3: mesajele de stadiu neplecate ale sesizărilor fără autor (`e` = email_outbox, `r` = reports). */
const R19_AUTHORLESS_WHERE =
  "e.kind = 'citizen_status_update' AND e.status IN ('queued', 'sending', 'on_hold') AND r.author_account_id IS NULL";

/**
 * R19, aplicat unei baze readuse la o stare mai veche (restaurarea dintr-o copie sau restaurarea întregului cont de
 * către furnizor, R20): starea cozii nu arată dacă un mesaj a plecat între timp. Codurile de autentificare și
 * anunțurile de blocare neplecate → `cancelled`; mesajele sesizărilor neplecate → `failed` (reținute), cu motivul
 * în `last_error`, fără nicio retrimitere automată; câte o intrare de audit pe mesaj reținut. Cu `dryRun`: numai
 * citiri (ce s-ar schimba). În tranzacția apelantului.
 */
export async function holdOutboxAfterRollback(
  conn: mysql.Connection | mysql.PoolConnection,
  now: Date,
  opts: { dryRun?: boolean } = {},
): Promise<{ emailsCancelled: number; emailsHeld: HeldEmail[] }> {
  let emailsCancelled: number;
  if (opts.dryRun) {
    const [c] = await conn.query(`SELECT COUNT(*) AS n FROM email_outbox WHERE ${R19_CANCEL_WHERE}`);
    emailsCancelled = Number((c as Array<{ n: number }>)[0]!.n);
  } else {
    const [cancelRes] = await conn.query(
      `UPDATE email_outbox SET status = 'cancelled', locked_until = NULL, next_attempt_at = NULL, last_error = ? WHERE ${R19_CANCEL_WHERE}`,
      [R19_CANCELLED_REASON],
    );
    emailsCancelled = (cancelRes as { affectedRows: number }).affectedRows;
  }
  // MINOR-3 (decizia B, 20.10.2026): mesajele de stadiu neplecate ale sesizărilor fără autor (contul autorului a fost
  // șters) nu se rețin pentru reîncercare, ci se anulează: destinatarul este persoana care și-a șters contul.
  // O sesizare se depune numai dintr-un cont, deci `author_account_id IS NULL` înseamnă cont șters.
  if (opts.dryRun) {
    const [c] = await conn.query(`SELECT COUNT(*) AS n FROM email_outbox e JOIN reports r ON r.id = e.report_id WHERE ${R19_AUTHORLESS_WHERE}`);
    emailsCancelled += Number((c as Array<{ n: number }>)[0]!.n);
  } else {
    const [authorless] = await conn.query(
      `UPDATE email_outbox e JOIN reports r ON r.id = e.report_id
          SET e.status = 'cancelled', e.locked_until = NULL, e.next_attempt_at = NULL, e.last_error = ?
        WHERE ${R19_AUTHORLESS_WHERE}`,
      [R19_AUTHOR_DELETED_REASON],
    );
    emailsCancelled += (authorless as { affectedRows: number }).affectedRows;
  }
  const [heldRows] = await conn.query(
    `SELECT e.id AS emailId, e.kind, e.status AS previousStatus, e.report_id AS reportId, r.reference_number AS referenceNumber,
            e.created_at AS createdAt
       FROM email_outbox e JOIN reports r ON r.id = e.report_id
      WHERE e.kind IN ('registry_notification', 'citizen_status_update')
        AND e.status IN ('queued', 'sending', 'on_hold')
        AND NOT (e.kind = 'citizen_status_update' AND r.author_account_id IS NULL)
      ORDER BY e.created_at, e.id`,
  );
  const held = heldRows as Array<HeldEmail & { reportId: string; createdAt: unknown }>;
  if (held.length > 0 && !opts.dryRun) {
    await conn.query(
      `UPDATE email_outbox SET status = 'failed', locked_until = NULL, next_attempt_at = NULL, last_error = ?
        WHERE id IN (?) AND kind IN ('registry_notification', 'citizen_status_update')
          AND status IN ('queued', 'sending', 'on_hold')`,
      [R19_HELD_REASON, held.map((m) => m.emailId)],
    );
    // auditul: câte o intrare pe mesaj reținut (ținta: sesizarea); fără adrese
    for (const m of held) {
      await writeAudit(conn as unknown as mysql.PoolConnection, now, {
        actorType: 'system',
        action: 'email.held_on_restore',
        targetType: 'report',
        targetId: m.reportId,
        details: { emailId: m.emailId, kind: m.kind, previousStatus: m.previousStatus },
      });
    }
  }
  const emailsHeld: HeldEmail[] = held.map((m) => ({
    emailId: m.emailId,
    kind: m.kind,
    previousStatus: m.previousStatus,
    referenceNumber: m.referenceNumber,
    createdAt: dbDate(m.createdAt).toISOString(),
  }));
  return { emailsCancelled, emailsHeld };
}

/**
 * R18 / R19: partea raportului `restore:db` despre conturi și coada de e-mail. Numai numere, numere TM și
 * ID-uri interne ale mesajelor (pentru corelarea cu Admin): fără destinatar și fără adrese de e-mail.
 */
export function formatRestoreAftercare(res: RestoreResult): string[] {
  const lines = [
    `restore:db: conturi șterse din nou conform marcajelor (R18): ${res.accountsDeleted}; ` +
      `păstrate (create după ștergerea notată): ${res.accountsKeptCreatedAfter}`,
    `restore:db: intenții de ștergere a conturilor nereconciliate (NEaplicate): ${res.unreconciledIntents}; conturi vizate rămase în baza restaurată: ${res.accountsKeptUnreconciled}` +
      (res.unreconciledIntents > 0 ? ` — ${R18_UNRECONCILED_WARNING} (fișierele: „${ACCOUNT_DELETIONS_PENDING_DIR}/”)` : ''),
    `restore:db: e-mailuri de cont neplecate, anulate (R19): ${res.emailsCancelled}`,
    `restore:db: mesaje ale sesizărilor reținute (R19), trecute în starea „failed”: ${res.emailsHeld.length}`,
  ];
  for (const m of res.emailsHeld) {
    lines.push(`  ${m.referenceNumber}  ${m.kind}  stare în copie: ${m.previousStatus}  creat: ${m.createdAt}  mesaj: ${m.emailId}`);
  }
  if (res.emailsHeld.length > 0) {
    lines.push(
      'restore:db: ATENȚIE — starea din copie NU arată dacă aceste mesaje au plecat sau nu după copie. Nimic nu se retrimite automat. ' +
        'Reîncercarea din Admin (super_admin, în detaliul sesizării cu numărul TM de mai sus) poate produce un DUPLICAT ' +
        '(pentru Primărie: aceeași sesizare, cu același număr TM). Verificați întâi dacă mesajul a ajuns la destinatar.',
    );
  }
  return lines;
}

/**
 * Restaurarea. Ordinea:
 *   0. toate verificările (`inspectRestore`): la orice problemă se oprește, fără nicio scriere;
 *   1. într-o SINGURĂ tranzacție pe baza țintă: încărcarea rândurilor, verificarea numărului de rânduri
 *      și a cheilor străine, contorul TM ridicat la marcaj, ștergerile din marcaje, retenția, conturile
 *      șterse din nou (R18), tratarea cozii de e-mail (R19) și auditul restaurării;
 *   2. copierea fotografiilor sesizărilor rămase în directorul de fișiere (gol), fără suprascriere;
 *   3. COMMIT.
 *
 * După o eroare la pașii 1–2 tranzacția se anulează: baza țintă rămâne goală (nu există o stare
 * „încărcată, dar cu ștergerile neaplicate”). Singura urmă posibilă: fotografii copiate parțial în
 * directorul țintă, care este un director nou, separat; următoarea încercare îl refuză până este golit.
 * Restaurarea nu șterge niciun fișier și nu scrie în copia sursă. În BACKUP_DIR scrie numai cu
 * `--allow-missing-markers --at-least N` (G1): marcajele lipsă, refăcute înainte de COMMIT.
 */
export async function restoreBackup(opts: RestoreOptions): Promise<RestoreResult> {
  const now = opts.now ?? new Date();
  const inspection = await inspectRestore(opts);
  if (inspection.problems.length > 0) throw new RestoreRefusedError(inspection.problems);
  const manifest = inspection.source.manifest!;
  const dbFile = join(opts.source, 'db.jsonl.gz');

  const conn = await rawConnection(opts.databaseUrl);
  const rows: Record<string, number> = {};
  let photosRestored = 0;
  let photosMissing = 0;
  try {
    // 1. încărcarea rândurilor
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
    for (const [t, n] of Object.entries(manifest.counts)) {
      if ((rows[t] ?? 0) !== n) throw new Error(`Restaurare incompletă: ${t} are ${rows[t] ?? 0} rânduri, manifestul ${n}.`);
    }
    // de aici, cheile străine sunt din nou active (ștergerile de mai jos se bazează pe CASCADE)
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await verifyForeignKeys(conn);

    // contorul TM nu coboară sub ultima valoare emisă (D25–D26), nici sub N declarat de proprietar (G1)
    await conn.query('UPDATE report_counter SET `last_value` = GREATEST(`last_value`, ?, ?, ?) WHERE id = 1', [
      inspection.markers.watermark ?? 0,
      inspection.markers.snapshotWatermark ?? 0, // G2: cel mai nou marcaj cunoscut dintr-o copie
      opts.atLeast ?? 0,
    ]);
    const [counterRows] = await conn.query('SELECT `last_value` AS v FROM report_counter WHERE id = 1');
    const reportCounter = Number((counterRows as Array<{ v: number }>)[0]?.v ?? 0);

    // marcajele de ștergere (cele curente și, G2, cele din fotografiile copiilor): sesizările șterse nu reapar
    const deleted = await deleteReportRows(conn, inspection.markers.deletionIds);

    // retenția: sesizările ajunse între timp la 45 de zile de la depunere dispar
    const expired = await deleteReportRows(conn, await expiredReportIds(conn, opts.retentionDays, now));

    // R18: conturile șterse de titular nu reapar. Numai după ID; numai un cont creat înaintea ștergerii
    // notate (un cont creat după aceea nu este contul șters și se păstrează). Marcajele provin exclusiv
    // din inspecție (validate integral înainte de prima scriere); aici nu se mai citește niciun fișier.
    let accountsDeleted = 0;
    let accountsKeptCreatedAfter = 0;
    for (const e of inspection.markers.accountDeletions) {
      const outcome = await deleteCitizenAccountRows(conn, e.accountId, { guard: { createdBefore: new Date(e.deletedAt) } });
      if (outcome === 'deleted') accountsDeleted++;
      else if (outcome === 'kept_created_after_marker') accountsKeptCreatedAfter++;
    }

    // decizia B: intențiile nereconciliate NU se aplică; conturile vizate rămân și se raportează
    const intentIds = inspection.markers.unreconciledIntentIds;
    let accountsKeptUnreconciled = 0;
    if (intentIds.length > 0) {
      const [k] = await conn.query('SELECT COUNT(*) AS n FROM citizen_accounts WHERE id IN (?)', [intentIds]);
      accountsKeptUnreconciled = Number((k as Array<{ n: number }>)[0]!.n);
    }

    // R19: starea cozii din copie nu arată dacă un mesaj a plecat după copie; nimic nu pleacă automat
    const { emailsCancelled, emailsHeld } = await holdOutboxAfterRollback(conn, now);
    const auditConn = conn as unknown as mysql.PoolConnection;

    // 2. fotografiile sesizărilor rămase; directorul țintă este gol, deci nimic nu se suprascrie
    const [photoRows] = await conn.query('SELECT storage_key AS k FROM report_photos');
    for (const { k } of photoRows as Array<{ k: string }>) {
      const src = storagePath(join(opts.source, 'photos'), k);
      if (!existsSync(src)) {
        photosMissing++;
        continue;
      }
      const dst = storagePath(opts.storageDir, k);
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(src, dst, fsConstants.COPYFILE_EXCL);
      photosRestored++;
    }

    // G1: cu --allow-missing-markers, marcajele lipsă se refac ÎNAINTE de COMMIT, în ordinea inițializării
    // (întâi marcajul contorului, apoi `deletions/`): aplicația nu le mai poate inițializa „în tăcere” din
    // contorul copiei. O eroare aici anulează tranzacția; un marcaj deja ridicat rămâne (nu coboară nimic).
    // G2: la fel, marcajele curente mai vechi decât o copie sunt aduse la zi (contorul, intrările de ștergere).
    const markersWritten: string[] = [];
    if (opts.allowMissingMarkers || inspection.markers.staleAgainst.length > 0) {
      if (inspection.markers.watermark === null || inspection.markers.watermark < reportCounter) {
        recordReportCounter(opts.backupDir, reportCounter);
        markersWritten.push(`${COUNTER_WATERMARK_FILE} = ${reportCounter}`);
      }
      if (!inspection.markers.deletionsDirExists && !inspection.markers.legacyListExists) {
        initMarkerDirs(opts.backupDir, { recoverAccountMarkers: opts.allowMissingMarkers === true });
        markersWritten.push(`${DELETIONS_DIR}/ (gol)`);
      }
      if (inspection.markers.accountMarkersLost) {
        // refacere explicită (--allow-missing-markers); intrările cunoscute din copii se scriu imediat după
        initMarkerDirs(opts.backupDir, { recoverAccountMarkers: true });
        markersWritten.push(`${ACCOUNT_DELETIONS_DIR}/ și ${ACCOUNT_DELETIONS_PENDING_DIR}/ (refăcute)`);
      }
      const n = writeMissingDeletionEntries(opts.backupDir, inspection.markers.snapshotOnlyEntries);
      if (n > 0) markersWritten.push(`${n} intrări de ștergere din fotografiile copiilor`);
      const na = writeMissingAccountDeletionEntries(opts.backupDir, inspection.markers.snapshotOnlyAccountEntries);
      if (na > 0) markersWritten.push(`${na} intrări de ștergere a conturilor din fotografiile copiilor`);
    }

    await writeAudit(auditConn, now, {
      actorType: 'system',
      action: 'restore.completed',
      details: {
        source: manifest.name,
        deletedFromList: deleted.reportIds.length,
        purgedByRetention: expired.reportIds.length,
        accountsDeleted,
        accountsKeptCreatedAfter,
        unreconciledIntents: intentIds.length,
        accountsKeptUnreconciled,
        emailsHeld: emailsHeld.length,
        emailsCancelled,
      },
    });

    // 3. totul sau nimic
    await conn.commit();
    return {
      rows,
      photosRestored,
      photosMissing,
      deletedFromList: deleted.reportIds.length,
      purgedByRetention: expired.reportIds.length,
      reportCounter,
      markersWritten,
      accountsDeleted,
      accountsKeptCreatedAfter,
      unreconciledIntents: intentIds.length,
      accountsKeptUnreconciled,
      emailsCancelled,
      emailsHeld,
    };
  } catch (err) {
    await conn.rollback().catch(() => {});
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Restaurare eșuată: ${reason}\nTranzacția a fost anulată: baza de date țintă a rămas goală. ` +
        'Directorul de fișiere țintă poate conține fotografii copiate parțial și trebuie golit înaintea unei noi încercări.',
      { cause: err },
    );
  } finally {
    await conn.end().catch(() => {});
  }
}

/** După încărcarea cu FOREIGN_KEY_CHECKS = 0: nicio referință fără părinte. */
async function verifyForeignKeys(conn: mysql.Connection): Promise<void> {
  const [fks] = await conn.query(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS c, REFERENCED_TABLE_NAME AS rt, REFERENCED_COLUMN_NAME AS rc
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`,
  );
  for (const fk of fks as Array<{ t: string; c: string; rt: string; rc: string }>) {
    const [r] = await conn.query(
      `SELECT COUNT(*) AS n FROM \`${fk.t}\` ch LEFT JOIN \`${fk.rt}\` p ON p.\`${fk.rc}\` = ch.\`${fk.c}\`
       WHERE ch.\`${fk.c}\` IS NOT NULL AND p.\`${fk.rc}\` IS NULL`,
    );
    const n = Number((r as Array<{ n: number }>)[0]!.n);
    if (n > 0) throw new Error(`Restaurare invalidă: ${n} rânduri din ${fk.t}.${fk.c} fără părinte în ${fk.rt}.`);
  }
}

// Migrațiile SQL versionate (B1 §1, DN-20).
//
// - fișierele: server/migrations/NNNN_nume.sql, instrucțiunile separate prin „--> statement-breakpoint”;
// - evidența: tabelul tehnic `schema_migrations` (versiune, nume, sumă de control), în afara celor
//   30 de tabele de domeniu;
// - o migrație deja aplicată nu se modifică: suma de control diferită oprește totul;
// - la pornire, aplicația refuză să ruleze dacă schema nu este exact la versiunea așteptată.
//
// Atenție: în MySQL instrucțiunile DDL nu sunt tranzacționale. Dacă o migrație eșuează la mijloc,
// DB-ul rămâne parțial modificat; rularea se oprește cu un mesaj clar, iar remedierea este manuală
// (restaurare din backup). Blocarea `GET_LOCK` împiedică două rulări simultane.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type mysql from 'mysql2/promise';

export const MIGRATIONS_TABLE = 'schema_migrations';
const FILE_RE = /^(\d{4})_([a-z0-9_]+)\.sql$/;
const LOCK_NAME = 'civic_schema_migrate';

export type MigrationFile = {
  version: number;
  name: string;
  file: string;
  checksum: string;
  statements: string[];
};

export type AppliedMigration = { version: number; name: string; checksum: string };

export type SchemaStatus = {
  ok: boolean;
  expectedVersion: number;
  currentVersion: number;
  pending: number[];
  problems: string[];
};

/** Sfârșiturile de linie se normalizează (fișier editat pe Windows → aceeași sumă). */
function normalize(sql: string): string {
  return sql.replace(/\r\n/g, '\n');
}

export function splitStatements(sql: string): string[] {
  return normalize(sql)
    .split('--> statement-breakpoint')
    .map((chunk) =>
      chunk
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .map((s) => s.replace(/;\s*$/, '').trim())
    .filter((s) => s.length > 0);
}

export function readMigrationFiles(dir: string): MigrationFile[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const result: MigrationFile[] = [];
  for (const file of files) {
    const m = FILE_RE.exec(file);
    if (!m) throw new Error(`Nume de migrație invalid: ${file} (formatul cerut: NNNN_nume.sql)`);
    const content = normalize(readFileSync(join(dir, file), 'utf8'));
    result.push({
      version: Number(m[1]),
      name: m[2]!,
      file,
      checksum: createHash('sha256').update(content).digest('hex'),
      statements: splitStatements(content),
    });
  }
  result.forEach((mig, i) => {
    if (mig.version !== i + 1) {
      throw new Error(`Migrațiile trebuie numerotate consecutiv de la 0001; lipsește ${String(i + 1).padStart(4, '0')}`);
    }
  });
  return result;
}

async function ensureMigrationsTable(pool: mysql.Pool): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
      \`version\` int unsigned NOT NULL,
      \`name\` varchar(200) NOT NULL,
      \`checksum\` char(64) NOT NULL,
      \`applied_at\` datetime(3) NOT NULL,
      PRIMARY KEY (\`version\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
  );
}

async function migrationsTableExists(pool: mysql.Pool): Promise<boolean> {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [MIGRATIONS_TABLE],
  );
  return Number((rows as Array<{ n: number }>)[0]?.n ?? 0) > 0;
}

export async function readApplied(pool: mysql.Pool): Promise<AppliedMigration[]> {
  if (!(await migrationsTableExists(pool))) return [];
  const [rows] = await pool.query(
    `SELECT version, name, checksum FROM \`${MIGRATIONS_TABLE}\` ORDER BY version`,
  );
  return (rows as Array<{ version: number; name: string; checksum: string }>).map((r) => ({
    version: Number(r.version),
    name: r.name,
    checksum: r.checksum,
  }));
}

export function compare(files: MigrationFile[], applied: AppliedMigration[]): SchemaStatus {
  const problems: string[] = [];
  const byVersion = new Map(files.map((f) => [f.version, f]));
  for (const a of applied) {
    const f = byVersion.get(a.version);
    if (!f) {
      problems.push(`DB-ul conține migrația ${a.version} (${a.name}), necunoscută acestei versiuni a aplicației`);
    } else if (f.checksum !== a.checksum) {
      problems.push(`Migrația ${f.file} a fost modificată după aplicare (sumă de control diferită)`);
    }
  }
  const appliedSet = new Set(applied.map((a) => a.version));
  const pending = files.filter((f) => !appliedSet.has(f.version)).map((f) => f.version);
  const expectedVersion = files.length === 0 ? 0 : files[files.length - 1]!.version;
  const currentVersion = applied.length === 0 ? 0 : Math.max(...applied.map((a) => a.version));
  if (pending.length > 0) {
    problems.push(
      `Schema DB este la versiunea ${currentVersion}, aplicația cere ${expectedVersion}: rulați „migrate”`,
    );
  }
  return { ok: problems.length === 0, expectedVersion, currentVersion, pending, problems };
}

export async function schemaStatus(pool: mysql.Pool, dir: string): Promise<SchemaStatus> {
  return compare(readMigrationFiles(dir), await readApplied(pool));
}

export type MigrateResult = { applied: string[]; version: number };

export async function migrate(
  pool: mysql.Pool,
  dir: string,
  log: (msg: string) => void = () => {},
): Promise<MigrateResult> {
  const files = readMigrationFiles(dir);
  const conn = await pool.getConnection();
  try {
    const [lockRows] = await conn.query('SELECT GET_LOCK(?, 60) AS got', [LOCK_NAME]);
    if (Number((lockRows as Array<{ got: number }>)[0]?.got) !== 1) {
      throw new Error('Altă rulare „migrate” este în curs (blocarea nu a putut fi obținută)');
    }
    try {
      await ensureMigrationsTable(pool);
      const status = compare(files, await readApplied(pool));
      const blocking = status.problems.filter((p) => !p.startsWith('Schema DB este la versiunea'));
      if (blocking.length > 0) {
        throw new Error('Migrarea este oprită:\n' + blocking.map((p) => `  - ${p}`).join('\n'));
      }
      const appliedNow: string[] = [];
      for (const f of files.filter((x) => status.pending.includes(x.version))) {
        log(`aplic ${f.file} (${f.statements.length} instrucțiuni)`);
        for (const [i, stmt] of f.statements.entries()) {
          try {
            await conn.query(stmt);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(
              `Migrația ${f.file} a eșuat la instrucțiunea ${i + 1}/${f.statements.length}: ${msg}. ` +
                'DB-ul poate fi parțial modificat (DDL netranzacțional): restaurați din backup înainte de o nouă rulare.',
            );
          }
        }
        await conn.query(
          `INSERT INTO \`${MIGRATIONS_TABLE}\` (version, name, checksum, applied_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))`,
          [f.version, f.name, f.checksum],
        );
        appliedNow.push(f.file);
      }
      const version = files.length === 0 ? 0 : files[files.length - 1]!.version;
      return { applied: appliedNow, version };
    } finally {
      await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
    }
  } finally {
    conn.release();
  }
}

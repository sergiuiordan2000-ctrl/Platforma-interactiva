// V3 (propunerea „metoda de lansare a restaurării pe găzduire, fără sarcină cron temporară”, r4, aprobată de
// proprietar la 05.11.2026: D-V3-1 = A, D-V3-2 = A): ținta unei restaurări de probă, citită dintr-un fișier
// separat de pe găzduire, `restore-target.env`, aflat în ACELAȘI director cu fișierul de setări activ
// (CIVIC_ENV_FILE). Comenzile `restore-target:*` rulează din cPanel → „Run JS script”, fără argumente și fără
// secrete în pachet; parola bazei de test stă numai pe găzduire, ca și cea din `civic.env`.
//
// Ce garantează acest modul (propunerea, §2.0 și §2.4), totul ÎNAINTEA oricărei scrieri:
// - fișierul țintei: nu este o legătură simbolică, are drepturile 600 / 400, stă în directorul real al fișierului
//   de setări activ și conține NUMAI `DATABASE_URL` și `STORAGE_DIR`, fiecare o singură dată;
// - baza țintă: alt nume decât baza activă (fără deosebire între litere mari și mici, indiferent de gazdă și port)
//   și alt utilizator decât cel activ;
// - directorul țintă: cale absolută, fără `.` / `..`; rezolvat REAL (legăturile simbolice, inclusiv pentru un
//   director încă inexistent) și fără suprapunere cu STORAGE_DIR activ, BACKUP_DIR, directorul aplicației sau
//   directorul fișierului de setări activ (unde stă și fișierul țintei);
// - copia sursă: exact o copie decriptată `civic-restore-<UTC>` direct în BACKUP_DIR.
//
// Fișierul țintei se citește separat: NU prin `process.loadEnvFile` și fără nicio scriere în `process.env`. Setările
// active rămân neschimbate; ținta ajunge la funcțiile existente ale restaurării numai ca parametru.

import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, sep } from 'node:path';
import { RESTORE_COPY_RE } from './backupCrypto.ts';
import { realPath } from './backup.ts';

export const RESTORE_TARGET_FILE = 'restore-target.env';
export const RESTORE_TARGET_KEYS = ['DATABASE_URL', 'STORAGE_DIR'] as const;

export const RESTORE_TARGET_STATUS_COMMAND = 'restore-target:status';
export const RESTORE_TARGET_MIGRATE_COMMAND = 'restore-target:migrate';
export const RESTORE_TARGET_RESTORE_COMMAND = 'restore-target:restore';

export class RestoreTargetError extends Error {}

export type RestoreTarget = {
  /** calea fișierului țintei */
  file: string;
  /** directorul real al fișierului de setări activ (și al fișierului țintei) */
  configDir: string;
  databaseUrl: string;
  storageDir: string;
};

/** Partea afișabilă a unui URL de bază de date (fără parolă). */
export type DbIdentity = { host: string; port: string; user: string; database: string };

export function dbIdentity(databaseUrl: string): DbIdentity {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new RestoreTargetError('DATABASE_URL din fișierul țintei nu este un URL valid (mysql://utilizator:parolă@gazdă/bază).');
  }
  if (url.protocol !== 'mysql:') throw new RestoreTargetError('DATABASE_URL din fișierul țintei trebuie să înceapă cu „mysql://”.');
  return {
    host: url.hostname.toLowerCase(),
    port: url.port || '3306',
    user: decodeURIComponent(url.username),
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
  };
}

/** Valoarea unei linii `CHEIE=valoare`: spațiile de la capete și ghilimelele pereche, scoase. */
function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")))) return t.slice(1, -1);
  return t;
}

/**
 * Citește și validează `restore-target.env` de lângă fișierul de setări activ. Orice abatere = RestoreTargetError,
 * cu un mesaj fără valori (fără parolă).
 */
export function readRestoreTarget(activeEnvFile: string | undefined): RestoreTarget {
  if (!activeEnvFile?.trim()) {
    throw new RestoreTargetError(
      'CIVIC_ENV_FILE lipsește: comenzile țintei caută „restore-target.env” în directorul fișierului de setări activ.',
    );
  }
  let activeDir: string;
  try {
    activeDir = dirname(realpathSync(activeEnvFile.trim()));
  } catch {
    throw new RestoreTargetError('Fișierul de setări activ (CIVIC_ENV_FILE) nu poate fi găsit.');
  }
  const file = join(activeDir, RESTORE_TARGET_FILE);
  let st;
  try {
    st = lstatSync(file);
  } catch {
    throw new RestoreTargetError(`Fișierul țintei „${RESTORE_TARGET_FILE}” nu există în directorul fișierului de setări activ.`);
  }
  if (st.isSymbolicLink()) throw new RestoreTargetError(`„${RESTORE_TARGET_FILE}” este o legătură simbolică; se acceptă numai un fișier obișnuit.`);
  if (!st.isFile()) throw new RestoreTargetError(`„${RESTORE_TARGET_FILE}” nu este un fișier obișnuit.`);
  if (process.platform !== 'win32' && (st.mode & 0o077) !== 0) {
    throw new RestoreTargetError(
      `„${RESTORE_TARGET_FILE}” este citibil și de alți utilizatori (drepturi ${(st.mode & 0o777).toString(8)}); setați drepturile 600.`,
    );
  }
  if (dirname(realpathSync(file)) !== activeDir) {
    throw new RestoreTargetError(`„${RESTORE_TARGET_FILE}” nu se află în directorul real al fișierului de setări activ.`);
  }

  const values = new Map<string, string>();
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    const key = eq > 0 ? line.slice(0, eq).trim() : '';
    if (!(RESTORE_TARGET_KEYS as readonly string[]).includes(key)) {
      throw new RestoreTargetError(
        `„${RESTORE_TARGET_FILE}”, rândul ${i + 1}: se acceptă numai ${RESTORE_TARGET_KEYS.join(' și ')} (CHEIE=valoare).`,
      );
    }
    if (values.has(key)) throw new RestoreTargetError(`„${RESTORE_TARGET_FILE}”: ${key} apare de mai multe ori.`);
    const value = unquote(line.slice(eq + 1));
    if (value === '') throw new RestoreTargetError(`„${RESTORE_TARGET_FILE}”: ${key} este gol.`);
    values.set(key, value);
  });
  for (const k of RESTORE_TARGET_KEYS) {
    if (!values.has(k)) throw new RestoreTargetError(`„${RESTORE_TARGET_FILE}”: lipsește ${k}.`);
  }
  return { file, configDir: activeDir, databaseUrl: values.get('DATABASE_URL')!, storageDir: values.get('STORAGE_DIR')! };
}

/** a și b (căi reale) sunt identice sau una o conține pe cealaltă */
function overlaps(a: string, b: string): boolean {
  const withSep = (p: string) => (p.endsWith(sep) ? p : p + sep);
  return a === b || a.startsWith(withSep(b)) || b.startsWith(withSep(a));
}

export type ActivePaths = { databaseUrl: string; storageDir: string; backupDir: string; appRoot: string };

/**
 * Verifică ținta față de resursele active (propunerea, §2.4, punctele 2 și 3). Întoarce lista problemelor (goală =
 * permis) și căile reale folosite. Se apelează din nou imediat înaintea primei scrieri.
 */
export function checkRestoreTarget(
  target: RestoreTarget,
  active: ActivePaths,
): { problems: string[]; target: DbIdentity; storageReal: string | null } {
  const problems: string[] = [];
  const t = dbIdentity(target.databaseUrl);
  let a: DbIdentity;
  try {
    a = dbIdentity(active.databaseUrl);
  } catch {
    throw new RestoreTargetError('DATABASE_URL activ nu poate fi citit pentru comparație.');
  }
  if (t.database === '') problems.push('baza țintă nu are nume (DATABASE_URL fără „/<bază>”).');
  else if (t.database.toLowerCase() === a.database.toLowerCase()) {
    problems.push('baza țintă are același nume ca baza activă (indiferent de gazdă și port, nu se acceptă).');
  }
  if (t.user === '') problems.push('baza țintă nu are utilizator (DATABASE_URL fără „utilizator@”).');
  else if (t.user === a.user) problems.push('baza țintă folosește același utilizator ca baza activă; baza de test are utilizatorul ei.');

  let storageReal: string | null = null;
  const s = target.storageDir;
  if (!isAbsolute(s)) problems.push('STORAGE_DIR din fișierul țintei trebuie să fie o cale absolută.');
  else if (s.split(/[\\/]+/).some((seg) => seg === '.' || seg === '..')) {
    problems.push('STORAGE_DIR din fișierul țintei nu poate conține segmente „.” sau „..”.');
  } else {
    storageReal = realPath(s);
    const others: Array<[string, string]> = [
      ['STORAGE_DIR activ', active.storageDir],
      ['BACKUP_DIR', active.backupDir],
      ['directorul aplicației', active.appRoot],
      ['directorul fișierului de setări activ (și al fișierului țintei)', target.configDir],
    ];
    for (const [label, p] of others) {
      if (overlaps(storageReal, realPath(p))) problems.push(`STORAGE_DIR țintă se suprapune cu ${label} (după rezolvarea căilor reale).`);
    }
  }
  return { problems, target: t, storageReal };
}

/** Exact o copie decriptată `civic-restore-<UTC>` direct în BACKUP_DIR (D-V3-2 = A); altfel RestoreTargetError. */
export function findSingleRestoreCopy(backupDir: string): string {
  let entries: string[];
  try {
    entries = readdirSync(backupDir);
  } catch {
    throw new RestoreTargetError('BACKUP_DIR nu poate fi citit.');
  }
  const copies = entries
    .filter((e) => RESTORE_COPY_RE.test(e))
    .filter((e) => {
      const st = lstatSync(join(backupDir, e));
      return st.isDirectory() && !st.isSymbolicLink();
    })
    .sort();
  if (copies.length !== 1) {
    throw new RestoreTargetError(
      copies.length === 0
        ? 'În BACKUP_DIR nu există nicio copie decriptată „civic-restore-<UTC>”: urcați copia decriptată pe calculator (backup:decrypt).'
        : `În BACKUP_DIR există ${copies.length} copii decriptate (${copies.join(', ')}); se acceptă exact una.`,
    );
  }
  return join(backupDir, copies[0]!);
}

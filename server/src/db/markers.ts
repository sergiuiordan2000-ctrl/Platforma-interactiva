// Marcajele ținute lângă backup-uri, în afara bazei de date (T-D1; remedierea R1–R5 din Faza 6).
//
// Baza de date se poate pierde; aceste fișiere spun restaurării ce NU are voie să readucă:
//
// 1. Marcajul contorului TM (`report-counter-watermark.json`): cel mai mare număr TM rezervat. Se scrie
//    ÎNAINTE de confirmarea (COMMIT) depunerii, sub blocarea rândului `report_counter`, deci scrierile
//    sunt ordonate și între procese diferite. Emiterea, pornirea, backup-ul și restaurarea pornesc de
//    la maximul dintre contorul din bază și marcaj (`reportCounter.ts`): un număr ajuns în marcaj nu
//    se mai emite niciodată (D25–D26; decizia proprietarului din 11.10.2026: golurile sunt acceptate).
//
// 2. Marcajele de ștergere (`deletions/<ID>.json`, câte un fișier pentru fiecare sesizare ștearsă de
//    autor sau de `super_admin`): se scriu ÎNAINTE de confirmarea ștergerii din baza de date.
//    Restaurarea șterge din nou aceste sesizări: o sesizare ștearsă nu reapare.
//
// Reguli comune:
// - scriere durabilă: fișier temporar cu nume unic → fsync → redenumire atomică → fsync pe director;
//   un fișier vizibil sub numele final este întotdeauna complet;
// - dacă scrierea eșuează, apelantul anulează tranzacția: operația NU se confirmă;
// - niciun fișier comun nu este rescris la o ștergere (fiecare intrare are fișierul ei), deci două
//   procese nu își pot pierde reciproc intrările;
// - în afara pornirii aplicației și a backup-ului, directoarele NU se creează din mers: un BACKUP_DIR
//   dispărut înseamnă eroare explicită, nu un set nou și gol de marcaje.
//
// Compromisul documentat: marcajul se scrie înainte de COMMIT. Dacă tranzacția cade după scriere,
// - la depunere: numărul rămâne rezervat în marcaj și NU mai este emis; următoarea depunere primește
//   numărul de după el, deci în numerotare rămâne un gol (acceptat prin decizia proprietarului);
// - la ștergere: intrarea rămâne, deși sesizarea nu a fost ștearsă; la o restaurare, sesizarea ar fi
//   eliminată. Ștergerea fusese cerută de o persoană autorizată, iar varianta opusă (ștergere
//   confirmată fără marcaj) ar readuce public date șterse. Intrarea nu se retrage niciodată automat:
//   o retragere s-ar putea suprapune cu o reîncercare reușită și ar lăsa ștergerea fără marcaj.
//
// Cât se păstrează o intrare de ștergere (decizia proprietarului din 11.10.2026: cât timp o copie
// restaurabilă poate readuce datele): restaurarea oricărei copii, oriunde ar fi fost păstrată, elimină
// la final sesizările care au depășit termenul de retenție (cel mult 45 de zile de la depunere). După
// „data depunerii + 45 de zile” nicio copie nu mai poate readuce sesizarea, deci intrarea se poate
// șterge (cu o zi de rezervă). Regula nu depinde de evidența copiilor, deci acoperă și copiile arhivate
// în afara BACKUP_DIR. Vârsta intrării (7 zile) NU mai este un criteriu.

import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { APPROVED_RETENTION_DAYS } from '../config.ts';

export const COUNTER_WATERMARK_FILE = 'report-counter-watermark.json';
export const DELETIONS_DIR = 'deletions';
/** Formatul vechi (un singur fișier); nu a fost scris niciodată de rute. Se mai citește, nu se mai scrie. */
export const LEGACY_DELETION_LIST_FILE = 'deletion-list.jsonl';
/** Rezerva peste termenul de retenție, înainte ca o intrare de ștergere să poată fi eliminată. */
export const DELETION_MARKER_MARGIN_DAYS = 1;

const DAY = 86_400_000;
const TMP_PREFIX = '.tmp-';
const ENTRY_SUFFIX = '.json';
/** ID intern (ULID, 26 de caractere): singurul nume de fișier acceptat pentru o intrare. */
const REPORT_ID_RE = /^[0-9A-Z]{26}$/;

/** Marcaj imposibil de scris sau de citit. Mesajul numește fișierul, nu conținutul lui. */
export class MarkerError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MarkerError';
  }
}

const errCode = (err: unknown) => (err as { code?: string } | null)?.code ?? 'eroare';

/** fsync pe director, ca redenumirea să supraviețuiască unei căderi. Unde platforma nu îl permite, se omite. */
function fsyncDir(dir: string): void {
  let fd: number | undefined;
  try {
    fd = openSync(dir, 'r');
    fsyncSync(fd);
  } catch (err) {
    if (!['EPERM', 'EISDIR', 'EINVAL', 'ENOTSUP'].includes(errCode(err))) throw err;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** Scriere completă sau deloc: temporar cu nume unic (`wx`), fsync, redenumire atomică, fsync pe director. */
function writeFileDurable(dir: string, name: string, content: string): void {
  const tmp = join(dir, `${TMP_PREFIX}${name}.${process.pid}.${randomBytes(6).toString('hex')}`);
  try {
    const fd = openSync(tmp, 'wx', 0o600);
    try {
      writeFileSync(fd, content);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, join(dir, name));
    fsyncDir(dir);
  } catch (err) {
    try {
      rmSync(tmp, { force: true });
    } catch {
      // temporarul nu a apucat să existe (de exemplu, directorul lipsește)
    }
    // mesajul numește fișierul și codul erorii, niciodată calea completă (poate ajunge în răspunsul HTTP)
    throw new MarkerError(`Marcajul „${name}” nu a putut fi scris în BACKUP_DIR (${errCode(err)}).`, { cause: err });
  }
}

/**
 * Prima parte a inițializării (A1): numai BACKUP_DIR, cu o scriere de probă. `deletions/` NU se creează
 * aici: el apare abia după scrierea marcajului contorului (`initBackupMarkers`), ca existența lui să
 * însemne mereu „marcajul contorului a fost scris”.
 */
export function prepareBackupDir(backupDir: string): void {
  try {
    mkdirSync(backupDir, { recursive: true });
  } catch (err) {
    throw new MarkerError(`BACKUP_DIR nu poate fi folosit: directorul nu poate fi creat (${errCode(err)}).`, { cause: err });
  }
  const probe = `.probe.${process.pid}.${randomBytes(6).toString('hex')}`;
  try {
    writeFileDurable(backupDir, probe, '');
  } catch (err) {
    const code = errCode((err as { cause?: unknown }).cause);
    throw new MarkerError(`BACKUP_DIR nu poate fi folosit: scrierea de probă a eșuat (${code}).`, { cause: err });
  }
  rmSync(join(backupDir, probe), { force: true });
}

/**
 * Creează directoarele marcajelor și verifică, printr-o scriere de probă, că se poate scrie durabil în
 * ele. Aruncă `MarkerError` dacă nu se poate. În aplicație se apelează numai prin `initBackupMarkers`,
 * DUPĂ scrierea marcajului contorului (A1).
 */
export function initMarkerDirs(backupDir: string): void {
  const deletions = join(backupDir, DELETIONS_DIR);
  try {
    mkdirSync(deletions, { recursive: true });
  } catch (err) {
    throw new MarkerError(`BACKUP_DIR nu poate fi folosit: directoarele marcajelor nu pot fi create (${errCode(err)}).`, { cause: err });
  }
  for (const dir of [backupDir, deletions]) {
    const probe = `.probe.${process.pid}.${randomBytes(6).toString('hex')}`;
    try {
      writeFileDurable(dir, probe, '');
    } catch (err) {
      const code = errCode((err as { cause?: unknown }).cause);
      throw new MarkerError(`BACKUP_DIR nu poate fi folosit: scrierea de probă a eșuat (${code}).`, { cause: err });
    }
    rmSync(join(dir, probe), { force: true });
  }
}

// ---- marcajul contorului TM ----

/** `null` = marcajul nu există. Un fișier care există, dar nu poate fi înțeles, este o eroare (nu „0”). */
export function readReportCounterWatermark(backupDir: string): number | null {
  const file = join(backupDir, COUNTER_WATERMARK_FILE);
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    if (errCode(err) === 'ENOENT') return null;
    throw new MarkerError(`Marcajul contorului TM („${COUNTER_WATERMARK_FILE}”) nu poate fi citit (${errCode(err)}).`, { cause: err });
  }
  let value: unknown;
  try {
    value = (JSON.parse(text) as { lastValue?: unknown }).lastValue;
  } catch (err) {
    throw new MarkerError(`Marcajul contorului TM („${COUNTER_WATERMARK_FILE}”) este corupt: nu este JSON valid.`, { cause: err });
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new MarkerError(`Marcajul contorului TM („${COUNTER_WATERMARK_FILE}”) este corupt: „lastValue” nu este un număr întreg pozitiv.`);
  }
  return value;
}

/** Comanda prin care proprietarul reface explicit marcajul contorului (A1). Numită în mesajele de refuz. */
export const REBUILD_COUNTER_COMMAND = 'markers:rebuild-counter';

/**
 * A1 (decizia proprietarului din 11.10.2026): setul de marcaje este „inițializat” dacă există directorul
 * `deletions/`. Inițializarea scrie ÎNTÂI marcajul contorului și abia apoi creează `deletions/`
 * (`initBackupMarkers`), deci `deletions/` fără marcajul contorului înseamnă un marcaj PIERDUT, nu o
 * primă folosire. În această stare aplicația nu poate deosebi numerele emise de cele neemise: o bază
 * readusă la o stare mai veche ar putea primi din nou numere deja comunicate. Refuz, cu mesaj explicit.
 */
export function assertCounterWatermarkCoherent(backupDir: string, watermark: number | null): void {
  if (watermark === null && existsSync(join(backupDir, DELETIONS_DIR))) {
    throw new MarkerError(
      `Marcajul contorului TM („${COUNTER_WATERMARK_FILE}”) lipsește, deși marcajele au fost inițializate („${DELETIONS_DIR}/” există). ` +
        `Numerele TM deja emise nu mai pot fi garantate; nu se refac automat. ` +
        `Refacerea se face numai explicit, cu comanda „${REBUILD_COUNTER_COMMAND}”.`,
    );
  }
}

/**
 * Emiterea (A1): după inițializare marcajul trebuie să existe. Lipsa lui la emitere înseamnă că s-a
 * pierdut (ori a dispărut tot BACKUP_DIR); emiterea se oprește, nu pornește de la contorul din bază.
 */
export function readRequiredCounterWatermark(backupDir: string): number {
  const value = readReportCounterWatermark(backupDir);
  assertCounterWatermarkCoherent(backupDir, value);
  if (value === null) {
    throw new MarkerError(
      `Marcajul contorului TM („${COUNTER_WATERMARK_FILE}”) lipsește din BACKUP_DIR; emiterea numerelor TM este oprită. ` +
        `Refacerea se face numai explicit, cu comanda „${REBUILD_COUNTER_COMMAND}”.`,
    );
  }
  return value;
}

/**
 * Ridică marcajul la `value` (niciodată nu îl coboară). Apelanții din aplicație țin blocat rândul
 * `report_counter` (FOR UPDATE), deci citirea urmată de scriere nu se poate intercala între procese.
 */
export function recordReportCounter(backupDir: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new MarkerError('Valoare invalidă pentru marcajul contorului TM.');
  const current = readReportCounterWatermark(backupDir);
  if (current !== null && value <= current) return;
  writeFileDurable(backupDir, COUNTER_WATERMARK_FILE, JSON.stringify({ lastValue: value }) + '\n');
}

// ---- marcajele de ștergere ----

/** Numai ID-ul intern și două date calendaristice: fără număr TM, fără autor, fără conținut. */
export type DeletionEntry = { reportId: string; reportCreatedAt: string; deletedAt: string };
export type DeletedReportRef = { id: string; createdAt: Date };

function parseEntry(text: string, expectedId: string): DeletionEntry | null {
  try {
    const e = JSON.parse(text) as Partial<DeletionEntry>;
    if (e.reportId !== expectedId) return null;
    if (typeof e.reportCreatedAt !== 'string' || Number.isNaN(Date.parse(e.reportCreatedAt))) return null;
    if (typeof e.deletedAt !== 'string' || Number.isNaN(Date.parse(e.deletedAt))) return null;
    return { reportId: e.reportId, reportCreatedAt: e.reportCreatedAt, deletedAt: e.deletedAt };
  } catch {
    return null;
  }
}

/**
 * Notează ștergerea definitivă a unor sesizări (autor / `super_admin`). Se apelează în tranzacția de
 * ștergere, după blocarea rândurilor și înainte de DELETE; dacă aruncă, tranzacția se anulează.
 * Idempotentă: aceeași sesizare → același fișier (rescris atomic, cu data ultimei cereri).
 */
export function recordReportDeletions(backupDir: string, reports: DeletedReportRef[], now: Date = new Date()): void {
  const dir = join(backupDir, DELETIONS_DIR);
  for (const r of reports) {
    if (!REPORT_ID_RE.test(r.id)) throw new MarkerError('ID de sesizare invalid pentru marcajul de ștergere.');
    const entry: DeletionEntry = { reportId: r.id, reportCreatedAt: r.createdAt.toISOString(), deletedAt: now.toISOString() };
    writeFileDurable(dir, `${r.id}${ENTRY_SUFFIX}`, JSON.stringify(entry) + '\n');
  }
}

export type DeletionMarkers = {
  /** directorul `deletions/` există (setul de marcaje a fost inițializat) */
  dirExists: boolean;
  entries: DeletionEntry[];
  /** fișiere din `deletions/` care nu pot fi înțelese (nume sau conținut) */
  invalid: string[];
  legacyFileExists: boolean;
  legacyIds: string[];
  legacyInvalid: boolean;
};

/** Citire fără nicio scriere. Fișierele temporare (scrieri neterminate, neconfirmate) se ignoră. */
export function readDeletionMarkers(backupDir: string): DeletionMarkers {
  const out: DeletionMarkers = { dirExists: false, entries: [], invalid: [], legacyFileExists: false, legacyIds: [], legacyInvalid: false };
  const dir = join(backupDir, DELETIONS_DIR);
  if (existsSync(dir)) {
    out.dirExists = true;
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith(TMP_PREFIX) || name.startsWith('.probe.')) continue;
      const id = name.endsWith(ENTRY_SUFFIX) ? name.slice(0, -ENTRY_SUFFIX.length) : '';
      let entry: DeletionEntry | null = null;
      if (REPORT_ID_RE.test(id)) {
        try {
          entry = parseEntry(readFileSync(join(dir, name), 'utf8'), id);
        } catch {
          entry = null;
        }
      }
      if (entry) out.entries.push(entry);
      else out.invalid.push(name);
    }
  }
  const legacy = join(backupDir, LEGACY_DELETION_LIST_FILE);
  if (existsSync(legacy)) {
    out.legacyFileExists = true;
    try {
      for (const line of readFileSync(legacy, 'utf8').split('\n')) {
        if (line.trim() === '') continue;
        const id = (JSON.parse(line) as { reportId?: unknown }).reportId;
        if (typeof id !== 'string' || !REPORT_ID_RE.test(id)) throw new Error('intrare invalidă');
        out.legacyIds.push(id);
      }
    } catch {
      out.legacyInvalid = true;
    }
  }
  return out;
}

/** ID-urile de șters din nou la restaurare. Strict: un marcaj neînțeles oprește apelantul. */
export function deletionListIds(backupDir: string): string[] {
  const m = readDeletionMarkers(backupDir);
  if (m.invalid.length > 0) {
    throw new MarkerError(`Marcaje de ștergere corupte în „${DELETIONS_DIR}/”: ${m.invalid.join(', ')}`);
  }
  if (m.legacyInvalid) throw new MarkerError(`Lista veche de ștergeri („${LEGACY_DELETION_LIST_FILE}”) este coruptă.`);
  return [...new Set([...m.entries.map((e) => e.reportId), ...m.legacyIds])];
}

// ---- G2: fotografia marcajelor păstrată în fiecare copie (formatul „civic-backup/2”) ----

export const MARKER_SNAPSHOT_FILE = 'markers.json';
export const MARKER_SNAPSHOT_FORMAT = 'civic-markers/1';

/** Marcajele din momentul copiei: marcajul contorului și intrările de ștergere (ID intern + două date). */
export type MarkerSnapshot = {
  format: typeof MARKER_SNAPSHOT_FORMAT;
  watermark: number | null;
  deletions: DeletionEntry[];
  legacyIds: string[];
};

/** Citire strictă, pentru backup: un marcaj corupt oprește backup-ul (copia nu ar putea fi restaurată). */
export function takeMarkerSnapshot(backupDir: string): MarkerSnapshot {
  const watermark = readReportCounterWatermark(backupDir);
  const m = readDeletionMarkers(backupDir);
  if (m.invalid.length > 0) throw new MarkerError(`Marcaje de ștergere corupte în „${DELETIONS_DIR}/”: ${m.invalid.join(', ')}`);
  if (m.legacyInvalid) throw new MarkerError(`Lista veche de ștergeri („${LEGACY_DELETION_LIST_FILE}”) este coruptă.`);
  return { format: MARKER_SNAPSHOT_FORMAT, watermark, deletions: m.entries, legacyIds: m.legacyIds };
}

/** Validarea fotografiei citite dintr-o copie. Aruncă `MarkerError` la orice abatere. */
export function parseMarkerSnapshot(text: string): MarkerSnapshot {
  let raw: Partial<MarkerSnapshot>;
  try {
    raw = JSON.parse(text) as Partial<MarkerSnapshot>;
  } catch (err) {
    throw new MarkerError('Fotografia marcajelor din copie nu este JSON valid.', { cause: err });
  }
  const bad = () => new MarkerError('Fotografia marcajelor din copie are un conținut neașteptat.');
  if (raw.format !== MARKER_SNAPSHOT_FORMAT) throw bad();
  const w = raw.watermark;
  if (w !== null && (typeof w !== 'number' || !Number.isSafeInteger(w) || w < 0)) throw bad();
  if (!Array.isArray(raw.deletions) || !Array.isArray(raw.legacyIds)) throw bad();
  const deletions: DeletionEntry[] = [];
  for (const e of raw.deletions) {
    const ok = e && typeof e === 'object' && typeof e.reportId === 'string' && REPORT_ID_RE.test(e.reportId)
      ? parseEntry(JSON.stringify(e), e.reportId)
      : null;
    if (!ok) throw bad();
    deletions.push(ok);
  }
  for (const id of raw.legacyIds) if (typeof id !== 'string' || !REPORT_ID_RE.test(id)) throw bad();
  return { format: MARKER_SNAPSHOT_FORMAT, watermark: w ?? null, deletions, legacyIds: raw.legacyIds as string[] };
}

/**
 * G2: aduce în `deletions/` intrările cunoscute din fotografiile copiilor și lipsă din marcajele curente
 * (marcaje curente mai vechi sau pierdute). Intrarea se scrie așa cum era, nu se suprascrie una existentă.
 */
export function writeMissingDeletionEntries(backupDir: string, entries: DeletionEntry[]): number {
  const dir = join(backupDir, DELETIONS_DIR);
  let written = 0;
  for (const e of entries) {
    if (!REPORT_ID_RE.test(e.reportId)) throw new MarkerError('ID de sesizare invalid pentru marcajul de ștergere.');
    if (existsSync(join(dir, `${e.reportId}${ENTRY_SUFFIX}`))) continue;
    writeFileDurable(dir, `${e.reportId}${ENTRY_SUFFIX}`, JSON.stringify(e) + '\n');
    written++;
  }
  return written;
}

/** Momentul de la care nicio copie nu mai poate readuce sesizarea (retenția aplicată la restaurare). */
export function deletionMarkerExpiry(entry: DeletionEntry): Date {
  return new Date(Date.parse(entry.reportCreatedAt) + (APPROVED_RETENTION_DAYS + DELETION_MARKER_MARGIN_DAYS) * DAY);
}

/**
 * Curățarea, rulată numai la backup. Elimină o intrare DOAR când se poate demonstra că nicio copie nu o
 * mai poate readuce (vezi antetul). Intrările neînțelese și lista veche se păstrează. Întoarce numărul
 * intrărilor eliminate.
 */
export function pruneDeletionList(backupDir: string, now: Date): number {
  const dir = join(backupDir, DELETIONS_DIR);
  if (!existsSync(dir)) return 0;
  let removed = 0;
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (name.startsWith(TMP_PREFIX) || name.startsWith('.probe.')) {
      removeIfStale(file);
      continue;
    }
    const id = name.endsWith(ENTRY_SUFFIX) ? name.slice(0, -ENTRY_SUFFIX.length) : '';
    if (!REPORT_ID_RE.test(id)) continue;
    let entry: DeletionEntry | null = null;
    try {
      entry = parseEntry(readFileSync(file, 'utf8'), id);
    } catch {
      entry = null;
    }
    if (!entry) continue; // nu se șterge ce nu se poate demonstra că este inutil
    if (now.getTime() >= deletionMarkerExpiry(entry).getTime()) {
      rmSync(file, { force: true });
      removed++;
    }
  }
  // temporarele rămase în rădăcină de la o scriere întreruptă a marcajului contorului
  for (const name of readdirSync(backupDir)) {
    if (name.startsWith(`${TMP_PREFIX}${COUNTER_WATERMARK_FILE}.`) || name.startsWith('.probe.')) removeIfStale(join(backupDir, name));
  }
  return removed;
}

/** Un temporar mai vechi de o zi (ceas real) aparține sigur unei scrieri abandonate. */
function removeIfStale(file: string): void {
  try {
    if (Date.now() - statSync(file).mtimeMs > DAY) rmSync(file, { force: true });
  } catch {
    // a dispărut între timp
  }
}

// E4.11 (planul r3.2, deciziile P1–P10, registrul §24): criptarea copiilor de pe găzduire în formatul
// standard age (age-encryption.org/v1: X25519, HKDF-SHA256, ChaCha20-Poly1305 în segmente de 64 KiB,
// antet autentificat), prin pachetul `age-encryption`, fixat la o versiune exactă (P1).
//
// Ce garantează: confidențialitatea copiilor față de oricine nu are identitatea (cheia privată) și
// detectarea oricărei modificări sau trunchieri a unui fișier. Ce NU garantează (P9, planul §2.2): că o
// copie a fost produsă de aplicație. Cheia publică stă pe găzduire, deci un atacator din cont poate crea o
// copie falsă, consecventă. După o compromitere se restaurează numai o copie de încredere (planul §2.4).
//
// Structura unei copii criptate (planul §3.1):
//   civic-backup-<UTC>/
//     manifest.json       în clar (structura, numărul de rânduri, SHA-256 al db.jsonl.gz în clar)
//     markers.json        în clar (fotografia marcajelor; o citesc restaurarea și protecțiile R18)
//     binding.json.age    criptat: asocierea fișierelor criptate cu manifestul și cu marcajele (§2.3)
//     db.jsonl.gz.age     criptat
//     photos/<cheie>.age  criptate
//
// Identitatea nu ajunge niciodată pe găzduire (P4): `backup:verify` și `backup:decrypt` rulează pe
// calculatorul proprietarului (P5), cu identitatea criptată cu fraza-parolă (planul §4).

import { createHash, type Hash } from 'node:crypto';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { PassThrough, Readable, Transform, Writable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { Decrypter, Encrypter, armor } from 'age-encryption';

/** Valoarea din `manifest.json` → `encryption.scheme` a unei copii criptate. */
export const AGE_SCHEME = 'age-x25519';
export const AGE_SUFFIX = '.age';
export const ENCRYPTED_DB_FILE = 'db.jsonl.gz.age';
export const BINDING_FILE = 'binding.json.age';
export const BINDING_FORMAT = 'civic-binding/1';
/** Marcajul copiei decriptate (planul §5.2): `civic-restore-<UTC>/DECRYPTED-COPY.json`. */
export const DECRYPTED_COPY_FILE = 'DECRYPTED-COPY.json';
export const DECRYPTED_COPY_FORMAT = 'civic-decrypted/1';
export const RESTORE_COPY_PREFIX = 'civic-restore-';
export const RESTORE_COPY_RE = /^civic-restore-(\d{8}T\d{6}\d{3}Z)$/;
/** Plasa de siguranță (planul §5.2): o copie decriptată mai veche de atât se șterge la backup și la pornire. */
export const RESTORE_COPY_MAX_AGE_HOURS = 24;
/** Numai destinatari X25519 nativi (`age1…`, 62 de caractere, alfabetul bech32), conform P1. */
export const AGE_RECIPIENT_RE = /^age1[02-9ac-hj-np-z]{58}$/;

const PLAIN_COPY_FILES = ['manifest.json', 'markers.json'] as const;
const KEY_PART = '[A-Za-z0-9_-][A-Za-z0-9._-]*';
/** Căile admise pentru fișierele criptate din copie (aceleași reguli ca cheile din STORAGE_DIR). */
const ENCRYPTED_PATH_RE = new RegExp(`^(db\\.jsonl\\.gz\\.age|photos/${KEY_PART}(/${KEY_PART})*\\.age)$`);

export function stamp(d: Date): string {
  return d.toISOString().replace(/[-:.]/g, '').replace(/(\d{8}T\d{6})(\d{3})Z/, '$1$2Z');
}

export function parseStamp(s: string): Date {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\d{3})Z$/.exec(s)!;
  return new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!, +m[7]!));
}

/**
 * Validarea completă a cheii publice (formă + suma de control bech32, prin biblioteca age). Întoarce motivul
 * respingerii sau `null`. Fără valori în mesaj.
 */
export function recipientProblem(recipient: string): string | null {
  if (!AGE_RECIPIENT_RE.test(recipient)) {
    return 'trebuie să fie o cheie publică age X25519 („age1…”, 62 de caractere); alte tipuri de destinatari nu sunt acceptate';
  }
  try {
    new Encrypter().addRecipient(recipient);
  } catch {
    return 'nu este o cheie publică age validă (suma de control nu corespunde)';
  }
  return null;
}

function hashing(h: Hash): Transform {
  return new Transform({
    transform(chunk: Buffer, _enc, cb) {
      h.update(chunk);
      cb(null, chunk);
    },
  });
}

function toWeb(src: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(src) as unknown as ReadableStream<Uint8Array>;
}

function fromWeb(s: ReadableStream<Uint8Array>): Readable {
  return Readable.fromWeb(s as unknown as WebReadableStream<Uint8Array>);
}

/**
 * Criptează un flux într-un fișier nou (`wx`: nu suprascrie nimic), fără nicio copie în clar pe disc.
 * Întoarce SHA-256 al fișierului criptat (calculat pe drum, fără recitire).
 */
export async function encryptStreamToFile(src: Readable, dst: string, recipient: string): Promise<string> {
  const enc = new Encrypter();
  enc.addRecipient(recipient);
  const out = await enc.encrypt(toWeb(src));
  const cipher = createHash('sha256');
  await pipeline(fromWeb(out), hashing(cipher), createWriteStream(dst, { flags: 'wx', mode: 0o600 }));
  return cipher.digest('hex');
}

function* withNewlines(lines: Iterable<string>): Generator<string> {
  for (const l of lines) yield l + '\n';
}

/**
 * Baza de date (planul §3.2, cu decizia din 01.11.2026 privind fluxul): rândurile → gzip → criptare →
 * `db.jsonl.gz.age`, totul în flux. Baza comprimată nu se ține întreagă în memorie și nu se scrie în clar.
 * SHA-256 al bazei comprimate în clar (pentru manifest) se calculează incremental, pe drum.
 */
export async function encryptDbLines(
  lines: Iterable<string>,
  dst: string,
  recipient: string,
): Promise<{ plainSha256: string; cipherSha256: string }> {
  const plain = createHash('sha256');
  const pass = new PassThrough();
  const producing = pipeline(Readable.from(withNewlines(lines)), createGzip(), hashing(plain), pass);
  const encrypting = encryptStreamToFile(pass, dst, recipient);
  try {
    const [, cipherSha256] = await Promise.all([producing, encrypting]);
    return { plainSha256: plain.digest('hex'), cipherSha256 };
  } catch (err) {
    pass.destroy();
    throw err;
  }
}

export type BindingFile = { path: string; sha256: string };
export type Binding = {
  format: typeof BINDING_FORMAT;
  name: string;
  createdAt: string;
  manifestSha256: string;
  markersSha256: string;
  files: BindingFile[];
};

/** `binding.json.age` (planul §2.3): JSON criptat pentru același destinatar. */
export async function writeBinding(dir: string, binding: Binding, recipient: string): Promise<void> {
  const enc = new Encrypter();
  enc.addRecipient(recipient);
  const bytes = await enc.encrypt(JSON.stringify(binding) + '\n');
  writeFileSync(join(dir, BINDING_FILE), bytes, { flag: 'wx', mode: 0o600 });
}

const sha256Hex = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

/** Fișierele unei copii (căi relative, cu „/”), recursiv; legăturile simbolice se raportează separat. */
function listFiles(root: string): { files: string[]; links: string[] } {
  const files: string[] = [];
  const links: string[] = [];
  const walk = (rel: string) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      const p = rel === '' ? e.name : `${rel}/${e.name}`;
      if (e.isSymbolicLink()) links.push(p);
      else if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk('');
  return { files: files.sort(), links: links.sort() };
}

/**
 * Pasul 7 al backup-ului (planul §3.2), pe găzduire, fără identitate: fișierele de pe disc sunt exact
 * manifestul, marcajele, `binding.json.age` și lista din binding, toate cu extensiile permise.
 */
export function encryptedStructureProblems(dir: string, bindingFiles: string[]): string[] {
  const problems: string[] = [];
  const expected = new Set<string>([...PLAIN_COPY_FILES, BINDING_FILE, ...bindingFiles]);
  const { files, links } = listFiles(dir);
  for (const l of links) problems.push(`legătură simbolică neașteptată: ${l}`);
  for (const f of files) if (!expected.has(f)) problems.push(`fișier neașteptat: ${f}`);
  for (const f of expected) if (!files.includes(f)) problems.push(`fișier lipsă: ${f}`);
  for (const f of bindingFiles) if (!ENCRYPTED_PATH_RE.test(f)) problems.push(`cale nepermisă: ${f}`);
  return problems;
}

/** Ce s-a verificat (sau decriptat) dintr-o copie criptată. Fără conținut în clar, fără identitate. */
export type CopyVerification = {
  name: string;
  /** lista goală = copia este întreagă și consecventă */
  problems: string[];
  /** fișierele criptate decriptate integral (cu eticheta fiecărui segment verificată) */
  filesChecked: number;
  photos: number;
  manifest: { createdAt?: string; photos?: number; counts?: Record<string, number> } | null;
};

function friendlyAgeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/no identity matched/i.test(msg)) return 'identitatea nu corespunde acestei copii';
  if (/invalid tag|tag/i.test(msg)) return 'conținut modificat sau trunchiat (eticheta de autentificare nu corespunde)';
  if (/header|mac|stanza|version/i.test(msg)) return 'antet age invalid sau modificat';
  return 'nu poate fi decriptat';
}

async function decryptFileTo(
  src: string,
  identity: string,
  sink: Writable,
  plainHash: Hash | null,
): Promise<string> {
  const cipher = createHash('sha256');
  const d = new Decrypter();
  d.addIdentity(identity);
  const readCipher = createReadStream(src).pipe(hashing(cipher));
  const out = await d.decrypt(toWeb(readCipher));
  if (plainHash) await pipeline(fromWeb(out), hashing(plainHash), sink);
  else await pipeline(fromWeb(out), sink);
  return cipher.digest('hex');
}

const discard = () => new Writable({ write: (_c, _e, cb) => cb() });

/**
 * Verificarea completă a unei copii criptate (nivelul 2, planul §6), cu identitatea, pe calculator. Cu
 * `outDir`, fișierele în clar se scriu acolo (folosit de `decryptCopy`, într-un director temporar).
 * Nu modifică nimic în copia sursă.
 */
export async function verifyEncryptedCopy(dir: string, identity: string, outDir?: string): Promise<CopyVerification> {
  const name = basename(resolve(dir));
  const problems: string[] = [];
  const result: CopyVerification = { name, problems, filesChecked: 0, photos: 0, manifest: null };

  // 1. fișierele în clar
  let manifestBytes: Buffer;
  let markersBytes: Buffer;
  try {
    manifestBytes = readFileSync(join(dir, 'manifest.json'));
    markersBytes = readFileSync(join(dir, 'markers.json'));
  } catch {
    problems.push('Copia nu conține „manifest.json” și „markers.json”.');
    return result;
  }
  let manifest: { format?: string; name?: string; createdAt?: string; photos?: number; counts?: Record<string, number>; dbSha256?: string; markersSha256?: string; encryption?: { scheme?: string } };
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    problems.push('„manifest.json” nu poate fi citit.');
    return result;
  }
  result.manifest = { createdAt: manifest.createdAt, photos: manifest.photos, counts: manifest.counts };
  if (manifest.encryption?.scheme !== AGE_SCHEME) {
    problems.push('Copia nu este criptată în formatul age (manifestul nu declară criptarea).');
    return result;
  }
  if (!manifest.markersSha256 || sha256Hex(markersBytes) !== manifest.markersSha256) {
    problems.push('„markers.json” nu corespunde manifestului.');
  }

  // 2. binding.json.age (planul §2.3)
  let binding: Binding;
  try {
    const d = new Decrypter();
    d.addIdentity(identity);
    binding = JSON.parse(await d.decrypt(readFileSync(join(dir, BINDING_FILE)), 'text')) as Binding;
  } catch (err) {
    const why = (err as { code?: string }).code === 'ENOENT' ? 'lipsește' : friendlyAgeError(err);
    problems.push(`„${BINDING_FILE}”: ${why}.`);
    return result;
  }
  if (binding.format !== BINDING_FORMAT) problems.push(`„${BINDING_FILE}”: format necunoscut.`);
  if (binding.name !== name || manifest.name !== name) problems.push('Numele copiei nu corespunde directorului (binding, manifest).');
  if (binding.manifestSha256 !== sha256Hex(manifestBytes)) problems.push('„manifest.json” a fost modificat (nu corespunde asocierii).');
  if (binding.markersSha256 !== sha256Hex(markersBytes)) problems.push('„markers.json” a fost modificat (nu corespunde asocierii).');
  const listed = Array.isArray(binding.files) ? binding.files : [];
  const paths = listed.map((f) => f.path);
  if (new Set(paths).size !== paths.length) problems.push('Asocierea conține căi duplicate.');
  if (!paths.includes(ENCRYPTED_DB_FILE)) problems.push(`Asocierea nu conține „${ENCRYPTED_DB_FILE}”.`);
  problems.push(...encryptedStructureProblems(dir, paths));
  if (problems.length > 0) return result;

  // 3. fiecare fișier: amprenta fișierului criptat, decriptarea integrală, amprenta bazei în clar
  for (const f of listed) {
    const src = join(dir, ...f.path.split('/'));
    const isDb = f.path === ENCRYPTED_DB_FILE;
    const plainHash = isDb ? createHash('sha256') : null;
    let sink: Writable = discard();
    if (outDir) {
      const rel = isDb ? 'db.jsonl.gz' : f.path.slice(0, -AGE_SUFFIX.length);
      const dst = join(outDir, ...rel.split('/'));
      mkdirSync(dirname(dst), { recursive: true });
      sink = createWriteStream(dst, { flags: 'wx', mode: 0o600 });
    }
    try {
      const cipherSha = await decryptFileTo(src, identity, sink, plainHash);
      if (cipherSha !== f.sha256) problems.push(`${f.path}: fișierul criptat nu corespunde asocierii.`);
      if (plainHash && plainHash.digest('hex') !== manifest.dbSha256) problems.push(`${f.path}: baza decriptată nu corespunde manifestului.`);
      result.filesChecked++;
      if (!isDb) result.photos++;
    } catch (err) {
      problems.push(`${f.path}: ${friendlyAgeError(err)}.`);
    }
  }
  if (manifest.photos !== result.photos) problems.push(`Numărul fotografiilor (${result.photos}) nu corespunde manifestului (${manifest.photos}).`);
  return result;
}

/**
 * `backup:decrypt` (planul §5): verificarea completă și scrierea copiei decriptate `civic-restore-<UTC>/`
 * în `outRoot`, cu `DECRYPTED-COPY.json`. Totul se scrie întâi într-un director temporar; la orice problemă
 * temporarul se șterge (fără fișiere parțiale). Pe găzduire, copia se urcă direct în BACKUP_DIR.
 */
export async function decryptCopy(
  src: string,
  identity: string,
  outRoot: string,
  now: Date = new Date(),
): Promise<CopyVerification & { out: string | null }> {
  const outName = `${RESTORE_COPY_PREFIX}${stamp(now)}`;
  const finalDir = join(outRoot, outName);
  const tmpDir = join(outRoot, `.tmp-${outName}`);
  if (existsSync(finalDir) || existsSync(tmpDir)) throw new Error(`Există deja „${outName}” în directorul de ieșire.`);
  mkdirSync(tmpDir, { recursive: false, mode: 0o700 });
  try {
    const v = await verifyEncryptedCopy(src, identity, tmpDir);
    if (v.problems.length > 0) {
      rmSync(tmpDir, { recursive: true, force: true });
      return { ...v, out: null };
    }
    for (const f of PLAIN_COPY_FILES) writeFileSync(join(tmpDir, f), readFileSync(join(src, f)), { flag: 'wx', mode: 0o600 });
    writeFileSync(
      join(tmpDir, DECRYPTED_COPY_FILE),
      JSON.stringify({ format: DECRYPTED_COPY_FORMAT, source: v.name, decryptedAt: now.toISOString() }, null, 2) + '\n',
      { flag: 'wx', mode: 0o600 },
    );
    renameSync(tmpDir, finalDir);
    return { ...v, out: finalDir };
  } catch (err) {
    rmSync(tmpDir, { recursive: true, force: true });
    throw err;
  }
}

/** Marcajul de timp UTC dintr-un nume (`YYYYMMDDTHHMMSSmmmZ`), validat strict: o dată imposibilă → `null`. */
export function parseStampStrict(s: string): Date | null {
  if (!/^\d{8}T\d{9}Z$/.test(s)) return null;
  const d = parseStamp(s);
  return Number.isNaN(d.getTime()) || stamp(d) !== s ? null : d;
}

const BACKUP_NAME_RE = /^civic-backup-(\d{8}T\d{9}Z)$/;
type Lister = (root: string) => { files: string[]; links: string[] };

/**
 * Problemele unei copii decriptate `civic-restore-<UTC>` (lista goală = validă), verificate efectiv, nu după
 * simpla existență a marcajului (auditul checkpointului E4.11, C1.b):
 * - numele are forma `civic-restore-<UTC>`, cu o dată UTC validă;
 * - `DECRYPTED-COPY.json` există, este JSON, are formatul `civic-decrypted/1`, numește o copie `civic-backup-<UTC>`
 *   (cu dată validă) și are `decryptedAt` în ISO UTC, egal cu marcajul de timp din nume;
 * - manifestul este al copiei-sursă declarate;
 * - copia nu conține niciun fișier `.age`, iar conținutul poate fi enumerat complet.
 * Verificarea NU oferă autenticitate criptografică: oricine are acces la cont poate scrie un asemenea marcaj.
 * Ea împiedică numai confundarea unui director oarecare cu o copie produsă de `backup:decrypt`.
 */
export function decryptedCopyProblems(dir: string, list: Lister = listFiles): string[] {
  const problems: string[] = [];
  const name = basename(resolve(dir));
  const m = RESTORE_COPY_RE.exec(name);
  const nameStamp = m ? parseStampStrict(m[1]!) : null;
  if (!m) problems.push('numele nu are forma „civic-restore-<UTC>”');
  else if (!nameStamp) problems.push('marcajul de timp din nume nu este o dată UTC validă');
  let marker: unknown;
  try {
    marker = JSON.parse(readFileSync(join(dir, DECRYPTED_COPY_FILE), 'utf8'));
  } catch (err) {
    problems.push((err as { code?: string }).code === 'ENOENT' ? `lipsește „${DECRYPTED_COPY_FILE}”` : `„${DECRYPTED_COPY_FILE}” nu este un JSON valid`);
  }
  if (marker !== undefined) {
    if (marker === null || typeof marker !== 'object' || Array.isArray(marker)) {
      problems.push(`„${DECRYPTED_COPY_FILE}” nu are structura așteptată`);
    } else {
      const { format, source, decryptedAt } = marker as Record<string, unknown>;
      if (format !== DECRYPTED_COPY_FORMAT) problems.push(`„${DECRYPTED_COPY_FILE}”: format necunoscut (așteptat „${DECRYPTED_COPY_FORMAT}”)`);
      const sm = typeof source === 'string' ? BACKUP_NAME_RE.exec(source) : null;
      if (!sm || !parseStampStrict(sm[1]!)) problems.push(`„${DECRYPTED_COPY_FILE}”: sursa nu este numele unei copii „civic-backup-<UTC>”`);
      const d = typeof decryptedAt === 'string' ? new Date(decryptedAt) : null;
      if (!d || Number.isNaN(d.getTime()) || d.toISOString() !== decryptedAt) {
        problems.push(`„${DECRYPTED_COPY_FILE}”: „decryptedAt” nu este o dată ISO UTC`);
      } else if (nameStamp && stamp(d) !== m![1]) {
        problems.push(`„${DECRYPTED_COPY_FILE}”: „decryptedAt” nu corespunde marcajului de timp din nume`);
      }
      if (sm) {
        let manifestName: unknown;
        try {
          manifestName = (JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { name?: unknown }).name;
        } catch {
          manifestName = undefined;
        }
        if (manifestName !== source) problems.push('manifestul nu este al copiei-sursă declarate');
      }
    }
  }
  try {
    const { files, links } = list(dir);
    const age = [...files, ...links].filter((f) => f.endsWith(AGE_SUFFIX));
    if (age.length > 0) problems.push(`conține fișiere criptate (${age.length})`);
  } catch (err) {
    problems.push(`conținutul nu poate fi enumerat complet (${(err as { code?: string }).code ?? 'eroare'})`);
  }
  return problems;
}

/** O copie decriptată validă (vezi `decryptedCopyProblems`). */
export function isDecryptedCopy(dir: string): boolean {
  return decryptedCopyProblems(dir).length === 0;
}

/** Directorul se prezintă drept copie decriptată (după nume sau după marcaj): atunci trebuie să fie și validă. */
export function claimsDecryptedCopy(dir: string): boolean {
  return basename(resolve(dir)).startsWith(RESTORE_COPY_PREFIX) || existsSync(join(dir, DECRYPTED_COPY_FILE));
}

/**
 * Motivul pentru care o sursă de restaurare este tratată ca o copie criptată (care nu se restaurează direct)
 * sau `null`. Fără excepție (auditul checkpointului E4.11, C1 și C1.a):
 * - orice fișier `.age` în copie (baza, asocierea sau o fotografie), chiar dacă există și fișierele în clar;
 * - un manifest care declară criptarea (`encryption`), cu excepția unei copii decriptate VALIDE
 *   (`decryptedCopyProblems` fără probleme);
 * - o copie al cărei conținut NU poate fi enumerat complet (eroare la citirea unui director, sursa nu este un
 *   director etc.): fără inspecția completă, prezența unui fișier `.age` nu poate fi exclusă (refuz, nu `null`).
 * Numai citire. `list` se poate înlocui numai în teste (simularea unei erori de enumerare).
 */
export function encryptedCopyReason(dir: string, list: Lister = listFiles): string | null {
  if (!existsSync(dir)) return null; // sursa lipsă: refuzată de verificările obișnuite
  let ageFiles: string[];
  try {
    const { files, links } = list(dir);
    ageFiles = [...files, ...links].filter((f) => f.endsWith(AGE_SUFFIX));
  } catch (err) {
    return `conținutul copiei nu poate fi enumerat complet (${(err as { code?: string }).code ?? 'eroare'}), deci prezența unor fișiere criptate nu poate fi exclusă`;
  }
  if (ageFiles.length > 0) {
    return `conține fișiere criptate (${ageFiles.length}, de exemplu „${ageFiles.sort()[0]}”)`;
  }
  let declared = false;
  try {
    declared = (JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { encryption?: unknown }).encryption !== undefined;
  } catch {
    // manifest absent sau ilizibil: refuzat de verificările obișnuite
  }
  if (declared) {
    const invalid = decryptedCopyProblems(dir, list);
    if (invalid.length > 0) {
      return `manifestul declară o copie criptată, dar sursa nu este o copie decriptată validă „civic-restore-<UTC>” (${invalid.join('; ')})`;
    }
  }
  return null;
}

/**
 * Plasa de siguranță (planul §5.2): orice `civic-restore-*` din BACKUP_DIR mai vechi de 24 de ore (după
 * marcajul de timp din nume, în UTC) se șterge; un nume cu marcaj de timp invalid se tratează ca expirat (conține
 * date în clar). Rulează la fiecare `backup:db` și la pornire. O copie expirată care NU a putut fi ștearsă este o
 * NECONFORMITATE (rămâne pe găzduire cu date în clar), nu o curățare reușită: se întoarce separat, în `failed`.
 * `remove` se poate înlocui numai în teste (simularea unei ștergeri eșuate).
 */
export function purgeStaleRestoreCopies(
  backupDir: string,
  now: Date,
  remove: (path: string) => void = (path) => rmSync(path, { recursive: true, force: true }),
): { removed: string[]; failed: string[] } {
  const removed: string[] = [];
  const failed: string[] = [];
  if (!existsSync(backupDir)) return { removed, failed };
  const limit = now.getTime() - RESTORE_COPY_MAX_AGE_HOURS * 3_600_000;
  for (const entry of readdirSync(backupDir)) {
    if (!entry.startsWith(RESTORE_COPY_PREFIX)) continue;
    const m = RESTORE_COPY_RE.exec(entry);
    const at = m ? parseStampStrict(m[1]!) : null;
    if (at && at.getTime() >= limit) continue;
    const p = join(backupDir, entry);
    try {
      if (!lstatSync(p).isDirectory()) continue;
      remove(p);
      removed.push(entry);
    } catch (err) {
      failed.push(`${entry} (${(err as { code?: string }).code ?? 'eroare'})`);
    }
  }
  return { removed, failed };
}

/**
 * Identitatea, din fișierul ei criptat cu fraza-parolă (planul §4.2: `age-keygen | age -p`). Un fișier de
 * identitate necriptat este refuzat: identitatea nu se păstrează în clar. Întoarce identitatea numai în
 * memorie; nu se scrie și nu se afișează niciodată.
 */
export async function readIdentityFile(path: string, passphrase: string): Promise<string> {
  const bytes = readFileSync(path);
  const head = bytes.subarray(0, 64).toString('latin1');
  if (/AGE-SECRET-KEY-/.test(bytes.toString('latin1')) || head.startsWith('# created')) {
    throw new Error('Fișierul de identitate este necriptat. Identitatea se păstrează numai criptată cu fraza-parolă (age -p).');
  }
  let input: Uint8Array;
  if (head.startsWith('age-encryption.org/v1')) input = bytes;
  else if (head.startsWith('-----BEGIN AGE ENCRYPTED FILE-----')) input = armor.decode(bytes.toString('utf8'));
  else throw new Error('Fișierul de identitate nu este în formatul age.');
  const d = new Decrypter();
  d.addPassphrase(passphrase);
  let text: string;
  try {
    text = await d.decrypt(input, 'text');
  } catch {
    throw new Error('Fraza-parolă este greșită sau fișierul de identitate este deteriorat.');
  }
  const keys = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('AGE-SECRET-KEY-'));
  if (keys.length !== 1 || !keys[0]!.startsWith('AGE-SECRET-KEY-1')) {
    throw new Error('Fișierul de identitate trebuie să conțină exact o identitate age X25519.');
  }
  return keys[0]!;
}

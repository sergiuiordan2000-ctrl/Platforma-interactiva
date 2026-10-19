// Contorul TM (D25–D26 și decizia proprietarului din 11.10.2026: un număr TM-XXX nu se refolosește
// NICIODATĂ, chiar dacă asta lasă goluri în numerotare după o eroare, o cădere sau o restaurare).
//
// Singurul loc din aplicație care emite un număr TM. Depunerea și datele demo trec amândouă pe aici,
// ca marcajul de lângă backup-uri (`markers.ts`) să nu poată fi ocolit de o cale nouă.
//
// Regula unică, aplicată la emitere, la pornire, la backup și la restaurare:
//
//     numărul rezervat cel mai mare = max(contorul din baza de date, marcajul durabil)
//
// - emiterea dă `max + 1` și îl rezervă în marcaj ÎNAINTE de COMMIT. Un număr ajuns în marcaj nu mai
//   este emis niciodată, nici dacă tranzacția lui a fost anulată sau procesul a căzut: următoarea
//   emitere pornește de la marcaj, deci numărul acela rămâne un gol în numerotare;
// - sincronizarea (pornire, backup) aduce ambele valori la maxim: ridică marcajul la contor ȘI
//   contorul din bază la marcaj. Contorul din bază nu rămâne sub cel mai mare număr rezervat;
// - restaurarea pornește contorul de la maximul dintre copie și marcaj (`backup.ts`).
//
// Concurența: toate citirile și scrierile marcajului se fac cu rândul `report_counter` blocat
// (SELECT … FOR UPDATE), adică pe rând, inclusiv între procese diferite. Două emiteri nu pot citi
// același maxim.
//
// Marcajul pierdut (A1, decizia proprietarului din 11.10.2026): marcajul contorului se creează automat
// NUMAI la prima inițializare, când lipsesc și el, și `deletions/`. Dacă `deletions/` există, iar
// marcajul contorului lipsește, pornirea, backup-ul și emiterea refuză; marcajul se reface numai explicit,
// cu `markers:rebuild-counter` (`rebuildReportCounterWatermark`). La emitere, marcajul lipsă oprește
// emiterea în orice situație.
//
// Setul de marcaje lipsă complet (decizia din 12.10.2026, varianta B): inițializarea automată este permisă
// numai pe o bază nouă (contorul 0, nicio sesizare). Altfel pornirea, backup-ul și `seed:demo` refuză, iar
// marcajele se creează numai cu `markers:rebuild-counter` (la prima instalare peste o bază cu date, la fel).

import type mysql from 'mysql2/promise';
import {
  MarkerError,
  REBUILD_COUNTER_COMMAND,
  assertCounterWatermarkCoherent,
  assertAccountMarkersNotLost,
  initMarkerDirs,
  prepareBackupDir,
  readReportCounterWatermark,
  readRequiredCounterWatermark,
  recordReportCounter,
} from './markers.ts';

type Conn = mysql.PoolConnection | mysql.Connection;

/**
 * Emite următorul număr, în tranzacția apelantului (care face COMMIT sau ROLLBACK).
 *
 * Ordinea: blocarea rândului contorului → `max(contor, marcaj) + 1` → scrierea durabilă a marcajului →
 * (apelantul: inserări, COMMIT). Dacă marcajul nu poate fi citit sau scris, funcția aruncă, apelantul
 * anulează tranzacția și nu se emite nimic. Dacă tranzacția este anulată DUPĂ scrierea marcajului,
 * numărul rămâne rezervat și nu mai este emis (gol acceptat).
 *
 * `backupDir` lipsește numai în dezvoltare (pe staging și în producție, configurarea îl cere); fără
 * el nu există rezervare durabilă, iar o tranzacție anulată nu consumă numărul.
 */
export async function allocateReportNumber(conn: Conn, backupDir: string | undefined): Promise<number> {
  const [rows] = await conn.query('SELECT `last_value` AS v FROM report_counter WHERE id = 1 FOR UPDATE');
  const counter = Number((rows as Array<{ v: number }>)[0]!.v);
  // A1: după inițializare marcajul trebuie să existe; absent sau corupt → MarkerError, nu se emite nimic
  const reserved = backupDir ? readRequiredCounterWatermark(backupDir) : 0;
  const next = Math.max(counter, reserved) + 1;
  await conn.query('UPDATE report_counter SET `last_value` = ? WHERE id = 1', [next]);
  if (backupDir) recordReportCounter(backupDir, next);
  return next;
}

export type CounterSync = {
  /** contorul din baza de date după sincronizare; `null` dacă rândul nu există încă (înainte de `seed:config`) */
  counter: number | null;
  /** marcajul după sincronizare */
  watermark: number | null;
  /** contorul găsit în bază, când a fost sub marcaj și a fost ridicat; altfel `null` */
  counterRaisedFrom: number | null;
};

/**
 * Aduce contorul din bază și marcajul la aceeași valoare, maximul dintre ele, sub aceeași blocare ca
 * emiterea. Niciuna dintre valori nu coboară. Se rulează la pornirea aplicației și la fiecare backup:
 * - marcajul există și pentru numerele emise înainte de introducerea lui;
 * - un backup nu poate conține un contor peste marcaj;
 * - dacă baza a rămas în urmă (tranzacție anulată, cădere, bază readusă la o stare mai veche),
 *   contorul ei este ridicat la cel mai mare număr rezervat.
 */
export async function syncReportCounterWatermark(pool: mysql.Pool, backupDir: string): Promise<CounterSync> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT `last_value` AS v FROM report_counter WHERE id = 1 FOR UPDATE');
    const row = (rows as Array<{ v: number }>)[0];
    const reserved = readReportCounterWatermark(backupDir);
    // A1: `deletions/` fără marcajul contorului = marcaj pierdut → refuz (nu se reface din contorul bazei)
    assertCounterWatermarkCoherent(backupDir, reserved);
    if (!row) {
      // bază nouă, înainte de `seed:config`: nimic emis încă; marcajul se scrie totuși (0), ca setul de
      // marcaje să fie complet și o pornire ulterioară să nu-l ia drept pierdut
      if (reserved === null) recordReportCounter(backupDir, 0);
      await conn.commit();
      return { counter: null, watermark: reserved ?? 0, counterRaisedFrom: null };
    }
    const found = Number(row.v);
    if (reserved === null) {
      // Decizia proprietarului din 12.10.2026 (varianta B): setul de marcaje lipsește complet, dar baza are
      // deja numere emise → nu se inițializează automat din contorul bazei (care poate fi al unei baze
      // readuse la o stare mai veche). Automat numai pe o bază nouă: contorul 0 și nicio sesizare.
      const [anyReport] = await conn.query('SELECT 1 FROM reports LIMIT 1');
      if (found > 0 || (anyReport as unknown[]).length > 0) {
        throw new MarkerError(
          `Marcajele lipsesc complet din BACKUP_DIR, dar baza are deja numere TM emise (contorul ${found}). ` +
            'Nu se inițializează automat: contorul bazei poate fi al unei stări mai vechi. ' +
            `Inițializarea se face numai explicit, cu comanda „${REBUILD_COUNTER_COMMAND}” (--at-least <cel mai mare număr TM comunicat> sau --from-db).`,
        );
      }
    }
    const top = Math.max(found, reserved ?? 0);
    let counterRaisedFrom: number | null = null;
    if (top > found) {
      await conn.query('UPDATE report_counter SET `last_value` = ? WHERE id = 1', [top]);
      counterRaisedFrom = found;
    }
    recordReportCounter(backupDir, top);
    await conn.commit();
    return { counter: top, watermark: top, counterRaisedFrom };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Inițializarea marcajelor (pornire, backup, `seed:demo`, `dev:e2e-setup`), în ordinea care face
 * `deletions/` o dovadă că marcajul contorului a fost scris (A1):
 * 1. BACKUP_DIR și proba de scriere;
 * 2. sincronizarea contorului: refuz dacă `deletions/` există fără marcaj; altfel marcajul este scris;
 * 3. abia apoi `deletions/` și proba lui.
 * O cădere între pașii 2 și 3 lasă marcajul fără `deletions/`, stare acceptată: pasul 3 se reia la
 * următoarea inițializare.
 */
export async function initBackupMarkers(pool: mysql.Pool, backupDir: string): Promise<CounterSync> {
  prepareBackupDir(backupDir);
  // R18 (auditul static, 19.10.2026): pierderea directoarelor de conturi se verifică ÎNAINTEA sincronizării
  // contorului TM, ca refuzul să nu modifice nici contorul din bază, nici marcajul lui
  assertAccountMarkersNotLost(backupDir);
  const sync = await syncReportCounterWatermark(pool, backupDir);
  initMarkerDirs(backupDir);
  return sync;
}

export type CounterRebuild = {
  /** contorul găsit în bază */
  counterFound: number;
  /** cel mai mare număr TM prezent în sesizările din bază; `null` dacă nu există nicio sesizare */
  highestReportNumber: number | null;
  /** valoarea minimă cerută explicit de proprietar (`--at-least`); `null` dacă nu a fost dată */
  atLeast: number | null;
  /** valoarea scrisă în marcaj (și în contorul din bază, dacă acesta era mai mic) */
  watermark: number;
};

/**
 * `markers:rebuild-counter [--at-least N]` (A1): singura cale prin care un marcaj al contorului PIERDUT
 * este refăcut. Rulată numai explicit, de proprietar, după ce a stabilit ce numere au fost comunicate.
 *
 * Valoarea scrisă = maximul dintre contorul din bază, cel mai mare număr TM din sesizările din bază și
 * `atLeast`. Dacă baza a fost readusă dintr-o copie, numerele emise după copie NU se văd în bază:
 * de aceea `atLeast` (de exemplu, ultimul număr TM comunicat) este singura informație care le acoperă.
 *
 * Refuză dacă marcajul există deja (nu este nimic de refăcut) sau este corupt (fișierul se cercetează
 * întâi de om). Sub aceeași blocare ca emiterea; contorul din bază este ridicat la valoare, niciodată coborât.
 */
export async function rebuildReportCounterWatermark(
  pool: mysql.Pool,
  backupDir: string,
  atLeast: number | null,
): Promise<CounterRebuild> {
  if (atLeast !== null && (!Number.isSafeInteger(atLeast) || atLeast < 0)) {
    throw new MarkerError('--at-least trebuie să fie un număr întreg pozitiv.');
  }
  prepareBackupDir(backupDir);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT `last_value` AS v FROM report_counter WHERE id = 1 FOR UPDATE');
    const row = (rows as Array<{ v: number }>)[0];
    if (!row) throw new MarkerError('Contorul TM nu există în baza de date (rulați întâi „seed:config”).');
    // corupt → MarkerError din citire; existent → nimic de refăcut
    const existing = readReportCounterWatermark(backupDir);
    if (existing !== null) {
      throw new MarkerError(`Marcajul contorului TM există deja (${existing}); nu este nimic de refăcut.`);
    }
    const [maxRows] = await conn.query(
      "SELECT MAX(CAST(SUBSTRING(reference_number, 4) AS UNSIGNED)) AS m FROM reports WHERE reference_number LIKE 'TM-%'",
    );
    const m = (maxRows as Array<{ m: number | string | null }>)[0]?.m;
    const highestReportNumber = m === null || m === undefined ? null : Number(m);
    const counterFound = Number(row.v);
    const watermark = Math.max(counterFound, highestReportNumber ?? 0, atLeast ?? 0);
    if (watermark > counterFound) {
      await conn.query('UPDATE report_counter SET `last_value` = ? WHERE id = 1', [watermark]);
    }
    recordReportCounter(backupDir, watermark);
    await conn.commit();
    initMarkerDirs(backupDir);
    return { counterFound, highestReportNumber, atLeast, watermark };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

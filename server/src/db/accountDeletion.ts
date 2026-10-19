// Ștergerea unui cont de cetățean (2.7, T-C6), folosită de ruta `DELETE /citizen/account` și de
// restaurare (R18 / D7-3, Etapa 7). Restaurarea repetă EXACT ștergerea cerută de titular, nu doar DELETE:
//
// 1. blocarea definitivă rămâne, redusă la datele minime (fără legătura cu contul, notă, autor, început);
// 2. e-mailurile de stadiu încă neplecate ale sesizărilor lui se anulează;
// 3. e-mailurile de cont (codurile, anunțul de blocare) adresate lui se șterg;
// 4. contul se șterge; sesizările lui rămân fără autor (FK `ON DELETE SET NULL`), sesiunile și codurile
//    dispar (FK `ON DELETE CASCADE`).
//
// Contul se identifică NUMAI după ID-ul intern. Adresa de e-mail citită din rândul contului servește doar
// la pasul 3 (mesajele adresate acelui cont), niciodată la alegerea contului de șters (R18, 16.10.2026).
//
// Marcajul de ștergere, în două etape (auditul D7-3, 16.10.2026):
//   a. în tranzacție, după blocarea rândului (`FOR UPDATE`) și înainte de orice modificare: INTENȚIA, scrisă
//      durabil în `account-deletions-pending/`; dacă nu poate fi scrisă, tranzacția se anulează;
//   b. după COMMIT: intenția este mutată atomic în `account-deletions/` (marcaj definitiv).
// O intenție rămasă (tranzacție anulată după scriere, oprire bruscă înainte sau după COMMIT, mutare eșuată)
// este rezolvată de `reconcileAccountDeletionIntents`, rulată la pornire și la fiecare backup.

import type mysql from 'mysql2/promise';
import { discardAccountDeletionIntent, promoteAccountDeletionIntent, readAccountDeletionIntents, recordAccountDeletionIntent } from './markers.ts';

type Conn = mysql.PoolConnection | mysql.Connection;

/** `created_at` vine ca Date (conexiunile aplicației) sau ca text UTC (conexiunea brută a restaurării). */
export const dbDate = (v: unknown): Date => (v instanceof Date ? v : new Date(`${String(v).replace(' ', 'T')}Z`));

/** Unde și cu ce dată se notează intenția (numai ruta o transmite; restaurarea nu scrie marcaje). */
export type AccountDeletionMarkerTarget = { backupDir: string; now: Date };

export type AccountDeletionGuard = {
  /**
   * R18: restaurarea șterge contul numai dacă a fost creat ÎNAINTEA ștergerii notate în marcaj. Un cont
   * creat după `deletedAt` nu poate fi contul șters (protecție față de un ID identic, oricât de improbabil).
   */
  createdBefore: Date;
};

export type AccountDeletionOutcome = 'deleted' | 'absent' | 'kept_created_after_marker';

/**
 * Partea din baza de date a ștergerii, ÎN tranzacția apelantului (care face COMMIT / ROLLBACK).
 * Cu `marker`, INTENȚIA se scrie după blocarea rândului și înainte de orice modificare; apelantul o
 * promovează (`promoteAccountDeletionIntent`) numai după COMMIT.
 */
export async function deleteCitizenAccountRows(
  conn: Conn,
  accountId: string,
  opts: { marker?: AccountDeletionMarkerTarget; guard?: AccountDeletionGuard } = {},
): Promise<AccountDeletionOutcome> {
  const [rows] = await conn.query('SELECT id, email_normalized AS email, created_at AS createdAt FROM citizen_accounts WHERE id = ? FOR UPDATE', [
    accountId,
  ]);
  const account = (rows as Array<{ id: string; email: string; createdAt: unknown }>)[0];
  if (!account) return 'absent';
  if (opts.guard && !(dbDate(account.createdAt).getTime() < opts.guard.createdBefore.getTime())) return 'kept_created_after_marker';
  if (opts.marker) recordAccountDeletionIntent(opts.marker.backupDir, account.id, opts.marker.now);
  await conn.query(
    `UPDATE citizen_blocks SET account_id = NULL, note = NULL, created_by = NULL, starts_at = NULL
     WHERE account_id = ? AND kind = 'permanent'`,
    [account.id],
  );
  await conn.query(
    `UPDATE email_outbox SET status = 'cancelled' WHERE kind = 'citizen_status_update'
       AND status IN ('queued', 'on_hold') AND report_id IN (SELECT id FROM reports WHERE author_account_id = ?)`,
    [account.id],
  );
  await conn.query(
    `DELETE FROM email_outbox WHERE report_id IS NULL AND recipient = ?
       AND kind IN ('citizen_login_code', 'citizen_account_blocked')`,
    [account.email],
  );
  await conn.query('DELETE FROM citizen_accounts WHERE id = ?', [account.id]);
  return 'deleted';
}

export type IntentReconciliation = {
  /** contul lipsește: ștergerea a fost confirmată → marcaj definitiv */
  confirmed: number;
  /** contul există, creat înaintea intenției: tranzacția nu a fost confirmată → intenția eliminată */
  discarded: number;
  /** contul există, creat DUPĂ data intenției: nu este contul vizat; intenția rămâne, cazul se raportează */
  keptCreatedAfter: number;
  /** eroare (bază, citire, mutare): intenția rămâne neschimbată, pentru o reconciliere ulterioară */
  errors: number;
  /** fișiere de intenție care nu pot fi înțelese: rămân neatinse */
  invalid: number;
};

/**
 * Reconcilierea intențiilor rămase. Idempotentă; sigură la rulări concurente și în paralel cu ștergerile.
 *
 * Pentru fiecare intenție: tranzacție proprie, citire cu blocare (`SELECT … FOR UPDATE`) a rândului
 * contului. Ștergerea blochează același rând ÎNAINTE de a scrie intenția, deci o intenție vizibilă aici
 * aparține fie unei tranzacții încheiate, fie uneia care ține încă blocarea: în al doilea caz, citirea cu
 * blocare AȘTEAPTĂ până la COMMIT / ROLLBACK și citește apoi ultima versiune confirmată (citirile cu
 * blocare din InnoDB, MySQL și MariaDB, nu folosesc instantaneul tranzacției). Decizia (mutare sau
 * eliminare) se ia și se aplică cât timp blocarea este ținută. Contul absent: blocarea pe cheia primară
 * (gap / next-key) împiedică reinserarea aceluiași ID până la sfârșitul tranzacției.
 *
 * O eroare la o intrare nu atinge intenția (nu se pierde, nu devine definitivă) și nu oprește celelalte.
 */
export async function reconcileAccountDeletionIntents(pool: mysql.Pool, backupDir: string): Promise<IntentReconciliation> {
  const out: IntentReconciliation = { confirmed: 0, discarded: 0, keptCreatedAfter: 0, errors: 0, invalid: 0 };
  const intents = readAccountDeletionIntents(backupDir);
  out.invalid = intents.invalid.length;
  for (const e of intents.entries) {
    let conn: mysql.PoolConnection | undefined;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const [rows] = await conn.query('SELECT created_at AS createdAt FROM citizen_accounts WHERE id = ? FOR UPDATE', [e.accountId]);
      const row = (rows as Array<{ createdAt: unknown }>)[0];
      // intenția poate fi rezolvată între timp de o altă reconciliere sau de rută: se recitește sub blocare
      const still = readAccountDeletionIntents(backupDir).entries.find((x) => x.accountId === e.accountId);
      if (still) {
        if (!row) {
          promoteAccountDeletionIntent(backupDir, e.accountId);
          out.confirmed++;
        } else if (dbDate(row.createdAt).getTime() < Date.parse(still.deletedAt)) {
          discardAccountDeletionIntent(backupDir, e.accountId);
          out.discarded++;
        } else {
          out.keptCreatedAfter++;
        }
      }
      await conn.commit();
    } catch {
      out.errors++;
      await conn?.rollback().catch(() => {});
    } finally {
      conn?.release();
    }
  }
  return out;
}

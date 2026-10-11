// Ștergerea definitivă a sesizărilor (B1 §3.8), folosită de restaurare (5.1.8) și, din 5.4,
// de ștergerea de către autor / super_admin și de purge:retention.
//
// O singură tranzacție: jurnalul e-mail (A05-4), rândurile audit_log ale sesizării (B-7, T-C3),
// sesizarea (fotografiile, notele, responsabilii prin CASCADE). Fără rând nou în audit_log.
// report_counter NU se atinge (D25–D26). Fișierele foto se șterg după COMMIT.
//
// Marcajul de ștergere (R1, Faza 6): la ștergerea cerută de autor / super_admin, ID-ul intern se
// notează lângă backup-uri ÎNAINTE de COMMIT (`markers.ts`), ca o restaurare să nu readucă sesizarea.
// Dacă marcajul nu poate fi scris, tranzacția se anulează și sesizarea rămâne. Retenția și
// restaurarea nu scriu marcaje (restaurarea aplică oricum retenția).

import { rm } from 'node:fs/promises';
import type mysql from 'mysql2/promise';
import { storagePath } from '../storage.ts';
import { recordReportDeletions } from './markers.ts';

export type DeletedReports = { reportIds: string[]; photoKeys: string[] };

/** Unde și cu ce dată se notează ștergerea (numai rutele de ștergere îl transmit). */
export type DeletionMarkerTarget = { backupDir: string; now: Date };

type Queryable = mysql.Pool | mysql.PoolConnection | mysql.Connection;

/** `created_at` vine ca Date (conexiunile aplicației) sau ca text UTC (conexiunea brută a restaurării). */
const asDate = (v: unknown): Date => (v instanceof Date ? v : new Date(`${String(v).replace(' ', 'T')}Z`));

/**
 * Partea din baza de date a ștergerii, ÎN tranzacția apelantului (care face COMMIT / ROLLBACK).
 * Nu atinge fișierele. Cu `marker`, intrarea se scrie după blocarea rândurilor și înainte de DELETE.
 */
export async function deleteReportRows(
  conn: mysql.PoolConnection | mysql.Connection,
  reportIds: string[],
  marker?: DeletionMarkerTarget,
): Promise<DeletedReports> {
  if (reportIds.length === 0) return { reportIds: [], photoKeys: [] };
  const [rows] = await conn.query('SELECT id, created_at AS createdAt FROM reports WHERE id IN (?) FOR UPDATE', [reportIds]);
  const found = rows as Array<{ id: string; createdAt: unknown }>;
  const existing = found.map((r) => r.id);
  let photoKeys: string[] = [];
  if (existing.length > 0) {
    const [photos] = await conn.query('SELECT storage_key AS k FROM report_photos WHERE report_id IN (?)', [existing]);
    photoKeys = (photos as Array<{ k: string }>).map((p) => p.k);
    if (marker) {
      recordReportDeletions(marker.backupDir, found.map((r) => ({ id: r.id, createdAt: asDate(r.createdAt) })), marker.now);
    }
    await conn.query('DELETE FROM email_outbox WHERE report_id IN (?)', [existing]);
    await conn.query("DELETE FROM audit_log WHERE target_type = 'report' AND target_id IN (?)", [existing]);
    await conn.query('DELETE FROM reports WHERE id IN (?)', [existing]);
  }
  return { reportIds: existing, photoKeys };
}

export async function deleteReportsHard(
  pool: mysql.Pool,
  reportIds: string[],
  storageDir: string,
  marker?: DeletionMarkerTarget,
): Promise<DeletedReports> {
  if (reportIds.length === 0) return { reportIds: [], photoKeys: [] };
  const conn = await pool.getConnection();
  let res: DeletedReports;
  try {
    await conn.beginTransaction();
    res = await deleteReportRows(conn, reportIds, marker);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  // după COMMIT; un eșec aici lasă fișiere orfane, curățate ulterior (purge:orphan-files, 5.4)
  for (const key of res.photoKeys) {
    await rm(storagePath(storageDir, key), { force: true });
  }
  return res;
}

/** Sesizările cu data depunerii mai veche decât `days` zile față de `now` (retenția, K-A02-3). */
export async function expiredReportIds(pool: Queryable, days: number, now: Date): Promise<string[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000);
  const [rows] = await pool.query('SELECT id FROM reports WHERE created_at < ?', [cutoff]);
  return (rows as Array<{ id: string }>).map((r) => r.id);
}

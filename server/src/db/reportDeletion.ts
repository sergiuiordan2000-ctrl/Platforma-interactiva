// Ștergerea definitivă a sesizărilor (B1 §3.8), folosită de restaurare (5.1.8) și, din 5.4,
// de ștergerea de către autor / super_admin și de purge:retention.
//
// O singură tranzacție: jurnalul e-mail (A05-4), rândurile audit_log ale sesizării (B-7, T-C3),
// sesizarea (fotografiile, notele, responsabilii prin CASCADE). Fără rând nou în audit_log.
// report_counter NU se atinge (D25–D26). Fișierele foto se șterg după COMMIT.

import { rm } from 'node:fs/promises';
import type mysql from 'mysql2/promise';
import { storagePath } from '../storage.ts';

export type DeletedReports = { reportIds: string[]; photoKeys: string[] };

export async function deleteReportsHard(
  pool: mysql.Pool,
  reportIds: string[],
  storageDir: string,
): Promise<DeletedReports> {
  if (reportIds.length === 0) return { reportIds: [], photoKeys: [] };
  const conn = await pool.getConnection();
  let existing: string[] = [];
  let photoKeys: string[] = [];
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT id FROM reports WHERE id IN (?) FOR UPDATE', [reportIds]);
    existing = (rows as Array<{ id: string }>).map((r) => r.id);
    if (existing.length > 0) {
      const [photos] = await conn.query('SELECT storage_key AS k FROM report_photos WHERE report_id IN (?)', [existing]);
      photoKeys = (photos as Array<{ k: string }>).map((p) => p.k);
      await conn.query('DELETE FROM email_outbox WHERE report_id IN (?)', [existing]);
      await conn.query("DELETE FROM audit_log WHERE target_type = 'report' AND target_id IN (?)", [existing]);
      await conn.query('DELETE FROM reports WHERE id IN (?)', [existing]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  // după COMMIT; un eșec aici lasă fișiere orfane, curățate ulterior (purge:orphan-files, 5.4)
  for (const key of photoKeys) {
    await rm(storagePath(storageDir, key), { force: true });
  }
  return { reportIds: existing, photoKeys };
}

/** Sesizările cu data depunerii mai veche decât `days` zile față de `now` (retenția, K-A02-3). */
export async function expiredReportIds(pool: mysql.Pool, days: number, now: Date): Promise<string[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000);
  const [rows] = await pool.query('SELECT id FROM reports WHERE created_at < ?', [cutoff]);
  return (rows as Array<{ id: string }>).map((r) => r.id);
}

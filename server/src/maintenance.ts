// Operațiile periodice legate de sesizări (B2 §2), rulate prin CLI / cron:
// - retenția (K-A02-3, B1 §3.9): sesizările și toate datele lor la RETENTION_DAYS (45) de la depunere;
//   auditul administrativ la 6 luni (A04-4); blocările temporare expirate (rândul se șterge, informația
//   rămâne în audit, actor `system`, T-E1). Textele libere ale sondajelor: la 5.6.
// - fișierele temporare orfane ale fotografiilor (> 1 h, B5 §1);
// - provocările proof-of-work expirate.

import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { AppContext } from './context.ts';
import { writeAudit } from './audit.ts';
import { deleteReportsHard, expiredReportIds } from './db/reportDeletion.ts';

export interface RetentionResult {
  reports: number;
  photoFiles: number;
  adminAudit: number;
  expiredBlocks: number;
  tmpFiles: number;
}

export async function purgeRetention(ctx: AppContext): Promise<RetentionResult> {
  const now = ctx.now();
  // 1. sesizările (K-A02-3): odată cu ele, fotografiile, notele, responsabilii, jurnalul e-mail și auditul lor
  const ids = await expiredReportIds(ctx.pool, ctx.config.retentionDays, now);
  let photoFiles = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const res = await deleteReportsHard(ctx.pool, ids.slice(i, i + 200), ctx.config.storageDir);
    photoFiles += res.photoKeys.length;
  }
  // 2. blocările temporare expirate: întâi rândul de audit (actor system), apoi ștergerea rândului
  const [blocks] = await ctx.pool.query(
    "SELECT id, account_id FROM citizen_blocks WHERE kind = 'temporary' AND ends_at <= ?",
    [now],
  );
  for (const b of blocks as Array<{ id: string; account_id: string | null }>) {
    await writeAudit(ctx.pool, now, {
      actorType: 'system', action: 'citizen.block.expire', targetType: 'citizen', targetId: b.account_id,
      details: { kind: 'temporary', blockId: b.id },
    });
    await ctx.pool.query('DELETE FROM citizen_blocks WHERE id = ?', [b.id]);
  }
  // 3. auditul administrativ (A04-4): 6 luni (ADMIN_RETENTION_MONTHS)
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - ctx.config.adminRetentionMonths);
  const [audit] = await ctx.pool.query('DELETE FROM audit_log WHERE occurred_at < ?', [cutoff]);
  // 4. fișierele temporare orfane
  const tmpFiles = await purgeTmpFiles(ctx);
  return {
    reports: ids.length,
    photoFiles,
    adminAudit: (audit as { affectedRows: number }).affectedRows,
    expiredBlocks: (blocks as unknown[]).length,
    tmpFiles,
  };
}

/** B5 §1: `STORAGE_DIR/tmp`, fișiere mai vechi de o oră. */
export async function purgeTmpFiles(ctx: AppContext, maxAgeMs = 3_600_000): Promise<number> {
  const dir = join(ctx.config.storageDir, 'tmp');
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return 0;
  }
  let removed = 0;
  const limit = ctx.now().getTime() - maxAgeMs;
  for (const n of names) {
    const p = join(dir, n);
    try {
      if ((await stat(p)).mtimeMs < limit) {
        await rm(p, { force: true });
        removed += 1;
      }
    } catch {
      // dispărut între timp
    }
  }
  return removed;
}

export async function purgePow(ctx: AppContext): Promise<number> {
  const [res] = await ctx.pool.query('DELETE FROM used_pow_challenges WHERE expires_at < ?', [ctx.now()]);
  return (res as { affectedRows: number }).affectedRows;
}

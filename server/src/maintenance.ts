// Operațiile periodice legate de sesizări (B2 §2), rulate prin CLI / cron:
// - retenția (K-A02-3, B1 §3.9): sesizările și toate datele lor la RETENTION_DAYS (45) de la depunere;
//   auditul administrativ la 6 luni (A04-4); blocările temporare expirate (rândul se șterge, informația
//   rămâne în audit, actor `system`, T-E1); 5.6: textele libere ale sondajelor la 6 luni de la închidere (T-7).
// - fișierele temporare orfane ale fotografiilor (> 1 h, B5 §1);
// - 5.5a: e-mailurile fără sesizare (codurile de cont) la 45 de zile (B6 §6, N3-8);
// - provocările proof-of-work expirate (R9, 7A: și în `purge:retention`, nu numai prin `purge:pow`);
// - R7 (7A): `rate_limits` expirate (≤ 48 h, N4-4), codurile de cetățean expirate (B1 §3.9), `rejected_attempts`
//   după 30 de zile (N4-8), sesiunile la 6 luni după expirare sau revocare (A05-1);
// - amendamentul Google: încercările OAuth expirate (`citizen_oauth_attempts`).

import { readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { LIMITS, type AppContext } from './context.ts';
import { writeAudit } from './audit.ts';
import { deleteReportsHard, expiredReportIds } from './db/reportDeletion.ts';
import { purgeSurveyFreeTexts } from './surveys.ts';

export interface RetentionResult {
  reports: number;
  photoFiles: number;
  adminAudit: number;
  expiredBlocks: number;
  tmpFiles: number;
  /** 5.5a (B6 §6, N3-8): e-mailurile fără sesizare (codurile de cont), corp și metadate, la RETENTION_DAYS. */
  accountEmails: number;
  /** 5.6 (A05-2, A06-1, T-7): răspunsurile libere golite la 6 luni de la închiderea sondajului. */
  surveyFreeTexts: number;
  /** Amendamentul Google (§8 D, §11.3): încercările OAuth expirate (folosite sau nu). */
  oauthAttempts: number;
  /** R7 (7A): rândurile `rate_limits` expirate. */
  rateLimits: number;
  /** R7 (7A): codurile de cetățean expirate (folosite sau nu). */
  citizenCodes: number;
  /** R7 (7A): orele din `rejected_attempts` mai vechi de 30 de zile. */
  rejectedAttempts: number;
  /** R7 (7A): sesiunile expirate sau revocate de peste 6 luni. */
  sessions: number;
  /** R9 (7A): provocările proof-of-work expirate. */
  powChallenges: number;
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
  // 5. e-mailurile fără sesizare (B6 §6, N3-8): rândul întreg, la RETENTION_DAYS (45) de la creare;
  //    cele legate de o sesizare dispar odată cu ea (pasul 1, A05-4)
  const mailCutoff = new Date(now.getTime() - ctx.config.retentionDays * 86_400_000);
  const [mails] = await ctx.pool.query('DELETE FROM email_outbox WHERE report_id IS NULL AND created_at < ?', [mailCutoff]);
  // 6. textele libere ale sondajelor (T-7): text_value = NULL; numărul răspunsurilor rămâne
  const surveyFreeTexts = await purgeSurveyFreeTexts(ctx);
  // 7. amendamentul Google: încercările OAuth expirate (10 minute de la pornire), folosite sau nu
  const [oauth] = await ctx.pool.query('DELETE FROM citizen_oauth_attempts WHERE expires_at < ?', [now]);
  // 8. R7 (7A): `rate_limits` expirate. Cea mai lungă fereastră are 24 h, iar curățarea rulează zilnic → ≤ 48 h (N4-4).
  //    Limitele încă în vigoare (de exemplu cele zilnice, gălețile TOTP din fereastra mobilă) nu sunt expirate.
  const [rl] = await ctx.pool.query('DELETE FROM rate_limits WHERE expires_at < ?', [now]);
  // 9. R7: codurile de cetățean expirate, folosite sau nu (B1 §3.9); un cod încă valabil nu se atinge
  const [codes] = await ctx.pool.query('DELETE FROM citizen_login_codes WHERE expires_at < ?', [now]);
  // 10. R7: jurnalul agregat al respingerilor, 30 de zile (N4-8); `hour` mai vechi strict decât pragul
  const rejCutoff = new Date(now.getTime() - LIMITS.rejectedAttemptsRetentionDays * 86_400_000);
  const [rej] = await ctx.pool.query('DELETE FROM rejected_attempts WHERE hour < ?', [rejCutoff]);
  // 11. R7: sesiunile la 6 luni după sfârșitul lor (A05-1). Sfârșitul = cel mai devreme dintre revocare, expirarea
  //     la inactivitate și expirarea absolută. Sesiunile de cetățean au ambele expirări la CITIZEN_NO_EXPIRY, deci
  //     pentru ele sfârșitul este numai revocarea: cele nerevocate nu se șterg (varianta B; decizia din 15.10.2026, A).
  //     Pragul este strict: o sesiune terminată exact acum 6 luni rămâne până la curățarea următoare.
  //     Cele 6 luni sunt calendaristice, cu ziua limitată la ultima zi a lunii-țintă (`monthsBeforeClamped`).
  const sessCutoff = monthsBeforeClamped(now, LIMITS.sessionRetentionMonths);
  const [sess] = await ctx.pool.query(
    `DELETE FROM sessions
      WHERE LEAST(COALESCE(revoked_at, idle_expires_at), idle_expires_at, absolute_expires_at) < ?`,
    [sessCutoff],
  );
  // 12. R9 (7A): provocările proof-of-work expirate; cele încă valabile rămân și blochează reluarea
  const powChallenges = await purgePow(ctx);
  return {
    reports: ids.length,
    photoFiles,
    adminAudit: (audit as { affectedRows: number }).affectedRows,
    expiredBlocks: (blocks as unknown[]).length,
    tmpFiles,
    accountEmails: (mails as { affectedRows: number }).affectedRows,
    surveyFreeTexts,
    oauthAttempts: (oauth as { affectedRows: number }).affectedRows,
    rateLimits: (rl as { affectedRows: number }).affectedRows,
    citizenCodes: (codes as { affectedRows: number }).affectedRows,
    rejectedAttempts: (rej as { affectedRows: number }).affectedRows,
    sessions: (sess as { affectedRows: number }).affectedRows,
    powChallenges,
  };
}

/**
 * R7 (7A, decizia proprietarului din 15.10.2026): aceeași dată și oră (UTC), cu `months` luni calendaristice în urmă;
 * dacă ziua nu există în luna-țintă, se ia ultima zi a acelei luni (31.08 − 6 luni = 28.02, sau 29.02 în an bisect).
 * `setUTCMonth` singur ar sări în luna următoare (31.08 − 6 luni → 03.03), deci un prag mai târziu și o ștergere
 * cu până la 3 zile înainte de împlinirea termenului. Cu limitarea, ștergerea nu vine niciodată mai devreme.
 */
export function monthsBeforeClamped(d: Date, months: number): Date {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() - months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year, month, Math.min(d.getUTCDate(), lastDay),
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds(),
  ));
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

// R20 (Etapa 7, 7A; decizia proprietarului D7-4 = B, 19.10.2026): recuperarea după restaurarea ÎNTREGULUI cont de
// găzduire de către furnizor („numai arhiva”, FAZA_5_1_BACKUP_RESTAURARE.md §8).
//
// O asemenea restaurare readuce simultan, la aceeași stare veche, baza, fișierele și BACKUP_DIR (inclusiv marcajele):
// `restore:db` nu intervine, deci R19 nu se aplică, iar contorul și marcajul TM sunt amândouă vechi. Comanda
// `host-restore:recover --at-least N`, rulată cu aplicația oprită și cronurile dezactivate:
//   1. verifică totul înaintea oricărei scrieri (N valid; marcajul contorului lizibil și prezent; directoarele R18
//      nepierdute; intențiile R18 lizibile);
//   2. ridică contorul TM (bază + marcaj) la max(bază, marcaj, N), marcajul scris înainte de COMMIT, ca la emitere:
//      numerele comunicate după copie nu se mai emit;
//   3. aplică R19 pe baza vie (aceeași funcție ca `restore:db`): nimic nu se retrimite automat;
//   4. reconciliază intențiile R18 față de baza restaurată;
//   5. aplică retenția (aceeași operație ca `purge:retention`).
// Cu `check`: numai citiri. O a doua rulare nu schimbă nimic. Limitele rămase (ștergerile de sesizări și de conturi
// de după copie nu pot fi cunoscute): documentate în §8.

import type mysql from 'mysql2/promise';
import type { AppContext } from '../context.ts';
import { writeAudit } from '../audit.ts';
import { purgeRetention, type RetentionResult } from '../maintenance.ts';
import { reconcileAccountDeletionIntents, type IntentReconciliation } from './accountDeletion.ts';
import { holdOutboxAfterRollback, type HeldEmail } from './backup.ts';
import {
  ACCOUNT_DELETIONS_PENDING_DIR,
  MarkerError,
  REBUILD_COUNTER_COMMAND,
  assertAccountMarkersNotLost,
  readAccountDeletionIntents,
  readReportCounterWatermark,
} from './markers.ts';
import { raiseReportCounterAtLeast } from './reportCounter.ts';

export const HOST_RESTORE_COMMAND = 'host-restore:recover';

export type HostRecoveryResult = {
  checkOnly: boolean;
  counterBefore: number;
  watermarkBefore: number;
  atLeast: number;
  /** contorul (și marcajul) după recuperare; la `check`: valoarea care ar fi scrisă */
  counterAfter: number;
  emailsCancelled: number;
  emailsHeld: HeldEmail[];
  /** `null` la `check` (nu se rulează) */
  intents: IntentReconciliation | null;
  retention: RetentionResult | null;
};

/** Verificările dinaintea oricărei scrieri. Aruncă `MarkerError` cu un mesaj explicit. */
function preflight(backupDir: string, atLeast: number): number {
  if (!Number.isSafeInteger(atLeast) || atLeast < 0) {
    throw new MarkerError('--at-least trebuie să fie un număr întreg pozitiv: cel mai mare număr TM comunicat vreodată.');
  }
  const watermark = readReportCounterWatermark(backupDir); // corupt → MarkerError
  if (watermark === null) {
    throw new MarkerError(
      `Marcajul contorului TM lipsește din BACKUP_DIR. Refaceți-l întâi cu „${REBUILD_COUNTER_COMMAND} --at-least ${atLeast}”, apoi repetați comanda.`,
    );
  }
  assertAccountMarkersNotLost(backupDir);
  const unreadable = readAccountDeletionIntents(backupDir).invalid.length;
  if (unreadable > 0) {
    throw new MarkerError(`${unreadable} intenții de ștergere a conturilor ilizibile în „${ACCOUNT_DELETIONS_PENDING_DIR}/”. Cercetați fișierele, apoi repetați comanda.`);
  }
  return watermark;
}

export async function recoverAfterHostRestore(
  ctx: AppContext,
  opts: { backupDir: string; atLeast: number; check: boolean },
): Promise<HostRecoveryResult> {
  const now = ctx.now();
  const watermarkBefore = preflight(opts.backupDir, opts.atLeast);
  const conn = await ctx.pool.getConnection();
  let result: HostRecoveryResult;
  try {
    await conn.beginTransaction();
    // contorul și marcajul: max(bază, marcaj, N), marcajul înainte de COMMIT; nu coboară niciodată
    const { counterBefore, counterAfter } = await raiseReportCounterAtLeast(conn, opts.backupDir, opts.atLeast, watermarkBefore, { dryRun: opts.check });
    const { emailsCancelled, emailsHeld } = await holdOutboxAfterRollback(conn as unknown as mysql.PoolConnection, now, { dryRun: opts.check });
    if (opts.check) {
      await conn.rollback();
    } else {
      await writeAudit(conn, now, {
        actorType: 'system',
        action: 'host_restore.recovered',
        details: { counterBefore, watermarkBefore, atLeast: opts.atLeast, counterAfter, emailsHeld: emailsHeld.length, emailsCancelled },
      });
      await conn.commit();
    }
    result = { checkOnly: opts.check, counterBefore, watermarkBefore, atLeast: opts.atLeast, counterAfter, emailsCancelled, emailsHeld, intents: null, retention: null };
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
  if (!opts.check) {
    result.intents = await reconcileAccountDeletionIntents(ctx.pool, opts.backupDir);
    result.retention = await purgeRetention(ctx);
  }
  return result;
}

/** Raportul comenzii: numai numere și numere TM (fără adrese, fără ID-uri de cont). */
export function formatHostRecovery(r: HostRecoveryResult): string[] {
  const p = HOST_RESTORE_COMMAND;
  const lines = [
    r.checkOnly ? `${p} --check: numai verificare, nu se scrie nimic.` : `${p}: recuperarea după restaurarea contului a fost aplicată.`,
    `${p}: contorul TM în bază ${r.counterBefore}, marcajul ${r.watermarkBefore}, --at-least ${r.atLeast} → ${r.checkOnly ? 'ar deveni' : 'acum'} ${r.counterAfter}; următorul număr emis: TM-${String(r.counterAfter + 1).padStart(3, '0')}.`,
    `${p}: e-mailuri de cont neplecate ${r.checkOnly ? 'de anulat' : 'anulate'}: ${r.emailsCancelled}`,
    `${p}: mesaje ale sesizărilor ${r.checkOnly ? 'de reținut' : 'reținute'} (stare „failed”): ${r.emailsHeld.length}`,
  ];
  for (const m of r.emailsHeld) lines.push(`  ${m.referenceNumber}  ${m.kind}  stare: ${m.previousStatus}  creat: ${m.createdAt}  mesaj: ${m.emailId}`);
  if (r.emailsHeld.length > 0) {
    lines.push(
      `${p}: ATENȚIE — starea restaurată NU arată dacă aceste mesaje au plecat. Nimic nu se retrimite automat. Reîncercarea din Admin ` +
        '(super_admin) poate produce un DUPLICAT (pentru Primărie: aceeași sesizare, același număr TM). Verificați întâi dacă mesajul a ajuns.',
    );
  }
  if (r.intents) lines.push(`${p}: intenții de ștergere a conturilor reconciliate: ${JSON.stringify(r.intents)}`);
  if (r.retention) lines.push(`${p}: retenția aplicată: ${JSON.stringify(r.retention)}`);
  if (r.checkOnly) lines.push(`${p}: pentru aplicare, repetați cu --confirm (aplicația oprită, cronurile dezactivate).`);
  return lines;
}

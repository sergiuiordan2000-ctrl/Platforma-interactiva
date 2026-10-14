// Coada e-mailurilor legate de sesizări (B6): punerea în coadă în tranzacția de domeniu, procesarea
// cu lease și reîncercări, starea derivată a transmiterii (A17-7) și notificările D9.
//
// 5.4: transportul `simulated` (nicio rețea; niciodată `sent`). 5.5a: SMTP (`ctx.mailTransport`, reports/smtp.ts);
// fără el, mesajele care ar cere SMTP rămân `queued`, neatinse.
// 2.1: la trimiterea efectivă a mesajului către Primărie (`sent`), în aceeași tranzacție:
// sesizarea `new` → `in_analysis` + notificarea autorului (opt-in, 2.2).

import type mysql from 'mysql2/promise';
import type { TransmissionState } from '@tmc/shared';
import { LIMITS, type AppContext } from '../context.ts';
import { deriveKey, hmacHex, sha256Hex } from '../auth/crypto.ts';
import { newId } from '../ids.ts';
import { getRegistrySettings, type RegistrySettings } from '../settings.ts';
import { storagePath } from '../storage.ts';

type Conn = mysql.Pool | mysql.PoolConnection;

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
  attachments?: Array<{ filename: string; contentType: string; path: string }>;
}
export interface MailTransport {
  send(msg: MailMessage): Promise<{ providerMessageId: string | null }>;
}

// ——— dezabonarea (D9-2) ———

/** Jetonul de dezabonare: derivat din ID-ul sesizării (256 de biți); în DB stă numai hash-ul lui. */
export function unsubscribeToken(ctx: AppContext, reportId: string): string {
  return Buffer.from(hmacHex(deriveKey(ctx.config.secrets.totpEncKey, 'unsubscribe'), reportId), 'hex').toString('base64url');
}
export const unsubscribeTokenHash = (token: string) => sha256Hex(token);

export function unsubscribeUrl(ctx: AppContext, reportId: string): string {
  // în fragment (#): jetonul nu ajunge în jurnalele serverului sau ale proxy-ului
  return `${ctx.config.publicBaseUrl}/#dezabonare?token=${unsubscribeToken(ctx, reportId)}`;
}

// ——— șabloanele (B6 §4): text simplu; antetele numai din TM-XXX și categorie ———

const STATUS_TEXT: Record<'in_analysis' | 'resolved', string> = { in_analysis: 'în analiză', resolved: 'rezolvată' };

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Bucharest' }).format(d);

export interface RegistryReportData {
  referenceNumber: string;
  categoryName: string;
  description: string;
  locationText: string;
  lat: number | null;
  lng: number | null;
  createdAt: Date;
  authorEmail: string | null;
}

export function registryTemplate(r: RegistryReportData): { subject: string; text: string } {
  const pos =
    r.lat !== null && r.lng !== null
      ? `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}\nHartă: https://www.openstreetmap.org/?mlat=${r.lat.toFixed(6)}&mlon=${r.lng.toFixed(6)}#map=18/${r.lat.toFixed(6)}/${r.lng.toFixed(6)}`
      : 'fără poziție pe hartă';
  const text = [
    `Sesizare ${r.referenceNumber}`,
    `Categoria: ${r.categoryName}`,
    `Data depunerii: ${fmtDate(r.createdAt)}`,
    '',
    'Descrierea:',
    r.description,
    '',
    `Locația: ${r.locationText}`,
    `Coordonate: ${pos}`,
    '',
    `Contact (e-mailul contului): ${r.authorEmail ?? 'indisponibil (contul a fost șters)'}`,
    '',
    '—',
    'Mesaj transmis la cererea cetățeanului prin platforma independentă Turnu Măgurele Civic.',
    `${r.referenceNumber} este numărul intern al platformei, nu un număr de înregistrare oficial.`,
  ].join('\n');
  return { subject: `Sesizare ${r.referenceNumber} — ${r.categoryName}`, text };
}

export function statusTemplate(
  ctx: AppContext,
  reportId: string,
  referenceNumber: string,
  categoryName: string,
  status: 'in_analysis' | 'resolved',
): { subject: string; text: string; headers: Record<string, string> } {
  const link = unsubscribeUrl(ctx, reportId);
  const text = [
    `Sesizarea ${referenceNumber} (${categoryName}) are un stadiu nou: ${STATUS_TEXT[status]}.`,
    '',
    'Detaliile se văd în aplicație, în „Contul meu”.',
    '',
    `Pentru a nu mai primi notificări despre această sesizare: ${link}`,
  ].join('\n');
  return {
    subject: `Sesizarea ${referenceNumber} — ${categoryName}: ${STATUS_TEXT[status]}`,
    text,
    // 5.5a (decizia din 01.10.2026): numai `List-Unsubscribe`; fără `List-Unsubscribe-Post` (dezabonarea „cu un clic”
    // ar cere un POST la adresa cu jetonul, care stă intenționat după `#` și nu ajunge la server)
    headers: { 'List-Unsubscribe': `<${link}>` },
  };
}

// ——— punerea în coadă ———

/** Fluxul către Primărie poate pleca acum? (A17-1, A17-4, E-5). Altfel rândul stă `on_hold` (2.13). */
export function registryReady(ctx: AppContext, s: RegistrySettings): boolean {
  if (!s.flowEnabled || !s.recipientEmail) return false;
  if (ctx.config.email.mode === 'live' && !s.agreementReference) return false;
  return true;
}

/** Rândul `registry_notification` (pct. 7): numai la cererea cetățeanului; în tranzacția depunerii. */
export async function enqueueRegistry(
  ctx: AppContext,
  conn: Conn,
  reportId: string,
  data: RegistryReportData,
  photoIds: string[],
): Promise<string> {
  const s = await getRegistrySettings(conn);
  const tpl = registryTemplate(data);
  const id = newId(ctx.now());
  await conn.query(
    `INSERT INTO email_outbox (id, kind, report_id, dedupe_key, recipient, subject, body_text, attachment_photo_ids,
       status, attempts, mode_at_send, created_at)
     VALUES (?, 'registry_notification', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, reportId, `registry:${reportId}`, s.recipientEmail ?? '', tpl.subject, tpl.text, JSON.stringify(photoIds),
      registryReady(ctx, s) ? 'queued' : 'on_hold', ctx.config.email.mode, ctx.now()],
  );
  return id;
}

/**
 * Notificarea de stadiu (D9, 2.2): numai `new → in_analysis` și `in_analysis → resolved`; opt-in, neabonat,
 * autorul încă are cont. Plafonul D9-4: peste 3 / sesizare / 24 h → `cancelled`, cu motiv.
 */
export async function enqueueStatusUpdate(
  ctx: AppContext,
  conn: Conn,
  reportId: string,
  status: 'in_analysis' | 'resolved',
): Promise<string | null> {
  const [rows] = await conn.query(
    `SELECT r.reference_number AS ref, r.notify_opt_in AS optIn, r.notify_unsubscribed_at AS unsub,
            c.name AS categoryName, a.email_normalized AS email
       FROM reports r JOIN report_categories c ON c.id = r.category_id
       LEFT JOIN citizen_accounts a ON a.id = r.author_account_id
      WHERE r.id = ?`,
    [reportId],
  );
  const r = (rows as Array<{ ref: string; optIn: number; unsub: Date | null; categoryName: string; email: string | null }>)[0];
  if (!r || !r.optIn || r.unsub || !r.email) return null;
  const now = ctx.now();
  const [cnt] = await conn.query(
    `SELECT COUNT(*) AS n FROM email_outbox WHERE report_id = ? AND kind = 'citizen_status_update'
       AND status <> 'cancelled' AND created_at > ?`,
    [reportId, new Date(now.getTime() - 86_400_000)],
  );
  const overCap = Number((cnt as Array<{ n: number }>)[0]!.n) >= LIMITS.citizenNotificationsPerReportPerDay;
  const tpl = statusTemplate(ctx, reportId, r.ref, r.categoryName, status);
  const id = newId(now);
  await conn.query(
    `INSERT IGNORE INTO email_outbox (id, kind, report_id, dedupe_key, recipient, subject, body_text, status, attempts,
       last_error, mode_at_send, created_at)
     VALUES (?, 'citizen_status_update', ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [id, reportId, `status:${reportId}:${status}`, r.email, tpl.subject, tpl.text,
      overCap ? 'cancelled' : 'queued', overCap ? 'plafon D9-4 depășit' : null, ctx.config.email.mode, now],
  );
  return id;
}

/** 2.13: la reactivarea fluxului, rândurile `on_hold` devin `queued` (cu destinatarul curent). */
export async function releaseOnHold(ctx: AppContext, conn: Conn): Promise<number> {
  const s = await getRegistrySettings(conn);
  if (!registryReady(ctx, s)) return 0;
  const [res] = await conn.query(
    `UPDATE email_outbox SET status = 'queued', recipient = ?, next_attempt_at = NULL
      WHERE kind = 'registry_notification' AND status = 'on_hold'`,
    [s.recipientEmail],
  );
  return (res as { affectedRows: number }).affectedRows;
}

// ——— procesarea ———

type Row = {
  id: string;
  kind: 'registry_notification' | 'citizen_status_update' | 'citizen_login_code' | 'citizen_account_blocked';
  report_id: string | null;
  recipient: string;
  subject: string;
  body_text: string | null;
  attachment_photo_ids: unknown;
  attempts: number;
};

export type ProcessOutcome = 'sent' | 'simulated' | 'blocked' | 'retry' | 'failed' | 'on_hold' | 'deferred' | 'skipped';

/** Încearcă un singur mesaj. Sigur la concurență: lease atomic (`locked_until`). */
export async function processOne(ctx: AppContext, id: string): Promise<ProcessOutcome> {
  const now = ctx.now();
  const lease = new Date(now.getTime() + LIMITS.emailLeaseMinutes * 60_000);
  const [leased] = await ctx.pool.query(
    `UPDATE email_outbox SET status = 'sending', locked_until = ?
      WHERE id = ? AND ((status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
                     OR (status = 'sending' AND locked_until < ?))`,
    [lease, id, now, now],
  );
  if ((leased as { affectedRows: number }).affectedRows !== 1) return 'skipped';
  const [rows] = await ctx.pool.query('SELECT * FROM email_outbox WHERE id = ?', [id]);
  const row = (rows as Row[])[0]!;

  const release = async (status: string, extra: Record<string, unknown> = {}) => {
    const sets = ['status = ?', 'locked_until = NULL', ...Object.keys(extra).map((k) => `${k} = ?`)];
    await ctx.pool.query(`UPDATE email_outbox SET ${sets.join(', ')} WHERE id = ?`, [status, ...Object.values(extra), id]);
  };

  let recipient = row.recipient;
  if (row.kind === 'registry_notification') {
    const s = await getRegistrySettings(ctx.pool);
    if (!registryReady(ctx, s)) {
      await release('on_hold');
      return 'on_hold';
    }
    recipient = s.recipientEmail!;
  }

  const mode = ctx.config.email.mode;
  if (mode === 'simulated') {
    await release('simulated', { recipient, transport: 'simulated', mode_at_send: mode });
    return 'simulated';
  }
  if (mode === 'allowlist' && !ctx.config.email.allowlist.includes(recipient.toLowerCase())) {
    await release('blocked', { recipient, mode_at_send: mode, last_error: 'destinatar în afara EMAIL_ALLOWLIST' });
    return 'blocked';
  }
  if (!ctx.mailTransport) {
    await release('queued'); // SMTP: 5.5
    return 'deferred';
  }

  const msg: MailMessage = { to: recipient, subject: row.subject, text: row.body_text ?? '' };
  if (row.kind === 'citizen_status_update' && row.report_id) {
    const link = unsubscribeUrl(ctx, row.report_id);
    msg.headers = { 'List-Unsubscribe': `<${link}>` };
  }
  if (row.kind === 'registry_notification' && row.report_id) {
    const ids = (typeof row.attachment_photo_ids === 'string' ? JSON.parse(row.attachment_photo_ids) : row.attachment_photo_ids) as string[] | null;
    if (ids?.length) {
      const [photos] = await ctx.pool.query(
        'SELECT id, ordinal, storage_key AS k, mime FROM report_photos WHERE report_id = ? AND id IN (?) ORDER BY ordinal',
        [row.report_id, ids],
      );
      msg.attachments = (photos as Array<{ ordinal: number; k: string; mime: string }>).map((p) => ({
        filename: `foto-${p.ordinal}.${p.mime === 'image/webp' ? 'webp' : 'jpg'}`,
        contentType: p.mime,
        path: storagePath(ctx.config.storageDir, p.k),
      }));
    }
  }

  let providerMessageId: string | null;
  try {
    ({ providerMessageId } = await ctx.mailTransport.send(msg));
  } catch (err) {
    const attempts = row.attempts + 1;
    const delays = LIMITS.emailRetryMinutes;
    const errText = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    if (attempts >= delays.length) {
      // CL-5 (K2, decizia proprietarului din 14.10.2026): ca la succes (RA-8), în `live` codul de autentificare nu
      // rămâne în clar nici după eșecul definitiv. La reîncercări (mai jos), corpul rămâne, ca mesajul să poată pleca.
      const clearCode = row.kind === 'citizen_login_code' && mode === 'live' ? { body_text: null } : {};
      await release('failed', { attempts, last_error: errText, recipient, mode_at_send: mode, transport: 'smtp', ...clearCode });
      return 'failed';
    }
    await release('queued', {
      attempts,
      last_error: errText,
      next_attempt_at: new Date(now.getTime() + delays[attempts - 1]! * 60_000),
      recipient,
      mode_at_send: mode,
      transport: 'smtp',
    });
    return 'retry';
  }

  // succes: `sent` (+ 2.1 / 2.2 pentru mesajul către Primărie), într-o singură tranzacție
  const conn = await ctx.pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE email_outbox SET status = 'sent', locked_until = NULL, sent_at = ?, provider_message_id = ?,
         recipient = ?, mode_at_send = ?, transport = 'smtp', attempts = attempts + 1 WHERE id = ?`,
      [ctx.now(), providerMessageId, recipient, mode, id],
    );
    // RA-8 (reaudit, 13.10.2026): în producție (`live`), codul de autentificare nu rămâne în clar în coadă după
    // trimitere. Pe staging (`allowlist`) și în dezvoltare textul rămâne, pentru `dev:show-code`.
    if (row.kind === 'citizen_login_code' && mode === 'live') {
      await conn.query('UPDATE email_outbox SET body_text = NULL WHERE id = ?', [id]);
    }
    if (row.kind === 'registry_notification' && row.report_id) {
      const [upd] = await conn.query(
        `UPDATE reports SET resolution_status = 'in_analysis', updated_at = ? WHERE id = ? AND resolution_status = 'new'`,
        [ctx.now(), row.report_id],
      );
      if ((upd as { affectedRows: number }).affectedRows === 1) {
        await enqueueStatusUpdate(ctx, conn, row.report_id, 'in_analysis');
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return 'sent';
}

/** Mesajele scadente (cron `outbox:process`, la 2 min; B6 §1). Codurile de cont au prioritate. */
export async function processDue(ctx: AppContext, limit = 50): Promise<Record<ProcessOutcome, number>> {
  const now = ctx.now();
  const [rows] = await ctx.pool.query(
    `SELECT id FROM email_outbox
      WHERE (status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
         OR (status = 'sending' AND locked_until < ?)
      ORDER BY kind IN ('citizen_login_code', 'citizen_account_blocked') DESC, created_at
      LIMIT ?`,
    [now, now, limit],
  );
  const out = { sent: 0, simulated: 0, blocked: 0, retry: 0, failed: 0, on_hold: 0, deferred: 0, skipped: 0 };
  for (const { id } of rows as Array<{ id: string }>) out[await processOne(ctx, id)] += 1;
  return out;
}

/** Declanșare neblocantă după COMMIT (B6 §1); eșecul nu afectează sesizarea (N3-1). */
export function kickOutbox(ctx: AppContext, ids: string[], log?: (err: unknown) => void): void {
  if (ids.length === 0) return;
  setImmediate(() => {
    void (async () => {
      for (const id of ids) {
        try {
          await processOne(ctx, id);
        } catch (err) {
          log?.(err);
        }
      }
    })();
  });
}

// ——— starea derivată (A17-7, B1 §157) ———

export function transmissionState(requested: boolean, outboxStatus: string | null): TransmissionState {
  if (!requested) return 'not_requested';
  switch (outboxStatus) {
    case 'on_hold':
      return 'on_hold';
    case 'queued':
    case 'sending':
      return 'queued';
    case 'sent':
      return 'sent';
    case 'failed':
      return 'failed';
    default:
      return 'stopped'; // simulated / blocked / cancelled (sau rând lipsă)
  }
}


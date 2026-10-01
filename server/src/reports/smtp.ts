// Transportul SMTP (5.5a, N3-2): `nodemailer` (T6), configurat numai din variabile de mediu.
// TLS obligatoriu: implicit pe 465 (`SMTP_SECURE=true`), STARTTLS cerut în rest; certificatul se verifică.
// Expeditorul: `MAIL_FROM`, pe domeniul Civic (N3-4, validat la pornire). Fără `Reply-To` (A17-6).

import nodemailer from 'nodemailer';
import type { Config } from '../config.ts';
import type { MailMessage, MailTransport } from './outbox.ts';

export interface SmtpOptions {
  /** Numai pentru teste: certificatul serverului de test (autosemnat). */
  tlsCa?: string | Buffer;
}

/** Eroarea furnizorului, scurtă și fără date de autentificare (ajunge în `email_outbox.last_error`). */
export function safeSmtpError(err: unknown, secrets: Array<string | undefined>): string {
  let text = err instanceof Error ? err.message : String(err);
  for (const s of secrets) if (s) text = text.split(s).join('***');
  return text.replace(/\s+/g, ' ').slice(0, 300);
}

export function createSmtpTransport(config: Config, opts: SmtpOptions = {}): MailTransport {
  const { smtp, mailFrom } = config.email;
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: !smtp.secure,
    auth: { user: smtp.user!, pass: smtp.pass! },
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2', ...(opts.tlsCa ? { ca: opts.tlsCa } : {}) },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    disableFileAccess: false, // atașamentele: numai căi construite de server din STORAGE_DIR
    disableUrlAccess: true,
  });
  return {
    async send(msg: MailMessage) {
      try {
        const info = await transporter.sendMail({
          from: mailFrom,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          headers: msg.headers,
          attachments: msg.attachments?.map((a) => ({ filename: a.filename, contentType: a.contentType, path: a.path })),
        });
        return { providerMessageId: info.messageId ?? null };
      } catch (err) {
        throw new Error(safeSmtpError(err, [smtp.pass, smtp.user]));
      }
    },
  };
}

/** Transportul pentru modul efectiv: niciunul în `simulated` (B6 §1: nicio rețea). */
export function mailTransportFor(config: Config): MailTransport | undefined {
  return config.email.mode === 'simulated' ? undefined : createSmtpTransport(config);
}

/** Mesajul de jurnal când modul cerut a fost înlocuit cu `simulated` (B6 §2); numai nume de variabile. */
export function emailDowngradeMessage(config: Config): string | null {
  const { requestedMode, mode, problems } = config.email;
  if (requestedMode === mode) return null;
  return `E-mail: EMAIL_MODE=${requestedMode} nu se poate folosi; se lucrează în „simulated” (nicio trimitere reală). Probleme: ${problems.join('; ')}`;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Tipuri pentru serviciul de e-mail (Etapa 5E).
 *
 * ARHITECTURĂ: transportul efectiv (SMTP, API al unui furnizor etc.) este complet
 * separat de generarea mesajului și de logica de business. Vezi `EmailTransportAdapter`.
 *
 * REGULĂ CENTRALĂ (obligatorie, Etapa 5E):
 * Starea unui e-mail NU este niciodată raportată ca „trimis" (`sent`) decât dacă
 * un transport real a confirmat efectiv transmiterea. Mediul curent nu are un
 * transport real configurat, deci starea folosită este `simulated` — niciodată `sent`.
 */

/**
 * Stadiile posibile ale unei încercări de trimitere e-mail:
 * - 'generated': mesajul a fost generat, dar procesul de transport nu s-a încheiat încă.
 * - 'simulated': transportul SIMULAT a "procesat" mesajul; NU a fost trimis niciun e-mail real.
 * - 'sent': un transport REAL a confirmat efectiv transmiterea (neutilizat momentan în acest mediu).
 * - 'failed': a apărut o eroare (configurare lipsă, eroare de generare, eroare de transport etc.).
 */
export type EmailStatus = 'generated' | 'simulated' | 'sent' | 'failed';

export type EmailKind = 'registry_notification' | 'citizen_confirmation';

/**
 * Informație minimă despre o fotografie asociată sesizării, inclusă în mesaj
 * doar ca metadată descriptivă — NU se inventează URL-uri publice.
 */
export interface EmailPhotoInfo {
  name: string;
  sizeKB: number;
  includedAsAttachment: boolean;
}

/**
 * Mesaj de e-mail generat, independent de mecanismul de transport.
 */
export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  body: string;
  photosInfo?: EmailPhotoInfo[];
  /** Atașamente reale incluse ca date base64 (disponibile deja din mecanismul existent de stocare a fotografiilor). */
  attachments?: Array<{ name: string; dataUrl: string }>;
}

/**
 * Rezultatul întors de un adaptor de transport la o încercare de trimitere.
 */
export interface EmailTransportResult {
  status: Extract<EmailStatus, 'simulated' | 'sent' | 'failed'>;
  errorMessage?: string;
}

/**
 * Interfață pentru un adaptor de transport e-mail. Permite înlocuirea ulterioară
 * a mecanismului de transport (ex: un API real al unui furnizor) fără a schimba
 * logica de generare a mesajului sau integrarea în fluxul de sesizări.
 */
export interface EmailTransportAdapter {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailTransportResult>;
}

/**
 * Intrare în jurnalul minimal al transmiterilor (Etapa 5E-7).
 * NU conține niciodată parole, tokenuri sau alte secrete.
 */
export interface EmailLogEntry {
  id: string;
  reportId: string;
  referenceNumber: string;
  kind: EmailKind;
  to: string;
  subject: string;
  createdAt: string;
  status: EmailStatus;
  transportName: string;
  errorMessage?: string;
}

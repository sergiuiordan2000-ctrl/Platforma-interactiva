/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CivicReport } from '../types/report';
import {
  EmailKind,
  EmailLogEntry,
  EmailMessage,
  EmailStatus,
  EmailTransportAdapter,
  EmailTransportResult,
} from '../types/email';

const STORAGE_LOG_KEY = 'turnu_civic_email_log_store';
const MAX_LOG_ENTRIES = 500;

/**
 * Adresa de expeditor implicită folosită pentru mesajele generate de platformă.
 * Nu reprezintă o cutie poștală reală — este doar câmpul „From" al mesajului generat.
 * Nu este o credențială și nu este un secret.
 */
const DEFAULT_SENDER_ADDRESS = 'notificari@platforma-turnumagurele.ro';

/**
 * ADAPTOR DE TRANSPORT SIMULAT (Etapa 5E-2).
 *
 * Mediul curent (aplicație 100% client-side, fără backend propriu, rulată într-un
 * sandbox fără acces de rețea la un server SMTP sau la API-ul unui furnizor de
 * e-mail) NU permite trimiterea reală a e-mailurilor. Acest adaptor nu contactează
 * nicio rețea și nu pretinde niciodată că a trimis un e-mail real.
 *
 * REGULĂ OBLIGATORIE: acest transport NU întoarce niciodată starea `sent`.
 * Rezultatul este întotdeauna `simulated` (cu excepția unei erori de generare a
 * mesajului însuși, tratată separat în `EmailService`).
 *
 * Pentru a activa trimiterea reală într-un mediu viitor, se înlocuiește doar acest
 * adaptor (implementând `EmailTransportAdapter`) — restul serviciului (generarea
 * mesajului, integrarea în flux, jurnalizarea) rămâne neschimbat.
 */
class SimulatedEmailTransportAdapter implements EmailTransportAdapter {
  public readonly name = 'simulated';

  public async send(_message: EmailMessage): Promise<EmailTransportResult> {
    // Simulăm latența unei operații de rețea, fără a contacta efectiv vreun server.
    await new Promise((resolve) => setTimeout(resolve, 60));
    return { status: 'simulated' };
  }
}

/**
 * Serviciu de e-mail (Etapa 5E) — complet separat de restul aplicației.
 *
 * Responsabilități:
 * 1. Generarea mesajelor (notificare instituție + confirmare cetățean) pe baza
 *    datelor deja existente ale unei sesizări, fără a inventa informații noi.
 * 2. Delegarea trimiterii către un adaptor de transport înlocuibil.
 * 3. Jurnalizarea minimală a fiecărei încercări (Etapa 5E-7).
 * 4. Tratarea explicită a erorilor, fără `catch` gol și fără a raporta fals „trimis".
 *
 * Acest serviciu NU influențează niciodată salvarea sesizării: este apelat DUPĂ
 * persistarea reușită a sesizării în `reportService`, iar orice eroare aici este
 * complet izolată de rezultatul depunerii sesizării.
 */
class EmailService {
  private logs: EmailLogEntry[] = [];
  private transport: EmailTransportAdapter = new SimulatedEmailTransportAdapter();

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      const stored = localStorage.getItem(STORAGE_LOG_KEY);
      this.logs = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn('Eroare la încărcarea jurnalului de e-mail din storage:', err);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      // Păstrăm jurnalul limitat, ca să nu crească nelimitat în localStorage.
      const trimmed = this.logs.slice(0, MAX_LOG_ENTRIES);
      localStorage.setItem(STORAGE_LOG_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('Eroare la salvarea jurnalului de e-mail în storage:', err);
    }
  }

  // ==========================================
  // GENERAREA MESAJELOR (Etapa 5E-3)
  // ==========================================

  /**
   * Construiește textul comun cu detaliile sesizării, reutilizat în ambele mesaje.
   * Nu inventează date — folosește strict câmpurile deja existente pe `CivicReport`.
   */
  private buildReportDetailsBlock(report: CivicReport): string {
    const lines: string[] = [];
    lines.push(`Număr de referință: ${report.referenceNumber}`);
    lines.push(`Categorie: ${report.categoryName}`);
    lines.push(`Descriere: ${report.description}`);
    lines.push(`Locație: ${report.location?.addressOrDetails || 'nespecificată'}`);
    if (typeof report.location?.latitude === 'number' && typeof report.location?.longitude === 'number') {
      lines.push(`Coordonate GPS: ${report.location.latitude.toFixed(5)}, ${report.location.longitude.toFixed(5)}`);
    }
    lines.push(`Data depunerii: ${new Date(report.createdAt).toLocaleString('ro-RO')}`);

    if (report.contact?.name || report.contact?.phone || report.contact?.email) {
      lines.push('');
      lines.push('Date de contact furnizate de cetățean:');
      if (report.contact?.name) lines.push(`  Nume: ${report.contact.name}`);
      if (report.contact?.phone) lines.push(`  Telefon: ${report.contact.phone}`);
      if (report.contact?.email) lines.push(`  E-mail: ${report.contact.email}`);
    } else {
      lines.push('');
      lines.push('Sesizare depusă fără date de contact (anonim).');
    }

    if (report.photos && report.photos.length > 0) {
      lines.push('');
      lines.push(
        `Fotografii atașate sesizării: ${report.photos.length} (incluse ca atașamente în acest mesaj, unde este posibil).`
      );
    } else {
      lines.push('');
      lines.push('Fără fotografii atașate.');
    }

    return lines.join('\n');
  }

  /**
   * Pregătește metadatele + atașamentele foto pe baza mecanismului EXISTENT de
   * stocare (base64 data URL în `ReportPhoto.dataUrl`). Nu se schimbă mecanismul
   * de stocare și nu se inventează niciun URL public pentru imagini.
   */
  private buildPhotoAttachments(report: CivicReport): EmailMessage['attachments'] {
    if (!report.photos || report.photos.length === 0) return undefined;
    // Atașamentele base64 sunt disponibile direct din mecanismul existent — le folosim
    // ca atare (transportul simulat nu le transmite efectiv nicăieri, dar arhitectura
    // este pregătită pentru un transport real care acceptă atașamente base64).
    return report.photos.map((p) => ({ name: p.name, dataUrl: p.dataUrl }));
  }

  private buildRegistryNotification(report: CivicReport, registryEmail: string): EmailMessage {
    const subject = `[Sesizare Nouă ${report.referenceNumber}] ${report.categoryName}`;
    const body = [
      `O sesizare nouă a fost înregistrată pe platforma civică Turnu Măgurele.`,
      '',
      this.buildReportDetailsBlock(report),
    ].join('\n');

    return {
      to: registryEmail,
      from: DEFAULT_SENDER_ADDRESS,
      subject,
      body,
      photosInfo: (report.photos || []).map((p) => ({
        name: p.name,
        sizeKB: Math.round(p.size / 1024),
        includedAsAttachment: true,
      })),
      attachments: this.buildPhotoAttachments(report),
    };
  }

  private buildCitizenConfirmation(report: CivicReport, citizenEmail: string): EmailMessage {
    const subject = `Confirmare primire sesizare ${report.referenceNumber}`;
    const body = [
      `Sesizarea dumneavoastră a fost înregistrată cu succes pe platforma civică Turnu Măgurele.`,
      '',
      this.buildReportDetailsBlock(report),
      '',
      'Acest mesaj este o confirmare automată. Platforma este un demers civic independent și nu reprezintă registrul oficial al Primăriei Municipiului Turnu Măgurele.',
    ].join('\n');

    return {
      to: citizenEmail,
      from: DEFAULT_SENDER_ADDRESS,
      subject,
      body,
      photosInfo: (report.photos || []).map((p) => ({
        name: p.name,
        sizeKB: Math.round(p.size / 1024),
        includedAsAttachment: false,
      })),
    };
  }

  // ==========================================
  // TRANSMITERE + JURNALIZARE (Etapa 5E-4, 5E-6, 5E-7)
  // ==========================================

  private appendLog(entry: EmailLogEntry): void {
    this.logs = [entry, ...this.logs];
    this.saveLogs();
  }

  /**
   * Trimite (prin transportul curent configurat) un mesaj deja generat și
   * jurnalizează rezultatul. Nu aruncă niciodată o excepție în afară — orice
   * eroare este capturată explicit și transformată într-o intrare `failed` în jurnal.
   */
  private async dispatch(
    report: CivicReport,
    kind: EmailKind,
    message: EmailMessage
  ): Promise<EmailLogEntry> {
    const baseEntry: Omit<EmailLogEntry, 'status' | 'errorMessage'> = {
      id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      reportId: report.id,
      referenceNumber: report.referenceNumber,
      kind,
      to: message.to,
      subject: message.subject,
      createdAt: new Date().toISOString(),
      transportName: this.transport.name,
    };

    let status: EmailStatus = 'generated';
    let errorMessage: string | undefined;

    try {
      const result = await this.transport.send(message);
      status = result.status;
      errorMessage = result.errorMessage;
    } catch (err: any) {
      // Tratare explicită a erorii de transport — nu se folosește niciodată catch gol
      // și nu se marchează niciodată succesul dacă transportul a eșuat.
      status = 'failed';
      errorMessage = err?.message || 'Eroare necunoscută la transportul de e-mail.';
      console.error(`Eroare la transmiterea e-mailului (${kind}) pentru ${report.referenceNumber}:`, err);
    }

    const entry: EmailLogEntry = { ...baseEntry, status, errorMessage };
    this.appendLog(entry);
    return entry;
  }

  /**
   * Punctul de intrare principal (Etapa 5E-4): generează și trimite (simulat)
   * cele două notificări posibile pentru o sesizare nou-creată:
   * - notificare către adresa de registratură a instituției (dacă este configurată);
   * - confirmare către adresa de contact a cetățeanului (dacă a fost furnizată).
   *
   * Eșecul oricăreia dintre cele două NU are niciun efect asupra sesizării deja
   * salvate — acest apel are loc întotdeauna DUPĂ persistarea cu succes a sesizării.
   */
  public async notifyNewReport(report: CivicReport, registryEmail?: string): Promise<EmailLogEntry[]> {
    const results: EmailLogEntry[] = [];

    // 1. Notificare către instituție (registratură)
    try {
      if (registryEmail && registryEmail.trim()) {
        const message = this.buildRegistryNotification(report, registryEmail.trim());
        results.push(await this.dispatch(report, 'registry_notification', message));
      } else {
        // Configurare lipsă — caz de eroare explicit acoperit (Etapa 5E-6).
        results.push(
          this.logConfigurationError(
            report,
            'registry_notification',
            'Adresa de registratură a instituției (registryEmail) nu este configurată în Ghidul Primăriei.'
          )
        );
      }
    } catch (err: any) {
      results.push(
        this.logConfigurationError(
          report,
          'registry_notification',
          err?.message || 'Eroare la generarea mesajului de notificare către instituție.'
        )
      );
    }

    // 2. Confirmare către cetățean, doar dacă a furnizat o adresă de contact
    if (report.contact?.email && report.contact.email.trim()) {
      try {
        const message = this.buildCitizenConfirmation(report, report.contact.email.trim());
        results.push(await this.dispatch(report, 'citizen_confirmation', message));
      } catch (err: any) {
        results.push(
          this.logConfigurationError(
            report,
            'citizen_confirmation',
            err?.message || 'Eroare la generarea mesajului de confirmare către cetățean.'
          )
        );
      }
    }

    return results;
  }

  private logConfigurationError(report: CivicReport, kind: EmailKind, errorMessage: string): EmailLogEntry {
    const entry: EmailLogEntry = {
      id: `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      reportId: report.id,
      referenceNumber: report.referenceNumber,
      kind,
      to: kind === 'registry_notification' ? '(nedefinit)' : report.contact?.email || '(nedefinit)',
      subject: '(negenerat — eroare de configurare)',
      createdAt: new Date().toISOString(),
      status: 'failed',
      transportName: this.transport.name,
      errorMessage,
    };
    this.appendLog(entry);
    return entry;
  }

  // ==========================================
  // CITIRE JURNAL (util pentru diagnosticare / Admin)
  // ==========================================

  public getLogs(): EmailLogEntry[] {
    return [...this.logs];
  }

  public getLogsForReport(referenceNumber: string): EmailLogEntry[] {
    const clean = referenceNumber.trim().toUpperCase();
    return this.logs.filter((l) => l.referenceNumber.toUpperCase() === clean);
  }
}

export const emailService = new EmailService();

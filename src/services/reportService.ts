/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CivicReport,
  ReportCategory,
  PublicMapReport,
  PublicationPreference,
  ModerationStatus,
  ResolutionStatus,
  ReportResponse
} from '../types/report';
import { DEMO_REPORT_CATEGORIES } from '../data/mockReportCategories';
import { directoryService } from './directoryService';
import { emailService } from './emailService';
import { permissionService } from './permissionService';

const STORAGE_REPORTS_KEY = 'turnu_civic_reports_store';
const STORAGE_COUNTER_KEY = 'turnu_civic_reports_counter';

/**
 * ETAPA 6.2 (C1) — Motivul pentru care salvarea unei sesizări a eșuat.
 * - 'quota_exceeded': spațiul de stocare al browserului (localStorage) este plin.
 * - 'storage_error': altă eroare de scriere (stocare dezactivată, mod privat restrictiv etc.).
 */
export type ReportSaveFailureReason = 'quota_exceeded' | 'storage_error';

/**
 * ETAPA 6.2 (C1) — Rezultatul explicit al trimiterii unei sesizări.
 * O sesizare este considerată înregistrată DOAR dacă `success === true`,
 * adică numai după ce a fost scrisă efectiv în stocarea persistentă.
 */
export type SubmitReportResult =
  | { success: true; report: CivicReport }
  | { success: false; reason: ReportSaveFailureReason };

/**
 * Recunoaște eroarea de depășire a cotei de stocare în toate browserele majore
 * (Chromium/WebKit: 'QuotaExceededError' / cod 22; Firefox: 'NS_ERROR_DOM_QUOTA_REACHED' / cod 1014).
 */
function isQuotaExceededError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

/**
 * Coordonatele de referință ale centrului municipiului Turnu Măgurele
 */
export const TURNU_MAGURELE_CENTER = {
  lat: 43.7486,
  lng: 24.8722,
};

/**
 * Exemple demonstrative inițiale de sesizări din Turnu Măgurele cu coordonate valide
 * pentru alimentarea inițială a hărții și a panoului de moderare.
 * Sesizările demonstrative acoperă ambele cazuri:
 * - TM-001: public_anonymous + approved -> Apare pe hartă fără date personale
 * - TM-002: public + approved -> Apare pe hartă fără date personale
 * - TM-003: private + pending -> NU apare pe hartă (marcată private de cetățean)
 */
const SEED_REPORTS: CivicReport[] = [
  {
    id: 'rep-seed-001',
    referenceNumber: 'TM-001',
    categoryId: 'iluminat',
    categoryName: 'Iluminat public',
    description: 'Corp de iluminat LED nefuncțional pe aleea principală a Parcului Municipal.',
    photos: [],
    location: {
      addressOrDetails: 'Parcul Municipal, Aleea Centrală',
      latitude: 43.7495,
      longitude: 24.8715,
      source: 'gps',
    },
    contact: {
      name: 'Cetățean Demo',
      phone: '0700000001',
      email: 'cetatean@exemplu.ro',
    },
    createdAt: '2026-09-24T10:15:00.000Z',
    status: 'transmis',
    publicationPreference: 'public_anonymous',
    moderationStatus: 'approved',
    moderatedAt: '2026-09-24T11:00:00.000Z',
  },
  {
    id: 'rep-seed-002',
    referenceNumber: 'TM-002',
    categoryId: 'drumuri',
    categoryName: 'Drumuri / carosabil',
    description: 'Groapă adâncă semnalată pe banda de rulare spre intersecție, risc de avariere auto.',
    photos: [],
    location: {
      addressOrDetails: 'Strada Nicolae Bălcescu nr. 14',
      latitude: 43.7512,
      longitude: 24.8760,
      source: 'both',
    },
    contact: {
      name: 'Anonim Demo',
    },
    createdAt: '2026-09-24T14:30:00.000Z',
    status: 'transmis',
    publicationPreference: 'public',
    moderationStatus: 'approved',
    moderatedAt: '2026-09-24T15:00:00.000Z',
  },
  {
    id: 'rep-seed-003',
    referenceNumber: 'TM-003',
    categoryId: 'spatii-verzi',
    categoryName: 'Spații verzi / parcuri',
    description: 'Creangă uscată de mari dimensiuni la risc de cădere pe alee pietonală.',
    photos: [],
    location: {
      addressOrDetails: 'Bulevardul Independenței, zona Școala Gimnazială',
      latitude: 43.7460,
      longitude: 24.8690,
      source: 'manual',
    },
    createdAt: '2026-09-25T08:00:00.000Z',
    status: 'transmis',
    publicationPreference: 'private',
    moderationStatus: 'pending',
  },
];

/**
 * Serviciu pentru gestionarea sesizărilor, identificatorilor interni, moderării și afișării pe hartă (Etapa 3E).
 * 
 * REGULI ARHITECTURALE (ETAPELE 3B, 3C, 3D, 3E):
 * 1. Formatul identificatorului civic este determinist: TM-001, TM-002, TM-003 etc.
 * 2. Numerele sunt secvențiale, unice și NICIODATĂ refolosite.
 * 3. Contorul de secvență este păstrat separat de numărul de elemente din listă.
 * 4. Generarea numărului are loc STRICT în momentul salvării unei sesizări valide.
 * 5. Separare clară: ID tehnic (`id`) vs. Identificator civic (`referenceNumber`).
 * 6. REGULA CENTRALĂ DE PUBLICARE (Etapa 3E):
 *    O sesizare poate apărea pe hartă dacă și numai dacă:
 *    - preferința cetățeanului permite publicarea ('public' sau 'public_anonymous')
 *    - ȘI administratorul a aprobat-o ('approved')
 *    - ȘI are coordonate geografice valide
 * 7. Dacă cetățeanul a ales 'private', sesizarea NU apare pe hartă indiferent de statusul de moderare.
 * 8. CONFIDENȚIALITATE STRICTĂ:
 *    Modelul PublicMapReport nu conține și nu expune niciodată date personale ale petiționarului.
 */
class ReportService {
  private categories: ReportCategory[] = [...DEMO_REPORT_CATEGORIES];
  private reports: CivicReport[] = [];
  private counter: number = 0;
  private lastSubmittedReport: CivicReport | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      // 1. Încărcare sesizări existente
      const storedReports = localStorage.getItem(STORAGE_REPORTS_KEY);
      if (storedReports) {
        const parsed: CivicReport[] = JSON.parse(storedReports);
        // Migrare/asigurare compatibilitate cu câmpurile din Etapa 3E dacă lipsesc
        this.reports = parsed.map((rep) => ({
          ...rep,
          publicationPreference: rep.publicationPreference || 'private',
          moderationStatus: rep.moderationStatus || 'pending',
        }));
      } else {
        // Dacă e prima rulare și nu există sesizări, inițializăm cu exemplele demonstrative
        this.reports = [...SEED_REPORTS];
        this.saveReports();
      }

      // 2. Încărcare contor secvențial persistent
      // ETAPA 6.2 (C1): contorul efectiv este MAXIMUL dintre valoarea salvată și cel mai mare
      // număr TM existent. Astfel, dacă o sesizare a fost salvată dar scrierea contorului a eșuat
      // (ex. cotă depășită), la următoarea pornire numărul ei NU este refolosit (regula 3B).
      const storedCounter = localStorage.getItem(STORAGE_COUNTER_KEY);
      let maxExisting = 0;
      this.reports.forEach((r) => {
        if (r.referenceNumber && r.referenceNumber.startsWith('TM-')) {
          const numPart = parseInt(r.referenceNumber.replace('TM-', ''), 10);
          if (!isNaN(numPart) && numPart > maxExisting) {
            maxExisting = numPart;
          }
        }
      });
      const parsedCounter = storedCounter ? parseInt(storedCounter, 10) || 0 : 0;
      this.counter = Math.max(parsedCounter, maxExisting);
      if (!storedCounter || parsedCounter < maxExisting) {
        this.saveCounter();
      }
    } catch {
      this.reports = [];
      this.counter = 0;
    }
  }

  /**
   * ETAPA 6.2 (C1): scrie o listă de sesizări în stocarea persistentă și raportează explicit
   * rezultatul. Returnează `null` la succes sau motivul eșecului. Nu modifică starea din memorie.
   */
  private writeReports(list: CivicReport[]): ReportSaveFailureReason | null {
    try {
      localStorage.setItem(STORAGE_REPORTS_KEY, JSON.stringify(list));
      return null;
    } catch (e) {
      console.warn('Eroare la salvarea sesizărilor în storage:', e);
      return isQuotaExceededError(e) ? 'quota_exceeded' : 'storage_error';
    }
  }

  private saveReports(): boolean {
    const failure = this.writeReports(this.reports);
    if (failure === null) {
      this.notify();
      return true;
    }
    return false;
  }

  private saveCounter() {
    try {
      localStorage.setItem(STORAGE_COUNTER_KEY, this.counter.toString());
    } catch (e) {
      console.warn('Eroare la salvarea contorului de secvență:', e);
    }
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Eroare la notificarea ascultătorilor reportService:', err);
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Formatează un număr secvențial conform formatului TM-XXX.
   * ETAPA 6.2 (C1): contorul este avansat în `submitReport()` DOAR după salvarea reușită
   * a sesizării, astfel încât o salvare eșuată nu consumă niciun număr.
   * Contorul rămâne strict monoton; un număr atribuit nu se refolosește niciodată.
   */
  private formatReferenceNumber(sequence: number): string {
    return `TM-${String(sequence).padStart(3, '0')}`;
  }

  /**
   * Returnează lista categoriilor de sesizări disponibile.
   */
  public getCategories(): ReportCategory[] {
    return [...this.categories];
  }

  /**
   * Returnează o categorie după ID.
   */
  public getCategoryById(id: string): ReportCategory | undefined {
    return this.categories.find((c) => c.id === id);
  }

  /**
   * Procesează și salvează o sesizare validată (Etapele 3B, 3C, 3E).
   * La trimitere:
   * - Se alocă ID tehnic unic
   * - Se generează TM-XXX secvențial
   * - Se setează `publicationPreference` conform alegerii cetățeanului (implicit 'private')
   * - Se setează `moderationStatus` pe 'pending'
   *
   * ETAPA 6.2 (C1) — salvare tranzacțională:
   * 1. sesizarea este scrisă mai întâi în stocarea persistentă, pe o listă candidat;
   * 2. DOAR dacă scrierea reușește se actualizează lista din memorie, contorul TM,
   *    „ultima sesizare transmisă” și se declanșează notificarea e-mail;
   * 3. dacă scrierea eșuează (ex. `QuotaExceededError`), nu se modifică nimic
   *    (nici memoria, nici contorul, nici datele existente) și se returnează motivul eșecului.
   */
  public submitReport(
    input: Omit<CivicReport, 'id' | 'referenceNumber' | 'createdAt' | 'status' | 'moderationStatus'> & {
      publicationPreference?: PublicationPreference;
    }
  ): SubmitReportResult {
    // 1. Generare ID tehnic unic pentru storage
    const technicalId = `rep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // 2. Identificator civic TM-XXX rezervat provizoriu (contorul NU este încă avansat)
    const nextSequence = this.counter + 1;
    const civicReferenceNumber = this.formatReferenceNumber(nextSequence);

    const report: CivicReport = {
      ...input,
      id: technicalId,
      referenceNumber: civicReferenceNumber,
      createdAt: new Date().toISOString(),
      status: 'transmis',
      // REGULĂ IMPORTANTĂ ETAPA 3E: Implicit este 'private' dacă nu e specificat
      publicationPreference: input.publicationPreference || 'private',
      moderationStatus: 'pending',
    };

    // 3. Salvare persistentă — mai întâi în stocare, abia apoi în memorie
    const candidateReports = [report, ...this.reports];
    const failure = this.writeReports(candidateReports);
    if (failure !== null) {
      return { success: false, reason: failure };
    }

    this.reports = candidateReports;
    this.counter = nextSequence;
    // Eșecul acestei scrieri nu poate duce la refolosirea numărului: la pornire contorul
    // este reconciliat cu cel mai mare număr TM existent (vezi `init()`).
    this.saveCounter();
    this.notify();

    this.lastSubmittedReport = report;

    // 4. Declanșarea trimiterii automate a e-mailurilor (Etapa 5E) — STRICT DUPĂ
    // salvarea cu succes a sesizării de mai sus. Este intenționat neblocant (fire-and-forget)
    // și complet izolat: orice eroare aici NU afectează în niciun fel sesizarea deja salvată
    // și returnată apelantului.
    try {
      const registryEmail = directoryService.getCityHallInfo()?.registryEmail;
      emailService.notifyNewReport(report, registryEmail).catch((err) => {
        console.error(`Eroare la procesarea notificărilor de e-mail pentru ${report.referenceNumber}:`, err);
      });
    } catch (err) {
      console.error(`Eroare la inițierea notificărilor de e-mail pentru ${report.referenceNumber}:`, err);
    }

    return { success: true, report };
  }

  /**
   * Returnează toate sesizările din evidența internă a dispozitivului.
   */
  public getAllReports(): CivicReport[] {
    return [...this.reports];
  }

  /**
   * Returnează o sesizare după ID-ul tehnic intern.
   */
  public getReportById(id: string): CivicReport | undefined {
    return this.reports.find((r) => r.id === id);
  }

  /**
   * Căutare sesizare după identificatorul civic (ex: TM-001).
   */
  public getReportByReferenceNumber(refNumber: string): CivicReport | undefined {
    const clean = refNumber.trim().toUpperCase();
    return this.reports.find((r) => r.referenceNumber.toUpperCase() === clean);
  }

  /**
   * ETAPA 6.1 — Serviciul NU expune nicio operație de ștergere a sesizărilor.
   * Regula de produs: sesizările pot fi vizualizate, moderate și soluționate,
   * dar ștergerea nu face parte din administrarea obișnuită (nici public,
   * nici `primarie_operator`, nici `super_admin`). Metoda `deleteReport()`,
   * artefact de test din Etapa 3B, a fost eliminată.
   * Regula 3B rămâne valabilă: contorul TM-XXX nu este niciodată decrementat.
   */

  /**
   * Returnează ultima sesizare transmisă în sesiunea activă.
   */
  public getLastSubmittedReport(): CivicReport | null {
    return this.lastSubmittedReport;
  }

  /**
   * Resetează starea ultimei sesizări pentru a deschide un nou formular curat.
   */
  public resetLastSubmittedReport(): void {
    this.lastSubmittedReport = null;
  }

  /**
   * Returnează valoarea curentă a contorului.
   */
  public getCurrentCounter(): number {
    return this.counter;
  }

  // ==========================================
  // METODE DE MODERARE (ETAPA 3E)
  // ==========================================

  /**
   * Actualizează statusul de moderare al unei sesizări.
   * Acțiuni posibile:
   * - 'approved': Aprobă sesizarea pentru publicare (dacă preferința cetățeanului nu e 'private')
   * - 'rejected': Respinge sau retrage sesizarea din publicare
   * - 'pending': Revocare în stare de așteptare
   */
  public updateModerationStatus(
    id: string, 
    newStatus: ModerationStatus, 
    note?: string
  ): boolean {
    // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu — fără permisiune nu se modifică nimic.
    if (!permissionService.currentUserCan('reports.moderate')) return false;

    const reportIndex = this.reports.findIndex((r) => r.id === id);
    if (reportIndex === -1) return false;

    const current = this.reports[reportIndex];
    this.reports[reportIndex] = {
      ...current,
      moderationStatus: newStatus,
      moderatedAt: new Date().toISOString(),
      moderationNote: note !== undefined ? note : current.moderationNote,
    };

    this.saveReports();
    return true;
  }

  // ==========================================
  // METODE DE SOLUȚIONARE (ETAPA 5C) — independente de moderare
  // ==========================================

  /**
   * Returnează stadiul de soluționare al unei sesizări. Sesizările fără câmpul
   * `resolutionStatus` (existente dinaintea Etapei 5C) sunt tratate ca 'new' prin fallback,
   * fără a rescrie datele stocate.
   */
  public getResolutionStatus(report: CivicReport): ResolutionStatus {
    return report.resolutionStatus ?? 'new';
  }

  /**
   * Schimbă stadiul de soluționare al unei sesizări (Etapa 5C).
   * Concept complet independent de `moderationStatus` — nu îl atinge și nu este atins de el.
   */
  public updateResolutionStatus(id: string, newStatus: ResolutionStatus): boolean {
    // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu.
    if (!permissionService.currentUserCan('reports.resolve')) return false;

    const reportIndex = this.reports.findIndex((r) => r.id === id);
    if (reportIndex === -1) return false;

    this.reports[reportIndex] = {
      ...this.reports[reportIndex],
      resolutionStatus: newStatus,
    };

    this.saveReports();
    return true;
  }

  /**
   * Adaugă un răspuns administrativ nou în istoricul sesizării (Etapa 5C).
   * Strict intern (Admin) în această etapă. Nu suprascrie răspunsurile anterioare —
   * doar adaugă la finalul listei existente.
   */
  public addResponse(id: string, message: string, authorName: string): ReportResponse | null {
    // ETAPA 6.5 (P1/P2): autorizare la nivel de serviciu.
    if (!permissionService.currentUserCan('reports.reply')) return null;

    const reportIndex = this.reports.findIndex((r) => r.id === id);
    if (reportIndex === -1) return null;

    const newResponse: ReportResponse = {
      id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      message,
      createdAt: new Date().toISOString(),
      authorName,
    };

    const current = this.reports[reportIndex];
    this.reports[reportIndex] = {
      ...current,
      responses: [...(current.responses || []), newResponse],
    };

    this.saveReports();
    return newResponse;
  }

  /**
   * Returnează statistici agregate reale privind sesizările și moderarea (pentru Admin).
   */
  public getModerationStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    privateCount: number;
    publiclyVisible: number;
  } {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let privateCount = 0;
    let publiclyVisible = 0;

    for (const r of this.reports) {
      if (r.moderationStatus === 'pending') pending++;
      if (r.moderationStatus === 'approved') approved++;
      if (r.moderationStatus === 'rejected') rejected++;
      if (r.publicationPreference === 'private') privateCount++;
      if (this.isPubliclyVisible(r)) publiclyVisible++;
    }

    return {
      total: this.reports.length,
      pending,
      approved,
      rejected,
      privateCount,
      publiclyVisible,
    };
  }

  // ==========================================
  // REGULA CENTRALĂ DE PUBLICARE & HARTĂ (ETAPA 3D & 3E)
  // ==========================================

  /**
   * CONDIȚIA CENTRALĂ DE VIZIBILITATE PUBLICĂ (Cerința 14 din Etapa 3E):
   * O sesizare este vizibilă public dacă și numai dacă:
   * 1. Cetățeanul a permis publicarea ('public' sau 'public_anonymous') — NICIODATĂ 'private';
   * 2. Administratorul a aprobat publicarea ('approved') — NICIODATĂ 'pending' sau 'rejected';
   * 3. Are coordonate geografice valide pentru afișarea pe hartă.
   */
  public isPubliclyVisible(report: CivicReport): boolean {
    // 1. Verificare preferință cetățean
    if (report.publicationPreference === 'private') {
      return false;
    }

    // 2. Verificare decizie moderator
    if (report.moderationStatus !== 'approved') {
      return false;
    }

    // 3. Verificare coordonate geografice valide
    const lat = report.location?.latitude;
    const lng = report.location?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return false;
    }

    if (lat < 40 || lat > 48 || lng < 20 || lng > 30) {
      return false;
    }

    return true;
  }

  /**
   * Transformă o sesizare internă într-un obiect public sigur (`PublicMapReport`).
   * 
   * PRINCIPIU STRICT DE CONFIDENȚIALITATE:
   * Numele, telefonul, e-mailul și datele private de contact ale petiționarului
   * sunt eliminate 100% din acest model.
   * 
   * Aplică verificarea `isPubliclyVisible(report)`.
   * Dacă sesizarea nu este eligibilă, returnează null.
   */
  public toPublicMapReport(report: CivicReport): PublicMapReport | null {
    if (!this.isPubliclyVisible(report)) {
      return null;
    }

    const lat = report.location.latitude!;
    const lng = report.location.longitude!;

    // Selectăm prima fotografie optimizată dacă există (din 3C)
    const primaryPhoto = report.photos && report.photos.length > 0 ? report.photos[0] : undefined;

    // ETAPA 6.5 (P4): modelul public NU include ID-ul tehnic intern și nici numele fișierului
    // original al fotografiei (poate conține date personale); nu sunt necesare niciunui consumator public.
    return {
      referenceNumber: report.referenceNumber,
      categoryId: report.categoryId,
      categoryName: report.categoryName,
      publicDescription: report.description,
      publicLocation: {
        addressOrDetails: report.location.addressOrDetails || 'Locație indicată în municipiu',
        latitude: lat,
        longitude: lng,
      },
      photo: primaryPhoto
        ? {
            dataUrl: primaryPhoto.dataUrl,
            size: primaryPhoto.size,
            compressionRatio: primaryPhoto.compressionRatio,
          }
        : undefined,
      createdAt: report.createdAt,
      isAnonymous: report.publicationPreference === 'public_anonymous',
    };
  }

  /**
   * Returnează lista tuturor sesizărilor publice eligibile pentru afișarea pe hartă.
   * - Include DOAR sesizările care respectă regula centrală: cetățeanul a dorit publicarea ȘI moderatorul a aprobat-o;
   * - Elimină sesizările 'private', 'pending' sau 'rejected';
   * - Elimină sesizările fără coordonate valide;
   * - Filtrează datele personale garantând confidențialitatea.
   */
  public getPublicMapReports(): PublicMapReport[] {
    const publicReports: PublicMapReport[] = [];
    for (const report of this.reports) {
      const pub = this.toPublicMapReport(report);
      if (pub) {
        publicReports.push(pub);
      }
    }
    return publicReports;
  }
}

export const reportService = new ReportService();

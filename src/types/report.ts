/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReportCategory {
  id: string;
  name: string;
  description: string;
  iconName?: string;
}

export interface ReportPhoto {
  id: string;
  dataUrl: string; // Date imagine optimizate în format base64/dataUrl
  name: string;
  size: number; // Mărime fișier optimizat (în octeți)
  type: string; // Tip MIME optimizat (ex: 'image/webp' sau 'image/jpeg')
  originalSize?: number; // Mărime fișier original (în octeți)
  width?: number; // Lățime imagine optimizată (px)
  height?: number; // Înălțime imagine optimizată (px)
  originalWidth?: number; // Lățime imagine originală (px)
  originalHeight?: number; // Înălțime imagine originală (px)
  compressionRatio?: number; // Procent reducere dimensiune (ex: 85.5)
}

export interface ReportLocation {
  addressOrDetails: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  source: 'manual' | 'gps' | 'both';
}

export interface CitizenContact {
  name?: string;
  phone?: string;
  email?: string;
}

/**
 * Opțiunea de afișare aleasă de cetățean în formular (Etapa 3E, modificată în Etapa 6.6).
 * - 'public_anonymous': afișare publică anonimă (valoarea implicită din Etapa 6.6).
 * - 'public': afișare publică.
 * - 'private': VALOARE ISTORICĂ (opțiunea „Nu doresc afișarea publică”, eliminată în Etapa 6.6).
 *   Păstrată în tip doar pentru compatibilitatea datelor salvate; NU mai exclude sesizarea de
 *   pe hartă și nu mai este oferită în formular. La publicare este tratată ca anonimă.
 * În toate cazurile, datele de contact ale autorului NU sunt publice.
 */
export type PublicationPreference = 'private' | 'public' | 'public_anonymous';

/**
 * Statusul administrativ de moderare decis de administrator (Etapa 3E).
 * - 'pending': În așteptarea evaluării administrative (implicit la trimitere).
 * - 'approved': Aprobată pentru publicare de către administrator.
 * - 'rejected': Respinsă de la publicare (sau retrasă ulterior).
 */
export type ModerationStatus = 'pending' | 'approved' | 'rejected';

/**
 * Stadiul soluționării sesizării de către administrator (Etapa 5C).
 * Concept SEPARAT și INDEPENDENT de `ModerationStatus`:
 * - `ModerationStatus` decide dacă sesizarea este eligibilă pentru harta publică.
 * - `ResolutionStatus` urmărește progresul intern al tratării problemei semnalate.
 * O sesizare poate fi, de exemplu, 'approved' (vizibilă pe hartă) și în același timp
 * 'new' (netratată încă) — cele două axe nu se condiționează reciproc.
 *
 * - 'new': sesizare nouă, neverificată/tratată încă (implicit — inclusiv pentru
 *   sesizările existente dinaintea Etapei 5C, prin fallback în reportService).
 * - 'in_progress': sesizarea este în curs de analiză/soluționare.
 * - 'resolved': problema semnalată a fost soluționată.
 * - 'closed': cazul este închis administrativ.
 */
export type ResolutionStatus = 'new' | 'in_progress' | 'resolved' | 'closed';

/**
 * Răspuns/observație administrativă asociată unei sesizări (Etapa 5C).
 * Strict intern (Admin) în această etapă — nu este afișat public.
 * Istoricul se păstrează integral; un răspuns nou NU suprascrie răspunsurile anterioare.
 */
export interface ReportResponse {
  id: string;
  message: string;
  createdAt: string;
  authorName: string;
}

/**
 * Modelul de date pentru sesizări cetățenești (Etapele 3A, 3B, 3C, 3D, 3E).
 * 
 * SEPARARE ARHITECTURALĂ STRICTĂ:
 * - `id`: Identificator tehnic intern al obiectului în baza de date / storage (ex: rep-1727271829-abc12).
 * - `referenceNumber`: Identificator civic unic al platformei (format TM-XXX, ex: TM-001).
 *   NU este număr oficial de înregistrare al Primăriei!
 * - `publicationPreference`: Preferința cetățeanului ('private' | 'public' | 'public_anonymous').
 * - `moderationStatus`: Decizia administratorului ('pending' | 'approved' | 'rejected').
 */
export interface CivicReport {
  id: string; // ID tehnic intern de stocare
  referenceNumber: string; // Identificator civic intern al platformei (TM-XXX)
  categoryId: string;
  categoryName: string;
  description: string;
  photos: ReportPhoto[];
  location: ReportLocation;
  contact?: CitizenContact;
  createdAt: string;
  status: 'transmis'; // Stare inițială simplă de transmitere
  publicationPreference: PublicationPreference; // Opțiunea cetățeanului; 'private' = valoare istorică fără efect pe hartă (Etapa 6.6)
  moderationStatus: ModerationStatus; // Decizia moderatorului (implicit: 'pending')
  moderatedAt?: string; // Data ultimei acțiuni de moderare
  moderationNote?: string; // Notă internă opțională a moderatorului (folosită exclusiv pentru moderare)

  // Câmpuri Etapa 5C — soluționare (independente de moderare)
  resolutionStatus?: ResolutionStatus; // Lipsă = 'new' (fallback în reportService)
  responses?: ReportResponse[]; // Istoric răspunsuri administrative interne, niciodată suprascris

  // Câmpuri Etapa 6.6 (C6) — asumare / preluare. Se păstrează DOAR starea curentă (fără istoric).
  // Concepte distincte de autorul sesizării (`contact`) și de `resolutionStatus`.
  assigneeIds?: string[]; // Responsabilii individuali curenți: ID-urile unice ale conturilor Admin. Lipsă = [].
  cityHallTakenOver?: boolean; // Preluarea instituțională de către Primărie; odată `true`, nu se retrage. Lipsă = false.
}

/**
 * Modelul public pentru afișarea pe hartă (Etapa 3D & 3E).
 * 
 * PRINCIPIU FUNDAMENTAL DE CONFIDENȚIALITATE:
 * Harta este publică. Acest model conține STRICT datele publice eligibile pentru afișare.
 * NU conține și NU expune niciodată date personale ale petiționarului:
 * - NU conține nume / prenume
 * - NU conține număr de telefon
 * - NU conține adresă de e-mail
 * - NU conține alte date de contact
 * - ETAPA 6.5 (P4): NU conține ID-ul tehnic intern și nici numele fișierului original al fotografiei
 */
export interface PublicMapReport {
  referenceNumber: string; // TM-XXX (identificator civic intern al platformei)
  categoryId: string;
  categoryName: string;
  publicDescription: string;
  publicLocation: {
    addressOrDetails: string;
    latitude: number;
    longitude: number;
  };
  photo?: {
    dataUrl: string;
    size: number;
    compressionRatio?: number;
  };
  createdAt: string;
  isAnonymous: boolean; // Opțiunea „anonim” (N1 închis în 6.6: identitatea autorului nu e publică în niciun caz)
  // ETAPA 6.6: fără stadiu, asumare, preluare sau responsabili — fluxul intern nu este public.
}

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
 * Opțiunea de publicare aleasă explicit de cetățean în formular (Etapa 3E).
 * - 'private': Nu doresc afișarea publică (VALOARE IMPLICITĂ OBLIGATORIE).
 * - 'public': Da, vreau să fie afișată public.
 * - 'public_anonymous': Da, vreau să fie afișată public anonim (fără date personale pe hartă).
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
  publicationPreference: PublicationPreference; // Preferința cetățeanului (implicit: 'private')
  moderationStatus: ModerationStatus; // Decizia moderatorului (implicit: 'pending')
  moderatedAt?: string; // Data ultimei acțiuni de moderare
  moderationNote?: string; // Notă internă opțională a moderatorului
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
 */
export interface PublicMapReport {
  id: string; // ID tehnic de referință
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
    name: string;
    size: number;
    compressionRatio?: number;
  };
  createdAt: string;
  isAnonymous: boolean; // Flag dacă sesizarea a fost marcată ca publică anonimă
}

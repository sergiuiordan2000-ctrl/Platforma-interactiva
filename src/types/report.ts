/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Faza 5.4: tipurile sesizărilor vin din `@tmc/shared` (sursa comună server / frontend).
 * Aici rămâne numai fotografia comprimată în browser, înainte de trimitere (3C).
 * Modelul vechi (`localStorage`, moderare, date de contact) a fost eliminat (2.3, A-9, B8 §2.4).
 */

export interface ReportPhoto {
  id: string;
  dataUrl: string; // imaginea optimizată (previzualizare locală, înainte de trimitere)
  name: string;
  size: number; // mărimea fișierului optimizat (octeți)
  type: string; // 'image/webp' sau 'image/jpeg'
  originalSize?: number;
  width?: number;
  height?: number;
  originalWidth?: number;
  originalHeight?: number;
  compressionRatio?: number; // procentul de reducere (ex: 85.5)
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CompressionOptions {
  maxDimension?: number; // Dimensiune maximă pe latura cea mai mare (implicit 1920px)
  quality?: number; // Calitate compresie (0.0 - 1.0, implicit 0.82)
  maxOriginalSizeMB?: number; // Mărime maximă fișier original (implicit 15MB)
}

export interface CompressedPhotoResult {
  dataUrl: string;
  name: string;
  type: string;
  originalSize: number;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  reductionPercent: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxDimension: 1920,
  quality: 0.82,
  maxOriginalSizeMB: 15,
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Serviciu dedicat pentru compresia și optimizarea fotografiilor în browser (Etapa 3C).
 * 
 * CARACTERISTICI TEHNICE:
 * 1. Redimensionare inteligentă cu păstrarea proporțiilor originale (max 1920px pe latura cea mai mare).
 * 2. Fără upscaling: imaginile sub 1920px nu sunt mărite artificial.
 * 3. Compresie Canvas de înaltă eficiență (WebP la calitate 0.82, cu fallback JPEG).
 * 4. Păstrarea orientării corecte (createImageBitmap cu imageOrientation: 'from-image').
 * 5. Eliminarea automată a metadatelor personale EXIF (GPS, dispozitiv) prin re-randare pe Canvas.
 */
/**
 * 7B.2 (E2): eroare cunoscută a procesării unei fotografii (format, mărime, decodare, Canvas), cu text în română,
 * afișat utilizatorului. Orice altă eroare (neașteptată, cu textul tehnic al browserului) primește un mesaj generic.
 */
export class PhotoProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoProcessingError';
  }
}

class ImageCompressionService {
  /**
   * Validează fișierul înainte de procesare.
   */
  public validateFile(file: File, maxMB: number = DEFAULT_OPTIONS.maxOriginalSizeMB): void {
    if (!file) {
      throw new PhotoProcessingError('Niciun fișier selectat.');
    }

    // Verificare tip MIME
    const mime = file.type.toLowerCase();
    const isAllowed = ALLOWED_MIME_TYPES.some((type) => mime.includes(type.replace('image/', '')));
    if (!isAllowed && !mime.startsWith('image/')) {
      throw new PhotoProcessingError(`Formatul fișierului „${file.name}” nu este acceptat. Formate permise: JPEG, PNG, WebP.`);
    }

    // Verificare dimensiune maximă originală
    const maxBytes = maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new PhotoProcessingError(
        `Fișierul „${file.name}” depășește limita maximă de ${maxMB} MB (are ${(file.size / (1024 * 1024)).toFixed(1)} MB).`
      );
    }
  }

  /**
   * Încarcă imaginea și preia orientarea corectă.
   */
  private async loadImageSource(
    file: File
  ): Promise<{ source: ImageBitmap | HTMLImageElement; origWidth: number; origHeight: number }> {
    // 1. Încercăm metoda modernă createImageBitmap cu orientare dinamică din EXIF
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      try {
        // Opțiunea imageOrientation: 'from-image' respectă automat eticheta EXIF Orientation din camera telefonului
        const bitmap = await (createImageBitmap as any)(file, { imageOrientation: 'from-image' });
        return {
          source: bitmap,
          origWidth: bitmap.width,
          origHeight: bitmap.height,
        };
      } catch {
        // Fallback la încărcarea clasică HTMLImageElement dacă createImageBitmap dă eroare
      }
    }

    // 2. Fallback clasic prin URL.createObjectURL
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          source: img,
          origWidth: img.naturalWidth || img.width,
          origHeight: img.naturalHeight || img.height,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new PhotoProcessingError(`Nu s-a putut decoda imaginea „${file.name}”. Fișierul poate fi corupt.`));
      };

      img.src = objectUrl;
    });
  }

  /**
   * Calculează noile dimensiuni cu respectarea raportului de aspect și fără upscaling.
   */
  public calculateDimensions(
    origWidth: number,
    origHeight: number,
    maxDimension: number = DEFAULT_OPTIONS.maxDimension
  ): { width: number; height: number } {
    let width = origWidth;
    let height = origHeight;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    return { width, height };
  }

  /**
   * Comprimă o singură fotografie conform cerințelor Etapei 3C.
   */
  public async compressPhoto(
    file: File,
    options: CompressionOptions = {}
  ): Promise<CompressedPhotoResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // 1. Validare
    this.validateFile(file, opts.maxOriginalSizeMB);

    // 2. Decodare sursă (cu orientare automată)
    const { source, origWidth, origHeight } = await this.loadImageSource(file);

    // 3. Calcul noilor dimensiuni (max 1920px, proporții păstrate, fără upscaling)
    const { width, height } = this.calculateDimensions(origWidth, origHeight, opts.maxDimension);

    // 4. Randare pe Canvas off-screen
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new PhotoProcessingError('Nu s-a putut inițializa contextul grafic Canvas pentru compresie.');
    }

    // Setări pentru randare calitativă superioară
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fundal alb pentru compatibilitate cu imagini PNG cu transparență
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

    // Închidere bitmap dacă este cazul
    if ('close' in source && typeof (source as ImageBitmap).close === 'function') {
      (source as ImageBitmap).close();
    }

    // 5. Export în format eficient (WebP preferat la calitate 0.82, fallback JPEG)
    let outputType = 'image/webp';
    let dataUrl = canvas.toDataURL(outputType, opts.quality);

    // Verificăm dacă browserul a returnat într-adevăr webp (unele browsere vechi cad în png dacă nu știu webp)
    if (!dataUrl.startsWith('data:image/webp')) {
      outputType = 'image/jpeg';
      dataUrl = canvas.toDataURL(outputType, opts.quality);
    }

    // 6. Calcul estimativ mărime octeți a fișierului comprimat
    // Formula standard pentru lungime base64 fără header: lungime * (3/4)
    const base64Content = dataUrl.split(',')[1] || '';
    const compressedSize = Math.round((base64Content.length * 3) / 4);

    const originalSize = file.size;
    const reductionPercent = Math.max(
      0,
      Math.round(((originalSize - compressedSize) / originalSize) * 1000) / 10
    );

    // Nume fișier nou optimizat
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const extension = outputType === 'image/webp' ? 'webp' : 'jpg';
    const optimizedName = `${baseName}_opt.${extension}`;

    return {
      dataUrl,
      name: optimizedName,
      type: outputType,
      originalSize,
      compressedSize,
      originalWidth: origWidth,
      originalHeight: origHeight,
      width,
      height,
      reductionPercent,
    };
  }

  /**
   * Comprimă un set de fotografii în serie controlată, prevenind blocarea interfeței.
   */
  public async compressPhotos(
    files: File[],
    onProgress?: (current: number, total: number, fileName: string) => void,
    options: CompressionOptions = {}
  ): Promise<CompressedPhotoResult[]> {
    const results: CompressedPhotoResult[] = [];
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      if (onProgress) {
        onProgress(i + 1, total, file.name);
      }
      const res = await this.compressPhoto(file, options);
      results.push(res);
      // Mică pauză între cadre pentru a permite browserului să deseneze cadrele de progres
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return results;
  }
}

export const imageCompressionService = new ImageCompressionService();

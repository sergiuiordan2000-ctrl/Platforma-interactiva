// Fotografiile sesizărilor (B5 §2): tipul după SEMNĂTURA binară (nu după extensie sau antet),
// dimensiunile citite din fișier și eliminarea metadatelor, fără re-encodare și fără dependențe
// (B-3: fără `sharp`; `file-type` actual cere Node ≥ 22).
//
// JPEG: se elimină segmentele APP1 (EXIF și XMP) și APP13 (IPTC / Photoshop); restul se copiază neschimbat.
// WebP: se elimină bucățile `EXIF` și `XMP `, iar în `VP8X` se șterg biții corespunzători.

import { REPORT_PHOTO_PX_MAX } from '@tmc/shared';

export type PhotoMime = 'image/jpeg' | 'image/webp';

export interface CleanPhoto {
  mime: PhotoMime;
  width: number;
  height: number;
  data: Buffer;
}

export class PhotoError extends Error {
  readonly reason: 'type' | 'corrupt' | 'dimensions';
  constructor(reason: 'type' | 'corrupt' | 'dimensions', message: string) {
    super(message);
    this.reason = reason;
  }
}

export function detectMime(buf: Buffer): PhotoMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 12 &&
    buf.toString('latin1', 0, 4) === 'RIFF' &&
    buf.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

// ——— JPEG ———

const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
// APP1 (EXIF, XMP), APP13 (IPTC); RA-6 (reaudit, 13.10.2026): și COM (comentariile, text liber)
const STRIP_JPEG = new Set([0xe1, 0xed, 0xfe]);
const JPEG_EOI = Buffer.from([0xff, 0xd9]);

function cleanJpeg(buf: Buffer): CleanPhoto {
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let pos = 2;
  let width = 0;
  let height = 0;
  for (;;) {
    if (pos + 4 > buf.length) throw new PhotoError('corrupt', 'Fișier JPEG incomplet.');
    if (buf[pos] !== 0xff) throw new PhotoError('corrupt', 'Structură JPEG invalidă.');
    const marker = buf[pos + 1]!;
    if (marker === 0xff) {
      pos += 1; // octeți de umplere
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(buf.subarray(pos, pos + 2));
      pos += 2;
      continue;
    }
    const len = buf.readUInt16BE(pos + 2);
    if (len < 2 || pos + 2 + len > buf.length) throw new PhotoError('corrupt', 'Segment JPEG invalid.');
    if (SOF_MARKERS.has(marker)) {
      if (len < 7) throw new PhotoError('corrupt', 'Segment JPEG invalid.');
      height = buf.readUInt16BE(pos + 5);
      width = buf.readUInt16BE(pos + 7);
    }
    if (marker === 0xda) {
      // SOS: de aici încolo sunt datele imaginii, copiate neschimbat până la sfârșitul imaginii (EOI, FF D9).
      // RA-6: ce urmează după EOI nu mai face parte din imagine și nu se păstrează. În datele comprimate, un
      // octet FF este urmat numai de 00 (umplutură) sau de un marcaj, deci primul FF D9 este sfârșitul imaginii.
      // Fără EOI (fișier fără marcajul final), datele se copiază până la capăt, ca înainte.
      const eoi = buf.indexOf(JPEG_EOI, pos + 2 + len);
      parts.push(eoi < 0 ? buf.subarray(pos) : buf.subarray(pos, eoi + 2));
      break;
    }
    if (!STRIP_JPEG.has(marker)) parts.push(buf.subarray(pos, pos + 2 + len));
    pos += 2 + len;
  }
  if (!width || !height) throw new PhotoError('corrupt', 'Dimensiunile imaginii lipsesc.');
  return { mime: 'image/jpeg', width, height, data: Buffer.concat(parts) };
}

// ——— WebP ———

const STRIP_WEBP = new Set(['EXIF', 'XMP ']);

function cleanWebp(buf: Buffer): CleanPhoto {
  const riffSize = buf.readUInt32LE(4);
  if (riffSize + 8 > buf.length || riffSize < 4) throw new PhotoError('corrupt', 'Fișier WebP incomplet.');
  const end = 8 + riffSize;
  const chunks: Buffer[] = [];
  let width = 0;
  let height = 0;
  let pos = 12;
  let vp8xIndex = -1;
  while (pos + 8 <= end) {
    const fourcc = buf.toString('latin1', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const padded = size + (size & 1);
    if (pos + 8 + size > end) throw new PhotoError('corrupt', 'Bucată WebP invalidă.');
    const chunk = Buffer.from(buf.subarray(pos, Math.min(pos + 8 + padded, end)));
    const data = buf.subarray(pos + 8, pos + 8 + size);
    if (fourcc === 'VP8X' && size >= 10) {
      width = 1 + data.readUIntLE(4, 3);
      height = 1 + data.readUIntLE(7, 3);
      vp8xIndex = chunks.length;
    } else if (fourcc === 'VP8 ' && size >= 10 && !width) {
      if (data[3] !== 0x9d || data[4] !== 0x01 || data[5] !== 0x2a) throw new PhotoError('corrupt', 'Cadru VP8 invalid.');
      width = data.readUInt16LE(6) & 0x3fff;
      height = data.readUInt16LE(8) & 0x3fff;
    } else if (fourcc === 'VP8L' && size >= 5 && !width) {
      if (data[0] !== 0x2f) throw new PhotoError('corrupt', 'Cadru VP8L invalid.');
      const bits = data.readUInt32LE(1);
      width = 1 + (bits & 0x3fff);
      height = 1 + ((bits >> 14) & 0x3fff);
    }
    if (!STRIP_WEBP.has(fourcc)) chunks.push(chunk);
    pos += 8 + padded;
  }
  if (!width || !height) throw new PhotoError('corrupt', 'Dimensiunile imaginii lipsesc.');
  if (vp8xIndex >= 0) {
    // biții „are EXIF” (0x08) și „are XMP” (0x04) din antetul VP8X
    const c = chunks[vp8xIndex]!;
    c[8] = c[8]! & ~0x0c;
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(body.length + 4, 4);
  header.write('WEBP', 8, 'latin1');
  return { mime: 'image/webp', width, height, data: Buffer.concat([header, body]) };
}

/** Verifică tipul, dimensiunile și elimină metadatele. Aruncă `PhotoError` la orice problemă. */
export function cleanPhoto(buf: Buffer, maxPx: number = REPORT_PHOTO_PX_MAX): CleanPhoto {
  const mime = detectMime(buf);
  if (!mime) throw new PhotoError('type', 'Sunt acceptate numai imagini JPEG și WebP.');
  let photo: CleanPhoto;
  try {
    photo = mime === 'image/jpeg' ? cleanJpeg(buf) : cleanWebp(buf);
  } catch (err) {
    if (err instanceof PhotoError) throw err;
    throw new PhotoError('corrupt', 'Imaginea nu poate fi citită.');
  }
  if (photo.width > maxPx || photo.height > maxPx) {
    throw new PhotoError('dimensions', `Imaginea depășește ${maxPx} × ${maxPx} px.`);
  }
  return photo;
}

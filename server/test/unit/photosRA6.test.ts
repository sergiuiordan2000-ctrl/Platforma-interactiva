// RA-6 (reaudit, 13.10.2026): la curățarea fotografiilor JPEG se elimină și comentariile (segmentul COM, FF FE)
// și orice date aflate după sfârșitul imaginii (EOI, FF D9). Construim variantele pornind de la fixtura `exif.jpg`.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { cleanPhoto } from '../../src/reports/photos.ts';

const JPEG = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'exif.jpg'));
const SECRET = 'Strada Exemplu 7, tel. 0700000000';

function comSegment(text: string): Buffer {
  const body = Buffer.from(text, 'latin1');
  const head = Buffer.from([0xff, 0xfe, 0, 0]);
  head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([head, body]);
}

describe('RA-6: comentariile JPEG și datele de după EOI', () => {
  it('fixtura se termină cu EOI (premisa testelor de mai jos)', () => {
    assert.equal(JPEG.subarray(-2).toString('hex'), 'ffd9');
  });

  it('segmentul COM este eliminat; restul imaginii rămâne identic', () => {
    const withCom = Buffer.concat([JPEG.subarray(0, 2), comSegment(SECRET), JPEG.subarray(2)]);
    const out = cleanPhoto(withCom).data;
    assert.ok(!out.includes(Buffer.from(SECRET, 'latin1')), 'textul comentariului nu mai apare');
    assert.ok(!out.includes(Buffer.from([0xff, 0xfe])), 'niciun marcaj COM');
    assert.deepEqual(out, cleanPhoto(JPEG).data);
  });

  it('datele de după EOI sunt eliminate; fișierul curățat se termină cu FF D9', () => {
    const trailing = Buffer.from(`PK\u0003\u0004${SECRET}`, 'latin1');
    const out = cleanPhoto(Buffer.concat([JPEG, trailing])).data;
    assert.ok(!out.includes(Buffer.from(SECRET, 'latin1')), 'datele atașate nu mai apar');
    assert.equal(out.subarray(-2).toString('hex'), 'ffd9');
    assert.deepEqual(out, cleanPhoto(JPEG).data);
  });

  it('fără EOI (fișier trunchiat la final), datele imaginii se copiază până la capăt, ca înainte', () => {
    const noEoi = JPEG.subarray(0, -2);
    const out = cleanPhoto(noEoi).data;
    assert.deepEqual(out.subarray(-10), noEoi.subarray(-10));
  });
});

// RA-6 (reaudit, 13.10.2026): la curățarea fotografiilor JPEG se elimină și comentariile (segmentul COM, FF FE)
// și orice date aflate după sfârșitul imaginii (EOI, FF D9). Construim variantele pornind de la fixtura `exif.jpg`.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { PhotoError, cleanPhoto } from '../../src/reports/photos.ts';

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

  // K2 (14.10.2026): testul de mai jos l-a înlocuit pe cel care fixa vechiul comportament („fără EOI, datele
  // imaginii se copiază până la capăt”). Adaptarea este intenționată: comportamentul s-a schimbat prin decizia
  // proprietarului (un JPEG fără EOI se respinge).
  it('K2: fără EOI (fișier trunchiat) → respins ca fotografie coruptă', () => {
    assert.throws(() => cleanPhoto(JPEG.subarray(0, -2)), (e: unknown) => e instanceof PhotoError && e.reason === 'corrupt');
    assert.throws(() => cleanPhoto(JPEG.subarray(0, JPEG.length - 20)), (e: unknown) => e instanceof PhotoError && e.reason === 'corrupt');
  });

  it('K2: trunchiat, cu date lipite în locul sfârșitului (fără EOI) → respins; datele nu ajung nicăieri', () => {
    const trailing = Buffer.from(`PK\u0003\u0004${SECRET}`, 'latin1');
    assert.throws(() => cleanPhoto(Buffer.concat([JPEG.subarray(0, -2), trailing])), (e: unknown) => e instanceof PhotoError && e.reason === 'corrupt');
  });

  it('K2, limită cunoscută (cazul C): datele inserate ÎNAINTEA unui EOI valid rămân (fără re-codare nu pot fi deosebite)', () => {
    // Testul documentează limita acceptată de proprietar; dacă se adoptă re-codarea, testul se inversează.
    const inserted = Buffer.concat([JPEG.subarray(0, -2), Buffer.from(SECRET, 'latin1'), Buffer.from([0xff, 0xd9])]);
    assert.ok(cleanPhoto(inserted).data.includes(Buffer.from(SECRET, 'latin1')));
  });
});

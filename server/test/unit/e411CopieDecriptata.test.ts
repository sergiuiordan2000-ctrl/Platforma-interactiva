// E4.11 (auditul checkpointului, C1.a, C1.b, A6, A10): fără bază de date.
// - validarea efectivă a unei copii decriptate `civic-restore-<UTC>` (nu doar existența marcajului);
// - refuzul (nu `null`) când conținutul unei copii nu poate fi enumerat complet;
// - marcajul de timp din nume, validat strict, în UTC;
// - plasa de 24 h: o ștergere eșuată este raportată separat (neconformitate), nu ca o curățare reușită.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  DECRYPTED_COPY_FILE,
  claimsDecryptedCopy,
  decryptedCopyProblems,
  encryptedCopyReason,
  isDecryptedCopy,
  parseStampStrict,
  purgeStaleRestoreCopies,
} from '../../src/db/backupCrypto.ts';

const SOURCE = 'civic-backup-20261101T031700000Z';
const STAMP = '20261101T080000000Z';
const AT = '2026-11-01T08:00:00.000Z';

/** O copie decriptată validă, construită direct (fără criptare): manifestul sursei și marcajul corect. */
function validCopy(name = `civic-restore-${STAMP}`, marker: unknown = { format: 'civic-decrypted/1', source: SOURCE, decryptedAt: AT }): string {
  const dir = join(mkdtempSync(join(tmpdir(), 'civic-e411-dec-')), name);
  mkdirSync(join(dir, 'photos'), { recursive: true });
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ format: 'civic-backup/2', name: SOURCE, encryption: { scheme: 'age-x25519', recipient: 'age1x' } }));
  writeFileSync(join(dir, 'markers.json'), '{}\n');
  writeFileSync(join(dir, 'db.jsonl.gz'), 'x');
  writeFileSync(join(dir, DECRYPTED_COPY_FILE), typeof marker === 'string' ? marker : JSON.stringify(marker));
  return dir;
}
const failingLister = () => {
  throw Object.assign(new Error('simulat'), { code: 'EACCES' });
};

describe('E4.11 C1.b: validarea copiei decriptate', () => {
  it('o copie validă: fără probleme; se prezintă și este acceptată', () => {
    const d = validCopy();
    assert.deepEqual(decryptedCopyProblems(d), []);
    assert.equal(isDecryptedCopy(d), true);
    assert.equal(claimsDecryptedCopy(d), true);
    assert.equal(encryptedCopyReason(d), null, 'manifestul declară criptarea, dar copia decriptată validă este excepția');
  });

  const cases: Array<[string, () => string, RegExp]> = [
    ['marcaj lipsă', () => { const d = validCopy(); rmSync(join(d, DECRYPTED_COPY_FILE)); return d; }, /lipsește/],
    ['JSON invalid', () => validCopy(undefined, '{nu-json'), /nu este un JSON valid/],
    ['JSON care nu este obiect', () => validCopy(undefined, '[1,2]'), /nu are structura așteptată/],
    ['format greșit', () => validCopy(undefined, { format: 'civic-decrypted/2', source: SOURCE, decryptedAt: AT }), /format necunoscut/],
    ['sursă care nu este o copie', () => validCopy(undefined, { format: 'civic-decrypted/1', source: '../altceva', decryptedAt: AT }), /sursa nu este numele/],
    ['sursă cu dată imposibilă', () => validCopy(undefined, { format: 'civic-decrypted/1', source: 'civic-backup-20261399T031700000Z', decryptedAt: AT }), /sursa nu este numele/],
    ['decryptedAt nu este ISO UTC', () => validCopy(undefined, { format: 'civic-decrypted/1', source: SOURCE, decryptedAt: '2026-11-01 08:00' }), /nu este o dată ISO UTC/],
    ['decryptedAt cu fus orar', () => validCopy(undefined, { format: 'civic-decrypted/1', source: SOURCE, decryptedAt: '2026-11-01T10:00:00.000+02:00' }), /nu este o dată ISO UTC/],
    ['decryptedAt diferit de nume', () => validCopy(undefined, { format: 'civic-decrypted/1', source: SOURCE, decryptedAt: '2026-11-01T08:00:01.000Z' }), /nu corespunde marcajului de timp din nume/],
    ['nume valid ca formă, dată imposibilă', () => validCopy('civic-restore-20261332T250000000Z'), /nu este o dată UTC validă/],
    ['nume cu prefix, dar altă formă', () => validCopy('civic-restore-ieri'), /numele nu are forma/],
    ['manifestul altei copii', () => { const d = validCopy(); writeFileSync(join(d, 'manifest.json'), JSON.stringify({ name: 'civic-backup-20261031T031700000Z', encryption: { scheme: 'age-x25519', recipient: 'age1x' } })); return d; }, /manifestul nu este al copiei-sursă/],
    ['un fișier .age rămas', () => { const d = validCopy(); writeFileSync(join(d, 'photos', 'a.webp.age'), 'x'); return d; }, /conține fișiere criptate/],
  ];
  for (const [label, make, expected] of cases) {
    it(`${label} → nevalidă; se prezintă drept copie decriptată, deci trebuie refuzată`, () => {
      const d = make();
      const p = decryptedCopyProblems(d);
      assert.match(p.join('\n'), expected, label);
      assert.equal(isDecryptedCopy(d), false);
      assert.equal(claimsDecryptedCopy(d), true);
      assert.ok(encryptedCopyReason(d), `${label}: manifestul declară criptarea, iar copia nu este o copie decriptată validă`);
    });
  }

  it('un director oarecare (fără nume civic-restore și fără marcaj) nu se prezintă drept copie decriptată', () => {
    const d = join(mkdtempSync(join(tmpdir(), 'civic-e411-plain-')), SOURCE);
    mkdirSync(d);
    assert.equal(claimsDecryptedCopy(d), false);
  });
});

describe('E4.11 C1.a: refuz la o enumerare incompletă (fail-closed)', () => {
  it('o eroare la enumerarea conținutului → motiv de refuz, nu `null`', () => {
    const d = validCopy();
    assert.match(encryptedCopyReason(d, failingLister) ?? '', /nu poate fi enumerat complet \(EACCES\)/);
    assert.match(decryptedCopyProblems(d, failingLister).join('\n'), /nu poate fi enumerat complet/);
  });

  it('sursa este un fișier, nu un director → motiv de refuz', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'civic-e411-f-')), 'civic-backup-20261101T031700000Z');
    writeFileSync(f, 'x');
    assert.match(encryptedCopyReason(f) ?? '', /nu poate fi enumerat complet \(ENOTDIR\)/);
  });

  it('o sursă care nu există → `null` (refuzată de verificările obișnuite ale restaurării)', () => {
    assert.equal(encryptedCopyReason(join(tmpdir(), 'nu-exista-e411')), null);
  });
});

describe('E4.11 A6: marcajul de timp din nume, strict, în UTC', () => {
  it('date valide → acceptate; imposibile sau cu altă formă → `null`', () => {
    assert.equal(parseStampStrict('20261101T080000000Z')?.toISOString(), '2026-11-01T08:00:00.000Z');
    assert.equal(parseStampStrict('20240229T235959999Z')?.toISOString(), '2024-02-29T23:59:59.999Z');
    for (const bad of ['20261301T080000000Z', '20261132T080000000Z', '20230229T000000000Z', '20261101T240000000Z', '20261101T086000000Z', '20261101T080000000', '2026-11-01T08:00:00Z', '']) {
      assert.equal(parseStampStrict(bad), null, bad);
    }
  });
});

describe('E4.11 A10: plasa de 24 h — ștergerile eșuate sunt neconformități', () => {
  const NOW = new Date('2026-11-02T09:00:00.000Z');
  function backupDirWith(names: string[]): string {
    const d = mkdtempSync(join(tmpdir(), 'civic-e411-purge-'));
    for (const n of names) mkdirSync(join(d, n));
    return d;
  }

  it('expirată → ștearsă; recentă → păstrată; marcaj de timp invalid → tratată ca expirată (date în clar); alte directoare neatinse', () => {
    const d = backupDirWith(['civic-restore-20261101T080000000Z', 'civic-restore-20261102T080000000Z', 'civic-restore-20261399T000000000Z', 'civic-backup-20261101T031700000Z']);
    const r = purgeStaleRestoreCopies(d, NOW);
    assert.deepEqual(r.removed.sort(), ['civic-restore-20261101T080000000Z', 'civic-restore-20261399T000000000Z']);
    assert.deepEqual(r.failed, []);
    assert.ok(existsSync(join(d, 'civic-restore-20261102T080000000Z')));
    assert.ok(existsSync(join(d, 'civic-backup-20261101T031700000Z')));
  });

  it('o ștergere eșuată → raportată în `failed` (neconformitate), nu în `removed`', () => {
    const d = backupDirWith(['civic-restore-20261101T080000000Z']);
    const r = purgeStaleRestoreCopies(d, NOW, () => {
      throw Object.assign(new Error('simulat'), { code: 'EACCES' });
    });
    assert.deepEqual(r.removed, []);
    assert.deepEqual(r.failed, ['civic-restore-20261101T080000000Z (EACCES)']);
    assert.ok(existsSync(join(d, 'civic-restore-20261101T080000000Z')), 'copia a rămas: neconformitate');
  });
});

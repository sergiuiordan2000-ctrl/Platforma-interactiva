// rotate:totp-key (plan FAZA_5_4_ROTIRE_TOTP_PLAN.md): citirea cheii din fișierul de setări și refuzurile.
// Partea cu baza de date este în test/integration/rotateTotpKey.test.ts.

import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { RotateTotpKeyError, parseTotpKey, readTotpKeyLine } from '../../src/rotateTotpKey.ts';

const HEX = '0123456789abcdef'.repeat(4);
const BYTES = Buffer.from(HEX, 'hex');

function makeFile(content: string, mode = 0o600): string {
  const f = join(mkdtempSync(join(tmpdir(), 'civic-totp-')), 'civic.env');
  writeFileSync(f, content);
  chmodSync(f, mode);
  return f;
}

describe('rotate:totp-key — formatul cheii', () => {
  it('acceptă 64 de caractere hex și base64 de 32 de octeți, cu sau fără ghilimele', () => {
    assert.ok(parseTotpKey(HEX)!.equals(BYTES));
    assert.ok(parseTotpKey(HEX.toUpperCase())!.equals(BYTES));
    assert.ok(parseTotpKey(`  "${HEX}"  `)!.equals(BYTES));
    assert.ok(parseTotpKey(`'${HEX}'`)!.equals(BYTES));
    assert.ok(parseTotpKey(BYTES.toString('base64'))!.equals(BYTES));
  });

  it('respinge orice altceva', () => {
    for (const bad of ['', HEX.slice(1), `${HEX}0`, `${HEX} # comentariu`, 'parola', BYTES.subarray(0, 16).toString('base64'), `"${HEX}`]) {
      assert.equal(parseTotpKey(bad), null, bad);
    }
  });
});

describe('rotate:totp-key — rândul cheii din fișierul de setări', { skip: process.platform === 'win32' }, () => {
  it('găsește rândul, indiferent de `export`, spații sau sfârșit de rând Windows; nu modifică fișierul', () => {
    for (const [line, eol] of [
      [`TOTP_ENC_KEY=${HEX}`, '\n'],
      [`export TOTP_ENC_KEY = "${HEX}"`, '\n'],
      [`  TOTP_ENC_KEY=${BYTES.toString('base64')}`, '\r\n'],
    ] as const) {
      const content = ['# setări', 'APP_ENV=staging', line, 'LOG_LEVEL=info', ''].join(eol);
      const f = makeFile(content);
      const res = readTotpKeyLine(f);
      assert.equal(res.index, 2);
      assert.equal(res.eol, eol);
      assert.ok(res.key.equals(BYTES));
      assert.equal(res.lines.join(res.eol), content, 'fișierul se poate reconstitui caracter cu caracter');
      assert.equal(readFileSync(f, 'utf8'), content);
    }
  });

  it('refuză: fișier lipsă, drepturi prea largi, cheie lipsă, cheie de două ori, format greșit; mesajul nu conține valoarea', () => {
    const cases: Array<[string, RegExp]> = [
      [join(tmpdir(), 'civic-nu-exista', 'civic.env'), /nu există/],
      [makeFile(`TOTP_ENC_KEY=${HEX}\n`, 0o644), /drepturi 644/],
      [makeFile(`TOTP_ENC_KEY=${HEX}\n`, 0o640), /drepturi 640/],
      [makeFile('APP_ENV=staging\n# TOTP_ENC_KEY=comentat\n'), /lipsește/],
      [makeFile(`TOTP_ENC_KEY=${HEX}\nAPP_ENV=staging\nTOTP_ENC_KEY=${HEX}\n`), /apare de 2 ori/],
      [makeFile(`TOTP_ENC_KEY=${HEX}xyz\n`), /formatul așteptat/],
    ];
    for (const [file, pattern] of cases) {
      assert.throws(
        () => readTotpKeyLine(file),
        (e: unknown) => e instanceof RotateTotpKeyError && pattern.test(e.message) && !e.message.includes(HEX),
        String(pattern),
      );
    }
    assert.ok(readTotpKeyLine(makeFile(`TOTP_ENC_KEY=${HEX}\n`, 0o400)).key.equals(BYTES), 'drepturile 400 sunt acceptate');
  });
});

// rotate:keys (plan FAZA_5_4_ROTIRE_SECRETE_PLAN.md): numai cele 4 chei se schimbă; restul fișierului rămâne identic.

import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { ROTATED_KEYS, RotateKeysError, rotateKeysInFile } from '../../src/rotateKeys.ts';

const OLD = {
  IP_HASH_SECRET: 'vechi-ip-0123456789abcdef0123456789',
  PARTICIPATION_HMAC_SECRET: 'vechi-part-0123456789abcdef01234567',
  FORM_TOKEN_SECRET: '"vechi-form-0123456789abcdef0123456"',
  POW_HMAC_KEY: 'vechi-pow-0123456789abcdef012345678',
};
const OTHER = [
  '# setări staging',
  'APP_ENV=staging',
  'DATABASE_URL=mysql://u:Parola123@localhost:3306/db_civic',
  '',
  'TOTP_ENC_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'GEOCODER_USER_AGENT="Civic test (contact)"',
];

function makeFile(content: string, mode = 0o600): string {
  const f = join(mkdtempSync(join(tmpdir(), 'civic-rot-')), 'civic.env');
  writeFileSync(f, content);
  chmodSync(f, mode);
  return f;
}
const sample = (eol = '\n') =>
  [OTHER[0], OTHER[1], `IP_HASH_SECRET=${OLD.IP_HASH_SECRET}`, OTHER[2], `PARTICIPATION_HMAC_SECRET=${OLD.PARTICIPATION_HMAC_SECRET}`,
    OTHER[3], `FORM_TOKEN_SECRET=${OLD.FORM_TOKEN_SECRET}`, `POW_HMAC_KEY = ${OLD.POW_HMAC_KEY}`, OTHER[4], OTHER[5], ''].join(eol);

describe('rotate:keys — rotirea celor 4 chei din fișierul de setări', () => {
  it('schimbă numai cele 4 rânduri; valori noi, distincte, ≥ 32 de caractere; restul fișierului identic; drepturi 600', { skip: process.platform === 'win32' }, () => {
    const f = makeFile(sample());
    assert.deepEqual(rotateKeysInFile(f), [...ROTATED_KEYS]);
    const lines = readFileSync(f, 'utf8').split('\n');
    const env = Object.fromEntries(lines.filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1)]));
    const fresh = ROTATED_KEYS.map((k) => env[k]!);
    for (const [i, k] of ROTATED_KEYS.entries()) {
      assert.match(fresh[i]!, /^[A-Za-z0-9_-]{43}$/, k);
      assert.ok(!Object.values(OLD).includes(fresh[i]!), `${k} diferită de valoarea veche`);
    }
    assert.equal(new Set(fresh).size, 4, 'valori distincte');
    // celelalte rânduri: neschimbate, în aceeași ordine
    assert.deepEqual(lines.filter((l) => !ROTATED_KEYS.some((k) => l.startsWith(`${k}=`))), [...OTHER, '']);
    assert.equal(statSync(f).mode & 0o777, 0o600);
    assert.deepEqual(readdirSync(dirname(f)), ['civic.env'], 'fără fișiere temporare sau copii');
  });

  it('păstrează terminațiile de rând Windows (CRLF)', { skip: process.platform === 'win32' }, () => {
    const f = makeFile(sample('\r\n'));
    rotateKeysInFile(f);
    const t = readFileSync(f, 'utf8');
    assert.equal(t.split('\r\n').length, sample('\r\n').split('\r\n').length);
    assert.ok(!/[^\r]\n/.test(t));
  });

  it('refuzuri, fără nicio schimbare și fără valori în mesaj: drepturi 644, cheie lipsă, cheie dublă, fișier inexistent', { skip: process.platform === 'win32' }, () => {
    const check = (f: string, re: RegExp) => {
      const before = readFileSync(f, 'utf8');
      assert.throws(() => rotateKeysInFile(f), (e: unknown) => {
        assert.ok(e instanceof RotateKeysError);
        assert.match(e.message, re);
        for (const v of Object.values(OLD)) assert.ok(!e.message.includes(v));
        return true;
      });
      assert.equal(readFileSync(f, 'utf8'), before);
    };
    check(makeFile(sample(), 0o644), /600/);
    check(makeFile(sample().replace(/^POW_HMAC_KEY.*\n/m, '')), /POW_HMAC_KEY lipsește/);
    check(makeFile(sample() + `IP_HASH_SECRET=${OLD.IP_HASH_SECRET}\n`), /IP_HASH_SECRET apare de 2 ori/);
    assert.throws(() => rotateKeysInFile('/nu/exista/civic.env'), RotateKeysError);
  });
});

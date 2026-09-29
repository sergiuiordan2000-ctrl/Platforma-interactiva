import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { EnvFileError, loadEnvFileFromVar } from '../../src/envFile.ts';

describe('fișierul de setări CIVIC_ENV_FILE (decizia tehnică 5.1-A)', () => {
  it('fără variabilă: nimic nu se încarcă', () => {
    assert.equal(loadEnvFileFromVar({}), undefined);
  });

  it('fișier cu drepturi 600: variabilele sunt încărcate, fără a le suprascrie pe cele existente', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'civic-env-')), 'civic.env');
    writeFileSync(f, 'CIVIC_TEST_ENVFILE_A=din-fisier\nCIVIC_TEST_ENVFILE_B=din-fisier\n');
    chmodSync(f, 0o600);
    process.env.CIVIC_TEST_ENVFILE_B = 'din-mediu';
    assert.equal(loadEnvFileFromVar({ CIVIC_ENV_FILE: f }), f);
    assert.equal(process.env.CIVIC_TEST_ENVFILE_A, 'din-fisier');
    assert.equal(process.env.CIVIC_TEST_ENVFILE_B, 'din-mediu');
    delete process.env.CIVIC_TEST_ENVFILE_A;
    delete process.env.CIVIC_TEST_ENVFILE_B;
  });

  it('fișier citibil de alții (644) → refuz, fără conținut în mesaj', { skip: process.platform === 'win32' }, () => {
    const f = join(mkdtempSync(join(tmpdir(), 'civic-env-')), 'civic.env');
    writeFileSync(f, 'IP_HASH_SECRET=valoare-secreta\n');
    chmodSync(f, 0o644);
    assert.throws(() => loadEnvFileFromVar({ CIVIC_ENV_FILE: f }), (err: unknown) => {
      assert.ok(err instanceof EnvFileError);
      assert.match(err.message, /600/);
      assert.ok(!err.message.includes('valoare-secreta'));
      return true;
    });
  });

  it('fișier inexistent → refuz', () => {
    assert.throws(() => loadEnvFileFromVar({ CIVIC_ENV_FILE: '/nu/exista/civic.env' }), EnvFileError);
  });
});

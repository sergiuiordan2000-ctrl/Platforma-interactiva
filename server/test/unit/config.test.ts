import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';
import { ConfigError, loadConfig } from '../../src/config.ts';
import { testEnv } from '../helpers/env.ts';

function problems(env: NodeJS.ProcessEnv): string[] {
  try {
    loadConfig(env);
  } catch (err) {
    assert.ok(err instanceof ConfigError);
    return err.problems;
  }
  assert.fail('configurarea trebuia refuzată');
}

describe('configurare (00 §5): validare la pornire', () => {
  it('un mediu complet este acceptat, cu valorile implicite aprobate', () => {
    const c = loadConfig(testEnv());
    assert.equal(c.appEnv, 'development');
    assert.equal(c.retentionDays, 45);
    assert.equal(c.adminRetentionMonths, 6);
    assert.equal(c.email.mode, 'simulated');
    assert.equal(c.secrets.totpEncKey.length, 32);
    assert.equal(c.trustProxy, false);
  });

  for (const key of [
    'APP_ENV',
    'PUBLIC_BASE_URL',
    'DATABASE_URL',
    'STORAGE_DIR',
    'IP_HASH_SECRET',
    'PARTICIPATION_HMAC_SECRET',
    'FORM_TOKEN_SECRET',
    'POW_HMAC_KEY',
    'TOTP_ENC_KEY',
  ]) {
    it(`fără ${key} → refuz, cu numele variabilei`, () => {
      const p = problems(testEnv({ [key]: undefined }));
      assert.ok(p.some((x) => x.startsWith(`${key}:`)), p.join('; '));
    });
  }

  it('un secret prea scurt este refuzat, iar mesajul nu conține valoarea', () => {
    const value = 'scurt-dar-secret';
    const env = testEnv({ IP_HASH_SECRET: value });
    try {
      loadConfig(env);
      assert.fail('trebuia refuzat');
    } catch (err) {
      assert.ok(err instanceof ConfigError);
      assert.match(err.message, /IP_HASH_SECRET/);
      assert.ok(!err.message.includes(value), 'mesajul nu are voie să conțină secretul');
    }
  });

  it('TOTP_ENC_KEY: 32 de octeți în hex sau base64; altceva → refuz', () => {
    assert.equal(loadConfig(testEnv({ TOTP_ENC_KEY: randomBytes(32).toString('base64') })).secrets.totpEncKey.length, 32);
    assert.ok(problems(testEnv({ TOTP_ENC_KEY: randomBytes(16).toString('hex') })).some((x) => x.startsWith('TOTP_ENC_KEY')));
  });

  it('în afara dezvoltării PUBLIC_BASE_URL trebuie să fie https', () => {
    assert.ok(problems(testEnv({ APP_ENV: 'staging' })).some((x) => x.startsWith('PUBLIC_BASE_URL')));
    assert.equal(loadConfig(testEnv({ APP_ENV: 'staging', PUBLIC_BASE_URL: 'https://exemplu.test/' })).publicBaseUrl, 'https://exemplu.test');
  });

  it('retenția nu se poate seta peste valorile aprobate (45 de zile, 6 luni)', () => {
    assert.ok(problems(testEnv({ RETENTION_DAYS: '46' })).some((x) => x.startsWith('RETENTION_DAYS')));
    assert.ok(problems(testEnv({ ADMIN_RETENTION_MONTHS: '7' })).some((x) => x.startsWith('ADMIN_RETENTION_MONTHS')));
    assert.equal(loadConfig(testEnv({ RETENTION_DAYS: '45' })).retentionDays, 45);
  });

  it('EMAIL_MODE = allowlist cere lista și datele SMTP', () => {
    const p = problems(testEnv({ EMAIL_MODE: 'allowlist' }));
    for (const k of ['EMAIL_ALLOWLIST', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']) {
      assert.ok(p.some((x) => x.startsWith(k)), k);
    }
  });

  it('TRUST_PROXY: număr de hop-uri sau listă de adrese', () => {
    assert.equal(loadConfig(testEnv({ TRUST_PROXY: '1' })).trustProxy, 1);
    assert.deepEqual(loadConfig(testEnv({ TRUST_PROXY: '127.0.0.1, 10.0.0.1' })).trustProxy, ['127.0.0.1', '10.0.0.1']);
  });

  it('DATABASE_URL trebuie să fie mysql://', () => {
    assert.ok(problems(testEnv({ DATABASE_URL: 'postgres://x' })).some((x) => x.startsWith('DATABASE_URL')));
  });
});

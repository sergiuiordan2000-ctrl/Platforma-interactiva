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

  // 5.5a (B6 §2, decizia din 01.10.2026): o configurație de e-mail incompletă nu mai oprește aplicația
  // (înainte: ConfigError); modul devine `simulated`, iar problemele se raportează numai prin nume.
  it('EMAIL_MODE = allowlist fără listă și fără SMTP → aplicația pornește în `simulated`, cu problemele numite', () => {
    const c = loadConfig(testEnv({ EMAIL_MODE: 'allowlist' }));
    assert.equal(c.email.mode, 'simulated');
    assert.equal(c.email.requestedMode, 'allowlist');
    for (const k of ['EMAIL_ALLOWLIST', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'CIVIC_MAIL_DOMAIN']) {
      assert.ok(c.email.problems.some((x) => x.startsWith(k)), k);
    }
  });

  const smtpOk = {
    EMAIL_MODE: 'live', SMTP_HOST: 'smtp.exemplu.test', SMTP_PORT: '587', SMTP_USER: 'u', SMTP_PASS: 'parola-smtp-secreta',
    MAIL_FROM: 'notificari@civic.exemplu', CIVIC_MAIL_DOMAIN: 'civic.exemplu',
  };

  it('configurație SMTP completă și coerentă → modul cerut rămâne activ', () => {
    const c = loadConfig(testEnv(smtpOk));
    assert.equal(c.email.mode, 'live');
    assert.deepEqual(c.email.problems, []);
    const a = loadConfig(testEnv({ ...smtpOk, EMAIL_MODE: 'allowlist', EMAIL_ALLOWLIST: 'Test@Exemplu.test, b@exemplu.test' }));
    assert.equal(a.email.mode, 'allowlist');
    assert.deepEqual(a.email.allowlist, ['test@exemplu.test', 'b@exemplu.test']);
  });

  it('N3-4: expeditorul niciodată pe electrovolt.ro (nici subdomenii); domeniul MAIL_FROM = CIVIC_MAIL_DOMAIN', () => {
    const cases: Array<[Record<string, string>, string]> = [
      [{ MAIL_FROM: 'civic@electrovolt.ro', CIVIC_MAIL_DOMAIN: 'electrovolt.ro' }, 'electrovolt'],
      [{ MAIL_FROM: 'civic@civic-test.electrovolt.ro', CIVIC_MAIL_DOMAIN: 'civic-test.electrovolt.ro' }, 'electrovolt'],
      [{ MAIL_FROM: 'civic@alt-domeniu.ro' }, 'CIVIC_MAIL_DOMAIN'],
      [{ MAIL_FROM: 'Civic <civic@civic.exemplu>' }, 'adresă simplă'],
      [{ SMTP_PORT: '465', SMTP_SECURE: 'false' }, 'SMTP_SECURE'],
    ];
    for (const [over, needle] of cases) {
      const c = loadConfig(testEnv({ ...smtpOk, ...over }));
      assert.equal(c.email.mode, 'simulated', JSON.stringify(over));
      assert.ok(c.email.problems.some((p) => p.includes(needle)), `${JSON.stringify(over)} → ${c.email.problems.join(' | ')}`);
    }
  });

  it('problemele de e-mail nu conțin valori (parole, adrese)', () => {
    const c = loadConfig(testEnv({ ...smtpOk, MAIL_FROM: 'civic@electrovolt.ro' }));
    const text = c.email.problems.join(' ');
    assert.ok(!text.includes('parola-smtp-secreta') && !text.includes('civic@electrovolt.ro'));
  });

  it('TRUST_PROXY: număr de hop-uri sau listă de adrese', () => {
    assert.equal(loadConfig(testEnv({ TRUST_PROXY: '1' })).trustProxy, 1);
    assert.deepEqual(loadConfig(testEnv({ TRUST_PROXY: '127.0.0.1, 10.0.0.1' })).trustProxy, ['127.0.0.1', '10.0.0.1']);
  });

  it('DATABASE_URL trebuie să fie mysql://', () => {
    assert.ok(problems(testEnv({ DATABASE_URL: 'postgres://x' })).some((x) => x.startsWith('DATABASE_URL')));
  });
});

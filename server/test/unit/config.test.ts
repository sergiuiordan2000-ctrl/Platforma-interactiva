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

// Amendamentul Google, pasul 3 (G-T10): furnizorul de identitate fals al testelor E2E.
// Cine îl controlează poate declara orice adresă de e-mail, deci setarea este acceptată numai în dezvoltare.
describe('DEV_OIDC_PROVIDER_URL: numai în dezvoltare, numai pe același calculator', () => {
  const FAKE = 'http://localhost:6199';

  it('fără setare: nimic de test în configurare', () => {
    assert.equal(loadConfig(testEnv()).devOidcProviderUrl, undefined);
    assert.equal(loadConfig(testEnv({ DEV_OIDC_PROVIDER_URL: '  ' })).devOidcProviderUrl, undefined);
  });

  it('în dezvoltare, cu o adresă locală: acceptată', () => {
    assert.equal(loadConfig(testEnv({ DEV_OIDC_PROVIDER_URL: FAKE })).devOidcProviderUrl, FAKE);
    assert.equal(loadConfig(testEnv({ DEV_OIDC_PROVIDER_URL: 'http://127.0.0.1:6199/' })).devOidcProviderUrl, 'http://127.0.0.1:6199');
  });

  for (const appEnv of ['staging', 'production']) {
    it(`pe ${appEnv}: aplicația refuză să pornească, cu numele setării`, () => {
      const p = problems(testEnv({ APP_ENV: appEnv, PUBLIC_BASE_URL: 'https://civic.exemplu.test', DEV_OIDC_PROVIDER_URL: FAKE }));
      assert.deepEqual(p.filter((x) => !x.startsWith('DEV_OIDC_PROVIDER_URL')), [], 'singura problemă este setarea de test');
      assert.equal(p.length, 1);
      assert.match(p[0]!, /numai cu APP_ENV=development/);
    });
  }

  it('configurație greșită: APP_ENV=development, dar aplicația are o adresă publică → refuz (furnizorul fals numai cu aplicația locală)', () => {
    for (const base of ['https://civic.exemplu.test', 'http://civic.exemplu.test:3000', 'https://localhost:3000', 'http://192.168.1.20:3000']) {
      const p = problems(testEnv({ PUBLIC_BASE_URL: base, DEV_OIDC_PROVIDER_URL: FAKE }));
      assert.equal(p.length, 1, base);
      assert.match(p[0]!, /^DEV_OIDC_PROVIDER_URL: .*PUBLIC_BASE_URL este o adresă locală/, base);
    }
    // aceeași adresă publică, fără setarea de test: configurarea este validă (nu s-a schimbat nimic pentru restul)
    assert.equal(loadConfig(testEnv({ PUBLIC_BASE_URL: 'http://192.168.1.20:3000' })).devOidcProviderUrl, undefined);
  });

  it('configurație greșită: APP_ENV scris altfel decât cele trei valori → aplicația nu pornește deloc', () => {
    for (const appEnv of ['Development', 'DEVELOPMENT', 'dev', 'test', 'local', 'Staging', 'prod', ' development']) {
      const p = problems(testEnv({ APP_ENV: appEnv, DEV_OIDC_PROVIDER_URL: FAKE }));
      assert.ok(p.some((x) => x.startsWith('APP_ENV')), appEnv);
    }
  });

  it('pe staging și în producție, refuzul nu depinde de celelalte setări Google sau de forma adresei', () => {
    const google = { GOOGLE_OAUTH_CLIENT_ID: 'client.apps.exemplu', GOOGLE_OAUTH_CLIENT_SECRET: randomBytes(16).toString('hex') };
    for (const appEnv of ['staging', 'production']) {
      for (const url of [FAKE, 'http://127.0.0.1:6199', 'https://accounts.google.com', 'orice']) {
        const p = problems(testEnv({ APP_ENV: appEnv, PUBLIC_BASE_URL: 'https://civic.exemplu.test', ...google, DEV_OIDC_PROVIDER_URL: url }));
        assert.equal(p.length, 1, `${appEnv} ${url}`);
        assert.match(p[0]!, /^DEV_OIDC_PROVIDER_URL: .*numai cu APP_ENV=development/);
        assert.ok(!p[0]!.includes(url), 'mesajul nu repetă valoarea');
      }
      // setarea goală (rând rămas în fișier fără valoare) nu activează nimic și nu oprește aplicația
      const c = loadConfig(testEnv({ APP_ENV: appEnv, PUBLIC_BASE_URL: 'https://civic.exemplu.test', ...google, DEV_OIDC_PROVIDER_URL: '' }));
      assert.equal(c.devOidcProviderUrl, undefined);
    }
  });

  it('în dezvoltare, o adresă care nu este locală (sau nu este http, sau are cale) este refuzată', () => {
    for (const url of ['https://accounts.exemplu.test', 'http://idp.exemplu.test:6199', 'https://localhost:6199',
      'http://localhost', 'http://localhost:6199/cale', 'http://u:p@localhost:6199', 'localhost:6199', 'http://127.0.0.2:6199']) {
      const p = problems(testEnv({ DEV_OIDC_PROVIDER_URL: url }));
      assert.ok(p.some((x) => x.startsWith('DEV_OIDC_PROVIDER_URL')), url);
    }
  });
});

// Faza 6 (R1–R2): marcajele de lângă backup-uri au nevoie de BACKUP_DIR pe staging și în producție
describe('BACKUP_DIR: obligatoriu pe staging și în producție; separat de STORAGE_DIR', () => {
  const https = { PUBLIC_BASE_URL: 'https://exemplu.test' };

  it('în dezvoltare poate lipsi; prezent, ajunge în configurare', () => {
    assert.equal(loadConfig(testEnv()).backupDir, undefined);
    assert.equal(loadConfig(testEnv({ BACKUP_DIR: '/var/civic/backups' })).backupDir, '/var/civic/backups');
  });

  for (const appEnv of ['staging', 'production'] as const) {
    it(`APP_ENV=${appEnv}: fără BACKUP_DIR (lipsă sau gol) → aplicația nu pornește; cu BACKUP_DIR → acceptat`, () => {
      for (const value of [undefined, '', '   ']) {
        const p = problems(testEnv({ APP_ENV: appEnv, ...https, BACKUP_DIR: value }));
        assert.deepEqual(p, ['BACKUP_DIR: este obligatorie pe staging și în producție (directorul backup-urilor și al marcajelor, în afara oricărui docroot)']);
      }
      assert.equal(loadConfig(testEnv({ APP_ENV: appEnv, ...https, BACKUP_DIR: '/var/civic/backups' })).backupDir, '/var/civic/backups');
    });
  }

  it('același director cu STORAGE_DIR, sau unul în interiorul celuilalt → refuz, în orice mediu; mesajul nu repetă calea', () => {
    for (const [storage, backup] of [
      ['/var/civic/storage', '/var/civic/storage'],
      ['/var/civic/storage', '/var/civic/storage/backups'],
      ['/var/civic/backups/storage', '/var/civic/backups'],
      ['/var/civic/storage/', '/var/civic/storage/../storage'],
    ] as const) {
      const p = problems(testEnv({ STORAGE_DIR: storage, BACKUP_DIR: backup }));
      assert.equal(p.length, 1);
      assert.match(p[0]!, /^BACKUP_DIR: nu poate fi același director cu STORAGE_DIR/);
      assert.ok(!p[0]!.includes('/var/civic'));
    }
    // directoare vecine cu prefix comun: permise
    assert.ok(loadConfig(testEnv({ STORAGE_DIR: '/var/civic/storage', BACKUP_DIR: '/var/civic/storage-backups' })).backupDir);
  });
});

// Faza 6, varianta B (D-B2, 13.10.2026): limitele pe IP, pornite implicit numai în dezvoltare (RA-9).
describe('IP_RATE_LIMITS (D-B2): limitele pe IP numai cu adresa reală a vizitatorului', () => {
  const HTTPS = { PUBLIC_BASE_URL: 'https://civic.exemplu.test' };
  it('implicit: pornite în dezvoltare, oprite pe staging și în producție', () => {
    assert.equal(loadConfig(testEnv()).ipRateLimits, true);
    assert.equal(loadConfig(testEnv({ APP_ENV: 'staging', ...HTTPS })).ipRateLimits, false);
    assert.equal(loadConfig(testEnv({ APP_ENV: 'production', ...HTTPS })).ipRateLimits, false);
  });
  it('„off” le oprește și în dezvoltare; „on” pe staging cu TRUST_PROXY setat este acceptat', () => {
    assert.equal(loadConfig(testEnv({ IP_RATE_LIMITS: 'off' })).ipRateLimits, false);
    assert.equal(loadConfig(testEnv({ APP_ENV: 'staging', ...HTTPS, IP_RATE_LIMITS: 'on', TRUST_PROXY: '127.0.0.1' })).ipRateLimits, true);
  });
  for (const appEnv of ['staging', 'production']) {
    it(`„on” pe ${appEnv} fără TRUST_PROXY → refuz, cu numele setării (ar fi limite comune tuturor)`, () => {
      const p = problems(testEnv({ APP_ENV: appEnv, ...HTTPS, IP_RATE_LIMITS: 'on' }));
      assert.equal(p.length, 1);
      assert.match(p[0]!, /^IP_RATE_LIMITS/);
    });
  }
  it('altă valoare decât on / off → refuz', () => {
    assert.match(problems(testEnv({ IP_RATE_LIMITS: 'true' }))[0]!, /^IP_RATE_LIMITS/);
  });
});

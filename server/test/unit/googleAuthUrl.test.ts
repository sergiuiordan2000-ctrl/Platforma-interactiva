// Corecția de după audit (09.10.2026): validarea strictă a adresei la care interfața trimite browserul
// (`authorizationUrl`). Aceeași funcție rulează în interfață (`src/services/citizenService.ts`).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEV_OIDC_AUTHORIZATION_PATH, GOOGLE_AUTHORIZATION_ENDPOINT, safeGoogleAuthorizationUrl } from '@tmc/shared';
import { devOidcProviderFor, GOOGLE_PROVIDER } from '../../src/auth/googleOAuth.ts';

/** De unde este deschisă aplicația. */
const STAGING = { protocol: 'https:', hostname: 'test.civic.exemplu' };
const PRODUCTION = { protocol: 'https:', hostname: 'civic.exemplu' };
const LOCAL = { protocol: 'http:', hostname: '127.0.0.1' };
const LOCAL_NAME = { protocol: 'http:', hostname: 'localhost' };
const PUBLIC_PAGES = [STAGING, PRODUCTION, { protocol: 'http:', hostname: 'civic.exemplu.test' }, { protocol: 'http:', hostname: '192.168.1.20' },
  { protocol: 'https:', hostname: 'localhost' }, { protocol: 'https:', hostname: '127.0.0.1' }, { protocol: 'http:', hostname: 'localhost.exemplu.test' }];

/** Parametrii pe care îi trimite serverul (server/src/routes/citizenGoogle.ts). */
const params = (over: Record<string, string | undefined> = {}) => {
  const p: Record<string, string | undefined> = {
    response_type: 'code',
    client_id: 'client-de-test.apps.exemplu',
    redirect_uri: 'https://test.civic.exemplu/api/v1/citizen/auth/google/callback',
    scope: 'openid email',
    state: 'S'.repeat(43),
    nonce: 'N'.repeat(43),
    code_challenge: 'C'.repeat(43),
    code_challenge_method: 'S256',
    ...over,
  };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined) q.set(k, v);
  return q.toString();
};
const GOOGLE_URL = `${GOOGLE_AUTHORIZATION_ENDPOINT}?${params()}`;
const FAKE_URL = `http://localhost:6199${DEV_OIDC_AUTHORIZATION_PATH}?${params()}`;

describe('adresa de autorizare acceptată de interfață (audit 09.10.2026)', () => {
  it('adresa Google reală este acceptată de oriunde este deschisă aplicația și se întoarce neschimbată', () => {
    for (const page of [STAGING, PRODUCTION, LOCAL, LOCAL_NAME]) {
      assert.equal(safeGoogleAuthorizationUrl(GOOGLE_URL, page), GOOGLE_URL, JSON.stringify(page));
    }
  });

  it('interfața acceptă exact adresa pe care o folosește serverul pentru Google', () => {
    assert.equal(GOOGLE_PROVIDER.authorizationEndpoint, GOOGLE_AUTHORIZATION_ENDPOINT);
  });

  it('furnizorul fals local este acceptat numai când aplicația este deschisă de pe calculatorul local', () => {
    const provider = devOidcProviderFor({ appEnv: 'development', publicBaseUrl: 'http://127.0.0.1:6099', devOidcProviderUrl: 'http://localhost:6199' });
    assert.ok(provider);
    const fromServer = `${provider.authorizationEndpoint}?${params()}`;
    assert.equal(fromServer, FAKE_URL);
    for (const page of [LOCAL, LOCAL_NAME]) {
      assert.equal(safeGoogleAuthorizationUrl(FAKE_URL, page), FAKE_URL);
      assert.equal(safeGoogleAuthorizationUrl(FAKE_URL.replace('localhost', '127.0.0.1'), page), FAKE_URL.replace('localhost', '127.0.0.1'));
    }
  });

  it('pe staging, în producție sau de pe orice adresă care nu este locală: furnizorul local este respins', () => {
    for (const page of PUBLIC_PAGES) {
      assert.equal(safeGoogleAuthorizationUrl(FAKE_URL, page), null, JSON.stringify(page));
      assert.equal(safeGoogleAuthorizationUrl(FAKE_URL.replace('localhost', '127.0.0.1'), page), null, JSON.stringify(page));
    }
  });

  it('adrese externe arbitrare și adrese care seamănă cu Google: respinse, de oriunde', () => {
    const q = params();
    const bad = [
      `https://evil.exemplu.test/o/oauth2/v2/auth?${q}`,
      `https://accounts.google.com.evil.exemplu.test/o/oauth2/v2/auth?${q}`,
      `https://evil.exemplu.test/accounts.google.com/o/oauth2/v2/auth?${q}`,
      `https://accounts.google.com@evil.exemplu.test/o/oauth2/v2/auth?${q}`,
      `https://user:parola@accounts.google.com/o/oauth2/v2/auth?${q}`,
      `https://user@accounts.google.com/o/oauth2/v2/auth?${q}`,
      `https://accounts.google.com:8443/o/oauth2/v2/auth?${q}`,
      `https://accounts.google.com./o/oauth2/v2/auth?${q}`,
      `https://xaccounts.google.com/o/oauth2/v2/auth?${q}`,
      `https://accounts.google.co/o/oauth2/v2/auth?${q}`,
      `https://google.com/o/oauth2/v2/auth?${q}`,
      `https://www.google.com/url?q=https://evil.exemplu.test&${q}`,
      `https://accounts.google.com/o/oauth2/auth?${q}`,
      `https://accounts.google.com/o/oauth2/v2/auth/alt?${q}`,
      `https://accounts.google.com/o/oauth2/v2/auth/../../../signout?${q}`,
      `https://accounts.google.com/?${q}`,
      `https://accounts.google.com//o/oauth2/v2/auth?${q}`,
      `https://ACCOUNTS.GOOGLE.COM.evil.exemplu.test/o/oauth2/v2/auth?${q}`,
      `https://accounts.google.com\\@evil.exemplu.test/o/oauth2/v2/auth?${q}`,
      `https://evil.exemplu.test\\@accounts.google.com/o/oauth2/v2/auth?${q}`,
      `https://accounts.google.com/o/oauth2/v2/auth?${q}#https://evil.exemplu.test`,
      `https://accounts.google.com/o/oauth2/v2/auth?${q}#`,
    ];
    for (const page of [STAGING, PRODUCTION, LOCAL, LOCAL_NAME]) {
      for (const url of bad) assert.equal(safeGoogleAuthorizationUrl(url, page), null, `${page.hostname}: ${url}`);
    }
  });

  it('scheme nepermise: respinse (inclusiv http către Google)', () => {
    const q = params();
    const bad = [
      `http://accounts.google.com/o/oauth2/v2/auth?${q}`,
      `javascript:alert(document.domain)//accounts.google.com/o/oauth2/v2/auth?${q}`,
      'javascript:alert(1)',
      `data:text/html,<script>alert(1)</script>?${q}`,
      `ftp://accounts.google.com/o/oauth2/v2/auth?${q}`,
      `file:///etc/passwd?${q}`,
      `blob:https://accounts.google.com/o/oauth2/v2/auth?${q}`,
      `intent://accounts.google.com/o/oauth2/v2/auth?${q}`,
      `ws://localhost:6199/authorize?${q}`,
      `https://localhost:6199/authorize?${q}`,
      `ftp://localhost:6199/authorize?${q}`,
    ];
    for (const page of [STAGING, LOCAL]) {
      for (const url of bad) assert.equal(safeGoogleAuthorizationUrl(url, page), null, `${page.hostname}: ${url}`);
    }
  });

  it('adrese neconforme: relative, fără schemă, goale, cu spații sau caractere de control, prea lungi, de alt tip', () => {
    const q = params();
    const bad: unknown[] = [
      '', ' ', '/o/oauth2/v2/auth', `//accounts.google.com/o/oauth2/v2/auth?${q}`, `accounts.google.com/o/oauth2/v2/auth?${q}`,
      `/\\accounts.google.com/o/oauth2/v2/auth?${q}`, `?${q}`, '#sesizari',
      ` ${GOOGLE_URL}`, `${GOOGLE_URL} `, `${GOOGLE_URL}\n`, `\t${GOOGLE_URL}`, GOOGLE_URL.replace('https://', 'https://\n'),
      GOOGLE_URL.replace('accounts', 'acc\tounts'), `${GOOGLE_URL}&x=${'a'.repeat(5000)}`, `${GOOGLE_URL}&x=é`, `${GOOGLE_URL}\u0000`,
      undefined, null, 0, 1, true, {}, [], [GOOGLE_URL], { toString: () => GOOGLE_URL }, new URL(GOOGLE_URL),
    ];
    for (const page of [STAGING, LOCAL]) {
      for (const value of bad) assert.equal(safeGoogleAuthorizationUrl(value, page), null, `${page.hostname}: ${String(value).slice(0, 80)}`);
    }
  });

  it('furnizorul local: altă cale, fără port, alt calculator din rețea, nume care seamănă cu localhost → respinse și local', () => {
    const q = params();
    const bad = [
      `http://localhost:6199/altceva?${q}`,
      `http://localhost:6199/authorize/x?${q}`,
      `http://localhost:6199/?${q}`,
      `http://localhost/authorize?${q}`,
      `http://127.0.0.1/authorize?${q}`,
      `http://192.168.1.20:6199/authorize?${q}`,
      `http://127.0.0.2:6199/authorize?${q}`,
      `http://0.0.0.0:6199/authorize?${q}`,
      `http://[::1]:6199/authorize?${q}`,
      `http://localhost.evil.exemplu.test:6199/authorize?${q}`,
      `http://evil.exemplu.test:6199/authorize?${q}`,
      `http://localhost:6199@evil.exemplu.test/authorize?${q}`,
      `http://user@localhost:6199/authorize?${q}`,
      `http://2130706433:6199/authorize?${q}`.replace('2130706433', 'evil-2130706433.exemplu.test'),
    ];
    for (const url of bad) assert.equal(safeGoogleAuthorizationUrl(url, LOCAL), null, url);
  });

  it('parametri neconformi: alt `response_type`, alte date cerute, PKCE lipsă sau slab, parametri lipsă sau repetați', () => {
    const bad = [
      params({ response_type: 'token' }), params({ response_type: 'id_token' }), params({ response_type: undefined }),
      params({ scope: 'openid email profile' }), params({ scope: 'openid' }), params({ scope: 'email openid' }), params({ scope: undefined }),
      params({ code_challenge_method: 'plain' }), params({ code_challenge_method: undefined }), params({ code_challenge: undefined }),
      params({ state: undefined }), params({ state: '' }), params({ nonce: undefined }), params({ client_id: undefined }), params({ redirect_uri: undefined }),
      `${params()}&scope=openid+email+profile`, `${params()}&response_type=token`, `${params()}&redirect_uri=https%3A%2F%2Fevil.exemplu.test`,
      `${params()}&state=altul`, '',
    ];
    for (const q of bad) {
      assert.equal(safeGoogleAuthorizationUrl(`${GOOGLE_AUTHORIZATION_ENDPOINT}?${q}`, STAGING), null, q);
      assert.equal(safeGoogleAuthorizationUrl(`http://localhost:6199/authorize?${q}`, LOCAL), null, q);
    }
    // parametrii în plus, nefolosiți de reguli, nu strică o adresă validă
    assert.ok(safeGoogleAuthorizationUrl(`${GOOGLE_URL}&prompt=select_account`, STAGING));
  });
});

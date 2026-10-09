// Amendamentul Google, pasul 3 (G-T10): alegerea furnizorului OpenID Connect.
// Furnizorul fals al testelor E2E se folosește numai în dezvoltare; altfel, întotdeauna Google.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GOOGLE_AUTHORIZATION_ENDPOINT, safeGoogleAuthorizationUrl } from '@tmc/shared';
import { devOidcProviderFor, GOOGLE_PROVIDER, googleProvider, type ExchangeParams } from '../../src/auth/googleOAuth.ts';

const FAKE = 'http://localhost:6199';
const LOCAL_APP = 'http://127.0.0.1:6099';
const PUBLIC_APP = 'https://civic.exemplu.test';
const PARAMS: ExchangeParams = { code: 'cod', codeVerifier: 'verificator', redirectUri: 'http://127.0.0.1:3000/intoarcere', clientId: 'client', clientSecret: 'secret' };

/** Un `fetch` care notează adresele cerute și răspunde ca un furnizor. */
function recordingFetch() {
  const urls: string[] = [];
  const impl = (async (input: Parameters<typeof fetch>[0]) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ id_token: 'jeton', keys: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { urls, impl };
}

describe('furnizorul OpenID Connect: fals numai în dezvoltare (G-T10)', () => {
  it('fără setare, în orice mediu: niciun furnizor de test (se folosește Google)', () => {
    for (const appEnv of ['development', 'staging', 'production']) {
      assert.equal(devOidcProviderFor({ appEnv, publicBaseUrl: appEnv === 'development' ? LOCAL_APP : PUBLIC_APP }), undefined, appEnv);
    }
  });

  it('pe staging și în producție: niciun furnizor de test, chiar dacă adresa ar ajunge în configurare', () => {
    for (const appEnv of ['staging', 'production', 'test', '', 'Development', 'DEVELOPMENT', 'development ', 'dev']) {
      assert.equal(devOidcProviderFor({ appEnv, publicBaseUrl: PUBLIC_APP, devOidcProviderUrl: FAKE }), undefined, appEnv);
      // nici cu adresa aplicației locală: mediul decide
      assert.equal(devOidcProviderFor({ appEnv, publicBaseUrl: LOCAL_APP, devOidcProviderUrl: FAKE }), undefined, appEnv);
    }
  });

  it('configurație greșită, APP_ENV=development pe un server public: niciun furnizor de test (aplicația nu este locală)', () => {
    for (const publicBaseUrl of [PUBLIC_APP, 'https://test.urbisactiv.exemplu', 'http://civic.exemplu.test:3000', 'https://localhost:3000', 'http://192.168.1.20:3000']) {
      assert.equal(devOidcProviderFor({ appEnv: 'development', publicBaseUrl, devOidcProviderUrl: FAKE }), undefined, publicBaseUrl);
    }
  });

  it('în dezvoltare, un furnizor care nu este local: niciun furnizor de test', () => {
    for (const devOidcProviderUrl of ['https://idp.exemplu.test', 'http://idp.exemplu.test:6199', 'http://192.168.1.20:6199', 'https://localhost:6199']) {
      assert.equal(devOidcProviderFor({ appEnv: 'development', publicBaseUrl: LOCAL_APP, devOidcProviderUrl }), undefined, devOidcProviderUrl);
    }
  });

  it('în dezvoltare, cu setarea: toate adresele furnizorului sunt cele locale, niciuna la Google', async () => {
    const { urls, impl } = recordingFetch();
    const provider = devOidcProviderFor({ appEnv: 'development', publicBaseUrl: LOCAL_APP, devOidcProviderUrl: FAKE }, impl);
    assert.ok(provider);
    assert.equal(provider.authorizationEndpoint, `${FAKE}/authorize`);
    assert.deepEqual(provider.issuers, [FAKE]);
    assert.equal(await provider.exchangeCode(PARAMS), 'jeton');
    assert.deepEqual(await provider.jwks(true), []);
    assert.deepEqual(urls, [`${FAKE}/token`, `${FAKE}/jwks`]);
  });

  it('furnizorul real folosește numai adresele Google', async () => {
    const { urls, impl } = recordingFetch();
    const provider = googleProvider(impl);
    assert.equal(provider.authorizationEndpoint, 'https://accounts.google.com/o/oauth2/v2/auth');
    // aceeași adresă pe care o acceptă interfața (shared/src/googleAuthUrl.ts): dacă cele două s-ar despărți, fluxul real s-ar opri
    assert.equal(provider.authorizationEndpoint, GOOGLE_AUTHORIZATION_ENDPOINT);
    assert.deepEqual(provider.issuers, GOOGLE_PROVIDER.issuers);
    await provider.exchangeCode(PARAMS);
    await provider.jwks(true);
    assert.deepEqual(urls, ['https://oauth2.googleapis.com/token', 'https://www.googleapis.com/oauth2/v3/certs']);
  });
});

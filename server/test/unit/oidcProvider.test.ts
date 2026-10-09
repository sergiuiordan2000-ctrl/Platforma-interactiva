// Amendamentul Google, pasul 3 (G-T10): alegerea furnizorului OpenID Connect.
// Furnizorul fals al testelor E2E se folosește numai în dezvoltare; altfel, întotdeauna Google.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { devOidcProviderFor, GOOGLE_PROVIDER, googleProvider, type ExchangeParams } from '../../src/auth/googleOAuth.ts';

const FAKE = 'http://localhost:6199';
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
      assert.equal(devOidcProviderFor({ appEnv }), undefined, appEnv);
    }
  });

  it('pe staging și în producție: niciun furnizor de test, chiar dacă adresa ar ajunge în configurare', () => {
    for (const appEnv of ['staging', 'production', 'test', '']) {
      assert.equal(devOidcProviderFor({ appEnv, devOidcProviderUrl: FAKE }), undefined, appEnv);
    }
  });

  it('în dezvoltare, cu setarea: toate adresele furnizorului sunt cele locale, niciuna la Google', async () => {
    const { urls, impl } = recordingFetch();
    const provider = devOidcProviderFor({ appEnv: 'development', devOidcProviderUrl: FAKE }, impl);
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
    assert.deepEqual(provider.issuers, GOOGLE_PROVIDER.issuers);
    await provider.exchangeCode(PARAMS);
    await provider.jwks(true);
    assert.deepEqual(urls, ['https://oauth2.googleapis.com/token', 'https://www.googleapis.com/oauth2/v3/certs']);
  });
});

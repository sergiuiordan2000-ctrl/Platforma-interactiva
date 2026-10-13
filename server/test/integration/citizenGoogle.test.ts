// Autentificarea cetățeanului cu Google (amendamentul Google, versiunea finală din 08.10.2026: §8 A–D, §9, §11).
// Furnizor OpenID Connect fals, local (G-T10): cheie RSA generată în test, fără apeluri reale la Google.

import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, sign as cryptoSign, type KeyObject } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { CITIZEN_POLICY_VERSION, GOOGLE_AUTHORIZATION_ENDPOINT, safeGoogleAuthorizationUrl } from '@tmc/shared';
import { requestLogSerializer } from '../../src/app.ts';
import { sha256Hex } from '../../src/auth/crypto.ts';
import { devOidcProviderFor, pkceChallenge, type ExchangeParams, type OidcProvider } from '../../src/auth/googleOAuth.ts';
import type { DbHandle } from '../../src/db/client.ts';
import { migrate } from '../../src/db/migrations.ts';
import { seedConfig } from '../../src/db/seeds.ts';
import { purgeRetention } from '../../src/maintenance.ts';
import { MIGRATIONS_DIR, SEEDS_DIR } from '../../src/paths.ts';
import { emailHash } from '../../src/routes/citizens.ts';
import type { AppContext } from '../../src/context.ts';
import { Client, Clock, makeApp } from '../helpers/apiClient.ts';
import { openTestDb, resetTestDb } from '../helpers/db.ts';

const V1 = '/api/v1';
const CLIENT_ID = 'client-id-de-test.apps.exemplu';
const ISSUER = 'https://idp.exemplu.test';
const SUB = 'sub-unic-de-test-7319460285';
const GOOGLE_ENV = { GOOGLE_OAUTH_CLIENT_ID: CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET: 'secret-de-test-' + randomBytes(16).toString('hex') };

let h: DbHandle;
const clock = new Clock();
const q = async <T>(sql: string, p: unknown[] = []) => (await h.pool.query(sql, p))[0] as T[];

// ——— furnizorul fals ———
const keyPair = () => generateKeyPairSync('rsa', { modulusLength: 2048 });
const good = keyPair();
const other = keyPair();
const KID = 'cheie-test-1';
const jwk = { ...(good.publicKey.export({ format: 'jwk' }) as object), kid: KID, kty: 'RSA', alg: 'RS256', use: 'sig' };

type Claims = Record<string, unknown>;
function signToken(claims: Claims, opts: { key?: KeyObject; kid?: string; alg?: string } = {}): string {
  const header = { alg: opts.alg ?? 'RS256', kid: opts.kid ?? KID, typ: 'JWT' };
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const data = `${enc(header)}.${enc(claims)}`;
  const sig = cryptoSign('RSA-SHA256', Buffer.from(data), opts.key ?? good.privateKey).toString('base64url');
  return `${data}.${sig}`;
}

/** Codul de autorizare → ce jeton întoarce furnizorul (construit cu `nonce`-ul încercării). */
const issued = new Map<string, { challenge: string; token: (nonce: string) => string }>();
let exchanges: ExchangeParams[] = [];
const fakeProvider: OidcProvider = {
  authorizationEndpoint: `${ISSUER}/autorizare`,
  issuers: [ISSUER],
  async exchangeCode(p) {
    exchanges.push(p);
    const entry = issued.get(p.code);
    if (!entry) throw new Error('cod necunoscut');
    if (pkceChallenge(p.codeVerifier) !== entry.challenge) throw new Error('PKCE greșit');
    return entry.token(nonceByChallenge.get(entry.challenge)!);
  },
  async jwks() {
    return [jwk];
  },
};
const nonceByChallenge = new Map<string, string>();

const nowSec = () => Math.floor(clock.now().getTime() / 1000);
const claims = (email: string, nonce: string, over: Claims = {}): Claims => ({
  iss: ISSUER, aud: CLIENT_ID, sub: SUB, email, email_verified: true, nonce, iat: nowSec(), exp: nowSec() + 3600, ...over,
});

// ——— clientul HTTP (două cookie-uri: încercarea OAuth și sesiunea) ———
type Started = { res: LightMyRequestResponse; state: string; nonce: string; challenge: string; cookie: string; url: URL };

function setCookies(res: LightMyRequestResponse): string[] {
  const set = res.headers['set-cookie'];
  return Array.isArray(set) ? set : set ? [set] : [];
}

async function start(app: FastifyInstance, body: unknown = { policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION },
  opts: { origin?: string; ip?: string; csrf?: boolean } = {}): Promise<Started> {
  const res = await app.inject({
    method: 'POST',
    url: `${V1}/citizen/auth/google/start`,
    payload: body as object,
    remoteAddress: opts.ip ?? nextIp(),
    headers: { ...(opts.csrf === false ? {} : { 'x-civic-request': '1' }), origin: opts.origin ?? 'http://localhost:3000' },
  });
  if (res.statusCode !== 200) return { res, state: '', nonce: '', challenge: '', cookie: '', url: new URL('http://x') };
  const url = new URL(res.json().authorizationUrl);
  const state = url.searchParams.get('state')!;
  const nonce = url.searchParams.get('nonce')!;
  const challenge = url.searchParams.get('code_challenge')!;
  nonceByChallenge.set(challenge, nonce);
  const pair = setCookies(res).find((c) => /civic_oauth=/.test(c))!.split(';')[0]!;
  return { res, state, nonce, challenge, cookie: pair, url };
}

let codeSeq = 0;
let ipSeq = 0;
/** IP nou la fiecare cerere: limitele pe IP (G-T9) se testează separat. */
const nextIp = () => `10.20.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;
/** Furnizorul „emite” un cod pentru încercarea pornită; `token` construiește jetonul din `nonce`. */
function issueCode(s: Started, token: (nonce: string) => string): string {
  const code = `cod-${++codeSeq}-${randomBytes(4).toString('hex')}`;
  issued.set(code, { challenge: s.challenge, token });
  return code;
}

async function callback(app: FastifyInstance, query: Record<string, string>, cookie?: string, ip = nextIp()) {
  const qs = new URLSearchParams(query).toString();
  return app.inject({ method: 'GET', url: `${V1}/citizen/auth/google/callback?${qs}`, remoteAddress: ip, headers: cookie ? { cookie } : {} });
}

const sessionCookie = (res: LightMyRequestResponse) => setCookies(res).find((c) => /civic_sid=[^;]+/.test(c) && !/civic_sid=;/.test(c));
const meWith = async (app: FastifyInstance, res: LightMyRequestResponse) => {
  const sid = sessionCookie(res)!.split(';')[0]!;
  return app.inject({ method: 'GET', url: `${V1}/citizen/me`, headers: { cookie: sid } });
};
const accountCount = async (email: string) => Number((await q<{ n: number }>('SELECT COUNT(*) AS n FROM citizen_accounts WHERE email_normalized = ?', [email]))[0]!.n);

/** Flux complet reușit pentru o adresă; întoarce răspunsul callback-ului. */
async function googleLogin(app: FastifyInstance, email: string, over: Claims = {}) {
  const s = await start(app);
  assert.equal(s.res.statusCode, 200, s.res.body);
  const code = issueCode(s, (nonce) => signToken(claims(email, nonce, over)));
  return { s, res: await callback(app, { state: s.state, code }, s.cookie) };
}

let app: FastifyInstance;
let ctx: AppContext;

before(async () => {
  h = openTestDb();
  await resetTestDb(h.pool);
  await migrate(h.pool, MIGRATIONS_DIR);
  await seedConfig(h.pool, SEEDS_DIR);
  ({ app, ctx } = await makeApp(h, clock, GOOGLE_ENV, { oidc: fakeProvider }));
});
after(async () => {
  await app.close();
  await h.close();
});

describe('Google: configurare (G-T7)', () => {
  it('fără GOOGLE_OAUTH_CLIENT_ID / _SECRET: toate rutele → 404, fără încercare creată', async () => {
    const { app: off } = await makeApp(h, clock, {}, { oidc: fakeProvider });
    try {
      assert.equal((await off.inject({ method: 'GET', url: `${V1}/citizen/auth/google` })).statusCode, 404, '§12.1: butonul nu apare');
      assert.equal((await start(off)).res.statusCode, 404);
      assert.equal((await callback(off, { state: 'x', code: 'y' })).statusCode, 404);
      assert.equal((await q('SELECT id FROM citizen_oauth_attempts')).length, 0);
    } finally {
      await off.close();
    }
  });

  it('numai una dintre cele două variabile → aplicația nu pornește (mesaj fără valoare)', async () => {
    await assert.rejects(makeApp(h, clock, { GOOGLE_OAUTH_CLIENT_ID: CLIENT_ID }), (err: Error) =>
      /GOOGLE_OAUTH_CLIENT_SECRET/.test(err.message) && !err.message.includes(CLIENT_ID));
  });
});

describe('Google: pornirea (§8 A, §8 D, §11.1, §11.2)', () => {
  it('§12.1: GET /citizen/auth/google → 200 { enabled: true }, fără încercare și fără cookie', async () => {
    const res = await app.inject({ method: 'GET', url: `${V1}/citizen/auth/google` });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { enabled: true });
    assert.equal(setCookies(res).length, 0);
    assert.equal((await q('SELECT id FROM citizen_oauth_attempts')).length, 0);
  });

  it('§8 A: fără bifă / fără versiune / cu versiune greșită → 422, fără încercare și fără cookie', async () => {
    for (const body of [{}, { policyAccepted: true }, { policyAccepted: false, policyVersion: CITIZEN_POLICY_VERSION },
      { policyAccepted: true, policyVersion: '2000-01' }]) {
      const { res } = await start(app, body);
      assert.equal(res.statusCode, 422, JSON.stringify(body));
      assert.equal(res.json().error.code, 'POLICY_REQUIRED');
      assert.equal(setCookies(res).length, 0, 'fără cookie');
    }
    assert.equal((await q('SELECT id FROM citizen_oauth_attempts')).length, 0, 'fără încercare');
  });

  it('§11.1: POST sub protecția CSRF: fără antetul X-Civic-Request sau de pe altă origine → 403; GET → 404', async () => {
    assert.equal((await start(app, undefined, { csrf: false })).res.statusCode, 403);
    assert.equal((await start(app, undefined, { origin: 'https://atacator.exemplu' })).res.statusCode, 403);
    assert.equal((await app.inject({ method: 'GET', url: `${V1}/citizen/auth/google/start` })).statusCode, 404);
    assert.equal((await q('SELECT id FROM citizen_oauth_attempts')).length, 0);
  });

  it('pornire validă: adresa Google (numai openid email, PKCE S256), încercarea pe server (hash state), cookie-ul', async () => {
    const s = await start(app);
    assert.equal(s.res.statusCode, 200);
    assert.equal(`${s.url.origin}${s.url.pathname}`, `${ISSUER}/autorizare`);
    assert.equal(s.url.searchParams.get('scope'), 'openid email');
    assert.equal(s.url.searchParams.get('response_type'), 'code');
    assert.equal(s.url.searchParams.get('client_id'), CLIENT_ID);
    assert.equal(s.url.searchParams.get('redirect_uri'), 'http://localhost:3000/api/v1/citizen/auth/google/callback');
    assert.equal(s.url.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(s.state.length >= 43 && s.nonce.length >= 43, '32 de octeți, base64url');
    assert.notEqual(s.state, s.nonce);
    const rows = await q<{ id: string; policy_version: string; consumed_at: Date | null; created_at: Date; expires_at: Date }>(
      'SELECT id, policy_version, consumed_at, created_at, expires_at FROM citizen_oauth_attempts WHERE id = ?', [sha256Hex(s.state)]);
    assert.equal(rows.length, 1, 'pe server numai hash-ul lui state');
    assert.equal((await q('SELECT id FROM citizen_oauth_attempts WHERE id = ?', [s.state])).length, 0);
    assert.equal(rows[0]!.policy_version, CITIZEN_POLICY_VERSION);
    assert.equal(rows[0]!.consumed_at, null);
    assert.equal(rows[0]!.expires_at.getTime() - rows[0]!.created_at.getTime(), 10 * 60_000);
    const c = setCookies(s.res).find((x) => x.startsWith('civic_oauth='))!;
    assert.match(c, /; HttpOnly/i);
    assert.match(c, /; SameSite=Lax/i);
    assert.match(c, /; Path=\//);
    assert.match(c, /; Max-Age=600/);
    assert.doesNotMatch(c, /Domain=/i);
    assert.equal(c.split(';')[0], `civic_oauth=${s.state}`, 'cookie-ul conține numai state');
  });

  it('§16: adresa cere de fiecare dată alegerea contului (`prompt=select_account`), o singură dată', async () => {
    const s = await start(app);
    assert.equal(s.res.statusCode, 200);
    assert.deepEqual(s.url.searchParams.getAll('prompt'), ['select_account']);
  });

  it('limită pe IP: a 21-a pornire într-o oră → 429; a 21-a întoarcere → google=limita, fără sesiune', async () => {
    for (let i = 0; i < 20; i++) assert.equal((await start(app, undefined, { ip: '10.7.7.7' })).res.statusCode, 200);
    assert.equal((await start(app, undefined, { ip: '10.7.7.7' })).res.statusCode, 429);
    for (let i = 0; i < 20; i++) await callback(app, { state: 'x', code: 'y' }, undefined, '10.8.8.8');
    const s = await start(app);
    const code = issueCode(s, (n) => signToken(claims('limita@exemplu.test', n)));
    const res = await callback(app, { state: s.state, code }, s.cookie, '10.8.8.8');
    assert.equal(res.headers.location, '/#sesizari?google=limita');
    assert.equal(sessionCookie(res), undefined);
    assert.equal(await accountCount('limita@exemplu.test'), 0);
  });
});

describe('Google: întoarcerea — reușită și același cont (G-3, §9.2)', () => {
  it('cont nou: activ, confirmat, cu versiunea politicii; sesiunea de cetățean; 303 spre /#sesizari; încercarea folosită; cookie șters', async () => {
    const { s, res } = await googleLogin(app, 'Ana.Google@Exemplu.test');
    assert.equal(res.statusCode, 303);
    assert.equal(res.headers.location, '/#sesizari');
    const [acc] = await q<{ email: string; status: string; policy_version: string; confirmed_at: Date | null }>(
      "SELECT email, status, policy_version, confirmed_at FROM citizen_accounts WHERE email_normalized = 'ana.google@exemplu.test'");
    assert.equal(acc!.status, 'active');
    assert.equal(acc!.policy_version, CITIZEN_POLICY_VERSION);
    assert.ok(acc!.confirmed_at);
    const me = await meWith(app, res);
    assert.equal(me.statusCode, 200);
    assert.equal(me.json().email, 'Ana.Google@Exemplu.test');
    const [att] = await q<{ consumed_at: Date | null }>('SELECT consumed_at FROM citizen_oauth_attempts WHERE id = ?', [sha256Hex(s.state)]);
    assert.ok(att!.consumed_at, 'marcată folosită');
    const cleared = setCookies(res).find((x) => x.startsWith('civic_oauth='))!;
    assert.match(cleared, /^civic_oauth=;/);
    assert.match(cleared, /; Max-Age=0/);
    assert.match(cleared, /; Path=\//);
    assert.doesNotMatch(cleared, /Domain=/i);
    assert.equal(exchanges.at(-1)!.redirectUri, 'http://localhost:3000/api/v1/citizen/auth/google/callback');
  });

  it('același cont ca la cod (un e-mail = un cont); versiunea politicii unui cont existent nu se schimbă (§9.2)', async () => {
    const c = new Client(app);
    await c.post(`${V1}/citizen/auth/start`, { email: 'ion.cod@exemplu.test', policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION });
    await q("UPDATE citizen_accounts SET policy_version = '2025-01' WHERE email_normalized = 'ion.cod@exemplu.test'");
    const [before] = await q<{ id: string }>("SELECT id FROM citizen_accounts WHERE email_normalized = 'ion.cod@exemplu.test'");
    const { res } = await googleLogin(app, 'ION.COD@exemplu.test');
    assert.equal(res.statusCode, 303);
    assert.equal(res.headers.location, '/#sesizari');
    assert.equal(await accountCount('ion.cod@exemplu.test'), 1);
    const [after] = await q<{ id: string; status: string; policy_version: string }>(
      "SELECT id, status, policy_version FROM citizen_accounts WHERE email_normalized = 'ion.cod@exemplu.test'");
    assert.equal(after!.id, before!.id);
    assert.equal(after!.status, 'active', 'Google confirmă adresa, ca primul cod');
    assert.equal(after!.policy_version, '2025-01');
    // și invers: contul creat cu Google primește cod pe aceeași adresă (fără cont nou)
    assert.equal((await new Client(app).post(`${V1}/citizen/auth/start`,
      { email: 'ana.google@exemplu.test', policyAccepted: true, policyVersion: CITIZEN_POLICY_VERSION })).statusCode, 202);
    assert.equal(await accountCount('ana.google@exemplu.test'), 1);
  });

  it('§8 C: valoarea `sub` nu apare în nicio tabelă (inclusiv audit și respingeri)', async () => {
    const tables = await q<{ t: string }>("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'");
    assert.ok(tables.length >= 32);
    for (const { t } of tables) {
      const rows = await q(`SELECT * FROM \`${t}\``);
      assert.ok(!JSON.stringify(rows).includes(SUB), `sub găsit în ${t}`);
    }
  });

  it('cont existent blocat temporar: autentificarea merge (blocarea privește numai depunerea)', async () => {
    const [acc] = await q<{ id: string }>("SELECT id FROM citizen_accounts WHERE email_normalized = 'ana.google@exemplu.test'");
    await q("INSERT INTO citizen_blocks (id, account_id, email_hash, kind, starts_at, ends_at) VALUES ('01JBLOCARETEMPGOOGLE00000A', ?, ?, 'temporary', ?, ?)",
      [acc!.id, emailHash(ctx, 'ana.google@exemplu.test'), clock.now(), new Date(clock.now().getTime() + 86_400_000)]);
    const { res } = await googleLogin(app, 'ana.google@exemplu.test');
    assert.equal(res.headers.location, '/#sesizari');
    assert.equal((await meWith(app, res)).json().blocked.active, true);
  });
});

describe('Google: întoarcerea — §8 D (state, folosire unică)', () => {
  const okToken = (email: string) => (nonce: string) => signToken(claims(email, nonce));

  it('state lipsă / cookie lipsă / cookie diferit / state necunoscut → refuz, fără sesiune; cookie șters', async () => {
    const s = await start(app);
    const code = issueCode(s, okToken('d1@exemplu.test'));
    const other = await start(app);
    const unknown = randomBytes(32).toString('base64url');
    for (const [query, cookie] of [
      [{ code }, s.cookie],
      [{ state: s.state, code }, undefined],
      [{ state: s.state, code }, other.cookie],
      [{ state: unknown, code }, `civic_oauth=${unknown}`],
    ] as Array<[Record<string, string>, string | undefined]>) {
      const res = await callback(app, query, cookie);
      assert.equal(res.statusCode, 303);
      assert.equal(res.headers.location, '/#sesizari?google=eroare');
      assert.equal(sessionCookie(res), undefined);
      assert.match(setCookies(res).find((x) => x.startsWith('civic_oauth='))!, /Max-Age=0/);
    }
    assert.equal(await accountCount('d1@exemplu.test'), 0);
    // încercarea originală a rămas nefolosită (refuzurile de mai sus nu au consumat-o)
    const ok = await callback(app, { state: s.state, code }, s.cookie);
    assert.equal(ok.headers.location, '/#sesizari');
  });

  it('refolosire: al doilea callback cu același state și același cookie → refuz, fără a doua sesiune', async () => {
    const s = await start(app);
    const code = issueCode(s, okToken('d2@exemplu.test'));
    const first = await callback(app, { state: s.state, code }, s.cookie);
    assert.equal(first.headers.location, '/#sesizari');
    // alt moment, încă în cele 10 minute (fără el, MySQL ar raporta 0 rânduri modificate și fără verificarea consumed_at)
    clock.advanceMinutes(1);
    const second = await callback(app, { state: s.state, code }, s.cookie);
    assert.equal(second.headers.location, '/#sesizari?google=eroare');
    assert.equal(sessionCookie(second), undefined);
    const n = await q<{ n: number }>("SELECT COUNT(*) AS n FROM sessions s JOIN citizen_accounts a ON a.id = s.citizen_account_id WHERE a.email_normalized = 'd2@exemplu.test'");
    assert.equal(Number(n[0]!.n), 1);
  });

  it('expirare: după 10 minute încercarea nu mai este acceptată; purge:retention o șterge', async () => {
    const s = await start(app);
    const code = issueCode(s, okToken('d3@exemplu.test'));
    clock.advanceMinutes(11);
    const res = await callback(app, { state: s.state, code }, s.cookie);
    assert.equal(res.headers.location, '/#sesizari?google=eroare');
    assert.equal(await accountCount('d3@exemplu.test'), 0);
    const r = await purgeRetention(ctx);
    assert.ok(r.oauthAttempts >= 1);
    assert.equal((await q('SELECT id FROM citizen_oauth_attempts WHERE expires_at < ?', [clock.now()])).length, 0);
  });

  it('§8 A la întoarcere: o încercare fără versiunea curentă a politicii → refuz, fără cont', async () => {
    const s = await start(app);
    await q("UPDATE citizen_oauth_attempts SET policy_version = '2000-01' WHERE id = ?", [sha256Hex(s.state)]);
    const code = issueCode(s, okToken('d4@exemplu.test'));
    const res = await callback(app, { state: s.state, code, policyAccepted: 'true', policyVersion: CITIZEN_POLICY_VERSION }, s.cookie);
    assert.equal(res.headers.location, '/#sesizari?google=eroare');
    assert.equal(await accountCount('d4@exemplu.test'), 0);
  });

  it('anulare la Google (error=access_denied) → google=anulat; încercarea se consumă', async () => {
    const s = await start(app);
    const res = await callback(app, { state: s.state, error: 'access_denied' }, s.cookie);
    assert.equal(res.headers.location, '/#sesizari?google=anulat');
    const [att] = await q<{ consumed_at: Date | null }>('SELECT consumed_at FROM citizen_oauth_attempts WHERE id = ?', [sha256Hex(s.state)]);
    assert.ok(att!.consumed_at);
  });
});

describe('Google: întoarcerea — §8 B (jetonul, email_verified)', () => {
  const cases: Array<[string, (nonce: string) => string]> = [
    ['semnătură cu altă cheie', (n) => signToken(claims('b@exemplu.test', n), { key: other.privateKey })],
    ['cheie necunoscută (kid)', (n) => signToken(claims('b@exemplu.test', n), { kid: 'alta' })],
    ['alg diferit de RS256', (n) => signToken(claims('b@exemplu.test', n), { alg: 'HS256' })],
    ['alt emitent', (n) => signToken(claims('b@exemplu.test', n, { iss: 'https://altcineva.test' }))],
    ['alt destinatar', (n) => signToken(claims('b@exemplu.test', n, { aud: 'alt-client' }))],
    ['expirat', (n) => signToken(claims('b@exemplu.test', n, { exp: nowSec() - 120 }))],
    ['nonce greșit', () => signToken(claims('b@exemplu.test', 'nonce-gresit'))],
    ['email_verified fals', (n) => signToken(claims('b@exemplu.test', n, { email_verified: false }))],
    ['email_verified șirul "true"', (n) => signToken(claims('b@exemplu.test', n, { email_verified: 'true' }))],
    ['email_verified lipsă', (n) => signToken(claims('b@exemplu.test', n, { email_verified: undefined }))],
    ['fără e-mail', (n) => signToken(claims('', n))],
    ['jeton deformat', () => 'nu.este.jwt'],
  ];
  for (const [name, token] of cases) {
    it(`${name} → refuz, fără cont și fără sesiune`, async () => {
      const s = await start(app);
      const code = issueCode(s, token);
      const res = await callback(app, { state: s.state, code }, s.cookie);
      assert.equal(res.statusCode, 303);
      assert.equal(res.headers.location, '/#sesizari?google=eroare');
      assert.equal(sessionCookie(res), undefined);
      assert.equal(await accountCount('b@exemplu.test'), 0);
    });
  }

  it('cod necunoscut la furnizor (schimbul eșuează) → refuz', async () => {
    const s = await start(app);
    const res = await callback(app, { state: s.state, code: 'cod-inexistent' }, s.cookie);
    assert.equal(res.headers.location, '/#sesizari?google=eroare');
  });

  it('PKCE: furnizorul primește verificatorul încercării (provocarea S256 corespunde)', async () => {
    exchanges = [];
    const { s, res } = await googleLogin(app, 'pkce@exemplu.test');
    assert.equal(res.headers.location, '/#sesizari');
    assert.equal(pkceChallenge(exchanges[0]!.codeVerifier), s.challenge);
    assert.equal(exchanges[0]!.clientId, CLIENT_ID);
  });
});

describe('Google: blocări și modul allowlist (§9.5, G-T8)', () => {
  it('blocare definitivă fără cont → google=blocat, fără cont nou (T-C7)', async () => {
    await q("INSERT INTO citizen_blocks (id, account_id, email_hash, kind, starts_at, ends_at) VALUES ('01JBLOCAREDEFGOOGLE000000A', NULL, ?, 'permanent', ?, NULL)",
      [emailHash(ctx, 'blocat@exemplu.test'), clock.now()]);
    const { res } = await googleLogin(app, 'blocat@exemplu.test');
    assert.equal(res.headers.location, '/#sesizari?google=blocat');
    assert.equal(await accountCount('blocat@exemplu.test'), 0);
  });

  it('modul allowlist: numai adresele din listă primesc sesiune', async () => {
    const { app: staging } = await makeApp(h, clock, {
      ...GOOGLE_ENV, EMAIL_MODE: 'allowlist', EMAIL_ALLOWLIST: 'lista@exemplu.test', SMTP_HOST: 'smtp.exemplu.test',
      SMTP_USER: 'u', SMTP_PASS: 'p', MAIL_FROM: 'no-reply@civic.exemplu.test', CIVIC_MAIL_DOMAIN: 'civic.exemplu.test',
    }, { oidc: fakeProvider });
    try {
      const out = await googleLogin(staging, 'inafara@exemplu.test');
      assert.equal(out.res.headers.location, '/#sesizari?google=eroare');
      assert.equal(await accountCount('inafara@exemplu.test'), 0);
      const inList = await googleLogin(staging, 'Lista@Exemplu.test');
      assert.equal(inList.res.headers.location, '/#sesizari');
    } finally {
      await staging.close();
    }
  });
});

describe('Google: pe HTTPS (staging / producție) — §11.2', () => {
  it('cookie-ul __Host-civic_oauth: Secure, HttpOnly, SameSite=Lax, Path=/, fără Domain; ștergerea cu aceleași atribute', async () => {
    const origin = 'https://test.civic.exemplu';
    const { app: https } = await makeApp(h, clock, { ...GOOGLE_ENV, APP_ENV: 'staging', PUBLIC_BASE_URL: origin }, { oidc: fakeProvider });
    try {
      const s = await start(https, undefined, { origin });
      assert.equal(s.res.statusCode, 200);
      assert.equal(s.url.searchParams.get('redirect_uri'), `${origin}/api/v1/citizen/auth/google/callback`);
      const c = setCookies(s.res).find((x) => x.startsWith('__Host-civic_oauth='))!;
      for (const re of [/; Secure/i, /; HttpOnly/i, /; SameSite=Lax/i, /; Path=\//, /; Max-Age=600/]) assert.match(c, re);
      assert.doesNotMatch(c, /Domain=/i);
      const code = issueCode(s, (n) => signToken(claims('https@exemplu.test', n)));
      const res = await callback(https, { state: s.state, code }, s.cookie);
      assert.equal(res.headers.location, '/#sesizari');
      const cleared = setCookies(res).find((x) => x.startsWith('__Host-civic_oauth='))!;
      for (const re of [/^__Host-civic_oauth=;/, /; Secure/i, /; Path=\//, /; Max-Age=0/]) assert.match(cleared, re);
      assert.doesNotMatch(cleared, /Domain=/i);
      assert.ok(setCookies(res).some((x) => x.startsWith('__Host-civic_sid=')), 'sesiunea de cetățean');
    } finally {
      await https.close();
    }
  });
});

describe('Google: jurnalul cererilor', () => {
  it('URL-ul callback-ului apare în jurnal fără code și state', () => {
    const out = requestLogSerializer({ method: 'GET', url: `${V1}/citizen/auth/google/callback?state=SECRET1&code=SECRET2`, hostname: 'h', ip: '1.2.3.4' } as never);
    assert.equal(out.url, `${V1}/citizen/auth/google/callback`);
    assert.ok(!JSON.stringify(out).includes('SECRET'));
  });
});

// ——— Verificările cerute la auditul pasului 3 (09.10.2026) ———
// Sunt ultimele din fișier, pentru că mută ceasul de test peste granița orei (fereastra limitelor).

const attemptCount = async () => Number((await q<{ n: number }>('SELECT COUNT(*) AS n FROM citizen_oauth_attempts'))[0]!.n);
const rateLimitedCount = async () =>
  Number((await q<{ n: number | null }>(
    "SELECT SUM(count) AS n FROM rejected_attempts WHERE area = 'citizen_code' AND target_id = 'google' AND reason = 'rate_limited'"))[0]!.n ?? 0);
/** Mută ceasul la un minut înaintea orei următoare (aceeași fereastră), apoi, la cerere, în fereastra următoare. */
const minutesToNextHour = () => 60 - clock.now().getUTCMinutes();

describe('Google: limitarea cererilor pe server (G-T9; verificare extinsă la audit, 09.10.2026)', () => {
  it('pornirea: 20 pe oră pe IP; a 21-a → 429 cu Retry-After, fără cookie, fără încercare; alt IP neafectat; după trecerea orei se reia', async () => {
    const ip = '10.60.0.1';
    // cererile refuzate pentru bifă (422) nu creează nimic și nu consumă limita
    for (let i = 0; i < 5; i++) assert.equal((await start(app, {}, { ip })).res.statusCode, 422);
    const before = await attemptCount();
    const rejectedBefore = await rateLimitedCount();
    for (let i = 0; i < 20; i++) assert.equal((await start(app, undefined, { ip })).res.statusCode, 200, `pornirea ${i + 1}`);
    assert.equal(await attemptCount(), before + 20);

    for (let i = 0; i < 2; i++) {
      const blocked = await start(app, undefined, { ip });
      assert.equal(blocked.res.statusCode, 429);
      assert.equal(blocked.res.json().error.code, 'RATE_LIMITED');
      assert.equal(blocked.res.headers['retry-after'], '3600');
      assert.equal(blocked.res.json().authorizationUrl, undefined, 'fără adresă de autorizare');
      assert.equal(setCookies(blocked.res).filter((c) => /civic_oauth=/.test(c)).length, 0, 'fără cookie-ul încercării');
    }
    assert.equal(await attemptCount(), before + 20, 'cererile refuzate nu creează încercări');
    assert.equal(await rateLimitedCount(), rejectedBefore + 2, 'refuzurile sunt numărate (agregat, fără e-mail)');

    // limita este pe IP, nu globală; pornirea și întoarcerea au limite separate
    assert.equal((await start(app, undefined, { ip: '10.60.0.9' })).res.statusCode, 200);
    const s = await start(app, undefined, { ip: '10.60.0.9' });
    const code = issueCode(s, (n) => signToken(claims('limita-pornire@exemplu.test', n)));
    assert.equal((await callback(app, { state: s.state, code }, s.cookie, ip)).headers.location, '/#sesizari', 'întoarcerea de pe IP-ul limitat la pornire reușește');

    // aceeași fereastră (un minut înainte de ora următoare): încă refuzat; în fereastra următoare: permis din nou
    clock.advanceMinutes(minutesToNextHour() - 1);
    assert.equal((await start(app, undefined, { ip })).res.statusCode, 429);
    clock.advanceMinutes(1);
    assert.equal((await start(app, undefined, { ip })).res.statusCode, 200);
  });

  it('întoarcerea: a 21-a pe oră pe IP → google=limita chiar cu o încercare validă: fără schimb de cod, fără cont, fără sesiune; alt IP reușește', async () => {
    const ip = '10.60.0.2';
    for (let i = 0; i < 20; i++) {
      assert.equal((await callback(app, { state: 'x', code: 'y' }, undefined, ip)).headers.location, '/#sesizari?google=eroare', `întoarcerea ${i + 1}`);
    }
    const rejectedBefore = await rateLimitedCount();
    const s = await start(app);
    const code = issueCode(s, (n) => signToken(claims('limita-intoarcere@exemplu.test', n)));
    exchanges = [];
    const res = await callback(app, { state: s.state, code }, s.cookie, ip);
    assert.equal(res.statusCode, 303);
    assert.equal(res.headers.location, '/#sesizari?google=limita');
    assert.equal(sessionCookie(res), undefined, 'fără sesiune');
    assert.equal(exchanges.length, 0, 'furnizorul nu este contactat');
    assert.equal(await accountCount('limita-intoarcere@exemplu.test'), 0, 'fără cont');
    assert.ok(setCookies(res).some((c) => /^civic_oauth=;/.test(c)), 'cookie-ul încercării este șters și la refuz');
    assert.equal(await rateLimitedCount(), rejectedBefore + 1);

    // limita este pe IP: aceeași întoarcere, de pe alt IP, reușește (refuzul pentru limită nu consumă încercarea)
    const other = await callback(app, { state: s.state, code }, s.cookie, '10.60.0.8');
    assert.equal(other.headers.location, '/#sesizari');
    assert.ok(sessionCookie(other));
    assert.equal(await accountCount('limita-intoarcere@exemplu.test'), 1);

    // în fereastra următoare, IP-ul limitat poate reveni
    clock.advanceMinutes(minutesToNextHour());
    const s2 = await start(app);
    const code2 = issueCode(s2, (n) => signToken(claims('limita-intoarcere@exemplu.test', n)));
    assert.equal((await callback(app, { state: s2.state, code: code2 }, s2.cookie, ip)).headers.location, '/#sesizari');
  });
});

describe('Google: adresa de autorizare și furnizorul folosit (audit 09.10.2026)', () => {
  const origin = 'https://test.civic.exemplu';
  const STAGING_PAGE = { protocol: 'https:', hostname: 'test.civic.exemplu' };
  const stagingEnv = { ...GOOGLE_ENV, APP_ENV: 'staging', PUBLIC_BASE_URL: origin };

  it('fluxul real (fără furnizor de test): `start` întoarce adresa Google, pe care validarea interfeței o acceptă neschimbată', async () => {
    const { app: real } = await makeApp(h, clock, stagingEnv); // fără `oidc`: furnizorul implicit, Google; `start` nu face apeluri în rețea
    try {
      const s = await start(real, undefined, { origin });
      assert.equal(s.res.statusCode, 200);
      const raw = s.res.json().authorizationUrl as string;
      assert.ok(raw.startsWith(`${GOOGLE_AUTHORIZATION_ENDPOINT}?`), raw);
      assert.equal(safeGoogleAuthorizationUrl(raw, STAGING_PAGE), raw);
      assert.equal(s.url.searchParams.get('prompt'), 'select_account', '§16: și în fluxul real');
      assert.equal(s.url.searchParams.get('redirect_uri'), `${origin}/api/v1/citizen/auth/google/callback`);
    } finally {
      await real.close();
    }
  });

  it('o adresă de autorizare de pe alt site (aici: furnizorul acestor teste) este respinsă de validarea interfeței, de oriunde', async () => {
    const s = await start(app);
    const raw = s.res.json().authorizationUrl as string;
    assert.ok(raw.startsWith('https://idp.exemplu.test/autorizare?'));
    for (const page of [STAGING_PAGE, { protocol: 'http:', hostname: '127.0.0.1' }, { protocol: 'http:', hostname: 'localhost' }]) {
      assert.equal(safeGoogleAuthorizationUrl(raw, page), null);
    }
  });

  it('configurație greșită: pe staging, chiar cu adresa furnizorului de test ajunsă în configurare, se folosește Google', async () => {
    const { app: wrong, ctx: wrongCtx } = await makeApp(h, clock, stagingEnv);
    try {
      // ocolirea validării de la pornire (care ar opri aplicația): valoarea este pusă direct în configurarea încărcată
      (wrongCtx.config as { devOidcProviderUrl?: string }).devOidcProviderUrl = 'http://localhost:6199';
      wrongCtx.oidc = devOidcProviderFor(wrongCtx.config); // exact ce face main.ts
      assert.equal(wrongCtx.oidc, undefined);
      const s = await start(wrong, undefined, { origin });
      assert.equal(s.res.statusCode, 200);
      assert.equal(s.url.origin, 'https://accounts.google.com');
      assert.equal(s.url.pathname, '/o/oauth2/v2/auth');
    } finally {
      await wrong.close();
    }
  });
});

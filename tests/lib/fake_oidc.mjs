// Furnizor de identitate FALS, local, pentru testele E2E ale autentificării cu Google (amendamentul Google, G-T10).
//
//   node tests/lib/fake_oidc.mjs <port>
//   mediu: FAKE_OIDC_CLIENT_ID, FAKE_OIDC_CLIENT_SECRET (aceleași valori ca GOOGLE_OAUTH_* ale serverului de test)
//
// Joacă rolul Google numai pe calculatorul de test: ascultă numai pe adresa locală, cu o cheie generată la pornire.
// Serverul aplicației îl folosește numai cu APP_ENV=development și DEV_OIDC_PROVIDER_URL (server/src/config.ts);
// pe staging și în producție, aplicația refuză să pornească dacă setarea există. Fișierul nu intră în pachetul de
// instalare (server/scripts/package-release.py nu include `tests/`). Fără dependențe: numai module Node.
//
//   GET  /authorize  pagina „furnizorului”: adresa de e-mail, bifa „adresă verificată”, Permite / Refuză
//   POST /decide     → redirecționare la aplicație, cu `code` + `state` sau cu `error=access_denied`
//   POST /token      codul + verificatorul PKCE → `id_token` semnat RS256
//   GET  /jwks       cheia publică
//   GET  /log        ce a cerut aplicația (pentru verificările din teste: `scope`, PKCE, `nonce`)

import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import http from 'node:http';

const port = Number(process.argv[2]);
const CLIENT_ID = process.env.FAKE_OIDC_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.FAKE_OIDC_CLIENT_SECRET ?? '';
if (!Number.isInteger(port) || port < 1024 || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Utilizare: FAKE_OIDC_CLIENT_ID=… FAKE_OIDC_CLIENT_SECRET=… node tests/lib/fake_oidc.mjs <port>');
  process.exit(2);
}
const ISSUER = `http://localhost:${port}`;

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KID = 'cheie-e2e-' + randomBytes(4).toString('hex');
const JWK = { ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' };

/** Cererile de autorizare primite (id → parametri) și codurile emise (cod → ce jeton se întoarce). */
const requests = new Map();
const codes = new Map();
const log = [];

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function idToken(claims) {
  const data = `${b64url({ alg: 'RS256', kid: KID, typ: 'JWT' })}.${b64url(claims)}`;
  return `${data}.${sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')}`;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
function send(res, status, body, type = 'application/json; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...headers });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function readForm(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 20_000) reject(new Error('corp prea mare'));
    });
    req.on('end', () => resolve(new URLSearchParams(data)));
    req.on('error', reject);
  });
}

async function handle(req, res) {
  const url = new URL(req.url ?? '/', ISSUER);

  if (req.method === 'GET' && url.pathname === '/authorize') {
    const p = Object.fromEntries(url.searchParams);
    log.push(p);
    const problems = [];
    if (p.response_type !== 'code') problems.push('response_type');
    if (p.client_id !== CLIENT_ID) problems.push('client_id');
    if (!p.redirect_uri) problems.push('redirect_uri');
    if (!p.state) problems.push('state');
    if (!p.nonce) problems.push('nonce');
    if (!p.code_challenge || p.code_challenge_method !== 'S256') problems.push('pkce');
    if (problems.length) return send(res, 400, `Cerere de autorizare invalidă: ${problems.join(', ')}`, 'text/plain; charset=utf-8');
    const id = randomBytes(12).toString('hex');
    requests.set(id, p);
    return send(
      res,
      200,
      `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>Furnizor de test</title></head><body>
<h1>Furnizor de identitate de test</h1>
<p>Nu este Google. Există numai în testele automate.</p>
<p>Date cerute de aplicație: <code id="scope">${esc(p.scope ?? '')}</code></p>
<form method="post" action="/decide">
  <input type="hidden" name="request" value="${id}">
  <label>Adresa de e-mail <input id="fake-email" name="email" type="text"></label>
  <label><input id="fake-verified" name="verified" type="checkbox" value="1" checked> adresă verificată</label>
  <button id="fake-allow" name="action" value="allow" type="submit">Permite</button>
  <button id="fake-deny" name="action" value="deny" type="submit">Refuză</button>
</form></body></html>`,
      'text/html; charset=utf-8',
    );
  }

  if (req.method === 'POST' && url.pathname === '/decide') {
    const form = await readForm(req);
    const p = requests.get(form.get('request') ?? '');
    if (!p) return send(res, 400, 'Cerere necunoscută', 'text/plain; charset=utf-8');
    requests.delete(form.get('request'));
    const back = new URL(p.redirect_uri);
    back.searchParams.set('state', p.state);
    if (form.get('action') === 'allow') {
      const code = randomBytes(16).toString('hex');
      codes.set(code, { request: p, email: form.get('email') ?? '', verified: form.get('verified') === '1' });
      back.searchParams.set('code', code);
    } else {
      back.searchParams.set('error', 'access_denied');
    }
    return send(res, 302, '', 'text/plain; charset=utf-8', { location: back.toString() });
  }

  if (req.method === 'POST' && url.pathname === '/token') {
    const form = await readForm(req);
    const entry = codes.get(form.get('code') ?? '');
    codes.delete(form.get('code') ?? ''); // un cod se folosește o singură dată
    const verifier = form.get('code_verifier') ?? '';
    const ok =
      entry &&
      form.get('grant_type') === 'authorization_code' &&
      form.get('client_id') === CLIENT_ID &&
      form.get('client_secret') === CLIENT_SECRET &&
      form.get('redirect_uri') === entry.request.redirect_uri &&
      createHash('sha256').update(verifier).digest('base64url') === entry.request.code_challenge;
    if (!ok) return send(res, 400, { error: 'invalid_grant' });
    const now = Math.floor(Date.now() / 1000);
    return send(res, 200, {
      token_type: 'Bearer',
      access_token: randomBytes(8).toString('hex'),
      expires_in: 3600,
      id_token: idToken({
        iss: ISSUER,
        aud: CLIENT_ID,
        sub: 'sub-e2e-' + randomBytes(8).toString('hex'),
        email: entry.email,
        email_verified: entry.verified,
        nonce: entry.request.nonce,
        iat: now,
        exp: now + 3600,
      }),
    });
  }

  if (req.method === 'GET' && url.pathname === '/jwks') return send(res, 200, { keys: [JWK] });
  if (req.method === 'GET' && url.pathname === '/log') return send(res, 200, log);
  return send(res, 404, 'Nu există', 'text/plain; charset=utf-8');
}

const listener = (req, res) => {
  handle(req, res).catch((err) => send(res, 500, String(err?.message ?? err), 'text/plain; charset=utf-8'));
};

// numai pe adresa locală; `localhost` poate însemna 127.0.0.1 sau ::1, în funcție de sistem
http.createServer(listener).listen(port, '127.0.0.1', () => console.log(`furnizor fals pornit: ${ISSUER}`));
http.createServer(listener).on('error', () => {}).listen(port, '::1');

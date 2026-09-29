import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { buildApp, type HealthState } from '../../src/app.ts';
import { loadConfig } from '../../src/config.ts';
import { testEnv } from '../helpers/env.ts';

async function app(opts: { health?: () => Promise<HealthState>; frontendDir?: string; env?: Record<string, string> } = {}) {
  return buildApp({
    config: loadConfig(testEnv(opts.env)),
    health: opts.health ?? (async () => 'ok'),
    frontendDir: opts.frontendDir,
    logger: false,
  });
}

function fakeFrontend(): string {
  const dir = mkdtempSync(join(tmpdir(), 'civic-dist-'));
  const root = join(dir, 'dist');
  mkdirSync(join(root, 'assets'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>test</title>');
  writeFileSync(join(root, 'assets', 'index-abc123.js'), 'console.log(1)');
  return root;
}

describe('GET /api/v1/health (B2 §3, T-RUN-2)', () => {
  it('ok → 200, numai { status, version }', async () => {
    const a = await app();
    const res = await a.inject({ method: 'GET', url: '/api/v1/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.deepEqual(Object.keys(body).sort(), ['status', 'version']);
    assert.equal(body.status, 'ok');
    assert.equal(res.headers['cache-control'], 'no-store');
    await a.close();
  });

  it('degraded → 503, fără detalii interne', async () => {
    const a = await app({ health: async () => 'degraded' });
    const res = await a.inject({ method: 'GET', url: '/api/v1/health' });
    assert.equal(res.statusCode, 503);
    assert.deepEqual(Object.keys(res.json()).sort(), ['status', 'version']);
    await a.close();
  });

  it('o eroare în verificare → degraded, fără mesajul erorii', async () => {
    const a = await app({
      health: async () => {
        throw new Error('parola DB-ului: secret123');
      },
    });
    const res = await a.inject({ method: 'GET', url: '/api/v1/health' });
    assert.equal(res.statusCode, 503);
    assert.ok(!res.body.includes('secret123'));
    await a.close();
  });
});

describe('antete de securitate (B2 §1, DN-19)', () => {
  it('CSP: numai aceeași origine; imagini externe numai tile-urile OSM; frame-ancestors none', async () => {
    const a = await app();
    const res = await a.inject({ method: 'GET', url: '/api/v1/health' });
    const csp = String(res.headers['content-security-policy']);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    const img = /img-src ([^;]+)/.exec(csp)?.[1]?.split(' ') ?? [];
    const external = img.filter((s) => s.startsWith('http'));
    assert.deepEqual(external, ['https://*.tile.openstreetmap.org']);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['strict-transport-security'], undefined, 'fără HSTS pe dezvoltare (HTTP)');
    assert.ok(!csp.includes('upgrade-insecure-requests'));
    await a.close();
  });

  it('staging / producție: HSTS și upgrade-insecure-requests', async () => {
    const a = await app({ env: { APP_ENV: 'staging', PUBLIC_BASE_URL: 'https://exemplu.test' } });
    const res = await a.inject({ method: 'GET', url: '/api/v1/health' });
    assert.ok(res.headers['strict-transport-security']);
    assert.match(String(res.headers['content-security-policy']), /upgrade-insecure-requests/);
    await a.close();
  });
});

describe('erori și frontend', () => {
  it('rută API necunoscută → 404 în formatul comun', async () => {
    const a = await app();
    const res = await a.inject({ method: 'GET', url: '/api/v1/nu-exista' });
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.json(), { error: { code: 'NOT_FOUND', message: 'Resursa nu există.' } });
    await a.close();
  });

  it('servește index.html (no-cache) și assets/ (cache lung)', async () => {
    const a = await app({ frontendDir: fakeFrontend() });
    const index = await a.inject({ method: 'GET', url: '/' });
    assert.equal(index.statusCode, 200);
    assert.match(String(index.headers['content-type']), /text\/html/);
    assert.equal(index.headers['cache-control'], 'no-cache');
    const asset = await a.inject({ method: 'GET', url: '/assets/index-abc123.js' });
    assert.equal(asset.statusCode, 200);
    assert.match(String(asset.headers['cache-control']), /immutable/);
    await a.close();
  });

  it('fără frontend construit, serverul servește numai API-ul', async () => {
    const a = await app({ frontendDir: join(tmpdir(), 'nu-exista-dist') });
    assert.equal((await a.inject({ method: 'GET', url: '/' })).statusCode, 404);
    assert.equal((await a.inject({ method: 'GET', url: '/api/v1/health' })).statusCode, 200);
    await a.close();
  });

  it('nu servește fișiere din afara dist/ (path traversal)', async () => {
    const a = await app({ frontendDir: fakeFrontend() });
    const res = await a.inject({ method: 'GET', url: '/../../etc/passwd' });
    assert.notEqual(res.statusCode, 200);
    const res2 = await a.inject({ method: 'GET', url: '/%2e%2e/%2e%2e/etc/passwd' });
    assert.notEqual(res2.statusCode, 200);
    await a.close();
  });
});

describe('staging: noindex (G3, condiția 4)', () => {
  it('staging: X-Robots-Tag pe orice răspuns și robots.txt care interzice tot', async () => {
    const a = await app({ env: { APP_ENV: 'staging', PUBLIC_BASE_URL: 'https://exemplu.test' }, frontendDir: fakeFrontend() });
    for (const url of ['/', '/api/v1/health', '/api/v1/nu-exista']) {
      const res = await a.inject({ method: 'GET', url });
      assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow', url);
    }
    const robots = await a.inject({ method: 'GET', url: '/robots.txt' });
    assert.equal(robots.statusCode, 200);
    assert.equal(robots.body, 'User-agent: *\nDisallow: /\n');
    await a.close();
  });

  it('dezvoltare: fără X-Robots-Tag', async () => {
    const a = await app();
    const res = await a.inject({ method: 'GET', url: '/api/v1/health' });
    assert.equal(res.headers['x-robots-tag'], undefined);
    await a.close();
  });
});

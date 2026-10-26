// Faza 7C, P4 (DEC-2a/2b/2c): controlul indexării SEARCH_INDEXING, independent de APP_ENV.
// - lipsă sau „off” (orice mediu): X-Robots-Tag: noindex, nofollow pe orice răspuns; robots.txt interzice tot;
// - „on”: permis numai cu APP_ENV=production (lansarea, E9): fără antet; robots.txt fără „Disallow: /”;
// - „on” în staging / development: refuz la pornire; orice altă valoare: refuz la pornire.
// Criteriile SI-1…SI-9: docs/faza7/FAZA_7_E0_REGISTRU_DECIZII.md, Anexa A.1.

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { buildApp } from '../../src/app.ts';
import { ConfigError, loadConfig } from '../../src/config.ts';
import { testEnv } from '../helpers/env.ts';

const NOINDEX = 'noindex, nofollow';
const ROBOTS_OFF = 'User-agent: *\nDisallow: /\n';
const HTTPS = 'https://exemplu.test';
const ENVS: Record<string, Record<string, string>> = {
  development: { APP_ENV: 'development' },
  staging: { APP_ENV: 'staging', PUBLIC_BASE_URL: HTTPS },
  production: { APP_ENV: 'production', PUBLIC_BASE_URL: HTTPS },
};
// pagina HTML, un fișier static și o rută API
const URLS = ['/', '/assets/index-abc123.js', '/api/v1/health'];

function fakeFrontend(): string {
  const root = join(mkdtempSync(join(tmpdir(), 'civic-dist-')), 'dist');
  mkdirSync(join(root, 'assets'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>test</title>');
  writeFileSync(join(root, 'assets', 'index-abc123.js'), 'console.log(1)');
  return root;
}

async function app(env: Record<string, string>) {
  return buildApp({ config: loadConfig(testEnv(env)), health: async () => 'ok', frontendDir: fakeFrontend(), logger: false });
}

async function observe(env: Record<string, string>) {
  const a = await app(env);
  const headers: Record<string, string | undefined> = {};
  for (const url of URLS) {
    const res = await a.inject({ method: 'GET', url });
    assert.equal(res.statusCode, 200, `${url} în ${JSON.stringify(env)}`);
    headers[url] = res.headers['x-robots-tag'] as string | undefined;
  }
  const robots = await a.inject({ method: 'GET', url: '/robots.txt' });
  await a.close();
  return { headers, robotsStatus: robots.statusCode, robots: robots.body };
}

function refusedFor(env: Record<string, string>, pattern: RegExp): ConfigError {
  let caught: unknown;
  try {
    loadConfig(testEnv(env));
  } catch (err) {
    caught = err;
  }
  assert.ok(caught instanceof ConfigError, `pornirea trebuia refuzată pentru ${JSON.stringify(env)}`);
  assert.match(caught.message, pattern);
  return caught;
}

describe('SEARCH_INDEXING (7C, P4)', () => {
  it('SI-1: fără variabilă, în toate mediile admise: antetul pe HTML, pe un fișier static și pe API', async () => {
    for (const [name, env] of Object.entries(ENVS)) {
      const r = await observe(env);
      for (const url of URLS) assert.equal(r.headers[url], NOINDEX, `${name} ${url}`);
    }
  });

  it('SI-2: „off” explicit dă același rezultat ca SI-1, în toate mediile', async () => {
    for (const [name, env] of Object.entries(ENVS)) {
      const r = await observe({ ...env, SEARCH_INDEXING: 'off' });
      for (const url of URLS) assert.equal(r.headers[url], NOINDEX, `${name} ${url}`);
    }
  });

  it('SI-3: robots.txt are conținutul exact pentru „off” și nu conține „Disallow: /” pentru „on”', async () => {
    const off = await observe({ ...ENVS.production, SEARCH_INDEXING: 'off' });
    assert.equal(off.robotsStatus, 200);
    assert.equal(off.robots, ROBOTS_OFF);
    const on = await observe({ ...ENVS.production, SEARCH_INDEXING: 'on' });
    assert.equal(on.robotsStatus, 200);
    assert.ok(!on.robots.includes('Disallow: /'), on.robots);
  });

  it('SI-4: „on” cu APP_ENV=production: antetul lipsește pe toate cele trei tipuri de răspuns', async () => {
    const r = await observe({ ...ENVS.production, SEARCH_INDEXING: 'on' });
    for (const url of URLS) assert.equal(r.headers[url], undefined, url);
  });

  it('SI-5: „on” cu APP_ENV=staging → refuz la pornire, cu un mesaj care numește SEARCH_INDEXING', () => {
    refusedFor({ ...ENVS.staging, SEARCH_INDEXING: 'on' }, /SEARCH_INDEXING: .*numai cu APP_ENV=production/);
  });

  it('SI-6: „on” cu APP_ENV=development → refuz la pornire, cu un mesaj care numește SEARCH_INDEXING', () => {
    refusedFor({ ...ENVS.development, SEARCH_INDEXING: 'on' }, /SEARCH_INDEXING: .*numai cu APP_ENV=production/);
  });

  it('SI-7: APP_ENV=test este refuzat de schema APP_ENV, nu de SEARCH_INDEXING', () => {
    const err = refusedFor({ APP_ENV: 'test', SEARCH_INDEXING: 'on' }, /APP_ENV/);
    assert.ok(!err.problems.some((p) => p.startsWith('SEARCH_INDEXING')), err.problems.join(' | '));
  });

  it('SI-8: valori invalide (șir gol, ON, Off, true, 1) → refuz la pornire, cu un mesaj care numește SEARCH_INDEXING', () => {
    for (const value of ['', 'ON', 'Off', 'true', '1']) {
      for (const env of Object.values(ENVS)) {
        refusedFor({ ...env, SEARCH_INDEXING: value }, /SEARCH_INDEXING: valorile acceptate sunt exact „off” și „on”/);
      }
    }
  });

  it('SI-9: pentru „off” și pentru variabila absentă, APP_ENV nu schimbă antetul și nici robots.txt', async () => {
    const variants: Record<string, string>[] = [{}, { SEARCH_INDEXING: 'off' }];
    for (const extra of variants) {
      const seen = [];
      for (const env of Object.values(ENVS)) seen.push(await observe({ ...env, ...extra }));
      for (const r of seen) {
        assert.deepEqual(r.headers, seen[0].headers);
        assert.equal(r.robots, ROBOTS_OFF);
      }
    }
  });
});

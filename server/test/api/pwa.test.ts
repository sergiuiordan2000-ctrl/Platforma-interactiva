// Lotul PWA (propunerea r2, §2 rândurile 1–9): fișierele aplicației instalabile, servite de server cu antetele corecte;
// înregistrarea service worker-ului numai în producție.

import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { buildApp } from '../../src/app.ts';
import { loadConfig } from '../../src/config.ts';
import { testEnv } from '../helpers/env.ts';
import { shouldRegisterServiceWorker } from '../../../src/services/pwaRegister.ts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PUBLIC_FILES = ['sw.js', 'offline.html', 'manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];

/** Un dist/ ca după construcție: index.html + fișierele reale din public/. */
function frontendWithPublicFiles(): string {
  const root = join(mkdtempSync(join(tmpdir(), 'civic-pwa-')), 'dist');
  mkdirSync(join(root, 'icons'), { recursive: true });
  mkdirSync(join(root, 'assets'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>test</title>');
  for (const f of PUBLIC_FILES) copyFileSync(join(repo, 'public', f), join(root, f));
  return root;
}

async function app() {
  return buildApp({ config: loadConfig(testEnv({})), health: async () => 'ok', frontendDir: frontendWithPublicFiles(), logger: false });
}

describe('lotul PWA — fișierele servite', () => {
  it('manifest.webmanifest: tipul application/manifest+json, no-cache, numele, pictogramele', async () => {
    const a = await app();
    const res = await a.inject({ method: 'GET', url: '/manifest.webmanifest' });
    await a.close();
    assert.equal(res.statusCode, 200);
    assert.match(String(res.headers['content-type']), /^application\/manifest\+json/);
    assert.equal(res.headers['cache-control'], 'no-cache');
    const m = res.json();
    assert.equal(m.name, 'Urbis Activ - Turnu Măgurele');
    assert.equal(m.short_name, 'Urbis Activ');
    assert.equal(m.start_url, '/');
    assert.equal(m.scope, '/');
    assert.equal(m.display, 'standalone');
    assert.deepEqual(m.icons.map((i: { src: string; purpose: string }) => `${i.src} ${i.purpose}`), [
      '/icons/icon-192.png any',
      '/icons/icon-512.png any',
      '/icons/icon-maskable-512.png maskable',
    ]);
  });

  it('sw.js și offline.html: no-cache; sw.js ca JavaScript; CSP-ul permite înregistrarea (script-src self)', async () => {
    const a = await app();
    const sw = await a.inject({ method: 'GET', url: '/sw.js' });
    const off = await a.inject({ method: 'GET', url: '/offline.html' });
    await a.close();
    assert.equal(sw.statusCode, 200);
    assert.equal(sw.headers['cache-control'], 'no-cache');
    assert.match(String(sw.headers['content-type']), /javascript/);
    assert.match(String(sw.headers['content-security-policy']), /script-src 'self'/);
    assert.equal(off.statusCode, 200);
    assert.equal(off.headers['cache-control'], 'no-cache');
  });

  it('offline.html este autonomă: fără scripturi și fără resurse externe (stil și siglă în fișier)', () => {
    const html = readFileSync(join(repo, 'public', 'offline.html'), 'utf8');
    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<link\b/i);
    assert.doesNotMatch(html, /\b(src|href)=/i);
  });

  it('pictogramele există, cu dimensiunile din manifest (antetul PNG)', () => {
    const size = (f: string) => {
      const b = readFileSync(join(repo, 'public', f));
      return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
    };
    assert.equal(size('icons/icon-192.png'), '192x192');
    assert.equal(size('icons/icon-512.png'), '512x512');
    assert.equal(size('icons/icon-maskable-512.png'), '512x512');
    assert.equal(size('icons/apple-touch-icon.png'), '180x180');
  });

  it('index.html leagă manifestul, theme-color și apple-touch-icon', () => {
    const html = readFileSync(join(repo, 'index.html'), 'utf8');
    assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest" \/>/);
    assert.match(html, /<meta name="theme-color" content="#1D4ED8" \/>/);
    assert.match(html, /<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png" \/>/);
  });

  it('înregistrarea service worker-ului: numai în producție și numai cu suport în browser', () => {
    const withSw = { serviceWorker: { register: async () => undefined } };
    assert.equal(shouldRegisterServiceWorker(true, withSw), true);
    assert.equal(shouldRegisterServiceWorker(false, withSw), false); // dezvoltare
    assert.equal(shouldRegisterServiceWorker(true, {}), false); // browser fără service worker
    assert.equal(shouldRegisterServiceWorker(true, undefined), false);
  });
});

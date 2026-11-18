// Lotul PWA (propunerea r2, §3 și §5.3; condițiile auditorului 1 și 2): comportamentul service worker-ului
// aplicației (public/sw.js) și al celui de retragere (deploy/sw-retragere.js), într-un mediu simulat (vm).
// Probele din browser (V-1 … V-9) se fac separat, pe staging.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const ORIGIN = 'https://urbisactiv.test';

type Listener = (event: Record<string, unknown>) => void;

/** Mediul simulat al unui service worker: self, caches, fetch, clients, registration — cu jurnalul apelurilor. */
function sandbox(opts: { addFails?: boolean; networkDown?: boolean; cacheKeys?: string[] } = {}) {
  const log: string[] = [];
  const listeners: Record<string, Listener> = {};
  const stores = new Map<string, Map<string, string>>();
  for (const k of opts.cacheKeys ?? []) stores.set(k, new Map());
  const puts: string[] = [];
  const cacheApi = (name: string) => ({
    add: async (req: { url: string }) => {
      log.push(`add:${name}:${new URL(req.url, ORIGIN).pathname}`);
      if (opts.addFails) throw new TypeError('Failed to fetch');
      stores.get(name)!.set(new URL(req.url, ORIGIN).pathname, 'OFFLINE');
    },
    put: async (req: unknown) => {
      puts.push(String(req));
    },
    match: async (url: string) => stores.get(name)?.get(url) ?? undefined,
  });
  const ctx = {
    URL,
    Request: class {
      url: string;
      constructor(url: string) {
        this.url = new URL(url, ORIGIN).href;
      }
    },
    Response: { error: () => 'RESPONSE_ERROR' },
    self: {
      location: { origin: ORIGIN },
      addEventListener: (type: string, fn: Listener) => {
        listeners[type] = fn;
      },
      skipWaiting: () => {
        log.push('skipWaiting');
      },
      clients: {
        claim: async () => {
          log.push('claim');
        },
        matchAll: async () => [
          { url: `${ORIGIN}/`, navigate: async (u: string) => log.push(`navigate:${u}`) },
          { url: `${ORIGIN}/harta`, navigate: async (u: string) => log.push(`navigate:${u}`) },
        ],
      },
      registration: {
        unregister: async () => {
          log.push('unregister');
          return true;
        },
      },
    },
    caches: {
      open: async (name: string) => {
        if (!stores.has(name)) stores.set(name, new Map());
        log.push(`open:${name}`);
        return cacheApi(name);
      },
      keys: async () => [...stores.keys()],
      delete: async (name: string) => {
        log.push(`delete:${name}`);
        return stores.delete(name);
      },
    },
    fetch: async (req: { url: string }) => {
      log.push(`fetch:${new URL(req.url).pathname}`);
      if (opts.networkDown) throw new TypeError('offline');
      return 'NETWORK';
    },
    module: { exports: {} as Record<string, unknown> },
  };
  return { ctx, log, listeners, stores, puts };
}

function load(file: string, sb: ReturnType<typeof sandbox>) {
  vm.runInNewContext(readFileSync(join(root, file), 'utf8'), sb.ctx, { filename: file });
  return sb.ctx.module.exports;
}

/** Declanșează un eveniment și întoarce promisiunea dată lui waitUntil / respondWith. */
async function fire(sb: ReturnType<typeof sandbox>, type: string, extra: Record<string, unknown> = {}) {
  let waited: Promise<unknown> | undefined;
  let responded: Promise<unknown> | undefined;
  sb.listeners[type]!({
    ...extra,
    waitUntil: (p: Promise<unknown>) => {
      waited = p;
    },
    respondWith: (p: Promise<unknown>) => {
      responded = p;
    },
  });
  return { waited, responded };
}

const nav = (path: string, origin = ORIGIN, method = 'GET') => ({ url: `${origin}${path}`, mode: 'navigate', method });

describe('public/sw.js — cache-ul offline (condiția 1)', () => {
  it('la instalare: un singur cache „urbis-offline-v1”, cu exclusiv /offline.html', async () => {
    const sb = sandbox();
    load('public/sw.js', sb);
    const { waited } = await fire(sb, 'install');
    await waited;
    assert.deepEqual([...sb.stores.keys()], ['urbis-offline-v1']);
    assert.deepEqual([...sb.stores.get('urbis-offline-v1')!.keys()], ['/offline.html']);
    assert.deepEqual(sb.log.filter((l) => l.startsWith('add:')), ['add:urbis-offline-v1:/offline.html']);
  });

  it('dacă /offline.html nu poate intra în cache, instalarea eșuează (promisiunea lui waitUntil e respinsă)', async () => {
    const sb = sandbox({ addFails: true });
    load('public/sw.js', sb);
    const { waited } = await fire(sb, 'install');
    await assert.rejects(waited as Promise<unknown>);
  });

  it('la activare: se șterg numai cache-urile „urbis-” cu alt nume; altele rămân', async () => {
    const sb = sandbox({ cacheKeys: ['urbis-offline-v0', 'urbis-offline-v1', 'alta-aplicatie'] });
    load('public/sw.js', sb);
    const { waited } = await fire(sb, 'activate');
    await waited;
    assert.deepEqual([...sb.stores.keys()].sort(), ['alta-aplicatie', 'urbis-offline-v1']);
  });
});

describe('public/sw.js — ce interceptează (condiția 2)', () => {
  it('numai navigările GET de pe același domeniu, în afara /api/', () => {
    const sb = sandbox();
    const { handlesRequest } = load('public/sw.js', sb) as { handlesRequest: (r: unknown, o: string) => boolean };
    assert.equal(handlesRequest(nav('/'), ORIGIN), true);
    assert.equal(handlesRequest(nav('/confidentialitate.html'), ORIGIN), true);
    // API, inclusiv întoarcerea de la Google (o navigare)
    assert.equal(handlesRequest(nav('/api/v1/citizen/auth/google/callback?code=x&state=y'), ORIGIN), false);
    assert.equal(handlesRequest(nav('/api/v1/health'), ORIGIN), false);
    assert.equal(handlesRequest(nav('/api'), ORIGIN), false);
    // alte cereri decât navigările: fotografii, scripturi, API din aplicație
    assert.equal(handlesRequest({ url: `${ORIGIN}/api/v1/public/reports`, mode: 'cors', method: 'GET' }, ORIGIN), false);
    assert.equal(handlesRequest({ url: `${ORIGIN}/api/v1/photos/abc`, mode: 'no-cors', method: 'GET' }, ORIGIN), false);
    assert.equal(handlesRequest({ url: `${ORIGIN}/assets/index-abc.js`, mode: 'no-cors', method: 'GET' }, ORIGIN), false);
    // POST și alt domeniu
    assert.equal(handlesRequest(nav('/', ORIGIN, 'POST'), ORIGIN), false);
    assert.equal(handlesRequest(nav('/', 'https://alt-domeniu.test'), ORIGIN), false);
  });

  it('cererile netratate nu primesc respondWith (merg direct la rețea)', async () => {
    const sb = sandbox();
    load('public/sw.js', sb);
    const { responded } = await fire(sb, 'fetch', { request: nav('/api/v1/citizen/me') });
    assert.equal(responded, undefined);
    const img = await fire(sb, 'fetch', { request: { url: `${ORIGIN}/api/v1/photos/x`, mode: 'no-cors', method: 'GET' } });
    assert.equal(img.responded, undefined);
  });

  it('o navigare cu rețea: răspunsul serverului, fără nicio salvare în cache', async () => {
    const sb = sandbox();
    load('public/sw.js', sb);
    const { responded } = await fire(sb, 'fetch', { request: nav('/harta') });
    assert.equal(await responded, 'NETWORK');
    assert.deepEqual(sb.puts, []);
  });

  it('o navigare fără rețea: pagina offline din cache', async () => {
    const sb = sandbox({ networkDown: true });
    load('public/sw.js', sb);
    await (await fire(sb, 'install')).waited;
    const { responded } = await fire(sb, 'fetch', { request: nav('/harta') });
    assert.equal(await responded, 'OFFLINE');
    assert.deepEqual(sb.puts, []);
  });
});

describe('deploy/sw-retragere.js — retragerea (condiția 2 a auditorului, §5.3)', () => {
  it('instalare: skipWaiting(), imediat', async () => {
    const sb = sandbox();
    load('deploy/sw-retragere.js', sb);
    await fire(sb, 'install');
    assert.deepEqual(sb.log, ['skipWaiting']);
  });

  it('activare: claim → ștergerea numai a cache-urilor „urbis-” → dezînregistrare → reîncărcarea filelor, în această ordine', async () => {
    const sb = sandbox({ cacheKeys: ['urbis-offline-v1', 'urbis-offline-v2', 'alta-aplicatie'] });
    load('deploy/sw-retragere.js', sb);
    const { waited } = await fire(sb, 'activate');
    await waited;
    assert.deepEqual([...sb.stores.keys()], ['alta-aplicatie']);
    assert.deepEqual(sb.log, [
      'claim',
      'delete:urbis-offline-v1',
      'delete:urbis-offline-v2',
      'unregister',
      `navigate:${ORIGIN}/`,
      `navigate:${ORIGIN}/harta`,
    ]);
  });

  it('nu interceptează nicio cerere', () => {
    const sb = sandbox();
    load('deploy/sw-retragere.js', sb);
    assert.equal(sb.listeners.fetch, undefined);
  });
});

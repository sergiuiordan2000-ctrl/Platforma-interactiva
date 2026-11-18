// Urbis Activ — service worker-ul DE RETRAGERE (lotul PWA, propunerea r2, §5.3).
//
// NU face parte din aplicație și nu se publică în mod normal. Se folosește NUMAI la revenirea la o versiune
// fără service worker: se copiază în dosarul public al codului vechi sub numele `sw.js` și rămâne acolo
// cel puțin 30 de zile. Browserele care au service worker-ul aplicației îl descarcă la următoarea navigare.
//
// Secvența (condiția auditorului 2): instalare cu skipWaiting() → activare cu clients.claim() → ștergerea
// EXCLUSIV a cache-urilor Urbis Activ (prefixul „urbis-”) → dezînregistrare → reîncărcarea filelor deschise.
// Nu interceptează nicio cerere.

const CACHE_PREFIX = 'urbis-';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX)).map((k) => caches.delete(k)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(windows.map((w) => w.navigate(w.url).catch(() => undefined)));
    })(),
  );
});

if (typeof module !== 'undefined') module.exports = { CACHE_PREFIX };

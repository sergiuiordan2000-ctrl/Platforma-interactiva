// Urbis Activ — service worker-ul aplicației instalabile (lotul PWA, propunerea r2, §3).
//
// Ce stochează: un singur cache, OFFLINE_CACHE, cu EXCLUSIV /offline.html (pagină autonomă, fără alte resurse).
// Ce interceptează: numai navigările (mode „navigate”) de pe același domeniu, a căror cale NU începe cu /api/.
//   Cererea merge normal la server; numai dacă rețeaua lipsește se arată /offline.html. Răspunsurile NU se salvează.
// Ce NU atinge: nimic din /api/ (sesizări, conturi, sesiuni, administrare, sondaje), inclusiv întoarcerea de la
//   Google; fotografiile, imaginile, scripturile și stilurile; cookie-urile. Fără sincronizare, fără notificări push.
// Revenirea la versiunea anterioară: deploy/sw-retragere.js (propunerea r2, §5.3).

const CACHE_PREFIX = 'urbis-';
const OFFLINE_CACHE = 'urbis-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  // Condiția auditorului (1): pagina offline intră explicit în cache la instalare; dacă nu se poate,
  // promisiunea e respinsă, instalarea eșuează și browserul NU activează acest service worker.
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))),
  );
});

self.addEventListener('activate', (event) => {
  // la o versiune nouă: se șterg numai cache-urile Urbis Activ cu alt nume
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== OFFLINE_CACHE).map((k) => caches.delete(k))),
    ),
  );
});

/** Exportată pentru teste: cererile pe care service worker-ul le tratează (toate celelalte merg direct la rețea). */
function handlesRequest(request, origin) {
  if (request.mode !== 'navigate' || request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== origin) return false;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return false;
  return true;
}

self.addEventListener('fetch', (event) => {
  if (!handlesRequest(event.request, self.location.origin)) return; // fără respondWith: browserul tratează normal
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.open(OFFLINE_CACHE).then((cache) => cache.match(OFFLINE_URL)).then((res) => res || Response.error()),
    ),
  );
});

if (typeof module !== 'undefined') module.exports = { handlesRequest, OFFLINE_CACHE, OFFLINE_URL, CACHE_PREFIX };

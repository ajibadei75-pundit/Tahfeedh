/* Noor Hifz service worker — offline shell, runtime caching, safe updates */
const VERSION = 'nh-v6';
const SHELL_CACHE = VERSION + '-shell';
const RUNTIME_CACHE = VERSION + '-runtime';
const QURAN_CACHE = 'nh-quran'; // kept across versions so downloaded surahs stay available offline

const SHELL = [
  '/', '/index.html', '/css/madrasah.css', '/js/madrasah.js', '/js/quran.js', '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/favicon-32.png'
];
const CDN_PRECACHE = ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL.map((u) => shell.add(u).catch(() => {})));
    const rt = await caches.open(RUNTIME_CACHE);
    await Promise.all(CDN_PRECACHE.map((u) => fetch(u).then((r) => r.ok && rt.put(u, r)).catch(() => {})));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, RUNTIME_CACHE, QURAN_CACHE];
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !keep.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

async function trim(cacheName, max) {
  const c = await caches.open(cacheName);
  const keys = await c.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => c.delete(k)));
}

// stale-while-revalidate
async function swr(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) { cache.put(request, res.clone()); if (maxEntries) trim(cacheName, maxEntries); }
    return res;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

// network first, fall back to cache
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never touch writes (Supabase RPC calls are POST)
  const url = new URL(req.url);

  // Page navigations: network first, offline fallback to the cached app shell
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(SHELL_CACHE); c.put('/index.html', res.clone());
        return res;
      } catch (e) {
        return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) { event.respondWith(swr(req, SHELL_CACHE)); return; }

  if (url.hostname === 'api.alquran.cloud') { event.respondWith(swr(req, QURAN_CACHE, 80)); return; }          // Qur'an text works offline once opened
  if (url.hostname === 'api.aladhan.com') { event.respondWith(networkFirst(req, RUNTIME_CACHE)); return; }       // prayer times
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(swr(req, RUNTIME_CACHE, 60)); return;
  }
  // everything else (Supabase, audio streams) goes straight to the network
});

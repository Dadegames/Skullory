// sw.js — Skullory PWA (GitHub Pages, root + /sounds)
const CACHE = 'skullory-v1'; // ↑ aumenta il numero quando cambi asset

// Metti qui TUTTI i file “di base” che vuoi disponibili anche offline.
// Percorsi relativi alla root (dove sta index.html).
const ASSETS = [
  './',
  './index.html',
  './sfx.js',
  './skullory-logo.svg',
  './splash-template.svg',
  './chaos_.svg',
  './zen_.svg',

  // AUDIO (nella cartella /sounds)
  './sounds/bgm.mp3',
  './sounds/bonus_streak.wav',
  './sounds/bonus_tick.wav',
  './sounds/flip_card.wav',
  './sounds/lose.wav',
  './sounds/pair_fail.wav',
  './sounds/pair_ok.wav',
  './sounds/reshuffle.wav',
  './sounds/skull_reveal.wav',
  './sounds/tap_card.wav',
  './sounds/win.wav'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

// Strategia:
// - HTML (navigazione): network-first con fallback alla home in cache (offline).
// - Asset precache: cache-first.
// - Altri file: network-first con fallback cache.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 1) Navigazioni (click/link/refresh di pagine)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE);
        return cache.match('./index.html');
      }
    })());
    return;
  }

  // 2) Asset precache → cache-first
  const url = new URL(req.url);
  const isPrecached = ASSETS.some(p => url.pathname.endsWith(p.replace('./','/')));
  if (isPrecached) {
    event.respondWith(caches.match(req).then(r => r || fetch(req)));
    return;
  }

  // 3) Altri asset → network-first con fallback cache
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
      return res;
    } catch {
      const cached = await caches.match(req);
      return cached || new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});

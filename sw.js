const CACHE_VERSION = 'v8';
const STATIC_CACHE = `shushang-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `shushang-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/css/variables.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/cards.css',
  '/css/animations.css',
  '/css/chaos.css',
  '/js/config.js',
  '/js/state.js',
  '/js/helpers.js',
  '/js/api.js',
  '/js/characters.js',
  '/js/lang.js',
  '/js/auth.js',
  '/js/navigation.js',
  '/js/scenarios.js',
  '/js/setup.js',
  '/js/funtext.js',
  '/js/game.js',
  '/js/history.js',
  '/js/dm.js',
  '/js/voice.js',
  '/js/socket.js',
  '/js/chaos.js',
  '/js/profile.js',
  '/js/admin.js',
  '/js/creatures.js',
  '/js/app.js',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

const OFFLINE_PAGE = '/';

// Install: cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Network-first for API calls
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, images)
  if (
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.match(/\.(png|svg|ico|woff2?)$/)
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Network-first for HTML pages with offline fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(DYNAMIC_CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(cached => cached || caches.match(OFFLINE_PAGE))
      )
  );
});

const CACHE_VERSION = 'v119';
const STATIC_CACHE = `ShowShung-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ShowShung-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/css/variables.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/cards.css',
  '/css/animations.css',
  '/css/chaos.css',
  '/css/typography.css',
  '/css/cinema-pages.css',
  '/css/showshung-mobile-theme.css',
  '/css/mobile-layout-patch.css',
  '/css/mascot.css',
  '/js/mascot.js',
  '/img/skeleton.png',
  '/js/config.js',
  '/js/state.js',
  '/js/helpers.js',
  '/js/api.js',
  '/js/characters.js',
  '/js/cardImages.js',
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
  '/js/lab.js',
  '/js/profile.js',
  '/js/admin.js',
  '/js/creatures.js',
  '/js/app.js',
  '/icon-192.png',
  '/icon-512.png',
  '/img/cover.png',
  '/img/backgrand.png',
  '/img/cards/back.png',
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

// Fetch: stale-while-revalidate for static, network-first for API
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Skip external requests (CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // API calls: network-only for auth, network-first for others
  if (url.pathname.startsWith('/api/')) {
    // Never cache auth endpoints
    if (url.pathname.includes('/auth/')) {
      e.respondWith(fetch(e.request));
      return;
    }
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(DYNAMIC_CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Network-first for JS (always get latest code)
  if (url.pathname.startsWith('/js/')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Stale-while-revalidate for CSS and images
  if (
    url.pathname.startsWith('/css/') ||
    url.pathname.match(/\.(png|svg|ico|woff2?|webp)$/)
  ) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first for HTML pages with offline fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(cached => cached || caches.match(OFFLINE_PAGE))
      )
  );
});

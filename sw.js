const CACHE_NAME = 'shushang-v2';
const ASSETS = [
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
  '/js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});

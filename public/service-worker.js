const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/investor-dashboard.html',
  '/applications-list.html',
  '/css/professional-theme.css',
  '/css/responsive.css',
  '/css/app/design-tokens.css',
  '/css/app/base.css',
  '/css/layout.css',
  '/css/components/skeleton-loader.css',
  '/js/state/app-state.js',
  '/js/theme/theme-manager.js',
  '/js/realtime/websocket-manager.js',
  '/js/cache/cache-manager.js',
  '/images/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      ))
  );
});

function cacheFirst(request) {
  return caches.match(request)
    .then((cached) => cached || fetch(request));
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      const clone = response.clone();
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.put(request, clone));
      return response;
    })
    .catch(() => caches.match(request));
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isStatic = STATIC_ASSETS.some((asset) => asset === url.pathname);

  event.respondWith(
    isStatic ? cacheFirst(event.request) : networkFirst(event.request)
  );
});

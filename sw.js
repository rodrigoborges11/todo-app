// Service worker minimalista: cache-first para os ficheiros da própria app,
// network-first para tudo o resto (fontes, Tailwind CDN, APIs Google).
// As chamadas à API Google NUNCA são servidas por este cache (RNF-42) —
// deixamos essas pedidos passar diretamente para a rede.

const CACHE_NAME = 'ledger-app-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/app.css',
  './js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isGoogleApi(url) {
  return url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('google.com');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (isGoogleApi(url)) return; // nunca servir/gravar em cache dados do Google

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && (url.origin === self.location.origin || url.hostname.includes('fonts.g'))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});

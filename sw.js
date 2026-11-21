/* ThisAbility Service Worker — v3
   Handles: notification clicks, offline cache for local assets. */

/* JS modules change frequently during development — always fetch from network.
   Only cache static assets (images, CSS) for performance. */
const ASSET_CACHE = 'ta-v8-assets';

const STATIC_ASSETS = [
  './assets/logo-icon.png',
  './assets/logo-full.png',
  './index.html', // cached as offline fallback
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(ASSET_CACHE)
      .then((c) => c.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== ASSET_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // skip external APIs + OSM tiles
  if (e.request.method !== 'GET') return;

  // JS and HTML: network-first; fall back to cache when offline
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then((cached) => cached || caches.match('./index.html'))
      )
    );
    return;
  }

  // Static assets (images, CSS): cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

/* Notification action handler */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if (e.action === 'cancel') return; // user dismissed — nothing to do

  // 'open' action or tap: focus existing window or open a new one
  e.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((all) => {
        const existing = all.find((c) => 'focus' in c);
        return existing ? existing.focus() : self.clients.openWindow('./');
      })
  );
});

/* ThisAbility Service Worker — v2
   Handles: notification clicks, offline cache for local assets. */

const CACHE = 'ta-v2-shell';

const SHELL = [
  './',
  './index.html',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/auth.css',
  './css/explore.css',
  './css/passport.css',
  './css/settings.css',
  './css/responsive.css',
  './js/main.js',
  './js/state.js',
  './js/ui.js',
  './js/routing.js',
  './js/map.js',
  './js/tfl.js',
  './js/osrm.js',
  './js/autocomplete.js',
  './js/falldetector.js',
  './js/notify.js',
  './js/screens/auth.js',
  './js/screens/explore.js',
  './js/screens/guardian.js',
  './js/screens/passport.js',
  './js/screens/settings.js',
  './assets/logo-icon.png',
  './assets/logo-full.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Cache-first for local shell assets; network-only for external APIs. */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Skip cross-origin API calls (Nominatim, TfL, OSRM, OSM tiles)
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

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

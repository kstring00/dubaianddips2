/* Dubai & Dips service worker.
   Makes the site installable and fast to reopen: the shell (pages, scripts,
   config, fonts, posters, icons) is cached; navigations and scripts are
   network-first so a config change (the Toast link) lands on the next open;
   images and fonts are cache-first.

   Never cached: anything off this origin (so never a Toast page), the two
   films, and any non-GET request. Bump VERSION to drop old caches. */
var VERSION = 'dd-2026-09-19a';
var SHELL = [
  '/', '/index.html', '/order-demo', '/404.html',
  '/site.js', '/track.js', '/demo.js', '/config/ordering.js', '/manifest.webmanifest',
  '/assets/favicon.svg', '/assets/apple-touch-icon.png', '/assets/icon-192.png', '/assets/icon-512.png', '/assets/icon-maskable-512.png',
  '/assets/hero-poster.webp', '/assets/craft-poster.webp',
  '/assets/fonts/fraunces-2.woff2', '/assets/fonts/sourcesans-2.woff2', '/assets/fonts/plexmono-2.woff2'
];
var NETWORK_FIRST = /\.(html|js|webmanifest)$|\/$|\/order-demo$|\/menu\//;
var NEVER = /\.(mp4|webm|mov)$/;

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    /* one missing file must not fail the whole install */
    return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          /* Toast, maps, fonts CDNs: straight through, never stored */
  if (NEVER.test(url.pathname)) return;                     /* the films stream from the network */
  if (url.search.indexOf('mode=') > -1 && !NETWORK_FIRST.test(url.pathname)) return;

  if (req.mode === 'navigate' || NETWORK_FIRST.test(url.pathname)) {
    e.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        return req.mode === 'navigate' ? caches.match('/') : Response.error();
      });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});

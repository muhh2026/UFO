// Service Worker für UFO-Jagd: cached nur lokale Dateien (nie das Firebase-CDN),
// damit das Spiel offline spielbar bleibt und lokale Highscores als Fallback dienen.
var CACHE = "ufo-jagd-v1";
var ASSETS = [
  "./",
  "./index.html",
  "./js/game.js",
  "./js/crosshair.js",
  "./js/cinematic-blast.js",
  "./js/firebase-highscore.js",
  "./favicon.svg",
  "./manifest.webmanifest",
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(function (c) {
        return c.addAll(ASSETS);
      })
      .then(function () {
        return self.skipWaiting();
      }),
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  // Nur eigene, lokale GET-Requests cachen – CDN/Firebase läuft normal übers Netz.
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(function (r) {
      if (r) return r;
      return fetch(e.request)
        .then(function (resp) {
          if (resp && resp.ok) {
            var copy = resp.clone();
            caches.open(CACHE).then(function (c) {
              c.put(e.request, copy);
            });
          }
          return resp;
        })
        .catch(function () {
          return caches.match("./index.html");
        });
    }),
  );
});

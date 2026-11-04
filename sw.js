// Service Worker für UFO-Jagd: Nachtangriff
//
// Strategie (wichtig nach jedem Deploy!):
// - Network-first für Navigationen, HTML, JS, Manifest, JSON:
//   immer frischer Code vom Server, HTTP-Cache wird per {cache:'no-cache'} umgangen.
// - Cache-first nur für statische Assets (z. B. favicon.svg).
// - Offline: Fallback auf den Cache bzw. index.html.
// - CACHE-Version wird bei jedem Release hochgezählt; beim Activate werden
//   alle älteren Caches gelöscht, skipWaiting + clients.claim sorgen dafür,
//   dass das Update sofort aktiv wird.
var CACHE = "ufo-jagd-v4";
var ASSETS = [
  "./",
  "./index.html",
  "./js/intro.js",
  "./js/game.js",
  "./js/crosshair.js",
  "./js/cinematic-blast.js",
  "./js/firebase-highscore.js",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./deep/",
  "./deep/index.html",
  "./deep/game.js",
];

// Muss "frisch" vom Netz geladen werden (nie aus dem alten Cache servieren)?
function isFresh(url) {
  var p = url.pathname;
  return (
    url.pathname === "/" ||
    p.endsWith("/") ||
    p.endsWith(".html") ||
    p.endsWith(".js") ||
    p.endsWith(".webmanifest") ||
    p.endsWith(".json")
  );
}

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
  // Nur eigene, lokale GET-Requests behandeln – CDN/Firebase läuft übers Netz.
  if (e.request.method !== "GET" || u.origin !== self.location.origin) return;

  if (e.request.mode === "navigate" || isFresh(u)) {
    // Network-first: frischer Code, HTTP-Cache umgehen
    e.respondWith(
      fetch(e.request, { cache: "no-cache" })
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
          // offline -> Cache -> index.html
          return caches.match(e.request).then(function (r) {
            return r || caches.match("./index.html");
          });
        }),
    );
    return;
  }

  // Statische Assets: cache-first, im Hintergrund aktualisieren
  e.respondWith(
    caches.match(e.request).then(function (r) {
      if (r) return r;
      return fetch(e.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) {
            c.put(e.request, copy);
          });
        }
        return resp;
      });
    }),
  );
});

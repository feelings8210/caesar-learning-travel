/* Caesar Learning travel pack service worker.
 *
 * Version-skew defence: the entire app - HTML, CSS, JavaScript and all lesson
 * content - is ONE file (index.html). There is no separate JS or CSS bundle
 * that could go stale against a newer page, which is the failure mode seen in
 * Caesar Games. The only other cached assets are this worker, the manifest and
 * two icons, none of which carry logic.
 *
 * Strategy: network-first for navigations so a rebuilt pack is picked up the
 * moment there is a network, with an immediate cache fallback when offline.
 * Cache-first for the icons and manifest, which never change meaningfully.
 */

var VERSION = "6ab6a246ff2e27ee";
var CACHE = "caesar-travel-" + VERSION;
var ASSETS = [
  "./", "index.html", "manifest.webmanifest",
  "icon-120.png", "icon-152.png", "icon-167.png", "icon-180.png",
  "icon-192.png", "icon-512.png", "icon-1024.png", "icon-maskable-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put("index.html", copy); });
          return res;
        })
        .catch(function () {
          return caches.match("index.html").then(function (hit) {
            return hit || caches.match("./");
          });
        })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
    })
  );
});

/* IBI Signed Manifest – Service Worker  (PWA offline shell)
   Bump CACHE_VERSION on every change so phones/laptops pick up the update. */
const CACHE_VERSION = "ibi-manifest-v7.0";
const CORE = [ "./", "./index.html" ];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_VERSION).then(function (c) {
    return c.addAll(CORE).catch(function(){ /* ignore individual failures */ });
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; })
                            .map(function (k) { return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Network-first for navigations (so updates show), cache fallback when offline.
self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req).then(function(r){ return r || caches.match("./index.html"); }); })
    );
    return;
  }
  // Cache-first for other same-origin GETs.
  e.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
    })
  );
});

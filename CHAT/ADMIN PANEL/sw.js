var CACHE_NAME = "jc-admin-v2";

self.addEventListener("install", function (e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll([
                "./",
                "./index.html",
                "./manifest.json",
                "./css/style.css",
                "./js/main.js",
                "./js/firebase-config.js",
                "./js/telegram-config.js",
                "./icons/icon-192.png",
                "./icons/icon-512.png",
                "./icons/apple-touch-icon.png"
            ]);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", function (e) {
    e.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys.filter(function (k) { return k !== CACHE_NAME; })
                    .map(function (k) { return caches.delete(k); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", function (e) {
    if (e.request.method !== "GET") return;

    var url = e.request.url;
    if (url.indexOf("firebase") !== -1 || url.indexOf("telegram") !== -1 || url.indexOf("gstatic") !== -1) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then(function (cached) {
            if (cached) return cached;
            return fetch(e.request).then(function (res) {
                if (res && res.status === 200) {
                    var copy = res.clone();
                    caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, copy); });
                }
                return res;
            }).catch(function () {
                return caches.match("./index.html");
            });
        })
    );
});
/**
 * Service Worker PinkyPlan — cache asset utama untuk offline-friendly PWA.
 */
const CACHE_NAME = "pinkyplan-v2";
const CORE_ASSETS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./assets/css/variables.css",
    "./assets/css/base.css",
    "./assets/css/layout.css",
    "./assets/css/components.css",
    "./assets/css/pages.css",
    "./assets/css/animation.css",
    "./assets/css/responsive.css",
    "./assets/js/app.js",
    "./assets/js/config.js",
    "./assets/js/storage.js",
    "./assets/js/store.js",
    "./assets/js/helpers.js",
    "./assets/js/router.js",
    "./assets/js/theme.js",
    "./data/quotes.json",
    "./data/categories.json"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => undefined)
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;
    if (!request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(request).then((cached) => {
            const fetched = fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => cached || caches.match("/index.html"));
            return cached || fetched;
        })
    );
});

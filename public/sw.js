// Minimal service worker: caches a small app shell so the app can at
// least show something (rather than a browser error page) when offline,
// and lets the browser offer "Install app". This is intentionally simple
// — a production build would want a proper strategy (e.g. Workbox) for
// versioned asset caching, background sync for queued actions made while
// offline, and push notification handling.

const CACHE_NAME = "sharepool-shell-v1";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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

  // Only handle GET navigations/assets; never intercept API calls or
  // mutations — those must always hit the network so data stays correct.
  if (request.method !== "GET" || request.url.includes("/api/")) return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) => cached || caches.match("/"))
    )
  );
});

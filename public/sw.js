const CACHE_NAME = "syncup-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

// Deliberately narrow: SyncUp is a realtime app (live sessions, swipes,
// results) — HTML navigations, Server Actions, and Supabase/TMDB calls
// always need the real network, so this never caches them. All it caches
// is Next's content-hashed static assets (safe indefinitely: a new
// deploy ships new filenames rather than mutating an old one) plus the
// manifest/icons. That's also what keeps this satisfying Chrome's
// installability check (a registered service worker with a real fetch
// handler) without pretending the app works offline, which it doesn't
// and isn't meant to.
function isCacheable(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname === "/manifest.json" ||
      url.pathname.startsWith("/icon") ||
      url.pathname === "/apple-touch-icon.png")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isCacheable(url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

// Bumped to v2 to force every existing visitor's service worker to evict
// whatever it cached under v1 — specifically /icon.png, which went through
// three different versions (missing link tag, card-fan redesign, reverted
// back to the original) while cached cache-first with no invalidation, so
// some browsers were stuck serving a stale copy indefinitely regardless of
// a hard refresh. Bump this string again any time a cached, non-hashed
// file's content needs to change — see isCacheable()'s comment below for
// why that's now a narrower list.
const CACHE_NAME = "syncup-static-v2";

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
// always need the real network, so this never caches them. Only Next's
// content-hashed static assets are cache-first-safe: a new deploy ships
// new filenames rather than mutating an old one, so a stale cache entry
// is simply never requested again. manifest.json and the icon files are
// NOT content-hashed (same URL every deploy, content can change — as the
// favicon just did three times), so a cache-first strategy for them
// serves a permanently stale copy the moment they're ever edited, with no
// way for a returning visitor to self-heal short of a cache-name bump
// (see above). Left uncached entirely instead: the browser's own ordinary
// HTTP cache already handles them correctly, respecting Vercel's
// Cache-Control on redeploy, which this SW's override was fighting.
// A registered SW with a real fetch handler is all Chrome's PWA
// installability check requires — it doesn't need these in scope too.
function isCacheable(url) {
  return url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");
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

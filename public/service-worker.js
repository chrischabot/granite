/* Granite — minimal offline service worker.
 *
 * Strategy:
 *   - Pre-cache the page shell + manifest on install.
 *   - Cache-first for hashed assets (Vite emits content-hashed filenames in
 *     /assets/, so cache hits are guaranteed-fresh).
 *   - Network-first for navigations, falling back to the cached shell.
 *   - Pass-through for cross-origin requests.
 */
const CACHE_VERSION = "granite-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))).then(
        () => self.clients.claim(),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // pass-through cross-origin
  if (req.method !== "GET") return; // never cache mutations

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
            return resp;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("/").then((r) => r || caches.match("/index.html") || new Response("", { status: 503 })),
      ),
    );
  }
});
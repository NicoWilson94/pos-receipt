// Offline cache for the receipt page.
// Bump VERSION whenever you change receipt.html or logo.png, so tablets pick up the new copy.
const VERSION = "receipt-v8";
const FILES = ["./receipt.html", "./logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) =>
      // add files one by one so a missing logo.png doesn't break the install
      Promise.all(FILES.map((f) => cache.add(f).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from the saved copy first (works offline, opens instantly),
// then quietly refresh the saved copy in the background when online.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(event.request, { ignoreSearch: true }).then((cached) => {
        const fresh = fetch(event.request)
          .then((res) => {
            if (res && res.ok && new URL(event.request.url).origin === location.origin) {
              cache.put(event.request, res.clone());
            }
            return res;
          })
          .catch(() => cached);
        return cached || fresh;
      })
    )
  );
});

/* Cache application assets only. Firebase requests and user records never enter CacheStorage. */
const root = new URL('./', self.location.href).pathname;
const CACHE_PREFIX = `life-os-shell:${encodeURIComponent(root)}:`;
const CACHE = `${CACHE_PREFIX}v2.0.1`;
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch(root, { cache: 'reload' });
      if (!response.ok) return;
      const html = await response.clone().text();
      await cache.put(root, response);
      const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
        .map((match) => new URL(match[1], self.location.origin + root))
        .filter(
          (url) =>
            url.origin === self.location.origin &&
            /\.(?:js|css|woff2?|png|svg|ico)$/.test(url.pathname),
        );
      await Promise.allSettled(assets.map((url) => cache.add(url.href)));
    })().catch(() => {}),
  );
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(root)
  )
    return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === root) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(root, copy));
          }
          return response;
        })
        .catch(async () => (await (await caches.open(CACHE)).match(root)) || Response.error()),
    );
    return;
  }
  if (/\.(?:js|css|woff2?|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) => cache.match(request))
        .then(
          (cached) =>
            cached ||
            fetch(request).then((response) => {
              if (response.ok) {
                const copy = response.clone();
                caches.open(CACHE).then((cache) => cache.put(request, copy));
              }
              return response;
            }),
        ),
    );
  }
});


const scope = new URL(self.registration.scope);
const cachePrefix = 'prismlab-' + scope.pathname + ':';
const cacheName = cachePrefix + '1370b57daeedd9c2';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) {
    if (key.startsWith(cachePrefix) && key !== cacheName) await caches.delete(key);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.headers.has('range') ||
      url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const relative = url.pathname.slice(scope.pathname.length);
  if (relative === 'offline.js') return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName).catch(() => null);
    const cached = await cache?.match(request);
    const immutable = relative.startsWith('_next/static/');
    if (cached && immutable) return cached;
    try {
      const response = await fetch(request, immutable ? undefined : { cache: 'no-cache' });
      if (cached && response.status >= 500) return cached;
      if (response.ok && response.type === 'basic') await cache?.put(request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      if (cached) return cached;
      if (request.mode === 'navigate') {
        return new Response('PrismLab is offline. Visit this page online once before opening it offline.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
      throw error;
    }
  })());
});

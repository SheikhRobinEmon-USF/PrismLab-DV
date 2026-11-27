import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const entries = await readdir("out", { recursive: true, withFileTypes: true });
const files = entries.filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name)).sort();
const hash = createHash("sha256");
for (const path of files) {
  if (path === join("out", "offline.js")) continue;
  hash.update(path + "\0");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
}
const version = hash.digest("hex").slice(0, 16);
const worker = `
const scope = new URL(self.registration.scope);
const cachePrefix = 'prismlab-' + scope.pathname + ':';
const cacheName = cachePrefix + '${version}';
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
`;
await writeFile("out/offline.js", worker);

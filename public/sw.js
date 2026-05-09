/**
 * Service worker mínimo para TillandsIA — escrito a mano, sin build step.
 *
 * Estrategia:
 *  - OSM tiles → CacheFirst, max 1000, TTL 30 días
 *  - Vercel Blob (fotos) → CacheFirst, max 200, TTL 1 año (blobs inmutables)
 *  - /api/* → siempre red (nunca cachear)
 *  - Resto: NetworkFirst con fallback a caché para offline
 *
 * Versionado: incrementar SW_VERSION purga las cachés viejas en activate.
 */

const SW_VERSION = "v2";
const TILE_CACHE = `osm-tiles-${SW_VERSION}`;
const PHOTO_CACHE = `blob-photos-${SW_VERSION}`;
const SHELL_CACHE = `shell-${SW_VERSION}`;

const TILE_MAX_ENTRIES = 1000;
const TILE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const PHOTO_MAX_ENTRIES = 200;
const PHOTO_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

self.addEventListener("install", (event) => {
  // Activa este SW inmediatamente, sin esperar a que se cierren las pestañas viejas
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Toma control de las páginas abiertas inmediatamente
      await self.clients.claim();
      // Purga cachés de versiones anteriores
      const keep = new Set([TILE_CACHE, PHOTO_CACHE, SHELL_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Solo interceptamos GET — POST/PUT/DELETE pasan a red
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // /api/* nunca se cachea — siempre red
  if (url.pathname.startsWith("/api/")) return;

  // OSM tiles → CacheFirst
  if (/tile\.openstreetmap\.org$/.test(url.hostname)) {
    event.respondWith(cacheFirst(req, TILE_CACHE, TILE_MAX_ENTRIES, TILE_MAX_AGE_MS));
    return;
  }

  // Vercel Blob (fotos públicas) → CacheFirst
  if (/\.public\.blob\.vercel-storage\.com$/.test(url.hostname)) {
    event.respondWith(cacheFirst(req, PHOTO_CACHE, PHOTO_MAX_ENTRIES, PHOTO_MAX_AGE_MS));
    return;
  }

  // Same-origin: NetworkFirst con fallback a caché
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req, SHELL_CACHE));
    return;
  }
});

/**
 * CacheFirst: si está en caché lo devuelve, si no va a red y guarda.
 * Aplica límite de entradas y TTL — descarta lo más viejo.
 */
async function cacheFirst(request, cacheName, maxEntries, maxAgeMs) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    const dateHeader = cached.headers.get("sw-cached-at");
    const cachedAt = dateHeader ? Number.parseInt(dateHeader, 10) : 0;
    if (Date.now() - cachedAt < maxAgeMs) return cached;
    await cache.delete(request);
  }
  try {
    const res = await fetch(request);
    if (res.ok) {
      const clone = res.clone();
      const headers = new Headers(clone.headers);
      headers.set("sw-cached-at", String(Date.now()));
      const body = await clone.blob();
      const stamped = new Response(body, { status: clone.status, headers });
      await cache.put(request, stamped);
      await trimCache(cache, maxEntries);
    }
    return res;
  } catch (err) {
    // Sin red y sin caché — devolvemos un fallback transparente
    return cached || new Response("", { status: 504, statusText: "Sin conexión" });
  }
}

/**
 * NetworkFirst: intenta red primero, cae a caché si falla.
 * Útil para shell y rutas SSR (HTML).
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok && (request.destination === "document" || request.destination === "")) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fallback offline: devolver la home cacheada (si existe) para navegaciones
    if (request.mode === "navigate") {
      const home = await cache.match("/");
      if (home) return home;
    }
    return new Response("Sin conexión", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

/**
 * Mantiene la caché por debajo de `maxEntries` eliminando las entradas más
 * antiguas (orden FIFO de cache.keys()).
 */
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const toRemove = keys.length - maxEntries;
  for (let i = 0; i < toRemove; i++) {
    await cache.delete(keys[i]);
  }
}

// Service Worker de la app (SPEC-034 imágenes + SPEC-040 app shell).
//
// SPEC-034: cachea las imágenes de carta que se ven en la ficha del navegador de la sección DB para
// servirlas offline. El host de ARH no manda CORS, así que las respuestas se cachean como OPACAS (no
// se pueden leer, pero sí re-servir a un <img>).
//
// SPEC-040: además precachea el app shell (index.html + JS/CSS/manifest/iconos con hash) para que la
// app arranque sin red. La lista la inyecta `scripts/build-sw-precache.mjs` en `dist/sw.js` después
// del build; en `npm run dev` este fichero se sirve tal cual, sin inyectar, y las constantes caen a
// sus defaults (lista vacía) → el SW se comporta como antes de SPEC-040, solo cache de imágenes.
//
// No usa skipWaiting()/clients.claim() por su cuenta: controla la página en la siguiente recarga (los
// criterios de SPEC-034 asumen esa recarga intermedia). Solo hace skipWaiting() cuando la página se lo
// pide con postMessage, al pulsar el usuario "Actualizar" (SPEC-040).

const IMAGE_CACHE = 'card-images-v1';

// Inyectados por scripts/build-sw-precache.mjs. Sin inyectar (dev) → shell desactivado.
const PRECACHE = self.__PRECACHE_MANIFEST__ ?? [];
const SHELL_CACHE = self.__PRECACHE_CACHE__ ?? 'app-shell-dev';
const SHELL_INDEX = self.__PRECACHE_INDEX__ ?? null;

// Casa las URLs de imagen de carta de forma agnóstica al host (ARH o el mirror): .../<carpeta>/<code>.jpg
// donde la carpeta son 2 dígitos en los sets oficiales (01-13) y 3 en la continuación fan
// (14-25 → 101, 102, 105…, SPEC-041), y code son dígitos con posible sufijo A/B (cartas de dos caras).
const CARD_IMAGE_RE = /\/\d{2,3}\/\d+[AB]?\.jpg$/;

self.addEventListener('install', (event) => {
  if (PRECACHE.length === 0) return; // dev: nada que precachear
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
});

self.addEventListener('activate', (event) => {
  // Borra los caches de builds viejas. IMAGE_CACHE se perdona SIEMPRE: las imágenes ya vistas
  // (SPEC-034) no se pierden al desplegar una versión nueva.
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== IMAGE_CACHE && name !== SHELL_CACHE)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
});

// La página pide tomar el control ya (botón "Actualizar" del aviso de versión nueva, SPEC-040).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function handleCardImage(req) {
  return caches.open(IMAGE_CACHE).then(async (cache) => {
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      // Cachea solo respuestas válidas (ok) u opacas (cross-origin sin CORS); nunca errores.
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      // Sin red y sin cache: deja que el <img> falle → onError → fallback a texto en la ficha.
      return Response.error();
    }
  });
}

// Navegación (abrir/recargar la app): sirve el index.html precacheado. La app es una SPA de una sola
// página, así que cualquier navegación dentro del scope se resuelve con ese mismo documento.
function handleNavigation() {
  return caches.open(SHELL_CACHE).then(async (cache) => {
    const cached = await cache.match(SHELL_INDEX);
    if (cached) return cached;
    try {
      return await fetch(SHELL_INDEX);
    } catch {
      return Response.error();
    }
  });
}

// Asset propio con hash en el nombre (JS/CSS/manifest/iconos): cache-first. Al cambiar el contenido
// cambia el nombre, así que servir de cache nunca da una versión rancia.
function handleShellAsset(req) {
  return caches.open(SHELL_CACHE).then(async (cache) => {
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return Response.error();
    }
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    if (SHELL_INDEX) event.respondWith(handleNavigation());
    return;
  }

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  if (req.destination === 'image' && CARD_IMAGE_RE.test(url.pathname)) {
    event.respondWith(handleCardImage(req));
    return;
  }

  if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith(handleShellAsset(req));
  }
});

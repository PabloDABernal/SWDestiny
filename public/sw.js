// Service Worker de cache de imágenes de carta (SPEC-034). Cachea las imágenes que se ven en la
// ficha del navegador de la sección DB para servirlas offline. El host de ARH no manda CORS, así que
// las respuestas se cachean como OPACAS (no se pueden leer, pero sí re-servir a un <img>).
//
// No usa skipWaiting()/clients.claim(): controla la página en la siguiente recarga (los criterios de
// la spec asumen esa recarga intermedia).

const CACHE = 'card-images-v1';

// Casa las URLs de imagen de carta de forma agnóstica al host (ARH o un mirror): .../<NN>/<code>.jpg
// donde NN son 2 dígitos y code son dígitos con posible sufijo A/B (cartas de dos caras).
const CARD_IMAGE_RE = /\/\d{2}\/\d+[AB]?\.jpg$/;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.destination !== 'image') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (!CARD_IMAGE_RE.test(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
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
    }),
  );
});

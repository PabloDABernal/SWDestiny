# SPEC-034: Imágenes de carta en la ficha (on-demand + cache IndexedDB + fallback)

**Estado:** Completada
**Sección del GDD:** §7 (nota "Sección DB" / imágenes)
**Depende de:** SPEC-030 (snapshot: `code` de cada carta), SPEC-032 (ficha del navegador en
`DbSection`)

## Qué es (2-4 líneas)

En la **ficha de detalle** del navegador de cartas (sección DB), además de los datos de texto, se
muestra la **imagen real** de la carta (`<img>`), descargada bajo demanda de ARH (o de un mirror
configurable). Un **Service Worker** cachea las imágenes vistas y las sirve **offline** (persistente
entre recargas); si no hay imagen (offline y no cacheada, o fallo/404), la ficha cae al detalle de
texto de siempre (SPEC-032). No se bundlean imágenes en el repo (serían ~226 MB).

**Por qué Service Worker y no `fetch`+IndexedDB (verificado 2026-07-26):** el host de imágenes de ARH
**no manda cabeceras CORS**, así que `fetch()` cross-origin no puede leer el blob para guardarlo en
IndexedDB (respuesta opaca). En cambio `<img src>` **pinta** la imagen sin necesidad de CORS, y un
Service Worker puede **cachear respuestas opacas** (Cache Storage) y servirlas offline sin CORS. Por
eso la imagen se muestra con `<img>` y la persistencia offline la da el SW, no IndexedDB.

## Origen de la imagen

- La URL se **reconstruye desde el `code`** (no se depende del `imagesrc` del snapshot, que además
  viene en `http://`): `<BASE>/<NN>/<code>.jpg`, donde `NN` son los 2 primeros dígitos del código
  (el set). Ej.: `02036` → `<BASE>/02/02036.jpg`. **Patrón verificado 2026-07-26** contra el host
  real: `https://…/en/02/02036.jpg` responde `200 image/jpeg`.
- `BASE` es **configurable** (constante leída de `import.meta.env.VITE_CARD_IMAGE_BASE`, con default
  al de ARH). Así, si ARH cae, apuntar a un **mirror propio** (S3/CDN/GitHub Releases) es cambiar una
  variable, sin tocar código. **Debe ser `https`** (en GitHub Pages, una imagen `http://` se bloquea
  por mixed-content; el default https ya lo cumple).
- Default: `https://db.swdrenewedhope.com/bundles/app/images/cards/en`.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] En la sección DB, elegir una carta → en su ficha aparece la **imagen** de la carta (además de
      los datos de texto), con la red disponible. Mientras carga se ve un **placeholder** (no un
      hueco roto).
- [ ] Ver una carta (con el Service Worker ya activo, tras la primera carga/recarga) y luego cortar
      la red (DevTools → Network → Offline) y **volver a abrirla** → la imagen **sigue mostrándose**
      (servida por el Service Worker desde Cache Storage), sin pedir red.
- [ ] Abrir una carta **nunca vista** estando **offline** → no hay imagen; la ficha muestra el
      detalle de **texto** (fallback), sin error ni imagen rota.
- [ ] La persistencia del cache de imágenes sobrevive a recargas **online**: con el SW activo, ver
      cartas, recargar (online) y volver a la DB → esas imágenes ya no piden red (Cache Storage
      persiste). *(Nota: recargar la página **estando offline** NO carga la app — el app shell no se
      cachea; hacer la app entera offline/instalable es una PWA fuera del alcance de esta spec, ver
      abajo.)*
- [ ] Cambiar `VITE_CARD_IMAGE_BASE` a otra base (mirror) y reconstruir → las imágenes se piden a esa
      base (verificable en Network), sin tocar más código.

## Fuera de alcance (explícito)

- **Miniaturas en la lista** del navegador: solo la ficha de detalle lleva imagen (decisión del
  usuario, 2026-07-26); la lista sigue siendo texto.
- **Bundlear las imágenes** en el repo/build: descartado por tamaño (~226 MB). El snapshot sigue
  siendo solo datos.
- **Descargar/pre-cachear todas** las imágenes de golpe en el juego: el cache se llena a medida que
  se ven cartas, no de una tacada.
- **Imágenes en el tablero de juego** (fichas de personaje, mano): esta spec es solo la ficha de la
  sección DB. Llevar imágenes al juego es otra spec.
- **App offline / PWA** (cachear el app shell HTML/JS/CSS para que la app entera funcione sin red y
  sea instalable): fuera de alcance. El Service Worker de esta spec cachea **solo las imágenes de
  carta**; recargar la app estando offline muestra el error del navegador (no hay shell cacheado).
  Convertirla en PWA offline es una spec propia futura (BACKLOG).
- **Invalidar/expirar** el cache de imágenes (errata que cambia el arte): no se gestiona; una imagen
  cacheada se sirve indefinidamente. Limpiar el cache es manual (borrar datos del sitio) hasta que se
  decida una spec de mantenimiento.

## Casos límite

- **Carta sin imagen en el origen** (404): fallback a texto vía `onError` del `<img>`, sin imagen
  rota. El SW **no** cachea respuestas de error (solo `ok` u opacas de imagen real), para reintentar
  si el mirror la añade luego. **Verificado 2026-07-26:** los códigos de dos caras (`13015A`) dan
  404 en el host → siempre caen a texto.
- **Código de dos caras** (`13015A`): la URL usa el `code` tal cual (`.../13/13015A.jpg`); el origen
  no la tiene (404) → texto.
- **Service Worker no disponible** (navegador viejo, o no registrado aún en la 1ª visita antes de la
  primera recarga): la imagen se sigue **mostrando** vía `<img>` con la red; simplemente no hay cache
  offline gestionado por SW hasta que esté activo (degradación, no rotura). Se verifica a mano viendo
  que con red la imagen aparece aunque el SW no controle todavía la página.
- **Cambiar de carta rápido** en la ficha: como la imagen se pinta con `<img src={urlDeLaCartaActual}>`,
  al seleccionar otra carta React cambia el `src`; el `onLoad`/`onError` van ligados a la carta
  actual, así que no se queda pintada la imagen de una carta anterior.
- **Base mal configurada / mirror caído**: fallo de red/`onError` → fallback a texto, igual que
  offline.
- **Red muy lenta / petición colgada**: no se pone timeout manual sobre el `<img>` (riesgo aceptado);
  el `onError` del navegador acaba disparando el fallback si la carga falla. Mientras tanto se ve el
  placeholder, no un spinner infinito bloqueante (el resto de la ficha —texto— ya está visible).

## Notas técnicas (opcional)

- **URL**: helper `cardImageUrl(code)` en `src/data/cardImages.ts` (o similar) que compone
  `<BASE>/<code.slice(0,2)>/<code>.jpg`. `BASE` de `import.meta.env.VITE_CARD_IMAGE_BASE ??` default
  https de ARH.
- **Mostrar**: componente `CardImage({ code })` con un `<img src={cardImageUrl(code)}>` (NO
  `fetch`+blob: el host no manda CORS). Estado local: `loading`/`loaded`/`error`; en `error` (404 o
  red) se oculta el `<img>` y no se muestra nada (la ficha ya renderiza el texto debajo, fallback
  automático); mientras `loading`, un placeholder. Se inserta en la ficha de `DbSection` por encima
  de los datos de texto, que **siempre** se renderizan.
- **Cache offline — Service Worker**: `public/sw.js` (fichero estático servido tal cual). Registrarlo
  en el arranque de la app (`navigator.serviceWorker.register('<base>/sw.js')`, con el `base`
  `/SWDestiny/` de Vite; solo si `'serviceWorker' in navigator`). En su evento `fetch`, para las
  peticiones cuyo destino sea `image` **y** la URL empiece por la base de imágenes: **cache-first** —
  `caches.match` → si está, servir; si no, `fetch(req)` (modo por defecto → respuesta **opaca**, no
  necesita CORS), y si la respuesta es `ok` **u opaca** (`type === 'opaque'`), `cache.put` en un
  cache `card-images-v1` y servirla; los errores no se cachean. Nota: las respuestas opacas ocupan
  con padding en la cuota, pero las imágenes son pequeñas; aceptable. **No** usa `self.skipWaiting()`
  ni `clients.claim()`: el SW controla la página en la siguiente recarga (los criterios ya asumen esa
  recarga intermedia), sin activación agresiva.
- **Script de mirror (dev, opcional, no shipped)**: `scripts/download-card-images.mjs` que recorre
  los códigos del snapshot y descarga cada `<BASE_ARH>/<NN>/<code>.jpg` a una carpeta local, para
  poder subirlas a un hosting propio (idealmente **con CORS**, lo que además habilitaría técnicas de
  cache más ricas) y apuntar `VITE_CARD_IMAGE_BASE` ahí. No se ejecuta en build/CI; es la "puerta
  abierta" a no depender de ARH (BACKLOG 2026-07-26).
- **Sin cambios** en el snapshot ni en la lógica de juego; es presentación en la sección DB + un
  Service Worker para el cache de imágenes.
- **SDD**: actualizar la mención de IndexedDB (hoy "opción futura") para reflejar que el cache de
  imágenes se hace con Service Worker + Cache Storage.

## Nota de tamaño (regla 4 CLAUDE.md)

Media: un helper de URL, un wrapper mínimo de IndexedDB, un componente `CardImage` con su ciclo de
carga/cancelación, y un script de dev. Sin gameplay. Cabe en una rebanada.

## Resultado del playtest

Completada tras playtest 2026-07-26. La ficha del navegador muestra la imagen de la carta con
placeholder; cartas sin imagen (404, dos caras) caen a texto. Con el Service Worker activo, las
imágenes ya vistas se sirven offline (Network→Offline sin recargar) desde Cache Storage; las no
vistas caen a texto. Bug corregido durante el playtest: `loading="lazy"` + `display:none` dejaba el
`<img>` colgado en "Cargando…" (quitado lazy + red de seguridad de 15s). Aclarado que recargar la
app estando offline no funciona (app shell no cacheado) — PWA offline queda en BACKLOG.

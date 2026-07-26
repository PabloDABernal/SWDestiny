# SPEC-034: Imágenes de carta en la ficha (on-demand + cache IndexedDB + fallback)

**Estado:** Pendiente
**Sección del GDD:** §7 (nota "Sección DB" / imágenes)
**Depende de:** SPEC-030 (snapshot: `code` de cada carta), SPEC-032 (ficha del navegador en
`DbSection`)

## Qué es (2-4 líneas)

En la **ficha de detalle** del navegador de cartas (sección DB), además de los datos de texto, se
muestra la **imagen real** de la carta, descargada bajo demanda de ARH (o de un mirror configurable).
La imagen se **cachea en IndexedDB** al verla, así que las ya vistas funcionan **offline**; si no hay
imagen (offline y no cacheada, o fallo de red), la ficha cae al detalle de texto de siempre (SPEC-032).
No se bundlean imágenes en el repo (serían ~226 MB).

## Origen de la imagen

- La URL se **reconstruye desde el `code`** (no se depende del `imagesrc` del snapshot, que además
  viene en `http://`): `<BASE>/<NN>/<code>.jpg`, donde `NN` son los 2 primeros dígitos del código
  (el set). Ej.: `02036` → `<BASE>/02/02036.jpg`.
- `BASE` es **configurable** (constante leída de `import.meta.env.VITE_CARD_IMAGE_BASE`, con default
  al de ARH). Así, si ARH cae, apuntar a un **mirror propio** (S3/CDN/GitHub Releases) es cambiar una
  variable, sin tocar código. **Debe ser `https`** (en GitHub Pages, una imagen `http://` se bloquea
  por mixed-content).
- Default: `https://db.swdrenewedhope.com/bundles/app/images/cards/en`.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] En la sección DB, elegir una carta → en su ficha aparece la **imagen** de la carta (además de
      los datos de texto), con la red disponible.
- [ ] Ver una carta y luego cortar la red (DevTools → Network → Offline) y **volver a abrirla** → la
      imagen **sigue mostrándose** (servida desde IndexedDB), sin pedir red.
- [ ] Abrir una carta **nunca vista** estando **offline** → no hay imagen; la ficha muestra el
      detalle de **texto** (fallback), sin error ni imagen rota.
- [ ] Recargar la página tras haber visto varias cartas y ponerse offline → esas cartas siguen
      mostrando imagen (IndexedDB persiste entre recargas), las no vistas caen a texto.
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
- **Invalidar/expirar** el cache de imágenes (errata que cambia el arte): no se gestiona; una imagen
  cacheada se sirve indefinidamente. Limpiar el cache es manual (borrar datos del sitio) hasta que se
  decida una spec de mantenimiento.

## Casos límite

- **Carta sin imagen en el origen** (404): fallback a texto, sin imagen rota; **no** se cachea el
  404 (para reintentar si el mirror la añade luego).
- **Código de dos caras** (`13015A`): la URL usa el `code` tal cual (`.../13/13015A.jpg`); si el
  origen no la tiene, cae a texto como cualquier 404.
- **IndexedDB no disponible** (modo privado estricto, cuota llena): se degrada a solo-red (cache del
  navegador), sin romper; la imagen se muestra si hay red, si no, texto.
- **Cambiar de carta rápido** en la ficha: al seleccionar otra carta antes de que cargue la anterior,
  no debe pintarse la imagen de la carta equivocada (cancelar/ignorar la carga obsoleta).
- **Base mal configurada / mirror caído**: fallo de red → fallback a texto, igual que offline.

## Notas técnicas (opcional)

- **URL**: helper `cardImageUrl(code)` en `src/data/cardImages.ts` (o similar) que compone
  `<BASE>/<code.slice(0,2)>/<code>.jpg`. `BASE` de `import.meta.env.VITE_CARD_IMAGE_BASE ??` default
  https de ARH.
- **Cache IndexedDB**: pequeño wrapper (sin librería externa) con un object store `card-images`
  (clave = `code`, valor = `Blob`). Flujo al mostrar la ficha: (1) buscar en IndexedDB → si está,
  `URL.createObjectURL(blob)`; (2) si no, `fetch(url)` → si `ok`, guardar el blob en IndexedDB y
  mostrar; (3) si falla (offline/404), no mostrar imagen (fallback a texto). Revocar los object URLs
  al cambiar de carta/desmontar. Usar un flag "carta actual" para ignorar respuestas obsoletas.
- **Componente**: `CardImage({ code })` que encapsula ese flujo y su estado (cargando/imagen/sin
  imagen); se inserta en la ficha de `DbSection` por encima de los datos de texto, que **siempre**
  se renderizan (así el fallback es automático).
- **Script de mirror (dev, opcional, no shipped)**: `scripts/download-card-images.mjs` que recorre
  los códigos del snapshot y descarga cada `<BASE_ARH>/<NN>/<code>.jpg` a una carpeta local, para
  poder subirlas a un hosting propio y apuntar `VITE_CARD_IMAGE_BASE` ahí. No se ejecuta en build/CI;
  es la "puerta abierta" a no depender de ARH (BACKLOG 2026-07-26).
- **Sin cambios** en el snapshot ni en la lógica de juego; es puramente presentación en la sección DB.

## Nota de tamaño (regla 4 CLAUDE.md)

Media: un helper de URL, un wrapper mínimo de IndexedDB, un componente `CardImage` con su ciclo de
carga/cancelación, y un script de dev. Sin gameplay. Cabe en una rebanada.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

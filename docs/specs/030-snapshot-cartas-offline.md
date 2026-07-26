# SPEC-030: Snapshot local de cartas (importar sin depender de la API en vivo)

**Estado:** Completada
**Sección del GDD:** §1/§7 (mazos de ARH DB) + nota nueva "Base de datos local de cartas"
**Depende de:** SPEC-001 (resolveCards, modelo ArhCard, caché), SPEC-017 (parseTextDeck)

## Qué es (2-4 líneas)

Hoy, importar un mazo resuelve **cada carta** con una llamada HTTP a `db.swdrenewedhope.com`; si su
web cae (pasó el 2026-07-25), no se puede importar nada nuevo. Con esta spec el juego incluye un
**snapshot local** de todas las cartas (descargado una vez del endpoint masivo de ARH y versionado
en el repo); la resolución de cartas lee de ese snapshot primero, así que importar y ver nombres de
carta funciona **offline**, sin depender de que la API esté arriba. Sin cambios de UI visibles.

## Contexto técnico (lo que ya existe)

- `resolveCards(slots)` (`src/import/resolveCards.ts`) resuelve por código con orden **caché
  localStorage → API** (`/api/public/card/<code>`), una llamada por carta.
- `readCache(code)` (mismo archivo) es la lectura **síncrona** que usan la mano y otras vistas
  (SPEC-018) para mostrar nombres sin volver a la API.
- El modelo `ArhCard` (`src/model/types.ts`) solo usa 7 campos: `code`, `name`, `type_code`,
  `health`, `is_unique`, `sides`, `cost?`.
- Existe un endpoint masivo **`GET /api/public/cards/`** que devuelve las **2977** cartas en un solo
  JSON (con esos campos y muchos más). Confirmado 2026-07-26.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] **Import offline**: con la red cortada — **DevTools → Network → "Offline"** (importante: en
      `npm run dev` la llamada a la API pasa por el proxy `/arh` de Vite, server-side; bloquear solo
      el dominio en el navegador **no** la corta, "Offline" sí) — importar un mazo cuyas cartas estén
      en el snapshot (p. ej. "Unduli, clone commander") → **importa igual**, con personajes y
      "Mazo: N" correctos, sin ningún error de red.
- [ ] **Snapshot gana a la caché**: poner a mano en localStorage (`swd:card:<code>`) una versión
      alterada de una carta del snapshot (p. ej. cambiar su `name`), importar un mazo que la use → se
      ve el dato del **snapshot**, no el de la caché.
- [ ] **Sin llamadas por-carta**: importar un mazo normal **no** genera peticiones a
      `/api/public/card/<code>` para las cartas del snapshot (verificable en Network: 0 requests de
      ese tipo). El único tráfico posible sería para códigos que no estén en el snapshot (ver abajo).
- [ ] **Nombres de mano offline**: tras importar y robar (SPEC-018/024), la mano muestra los
      **nombres** de las cartas sin haber contactado la API (salen del snapshot vía `readCache`).
- [ ] **Carta fuera del snapshot, API arriba**: importar un mazo con un código que no está en el
      snapshot (p. ej. un set más nuevo que la fecha del snapshot) → se resuelve por la API como hoy
      (comportamiento heredado), sin romper.
- [ ] **Carta fuera del snapshot, API caída**: el import se cancela con el error claro de siempre
      (`card-not-found`/`network`) nombrando el código, no un error genérico.
- [ ] **Regeneración**: existe un comando (`npm run …`) que vuelve a bajar el bulk de ARH y
      reescribe el snapshot; tras ejecutarlo el build sigue verde y los tests pasan.

## Fuera de alcance (explícito)

- **Botón "Actualizar desde ARH" dentro del juego**: la regeneración del snapshot es de desarrollo
  (script + commit), no una acción del jugador en la UI. El botón in-app va en una spec posterior.
- **Sección "DB" / biblioteca de mazos** (SPEC-032) y **mazos precargados** (SPEC-031): esta spec
  solo cambia de dónde salen los datos de carta, no añade pantallas.
- **Cartas de trama (plot) con código de dos caras A/B**: `parseTextDeck` las sigue ignorando
  (BACKLOG 2026-07-22); tenerlas en el snapshot no cambia eso.
- **Imágenes de carta**: el snapshot guarda solo datos de juego (los 7 campos de `ArhCard`), no
  `imagesrc` ni arte; mostrar imágenes es otra decisión futura.
- **Purgar/migrar la caché `swd:card:*` de localStorage** ya existente: se deja como está (el
  snapshot se consulta antes, así que la caché queda como capa secundaria para códigos fuera de él).

## Casos límite

- **Código repetido en el mazo**: igual que hoy, se resuelve una vez (el `Map` deduplica).
- **Snapshot y caché discrepan para un código** (una carta con errata reeditada): gana el
  **snapshot** (fuente versionada y auditable), no la caché de localStorage.
- **JSON del snapshot corrupto o ausente en runtime**: no debería ocurrir (va bundleado con el
  build), pero si el `Map` quedara vacío, la resolución cae a caché→API como hoy (degradación, no
  crash) — mismo espíritu defensivo que SPEC-012.
- **Endpoint masivo caído al regenerar**: el script falla con mensaje claro y **no** sobrescribe el
  snapshot existente con un archivo vacío/parcial.
- **Carta suelta con datos parciales en el bulk** (le falta alguno de los 7 campos, no es fallo total
  de la descarga): el script **descarta esa carta** y sigue, avisando por consola cuántas descartó;
  no aborta el snapshot entero por un registro malo. (Ausencia total de respuesta sí aborta, ver
  arriba.)
- **Aviso de chunk grande de Vite**: el import estático del snapshot (~80 KB gzip) engorda el bundle
  inicial; el build de producción **no debe fallar** por ello (a lo sumo un warning de tamaño de
  chunk es aceptable). Si Vite lo marca, no es un bloqueante.

## Notas técnicas (opcional)

- **Archivo de snapshot**: `src/data/cards.json`, un objeto `{ "<code>": ArhCard }` (mapa directo,
  no array — lookup O(1) y sin reconstruir Map en cada arranque más de una vez) recortado a los 7
  campos de `ArhCard`. Tamaño estimado ~300 KB crudo / ~80 KB gzip (aceptable en el bundle).
- **Carga**: `import cardsSnapshot from '../data/cards.json'` (Vite lo inlinea → disponible
  **síncrono**, sin fetch, garantiza offline y no rompe la naturaleza síncrona de `readCache`).
  Envolver en un módulo `src/data/cards.ts` que exponga `getCardFromSnapshot(code): ArhCard | null`.
- **`resolveCards`**: nuevo orden **snapshot → caché localStorage → API**. Para códigos del
  snapshot no se toca la red ni se escribe caché (ya son estables).
- **`readCache`**: consultar el snapshot **antes** que localStorage, para que los nombres de mano
  salgan offline aunque esa carta nunca se haya resuelto por API en esta máquina.
- **Script de regeneración**: `scripts/build-card-snapshot.mjs` (Node), llamado por
  `npm run cards:snapshot`. Baja `https://db.swdrenewedhope.com/api/public/cards/`, recorta cada
  carta a los 7 campos, escribe `src/data/cards.json` ordenado por código (diffs limpios). Aborta sin
  escribir si la descarga falla o trae 0 cartas; una carta suelta a la que le falte algún campo se
  descarta y se cuenta en un aviso de consola (no aborta el conjunto). Un comentario de cabecera (o
  un `_meta` en el JSON) anota fecha y nº de cartas de la última regeneración.
- **Sin cambio de contrato**: `resolveCards` sigue devolviendo `Map<string, ArhCard>` y el resto del
  pipeline (`buildCharacters`, `buildDrawPile`, `parseTextDeck`) no cambia.

## Nota de tamaño (regla 4 CLAUDE.md)

Media: un asset de datos generado + un módulo de carga + reordenar la fuente en `resolveCards`/
`readCache` + un script de dev. Sin gameplay nuevo, sin UI nueva. El grueso es datos, no lógica.

## Resultado del playtest

Completada tras playtest 2026-07-26. Import offline (DevTools Network → Offline) funciona: mazo
"Unduli" importa con personajes y "Mazo: N" sin error de red; 0 peticiones a `/api/public/card/`;
nombres de mano offline; el snapshot gana a una caché de localStorage alterada; `npm run
cards:snapshot` regenera el JSON (2977 cartas) y el build sigue verde.

# SPEC-035: Mazos de la comunidad (bundle desde ARH DB)

**Estado:** Completada
**Sección del GDD:** §7 (nota "Mazos de la comunidad")
**Depende de:** SPEC-030 (snapshot: validar que los códigos existen), SPEC-031 (`importSlots`,
mazos bundleados), SPEC-033 (`DeckPicker` con buscador)

## Qué es (2-4 líneas)

Además de los 3 mazos precargados (SPEC-031), el juego trae un lote grande de **mazos de la
comunidad** descargados de ARH DB, para tener mucho donde elegir sin pegar nada. Aparecen en el
selector de mazo de cada bando (categoría "Comunidad", buscable), y se cargan como cualquier otro
mazo. Un decklist es solo su lista de cartas (los datos/caras salen del snapshot), así que traer
cientos es barato en peso.

## Cómo se obtienen (script de dev)

- Un script `scripts/build-community-decks.mjs` (no shipped, dev) recorre los decklists de ARH por id
  (`/api/public/decklist/<id>`, ids ~1..N; los vacíos/borrados devuelven cuerpo vacío y se saltan;
  el script para tras una racha larga de vacíos).
- Cada decklist trae `slots` (`{código: {quantity, dice}}`), que **ya incluye a los personajes** (el
  campo `characters` es un subconjunto); se usa **solo `slots`** para el `DeckSlot[]` (`{code, qty}`)
  — combinar ambos duplicaría los personajes (bug corregido en el playtest).
- **id del mazo de comunidad**: el id numérico de ARH **como string** (p. ej. `"1"`, `"146"`). Nunca
  colisiona con los ids de palabra de los precargados (`unduli`, `zuckuss-bounty`, `vader-force`), así
  que `getPresetDeck` puede buscar en ambos arrays sin ambigüedad. (Regla: los precargados usan ids de
  palabra; la comunidad, ids numéricos.)
- **Volumen**: el script escanea **todos** los ids (`1..5000`, parando tras 300 vacíos consecutivos)
  y bundlea **todos** los mazos que pasan el filtro (decisión del usuario 2026-07-26: traerlos todos,
  no solo los ids bajos, para mejorar la cobertura de personajes de sets nuevos). Hay un tope de
  seguridad muy alto (10000) que en la práctica no se alcanza. Peso real ~1–1.5 MB crudo (~150–200 KB
  gzip); build puede avisar de chunk grande (aceptable).
- **Filtro de calidad** (heurística de curación de datos, ajustable al implementar; no es regla de
  juego): se descarta el mazo si no tiene al menos 1 personaje, si tiene menos de **~20** cartas de
  no-personaje (umbral para colar incompletos/tests, cerca del mínimo reglamentario de 30 pero
  tolerante), si su nombre está vacío, o si **algún código no está en el snapshot** (SPEC-030) — esto
  último garantiza que todos cargan offline.
- **Dedupe**: mazos con exactamente el mismo conjunto de cartas (código→cantidad) se cuentan una vez
  (varios usuarios suben copias); se queda el primero.
- Salida: `src/data/communityDecks.json` (array `{ id, name, slots }`), y por consola un **informe de
  cobertura**: cuántos personajes del snapshot tienen ≥1 mazo y **cuáles quedan sin ninguno**.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] En el selector "Elegir mazo" de un bando aparecen, además de los precargados, **muchos mazos de
      la comunidad** (categoría/etiqueta "comunidad"), buscables por nombre.
- [ ] Elegir uno de la comunidad lo carga en el bando igual que cualquier mazo (personajes +
      "Mazo: N"), **offline** (todos sus códigos están en el snapshot; verificable con Network →
      Offline).
- [ ] La búsqueda del selector filtra también los mazos de la comunidad por nombre.
- [ ] Los mazos de la comunidad son **fijos**: se pueden cargar pero no borrar (no son de la
      biblioteca del jugador).
- [ ] Abrir el selector con la comunidad cargada **no se congela ni pinta los cientos de mazos de
      golpe**: la lista renderiza un tope (p. ej. primeros 50) + "mostrar más"; el buscador acota al
      instante.
- [ ] Regenerar con el script vuelve a producir el JSON y el build sigue verde; el informe de
      consola lista los personajes sin mazo.

## Fuera de alcance (explícito)

- **Auto-generar un mazo mínimo por personaje** no cubierto por ningún mazo comunitario: es el
  objetivo "un mazo por personaje", que queda para una **spec futura** (decisión del usuario, 2026-07-26).
  Esta spec solo reporta la cobertura, no la completa.
- **Ordenar por popularidad / mostrar favoritos / autor / descripción** del mazo: se trae solo
  nombre + cartas; ni ranking ni metadatos. (La API no expone votos de forma fiable.)
- **Editar/guardar** los mazos de la comunidad: solo cargar. Guardar una copia editable sería usar la
  biblioteca (SPEC-032) tras cargarlo, y el deck-builder (BACKLOG) para editarlo.
- **Listar los cientos de mazos de la comunidad en la "biblioteca" de la sección DB**: para no
  saturar esa lista (que es precargados + guardados del jugador), los de la comunidad viven en el
  **selector de mazo** (con su buscador), no en la biblioteca de la DB.
- **Traducir/normalizar nombres** de mazo: se usan tal cual vienen (dato público de ARH), solo se
  descartan los vacíos.

## Casos límite

- **Mazo comunitario con un código fuera del snapshot** (set más nuevo que el snapshot): se **descarta
  al generar** (no se bundlea), para que todos los bundleados carguen offline sin sorpresa.
- **Nombre de mazo duplicado** entre comunidad: se permite (varios pueden llamarse igual); cada uno
  con su id. El dedupe es por **cartas idénticas**, no por nombre.
- **Muchísimos mazos en el selector**: el buscador es el modo principal de encontrarlos; la lista
  renderizada se **acota** (p. ej. primeros N + "mostrar más") para no pintar cientos de nodos de
  golpe (mismo patrón que el navegador de cartas, SPEC-032).
- **Snapshot regenerado después** (SPEC-030) quitando una carta que un mazo comunitario usaba: ese
  mazo ya bundleado podría no cargar offline; se acepta hasta la siguiente regeneración de
  `communityDecks.json` (que lo filtraría). Nota, no bloqueante.

## Notas técnicas (opcional)

- **Datos**: `src/data/communityDecks.ts` exporta `COMMUNITY_DECKS: PresetDeck[]` (mismo tipo que
  SPEC-031) leídos de `communityDecks.json`. Peso estimado ~0.5–1 MB crudo (~100–200 KB gzip); el
  build puede avisar de chunk grande (aceptable, como SPEC-030/032/034).
- **Carga**: reutilizar el pipeline de SPEC-031. `getPresetDeck(id)` (o un `getBundledDeck(id)`) pasa
  a buscar en `PRESET_DECKS` **y** `COMMUNITY_DECKS`; `importPreset(side, id)` sirve para ambos, así
  que no hace falta acción de store nueva.
- **UI**: en `DeckPicker` (`src/components/DeckPicker.tsx`), añadir `COMMUNITY_DECKS` a la lista tras
  los precargados y la biblioteca, con etiqueta "comunidad"; acotar el render (limit + "mostrar más")
  porque son cientos. La búsqueda ya normaliza (`norm`).
- **Script**: `scripts/build-community-decks.mjs` usa `slots` (que ya incluye personajes), filtra
  contra `src/data/cards.json`, dedupe por hash de slots ordenados, escribe el JSON e imprime el
  informe de cobertura de personajes. Aborta sin sobrescribir si no logra bajar ningún mazo (red caída).

## Nota de tamaño (regla 4 CLAUDE.md)

Media: un script de dev (el grueso), un archivo de datos generado, y un pequeño cambio en `DeckPicker`
+ `getPresetDeck` para incluir la categoría comunidad. Sin gameplay nuevo. El coste real es el tiempo
de descarga del script, no líneas de código.

## Resultado del playtest

Completada tras playtest 2026-07-26. **2107 mazos** bundleados de ARH (JSON 1.2 MB), todos cargables
offline; aparecen en el selector "Elegir mazo" (etiqueta "comunidad") con recuento, buscador y render
50/tanda ("mostrar más"); cargar uno importa el bando sin congelar. Cobertura 512/572 personajes (60
sin mazo → spec futura de auto-mazo). Bug corregido durante el playtest: personajes salían duplicados porque el
`slots` de ARH ya incluye a los `characters` (se combinaban) — ahora se usa solo `slots`.

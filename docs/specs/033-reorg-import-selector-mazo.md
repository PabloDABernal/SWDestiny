# SPEC-033: Reorganizar el import — pegar mazos en la sección DB + selector de mazo por bando

**Estado:** Pendiente
**Sección del GDD:** §7 (nota "Sección DB" / "Formatos de import" a ajustar)
**Depende de:** SPEC-031 (`importPreset`, `PRESET_DECKS`), SPEC-032 (sección DB, biblioteca,
`importSlots`, `saveDeckToLibrary`/`loadDeckFromLibrary`, `swd:slots`/`swd:decklib`)

## Qué es (2-4 líneas)

Hoy cada bando de la pantalla de juego tiene su propio panel para pegar un mazo (textarea + `<select>`
de precargados). Con esta spec eso se reorganiza: **pegar un mazo nuevo** (JSON o text file) pasa a
la **sección DB**, donde se resuelve y se guarda en la biblioteca con un nombre. La pantalla de juego
deja de tener textarea; en su lugar cada bando tiene un **selector de mazo con buscador** que lista
los precargados y los de la biblioteca, y al elegir uno lo carga en ese bando. Preparar una partida
pasa a ser "elegir mazo para cada lado", no "pegar dos veces".

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Pantalla de juego (selector por bando)

- [ ] Cada bando (Jugador y Enemigo) muestra un **selector de mazo con buscador**: un campo de texto
      que filtra por nombre y una lista con los **precargados** (SPEC-031) + los mazos **guardados**
      en la biblioteca (SPEC-032). Orden: **precargados primero, luego los guardados en orden de
      guardado** (mismo criterio que la lista de la biblioteca en SPEC-032), y los precargados se
      distinguen visualmente (etiqueta "precargado").
- [ ] Elegir un mazo en el selector del Jugador lo importa en el Jugador (personajes + "Mazo: N");
      ídem en el Enemigo (con multiplicador de vida por dificultad, SPEC-015). Mismo efecto que hoy
      tiene importar.
- [ ] Ya **no** hay textarea de pegar mazo en la pantalla de juego (ni el `<select>` viejo): pegar
      se hace solo en la sección DB.
- [ ] Con la biblioteca vacía, el selector sigue mostrando al menos los 3 precargados.

### Sección DB (importar a la biblioteca)

- [ ] La sección DB tiene un panel **"Importar mazo"** con el textarea (JSON o text file,
      autodetección SPEC-017) y un campo de **nombre**; al importar, el mazo se resuelve (offline vía
      snapshot) y se **añade a la biblioteca** con ese nombre, sin cargarlo en ningún bando.
- [ ] Un import con error (código inexistente, formato inválido) muestra el mismo error claro de
      siempre y **no** añade nada a la biblioteca.
- [ ] Tras importar en la DB, el nuevo mazo aparece en la biblioteca y en los selectores de ambos
      bandos de la pantalla de juego.

## Fuera de alcance (explícito)

- **Deck-builder** (crear mazos carta a carta): sigue siendo futuro (BACKLOG); aquí solo se pega/
  importa un decklist entero, como hasta ahora.
- **Imágenes de carta**: SPEC-034.
- **Cargar directamente a un bando desde el panel de importar de la DB**: el import de la DB va a la
  **biblioteca**; para ponerlo en un bando se usa el selector de la pantalla de juego o los botones
  "→ Jugador/→ Enemigo" que la biblioteca ya tiene (SPEC-032). Así el import tiene un único destino
  (la biblioteca) y no dos caminos.
- **Renombrar/editar** mazos de la biblioteca: igual que SPEC-032, solo guardar/cargar/borrar.
- **Persistir qué mazo está elegido** en cada selector entre recargas: lo que persiste es el mazo
  importado en el bando (SPEC-001) y la biblioteca (SPEC-032), no el estado del buscador.

## Casos límite

- **Buscador sin resultados**: mensaje "sin resultados", sin error; vaciar el buscador vuelve a
  listar todo.
- **Elegir en el selector un mazo ya cargado en ese bando**: lo reimporta (reinicia y rebaraja),
  consistente con reimportar (SPEC-001/031).
- **Importar en la DB con nombre vacío**: no se acepta (avisa), no se añade a la biblioteca (mismo
  criterio que "Guardar en biblioteca" de SPEC-032).
- **Importar en la DB mientras otro import está en curso**: el botón queda deshabilitado mientras el
  import a biblioteca esté en curso. Como `importToLibrary` **no** toca ningún bando, no usa el
  `importStatus` de un side: lleva su **propio estado** (p. ej. `libraryImportStatus`/
  `libraryImportError` en el store) para el "importando…"/error del panel de la DB.
- **Borrar de la biblioteca un mazo que está cargado en un bando**: el bando no se toca (sigue
  jugándose con lo ya importado); solo desaparece de los selectores/biblioteca. No es un error.

## Notas técnicas (opcional)

- **Quitar** el `ImportPanel` de `BattleSide` (`src/App.tsx`) y, con él, el textarea/`<select>` por
  bando. `ImportPanel.tsx` se reutiliza/renombra: su parte de **pegar** se mueve a la sección DB.
- **Selector por bando**: nuevo componente (p. ej. `DeckPicker`) que combina `PRESET_DECKS` +
  `library` (del store), con un input de búsqueda (normalizada, mismo `norm` que el navegador). Al
  elegir: si es preset → `importPreset(side, id)`; si es guardado → `loadDeckFromLibrary(id, side)`.
- **Import a biblioteca**: nueva acción de store `importToLibrary(raw, name)` que parsea
  (`parseDeck`/`parseTextDeck`), resuelve (`resolveCards`, para validar/offline), y si va bien añade
  `{ id, name, slots }` a la biblioteca (reutiliza el guardado de SPEC-032). Reutiliza el manejo de
  errores de `importDeck` (mismo `ImportError`) pero con **estado propio** (`libraryImportStatus`/
  `libraryImportError`, no el de un side, porque no toca `sides`). No modifica `sides`.
- **DB**: en `DbSection`, añadir el panel "Importar mazo" (textarea + nombre + botón) por encima o
  junto a la biblioteca.
- El pipeline de import a un bando (`importSlots`, trampa de vida enemiga, mazo de robo, reset de
  bando) **no cambia**; esta spec solo reubica los puntos de entrada de la UI.

## Nota de tamaño (regla 4 CLAUDE.md)

Media: mover un panel de sitio, un componente de selección nuevo con buscador, una acción de store
`importToLibrary` (reutiliza parse+resolve+guardar ya existentes). Sin gameplay nuevo. Cabe en una
rebanada.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

# SPEC-032: Sección "DB" — navegador de cartas + biblioteca de mazos

**Estado:** Pendiente
**Sección del GDD:** §7 (nota "Sección DB" a añadir)
**Depende de:** SPEC-030 (snapshot local de cartas), SPEC-031 (mazos precargados, `importSlots`/
`importPreset`, `PRESET_DECKS`)

## Qué es (2-4 líneas)

Una segunda pantalla del juego, accesible con un conmutador **"Jugar | DB"** arriba. La sección DB
tiene dos partes: (1) un **navegador de cartas** que lista y busca todas las cartas del snapshot
local, con su ficha (facción, set, coste, vida, caras de dado, texto); y (2) una **biblioteca de
mazos** donde el jugador guarda con nombre los mazos que importa, para volver a cargarlos en un bando
sin pegarlos de nuevo. Todo offline (snapshot, SPEC-030).

## Enriquecer el snapshot (habilitador)

El snapshot de SPEC-030 solo guarda 7 campos de juego. El navegador necesita más, así que el script
`cards:snapshot` pasa a incluir también, por carta: `faction_code`, `faction_name`, `set_code`,
`set_name`, `affiliation_code`, `cost` (ya estaba), `points` (mostrado en la ficha de personaje —
reabre a propósito la omisión de SPEC-001, ahora sí verificado por un criterio) y `text` (texto de
reglas). El modelo
`ArhCard` gana esos campos como **opcionales** (la lógica de juego sigue usando solo los 7 de antes;
los nuevos son para mostrar). El JSON crece a ~2.7 MB crudo / ~0.5 MB gzip; el build no debe fallar
por tamaño de chunk (a lo sumo warning, como en SPEC-030).

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Navegación

- [ ] Arriba hay un conmutador "Jugar | DB". En "Jugar" se ve el tablero de siempre; en "DB" se ve
      la sección DB. Cambiar de pestaña **no** reinicia la partida en curso (el estado se conserva al
      volver a "Jugar").

### Navegador de cartas

- [ ] La sección DB muestra una lista de cartas del snapshot (nombre + tipo + facción). Escribir en
      un buscador filtra por **nombre** (subcadena, sin distinguir mayúsculas/acentos) en vivo.
- [ ] Hay filtros por **tipo** (personaje/mejora/apoyo/evento/…) y por **facción**; combinados con
      el buscador acotan la lista.
- [ ] Al elegir una carta se ve su **ficha**: nombre, tipo, facción, set, coste (si tiene), **puntos**
      (si es personaje), vida (si es personaje), **caras de dado** (si tiene dado) y **texto** de
      reglas.
- [ ] Los filtros de **tipo** ofrecen los `type_code` realmente presentes en el snapshot
      (personaje, mejora, apoyo, evento, trama, campo de batalla, desmejora…), no una lista cerrada
      inventada; ídem los de **facción**.
- [ ] La lista no intenta cargar imágenes ni llamar a la API: todo sale del snapshot (funciona
      offline, verificable con Network → Offline).

### Biblioteca de mazos

- [ ] Tras importar un mazo en un bando (pegado o precargado), hay una acción **"Guardar en
      biblioteca"** que pide un nombre y lo añade a la biblioteca (persistida en localStorage).
- [ ] La sección DB lista los mazos guardados (nombre + nº de cartas). Desde ahí se puede **cargar**
      un mazo en el bando **Jugador** o **Enemigo** (mismo efecto que importarlo: reutiliza
      `importSlots`), y **borrar** un mazo de la biblioteca.
- [ ] Cargar un mazo de la biblioteca en el bando **Enemigo** aplica el multiplicador de vida de la
      dificultad vigente (igual que cualquier import, SPEC-015/031).
- [ ] Los 3 mazos precargados (SPEC-031) aparecen listados en la biblioteca como **fijos** (se pueden
      cargar, no borrar); los guardados por el jugador sí se pueden borrar. Orden de la lista: los
      **precargados primero**, luego los guardados en **orden de guardado** (el más reciente al final).
- [ ] Recargar la página conserva la biblioteca de mazos guardados (localStorage), igual que el mazo
      importado de cada bando.

## Fuera de alcance (explícito)

- **Imágenes de carta**: el snapshot no guarda arte (`imagesrc`) y la CSP/offline lo complican; la
  ficha es solo texto/datos. Otra spec si se decide.
- **Construir/editar mazos carta a carta** desde la DB (deck builder): la biblioteca solo **guarda,
  carga y borra** mazos ya importados; crear un mazo eligiendo cartas es una spec futura.
- **Editar el contenido** de un mazo guardado o **renombrarlo**: solo guardar/cargar/borrar. Renombrar
  = borrar y volver a guardar.
- **Sincronizar/compartir** la biblioteca entre dispositivos: es local (localStorage), sin backend
  (v1, SDD).
- **Botón "actualizar snapshot desde ARH" dentro del juego**: sigue siendo dev-time (SPEC-030), no
  entra aquí.
- **Ordenar/paginar avanzado**: basta una lista filtrable; si el rendimiento con ~3000 cartas lo
  exige, se resuelve en implementación (virtualización simple), no es un criterio de diseño.

## Casos límite

- **Buscador vacío / sin resultados**: lista completa si está vacío; mensaje "sin resultados" si el
  filtro no casa nada, sin error.
- **Guardar un bando sin mazo importado**: la acción "Guardar en biblioteca" no está disponible (o
  avisa) si el bando no tiene mazo; no guarda un mazo vacío.
- **Nombre de mazo duplicado o vacío al guardar**: nombre vacío no se acepta (avisa). Nombre repetido
  **se permite** (decisión del usuario, 2026-07-26): cada mazo tiene un id interno único, pueden
  convivir dos entradas con el mismo nombre en la lista.
- **Biblioteca corrupta en localStorage** (mismo espíritu que SPEC-012): si el valor guardado no es
  un array válido, se descarta y la biblioteca arranca vacía (solo los precargados fijos), sin
  romper la carga.
- **Cargar un mazo guardado con un código que ya no esté en el snapshot** (tras una regeneración que
  quitara una carta): cae al respaldo API (SPEC-030); si no hay red, error claro como cualquier
  import.
- **Cambiar de pestaña a "DB" a mitad de una acción de resolución** (dados marcados, reparto de
  indirecto): no se pierde el estado; al volver a "Jugar" sigue donde estaba.

## Notas técnicas (opcional)

- **Snapshot**: ampliar `REQUIRED`/`trim` en `scripts/build-card-snapshot.mjs` con los campos nuevos
  y regenerar `src/data/cards.json`. Añadir los campos opcionales a `ArhCard` (`src/model/types.ts`).
  `getCardFromSnapshot` no cambia de firma.
- **Navegación por pestañas**: estado `view: 'play' | 'db'` en el store (o estado local en `App`),
  con el conmutador arriba. El tablero actual pasa a renderizarse solo cuando `view === 'play'`; la
  DB cuando `view === 'db'`. Montar/desmontar no debe tocar el estado de partida del store.
- **Navegador**: nuevo componente `CardBrowser` que lee `PRESET`... no —lee todas las cartas del
  snapshot (exponer un `getAllCards()` en `src/data/cards.ts` que devuelva el array sin `_meta`).
  Búsqueda por nombre normalizada (minúsculas + quitar acentos). Con ~3000 cartas, si hace falta,
  limitar el render (p. ej. primeros N + "mostrar más") o virtualizar; empezar simple.
- **Biblioteca**: `src/data/deckLibrary.ts` (o en el store) con `SavedDeck { id, name, slots }`
  persistida en `localStorage` clave `swd:decklib` (patrón `Array.isArray` + validación como SPEC-012).
  Acciones de store: `saveDeckToLibrary(side, name)` (toma los slots del mazo importado de ese bando
  — **guardar los slots de origen**, no reconstruirlos desde el estado de partida), `loadDeckFromLibrary(id, side)`
  (→ `importSlots`), `deleteFromLibrary(id)`. Los `PRESET_DECKS` se listan junto a los guardados,
  marcados como no borrables.
  - Nota: hoy no se guardan en ningún sitio los `slots` originales de un import; hace falta
    **persistir los slots** del último import por bando (nueva clave, p. ej. `swd:slots:<side>`) para
    poder guardarlos en la biblioteca. Alternativa: guardar en biblioteca directamente en el momento
    del import. Decidir en implementación sin cambiar los criterios.

## Nota de tamaño (regla 4 CLAUDE.md)

**Grande, en el límite.** Junta enriquecer el snapshot + navegador de cartas + biblioteca de mazos +
conmutador de pestañas. Es el máximo que cabe en una rebanada; si al implementar se dispara de ~300
líneas de código o de complejidad, **partir**: dejar en SPEC-032 el conmutador + navegador de cartas
(con el snapshot enriquecido) y mover la **biblioteca de mazos** a SPEC-033, avisando al usuario
antes. No subdividir con sufijos (regla 4). **Si se parte, editar en el mismo movimiento** la nota
"Sección DB (SPEC-032)" de `docs/GDD.md` §7 (que hoy atribuye navegador + biblioteca a 032) para
reflejar que la biblioteca pasa a SPEC-033.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

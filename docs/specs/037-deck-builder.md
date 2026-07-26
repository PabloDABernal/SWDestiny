# SPEC-037: Deck-builder v1 — crear y editar mazos (libre + contadores)

**Estado:** Pendiente
**Sección del GDD:** §7 (nota "Deck-builder")
**Depende de:** SPEC-030 (snapshot/`getAllCards`), SPEC-032 (navegador de cartas), SPEC-036
(explorador de mazos, biblioteca)

## Qué es (2-4 líneas)

Desde la sección DB se pueden **crear mazos carta a carta** y **editar** los guardados. Un constructor
con el navegador de cartas a un lado y el mazo en construcción al otro: buscas/filtras cartas, las
añades/quitas con `+`/`−`, eliges personajes y battlefield, le pones nombre y lo guardas en tu
biblioteca. Es **libre** (no fuerza las reglas de construcción): muestra **contadores** (puntos de
personajes, nº de cartas, copias) como guía, sin bloquear.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Crear

- [ ] En la sección DB hay un botón **"Crear mazo"** que abre el **constructor**: a un lado el
      navegador de cartas (buscar por nombre + filtros tipo/facción/set, SPEC-032/036), al otro el
      **mazo en construcción** (vacío al empezar) con un campo de **nombre**.
- [ ] Añadir una carta (botón `+` en su fila) la mete en el mazo con cantidad 1; volver a añadirla
      sube la cantidad; `−` la baja y a 0 la quita. El mazo en construcción refleja los cambios.
- [ ] El mazo en construcción muestra **contadores**: **puntos** de los personajes (usando el valor
      elite cuando un personaje único va a 2), **nº de cartas** de mazo (no-personaje, no-battlefield)
      y avisa (marca suave) de cartas con **más de 2 copias** — todo informativo, **no bloquea**.
- [ ] Los personajes y el/los battlefield se muestran separados de las cartas de mazo en el panel.
- [ ] Con un nombre puesto y **al menos un personaje**, **"Guardar"** añade el mazo a la biblioteca
      (aparece en el explorador como "guardado") y se puede cargar en "Jugar → Elegir mazo".
- [ ] Guardar sin nombre, o sin ningún personaje, no guarda (aviso); no se crea un mazo injugable.

### Editar

- [ ] En el explorador, un mazo **guardado** tiene **"Editar"** que lo abre en el constructor con sus
      cartas ya cargadas; al guardar, **actualiza ese mismo mazo** (mismo id, no crea un duplicado).
- [ ] Los mazos **precargados y de comunidad** no se editan directamente; pero se puede **"Duplicar a
      mi biblioteca"** (crea una copia guardada editable) — así se parte de uno existente.

## Fuera de alcance (explícito)

- **Validar las reglas de construcción** de SW Destiny (30 puntos exactos, misma afiliación, facción
  compatible de las cartas, 30 cartas, máx. 2 copias, 1 battlefield obligatorio): NO se fuerzan
  (decisión del usuario 2026-07-26); solo se muestran contadores. Coherente con que el import tampoco
  valida (SPEC-001).
- **Editar precargados/comunidad in situ**: solo vía "duplicar a mi biblioteca" y editar la copia.
- **Imágenes en el constructor**: el navegador de cartas ya tiene su ficha con imagen (SPEC-034); el
  panel del mazo en construcción es texto (nombre + cantidad).
- **Tirada de enfrentamiento / elegir battlefield activo**: no aplica aquí; el battlefield es una
  carta más del mazo (como en el import).
- **Deshacer/rehacer** cambios del constructor: no; se edita en vivo y se guarda o se descarta.

## Casos límite

- **Editar un mazo guardado que está cargado en un bando**: guardar actualiza la biblioteca, **no**
  toca el bando ya cargado (igual que borrar, SPEC-036).
- **Descartar cambios**: salir del constructor sin guardar (botón "Volver"/cerrar) no modifica la
  biblioteca; si había cambios sin guardar, se pierden (aceptado; opcional avisar).
- **Cantidad de una carta a 0**: desaparece del mazo en construcción.
- **Personaje único a cantidad 2**: se considera **elite** en el contador de puntos (mismo criterio
  que `buildCharacters`, SPEC-001); a 3+ el contador lo refleja igual pero es informativo.
- **Guardar una edición sin cambios**: reescribe el mismo mazo con el mismo contenido (no rompe).
- **Nombre duplicado** con otro guardado: se permite (ids distintos), igual que SPEC-032.

## Notas técnicas (opcional)

- **Estado del constructor**: local al componente (no en el store de partida): `name`, `slots`
  (`Map<code, qty>` o `DeckSlot[]`), y `editingId: string | null` (id del mazo guardado que se edita,
  o null para uno nuevo). Reutilizar `getCardFromSnapshot` para nombres/tipos/puntos y el mismo
  navegador/filtros que `CardBrowser` (extraer lo común si hace falta).
- **Contadores**: puntos = suma de `points` de los personajes (parsear `"n/e"`; usar `e` si el
  personaje es único y su cantidad ≥2, si no `n`); nº de cartas = suma de `qty` de no-personaje/
  no-battlefield; copias = marcar `qty > 2`.
- **Guardar**: nueva acción de store `upsertLibraryDeck({ id?, name, slots })`: si `id` existe en
  `library`, lo **reemplaza** (mismo id); si no, crea uno nuevo (id `crypto.randomUUID()`). Persiste
  con `persistLibrary` (SPEC-032). "Duplicar a mi biblioteca" = `upsertLibraryDeck` sin id con los
  slots del preset/comunidad.
- **Abrir para editar**: desde el explorador (SPEC-036), botón "Editar" en guardados y "Duplicar" en
  bundleados; ambos abren el constructor precargando `slots` (y `editingId` solo en "Editar").
- **UI**: el constructor puede ser una vista/modo dentro de la sección DB (oculta el explorador
  mientras construyes, con "Volver"). Render del navegador acotado como ya se hace (limit + más).
- Sin cambios en el pipeline de import a bando ni en el estado de partida.

## Nota de tamaño (regla 4 CLAUDE.md)

Media-grande, en el límite: un constructor nuevo (navegador con +/−, panel de mazo, contadores),
guardar/editar/duplicar (una acción de store `upsertLibraryDeck` + ganchos en el explorador). Reutiliza
mucho de SPEC-032/036. Si al implementar se dispara, dejar **crear** en SPEC-037 y mover **editar/
duplicar** a SPEC-038, avisando antes (no subdividir con sufijos).

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

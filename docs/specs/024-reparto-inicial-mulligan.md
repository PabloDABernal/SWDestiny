# SPEC-024: Reparto inicial y mulligan

**Estado:** Pendiente
**Sección del GDD:** "Reparto inicial y mulligan (primera pieza del bloque de turnos reales,
SPEC-024)", sección 5 — bloque nuevo (reordenado 2026-07-23, decisión del usuario) que precede a la
capa de texto/keywords de v4.
**Depende de:** SPEC-016 (mazo de robo), SPEC-018 (mano), SPEC-022 (robo real y deck-out)

## Qué es (2-4 líneas)

Un botón nuevo **"Nueva partida"** reparte 5 cartas a cada bando desde su mazo de robo, en cuanto
ambos tienen mazo importado y la mano vacía. Tras el reparto, el jugador puede hacer **mulligan**:
elegir qué cartas de su mano de 5 devolver al mazo (0 a 5); esas cartas vuelven al mazo, que se
rebaraja, y el jugador roba de vuelta **la misma cantidad** de cartas que devolvió (no
necesariamente las mismas cartas, el mazo se ha rebarajado) — una sola vez por partida. El enemigo
no hace mulligan, se queda con su mano inicial tal cual.

## Criterios de aceptación

- [ ] Con ambos bandos importados y sus manos vacías, el botón "Nueva partida" está habilitado; al
  pulsarlo, cada bando roba 5 cartas de su mazo de robo a su mano.
- [ ] Tras "Nueva partida", el jugador ve su mano de 5 cartas con una forma de marcar cuáles quiere
  devolver al mazo (0 a 5 cartas) y un botón para confirmar el mulligan.
- [ ] Al confirmar el mulligan, las cartas marcadas vuelven al mazo de robo, el mazo se rebaraja, y
  el jugador roba de vuelta tantas cartas como devolvió (si marcó 0, no roba nada, pero el mulligan
  queda "hecho" igualmente).
- [ ] El mulligan solo se puede confirmar una vez por partida; tras confirmarlo (con 0 o más
  cartas), no hay forma de repetirlo hasta la siguiente "Nueva partida".
- [ ] Mientras el mulligan está pendiente de confirmar, otras acciones de partida (Activar, jugar
  una carta, "Nueva ronda", "Turno enemigo") están bloqueadas.
- [ ] El enemigo recibe sus 5 cartas igual que el jugador, pero no hay ninguna opción de mulligan
  para él: su mano queda fija tras el reparto.
- [ ] Si un bando ya tiene cartas en mano (partida ya empezada) o le falta el mazo importado al otro
  bando, el botón "Nueva partida" aparece deshabilitado.

## Fuera de alcance (explícito)

- Turnos reales alternados (fase de acción con turnos de 1 acción cada uno): siguiente pieza de
  este bloque, spec propia posterior (ver BACKLOG).
- Tirada inicial de personajes para elegir campo de batalla (RR pg 19, paso 6): no hay campo de
  batalla implementado, fuera de alcance.
- Límite máximo de cartas en mano: no existe en el reglamento real (solo se roba hasta 5 en
  mantenimiento), no se añade ninguno artificial.
- Cualquier lógica de qué cartas debería devolver el jugador en el mulligan (sugerencias, IA de
  ayuda): la elección es enteramente manual.
- Mulligan del enemigo con cualquier criterio: no hace mulligan en esta spec.
- Deshacer o repetir "Nueva partida" una vez ya se ha repartido y confirmado el mulligan: para volver
  a repartir hace falta pasar antes por "Reset total" (que vacía la mano) o reimportar.

## Casos límite

- Mazo de robo con menos de 5 cartas al pulsar "Nueva partida": reparte las que haya, la mano queda
  por debajo de 5, sin error ni bloqueo.
- Jugador marca las 5 cartas para mulligan: las 5 vuelven al mazo, se rebaraja, y roba 5 de vuelta.
  Si el mazo de robo resultante tiene menos de 5 (solo puede pasar si ya estaba corto desde el
  reparto inicial), reparte las que haya, igual que el reparto inicial — sin error ni caso especial.
- Jugador confirma mulligan con 0 cartas marcadas: no se mueve ninguna carta, pero el mulligan queda
  "usado" (no se puede volver a abrir).
- El estado de "mulligan pendiente de confirmar" **no se persiste** en localStorage: es estado de
  partida (como `resolve`/`playUpgrade` hoy), no de mazo. Una recarga de página a mitad de mulligan
  pierde ese estado; la mano ya repartida sí persiste (`hand`, igual que siempre), así que tras
  recargar el jugador ve su mano de 5 pero sin el modo mulligan activo — no puede volver a abrirlo
  (ya se "gastó" el reparto), ni tampoco queda bloqueado sin poder jugar. Aceptado como
  comportamiento igual de imperfecto que el resto de estado de partida no persistido en el proyecto.
- Bando cuyo mazo de robo tiene 0 cartas de partida (import atípico, sin cartas de no-personaje):
  "Nueva partida" le reparte 0. Ese bando queda con mano=0 y mazo=0 a la vez, pero **esta spec no
  comprueba deck-out** — esa comprobación sigue siendo exclusiva de "Nueva ronda" (SPEC-022); "Nueva
  partida" solo reparte, no evalúa fin de partida. El botón "Nueva partida" puede quedar habilitado
  indefinidamente para ese bando (mano sigue en 0 tras repartir 0), pulsarlo de nuevo simplemente
  vuelve a repartir 0: inofensivo, no bloquea nada. Mismo tipo de inconsistencia ya aceptada entre
  "Robar" y "Nueva ronda" en SPEC-022.
- "Nueva partida" pulsada con un solo bando en estado fresco (p. ej. jugador con mano vacía, enemigo
  con mano ya repartida de una partida anterior sin "Reset total" de por medio): el botón queda
  deshabilitado hasta que ambos bandos estén en estado fresco (mazo importado + mano vacía).
- "Reset total" o reimportar un mazo mientras el mulligan está pendiente de confirmar: se permite
  igual que ya permiten esas acciones con otros modos en curso, y limpia el estado de mulligan
  pendiente (vuelve a mano vacía, botón "Nueva partida" vuelve a estar disponible). **Ojo**: hoy
  `importDeck` no limpia `playUpgrade` al reimportar (solo resetea `resolve`/`outcome`), así que hay
  que añadir explícitamente `mulligan: null` ahí (y en `resetAll`, que sí limpia `playUpgrade` hoy)
  para no repetir ese mismo olvido con el estado nuevo — ver Notas técnicas.
- Caso extremadamente improbable, reconocido y aceptado: si en mitad de una partida ya arrancada
  ambas manos llegan a 0 a la vez sin pasar por "Reset total" (solo posible si el jugador descarta
  toda su mano justo cuando la del enemigo también está en 0; el enemigo nunca descarta, SPEC-022),
  la condición de habilitado de "Nueva partida" (`hand.length === 0` en ambos bandos) se reactivaría
  aunque la partida siga en curso. Se acepta el riesgo sin guard adicional: es casi inalcanzable y,
  si ocurriera, pulsar "Nueva partida" simplemente repartiría 5 cartas de más a mitad de partida sin
  romper nada (no hay "Fuera de alcance" que dependa de que esto sea imposible, solo inusual).
- Outcome de partida ya decidido (Victoria/Derrota): "Nueva partida" y el mulligan son no-op, mismo
  criterio que el resto de acciones.

## Notas técnicas (opcional)

- Nueva acción de store, p. ej. `startGame()`: reparte 5 cartas a cada bando (usa la misma mecánica
  de robo que ya existe, sin pasar por `newRound()` para no re-tirar dados/dar recursos/etc.).
- Nuevo estado de "mulligan pendiente" (p. ej. `mulligan: { marked: number[] } | null` en el store,
  análogo a `playUpgrade`), que **no se persiste** en localStorage (sigue el mismo patrón que
  `resolve`/`playUpgrade` hoy: es estado de partida, no de mazo — ver Casos límite).
  - Guards a añadir: `activate`, `selectDie`, `selectUpgradeCard`, `playSupport`, `discardCard` ya
    tienen guards por `playUpgrade`/`resolve.pendingEffect`/`resolve.focusFaceChoice` en
    `src/store/gameStore.ts` — añadir ahí también `state.mulligan !== null`, mismo patrón.
  - **Ojo**: hoy `playUpgrade` (ni `resolve`) **no bloquea `newRound()`** — ni en el store ni en la
    UI (`src/App.tsx`, el botón "Nueva ronda" solo se deshabilita con `outcome !== null`; el único
    guard existente por `playUpgrade` está en el botón "Turno enemigo"). El guard de `mulligan` en
    `newRound()` y en el botón "Nueva ronda" hay que **crearlo de cero** en esta spec, no es una
    replicación de algo que ya exista para ese botón.
- El botón "Nueva partida" convive con "Reset total"/"Nueva ronda" ya existentes (`src/App.tsx`);
  su condición de habilitado depende de `hand.length === 0` en ambos bandos y de que ambos tengan
  `characters.length > 0`.
- `mulligan: null` hay que añadirlo tanto en `resetAll` (que ya limpia `playUpgrade`) como en
  `importDeck` (que hoy **no** limpia `playUpgrade` al reimportar, solo `resolve`/`outcome` —
  mismo olvido a no repetir con el estado nuevo).

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

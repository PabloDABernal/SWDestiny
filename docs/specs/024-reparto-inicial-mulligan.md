# SPEC-024: Reparto inicial y mulligan

**Estado:** Pendiente
**Sección del GDD:** "Reparto inicial y mulligan (primera pieza del bloque de turnos reales,
SPEC-024)", sección 5 — bloque nuevo (reordenado 2026-07-23, decisión del usuario) que precede a la
capa de texto/keywords de v4.
**Depende de:** SPEC-016 (mazo de robo), SPEC-018 (mano), SPEC-022 (robo real y deck-out)

## Qué es (2-4 líneas)

Un botón nuevo **"Nueva partida"** reparte 5 cartas a cada bando desde su mazo de robo, en cuanto
ambos tienen mazo importado y la mano vacía. Tras el reparto, el jugador puede hacer **mulligan**:
elegir qué cartas de su mano de 5 devolver al mazo (0 a 5) y robar las mismas de vuelta, una sola
vez por partida. El enemigo no hace mulligan, se queda con su mano inicial tal cual.

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
- Jugador marca las 5 cartas para mulligan: las 5 vuelven al mazo, se rebaraja, y roba 5 nuevas (o
  menos, si el mazo resultante tiene menos de 5 tras la devolución — aunque devolver y robar el mismo
  número siempre deja el tamaño de mazo igual que antes de "Nueva partida", así que esto no debería
  poder pasar salvo que el mazo ya estuviera corto desde el reparto inicial).
- Jugador confirma mulligan con 0 cartas marcadas: no se mueve ninguna carta, pero el mulligan queda
  "usado" (no se puede volver a abrir).
- Recarga de página con el mulligan pendiente de confirmar: a decidir contra el SDD si este estado
  (mulligan pendiente) se persiste o no — ver Notas técnicas.
- "Nueva partida" pulsada con un solo bando en estado fresco (p. ej. jugador con mano vacía, enemigo
  con mano ya repartida de una partida anterior sin "Reset total" de por medio): el botón queda
  deshabilitado hasta que ambos bandos estén en estado fresco (mazo importado + mano vacía).
- "Reset total" o reimportar un mazo mientras el mulligan está pendiente de confirmar: se permite
  igual que ya permiten esas acciones con otros modos en curso, y limpia el estado de mulligan
  pendiente (vuelve a mano vacía, botón "Nueva partida" vuelve a estar disponible).
- Outcome de partida ya decidido (Victoria/Derrota): "Nueva partida" y el mulligan son no-op, mismo
  criterio que el resto de acciones.

## Notas técnicas (opcional)

- Nueva acción de store, p. ej. `startGame()`: reparte 5 cartas a cada bando (usa la misma mecánica
  de robo que ya existe, sin pasar por `newRound()` para no re-tirar dados/dar recursos/etc.).
- Nuevo estado de "mulligan pendiente" (p. ej. `mulligan: { marked: number[] } | null` en el store,
  análogo a `playUpgrade`), que bloquea las mismas acciones que ya bloquea `playUpgrade` (mismos
  guards a replicar: `activate`, `selectDie`, `selectUpgradeCard`, `playSupport`, `discardCard`,
  `newRound` con el botón "Turno enemigo").
- A confirmar contra el SDD: si el estado de "mulligan pendiente" se persiste en localStorage (como
  `hand`/`drawPile`) o es puramente de partida (como `activated`) — probablemente lo segundo, dado
  que el SDD ya establece que "pools, activaciones, daño, fin de partida no se persiste", pero
  requiere decisión explícita antes de implementar.
- El botón "Nueva partida" convive con "Reset total"/"Nueva ronda" ya existentes (`src/App.tsx`);
  su condición de habilitado depende de `hand.length === 0` en ambos bandos y de que ambos tengan
  `characters.length > 0`.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

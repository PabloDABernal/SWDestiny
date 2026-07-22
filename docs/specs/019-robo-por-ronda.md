# SPEC-019: Robo automático al pasar de ronda

**Estado:** Pendiente
**Sección del GDD:** v3 — mano, mazo, robo, condición de victoria por deck-out (sección 5, línea
153); sustituye la pieza "provisional" de SPEC-018 por la regla real de robo.
**Depende de:** SPEC-016 (mazo de robo), SPEC-018 (mano de cartas y robo manual)

## Qué es (2-4 líneas)

Al pulsar **"Nueva ronda"**, además de re-tirar dados y sumar +2 recursos (SPEC-009/011), cada
bando roba automáticamente **1 carta** de su mazo de robo a su mano. Es la regla real de robo que
SPEC-018 dejó pendiente ("se roba 1 carta al pasar de ronda"). El botón manual "Robar" del jugador
(SPEC-018) se mantiene tal cual. El paso de robo del autómata dentro de "Turno enemigo" (SPEC-018,
prioridad más baja) desaparece: ahora el enemigo roba en "Nueva ronda", igual que el jugador, y
"Turno enemigo" puede volver a terminar en "Pasa".

## Criterios de aceptación

- El jugador pulsa "Nueva ronda" y ve una carta nueva en su mano (nombre visible); "Mazo" baja en 1
  y "Mano" sube en 1, igual que con el botón "Robar" (SPEC-018).
- En la misma pulsación de "Nueva ronda", el bando enemigo también roba 1 carta: su "Mazo" baja en
  1 y su "Mano" sube en 1 (sin mostrar el contenido).
- El botón "Robar" del jugador (SPEC-018) sigue funcionando exactamente igual que antes, en
  cualquier momento, independientemente de "Nueva ronda".
- Al pulsar "Turno enemigo" cuando no le queda ninguna otra acción legal (dados, activación,
  recurso, reroll), el autómata **pasa** (ya no roba ahí); el mensaje de acción muestra "El enemigo
  pasa." como antes de SPEC-018.
- La primera vez que se pulsa "Nueva ronda" tras importar el mazo, ya reparte 1 carta a cada bando
  (sin tratamiento especial).
- Si al pulsar "Nueva ronda" el mazo de un bando está vacío, la partida termina en el acto con el
  mismo criterio de deck-out ya establecido en SPEC-018 (Derrota si es el jugador, Victoria si es el
  enemigo), **sin** aplicar ninguna parte del mantenimiento (ni re-tirada de dados, ni +2 recursos,
  ni el robo del otro bando) — ver Casos límite para el orden de comprobación si ambos están vacíos.

## Fuera de alcance (explícito)

- Cambiar la cantidad de recursos (+2) o el resto de mantenimiento de "Nueva ronda" (SPEC-009/011):
  no se toca, solo se añade el robo de 1 carta.
- Límite de tamaño de mano y descarte por exceso (regla RR de mantenimiento completo): sigue sin
  existir la fase de mantenimiento reglamentaria; ver SPEC-018.
- Mano inicial al importar el mazo (robo de 5 cartas, RR): sigue fuera de alcance; se empieza con
  mano vacía tras importar, como hasta ahora.
- Jugar o descartar cartas de la mano: sigue fuera de alcance (v4).

## Casos límite

- Solo el mazo del jugador está vacío (el del enemigo no) → Derrota inmediata; no se aplica nada
  del mantenimiento (ni dados, ni recursos, ni el robo del enemigo).
- Solo el mazo del enemigo está vacío → Victoria inmediata, mismo criterio (nada se aplica).
- **Ambos mazos vacíos a la vez** en la misma pulsación de "Nueva ronda" (caso raro): se resuelve
  **Victoria**. El orden de comprobación es fijo y se hace **antes de mutar nada**: primero se
  comprueba si el mazo del enemigo está vacío (Victoria); solo si no lo está, se comprueba el del
  jugador (Derrota) — mismo orden de prioridad que ya usa `computeOutcome` en
  `src/game/outcome.ts` (comprueba `allKO(enemy)` antes que `allKO(player)`). Es una comprobación
  previa de ambos mazos, no dos robos secuenciales con aborto tras el primero: si se implementara
  como "robar jugador → comprobar → robar enemigo → comprobar", este caso daría Derrota en vez de
  Victoria, contradiciendo este criterio.
- "Nueva ronda" pulsada con la partida ya terminada (outcome no nulo): sigue siendo no-op, como ya
  pasa hoy (SPEC-009); no intenta robar.
- El jugador pulsa "Robar" (SPEC-018) varias veces entre rondas y luego pulsa "Nueva ronda": el
  robo de ronda se suma sin más a lo ya robado a mano (no hay límite de mano en esta spec).
- "Reset total" (SPEC-009/018) no cambia con esta spec: sigue vaciando la mano de ambos bandos y
  reconstruyendo el mazo de robo completo (`drawPile` + `hand`, rebarajado); no interactúa de forma
  nueva con el robo automático de ronda.

## Notas técnicas (opcional)

- `newRound()` en `src/store/gameStore.ts` (SPEC-009/011) gana el robo de 1 carta por bando dentro
  de la misma actualización atómica, reutilizando la lógica de `drawCard` (o extrayendo su núcleo a
  una función compartida) en vez de duplicar el manejo de `drawPile`/`hand`. **Importante:** el
  chequeo de deck-out de ambos bandos (`drawPile.length === 0`) debe hacerse como guarda previa,
  **antes** de mutar el `drawPile`/`hand` de ninguno de los dos, precisamente para que el caso
  "ambos vacíos" dé Victoria (enemigo primero) de forma consistente con el caso "solo el jugador
  vacío" (Derrota) — ver Casos límite.
- El paso 6 del autómata (SPEC-018, `src/game/automaton.ts`) se retira: `nextAutomatonAction` vuelve
  a devolver `{ type: 'pass' }` cuando no queda ninguna acción legal tras el reroll. El tipo
  `{ type: 'draw' }` de `AutomatonAction` y el caso `'draw'` en `enemyTurn` (store) se eliminan por
  completo (código muerto sin usuario, ver precedente de limpieza en SPEC-013), no se dejan sin
  alcanzar.
- `src/game/automaton.test.ts`: los 4 tests que SPEC-018 modificó (cambiando `{type:'pass'}` por
  `{type:'draw'}`, y ajustando nombres) se revierten a como estaban antes: expectativa de vuelta a
  `{type:'pass'}`, y los nombres de test/describe de vuelta a los originales (en particular, el
  describe `'nextAutomatonAction — robar (SPEC-018)'` vuelve a llamarse `'nextAutomatonAction —
  pasa'`, y su test a `'pasa si no hay nada legal que hacer'`) — no es un bloque nuevo a eliminar,
  es el mismo test que SPEC-018 renombró y hay que deshacer ese renombrado.
- El GDD sección 4 (tabla de prioridades) pierde el paso de robo que SPEC-018 añadió; vuelve a
  terminar en "Pasa" sin paso de robo (ya actualizado).

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

# SPEC-018: Mano de cartas y robo manual

**Estado:** Pendiente
**Sección del GDD:** v3 — mano, mazo, robo, condición de victoria por deck-out (sección 5, línea
153); "Mano y robo manual (segunda pieza de v3, SPEC-018)", justo después de "Mazo de robo (primera
pieza de v3, SPEC-016)".
**Depende de:** SPEC-016 (mazo de robo), SPEC-017 (import de texto ARH)

## Qué es (2-4 líneas)

Cada bando tiene una **mano** de cartas robadas de su mazo de robo. El jugador roba pulsando un
botón **"Robar"** propio, cuando quiera; ve el **nombre** de cada carta en su mano. El enemigo roba
como un paso más de su tabla de prioridades (al pulsar "Turno enemigo", cuando no le queda ninguna
otra acción legal); de su mano solo se ve el **número** de cartas, no el contenido. Si un bando debe
robar y su mazo está vacío, pierde la partida en el acto (deck-out).

Esta es una pieza deliberadamente provisional: la regla real ("se roba 1 carta al pasar de ronda")
se define en una spec posterior; aquí se prueba el mecanismo con un botón manual.

## Criterios de aceptación

- El jugador puede pulsar "Robar" y ve una carta nueva en su mano (nombre visible) y el contador
  "Mazo: N" del jugador baja en 1.
- El jugador puede pulsar "Robar" varias veces seguidas; cada pulsación roba 1 carta más (sin
  límite de tamaño de mano en esta spec).
- Se muestra un contador "Mano: N" junto a cada bando (además del "Mazo: N" ya existente de
  SPEC-016).
- Al pulsar "Turno enemigo": si no hay ninguna acción legal previa en la tabla de prioridades
  (dados de daño/escudo/recurso pendientes, personaje sin activar, 2+ blancos para reroll), el
  autómata roba 1 carta; el "Mazo: N" enemigo baja en 1, el "Mano: N" enemigo sube en 1, y **no**
  se muestra qué carta es.
- Cuando el jugador pulsa "Robar" con su mazo en 0, la partida termina en **Derrota** inmediata
  (deck-out del jugador), con el mismo tipo de aviso de fin de partida que ya existe para "todo el
  bando KO".
- Cuando le toca robar al autómata (mismo criterio que el punto anterior) y su mazo está en 0, la
  partida termina en **Victoria** inmediata (deck-out del enemigo).
- "Reset total" vacía la mano de ambos bandos y reconstruye el mazo de robo a su composición
  completa original (reshuffle), igual que ya hace con vida/escudos/recursos.

## Fuera de alcance (explícito)

- Jugar, descartar o ver el texto/imagen de las cartas de la mano: solo se muestra el nombre (y el
  recuento en el caso del enemigo). Jugar cartas es v4.
- Límite de tamaño de mano y descarte por exceso de mano (regla RR de mantenimiento): no existe
  todavía la fase de mantenimiento completa, así que no se aplica límite en esta spec.
- Robo automático al pasar de ronda ("Nueva ronda" no roba cartas todavía): la regla real de robo
  por ronda queda para una spec posterior, cuando se decida el número y el momento exacto.
- Mano inicial al importar el mazo (robo de las 5 cartas iniciales, RR): no se implementa aquí; se
  empieza con la mano vacía tras importar.

## Casos límite

- Mazo de robo vacío y el jugador pulsa "Robar" → Derrota inmediata (deck-out), ver criterios.
- Mazo de robo vacío y le toca robar al autómata → Victoria inmediata (deck-out), ver criterios.
- Pulsar "Turno enemigo" repetidamente tras agotar dados/activaciones/blancos en la misma ronda: el
  autómata robará 1 carta **en cada pulsación** (es la acción de prioridad más baja, siempre
  disponible como filler mientras haya mazo). Esto puede vaciar su mazo más rápido de lo que
  pasaría con la regla real de "1 por ronda" — es una limitación conocida de esta pieza provisional,
  aceptada porque la regla real llega en una spec posterior.
- "Reset total" con partida ya en Derrota/Victoria por deck-out: igual que ya pasa con KO, Reset
  total debe poder reiniciar la partida con normalidad (mano vacía, mazo completo de nuevo).
- Ambos mazos de robo vacíos a la vez (caso raro: el jugador se fuerza el deck-out con el botón
  mientras el autómata también estaba a 0): se resuelve la acción que dispara el chequeo primero
  (quien pulsó); no hay empate simultáneo posible porque cada robo es una acción explícita distinta.
- Caché de `hand` en localStorage corrupta o con forma inesperada al cargar (recarga de página con
  datos manipulados a mano, mismo caso que ya cubre SPEC-016 para `drawPile`): si el valor guardado
  no es un array de strings, se descarta y la mano arranca vacía, sin romper la carga del resto del
  estado.

## Notas técnicas (opcional)

- `SideState.drawPile: string[]` (SPEC-016) pasa a mutarse al robar (se saca el código del array);
  hay que persistir el array actualizado en localStorage igual que ya se persiste tras importar.
- Nuevo campo `SideState.hand: string[]` (códigos de carta), persistido igual que `drawPile`.
- El nombre de una carta en mano se resuelve igual que ya se resuelven personajes/mazo de robo:
  contra la caché de `resolveCards`/`ArhCard` (sin llamadas nuevas a la API, la carta ya se resolvió
  al importar).
- La tabla de prioridades del autómata (`src/game/automaton.ts`, GDD sección 4) gana un nuevo
  último paso, **por debajo** del reroll de blancos y **por encima** de "Pasa": robar si el mazo no
  está vacío. `AutomatonSide` necesita conocer el mazo de robo y `AutomatonAction` gana un tipo
  `'draw'`; el GDD sección 4 se actualiza con este paso 7 (ver más abajo).
- Los 4 tests actuales de `src/game/automaton.test.ts` que hoy esperan `{type:'pass'}` cuando no
  hay ninguna otra acción legal van a devolver `{type:'draw'}` en cuanto `AutomatonSide` incluya el
  mazo de robo (si no está vacío). Esto es el comportamiento nuevo esperado, **no** una regresión:
  esos tests hay que actualizarlos (pasarles `drawPile: []` donde se quiera seguir comprobando
  `'pass'`) y añadir un test nuevo que cubra `'draw'`.
- `computeOutcome` (`src/game/outcome.ts`) hoy solo mira `characters`/`damage` (`allKO`) y es
  recalculable en cualquier momento a partir del estado. El deck-out **no** encaja en ese mismo
  patrón: es un evento puntual que solo se dispara en el instante de la propia acción de robar con
  mazo en 0 (no algo que se pueda derivar después releyendo `drawPile`/`hand`, que en 0 cartas es un
  estado válido si nadie ha intentado robar). Se resuelve como parte de la acción de robar (jugador
  o autómata), no forzándolo dentro de la firma actual de `computeOutcome(player, enemy)`.
- El nombre de una carta en mano requiere una forma de leerla por código de vuelta desde la caché
  tras el import (hoy `readCache`/`writeCache` en `src/import/resolveCards.ts` no están exportadas
  y el `Map<string, ArhCard>` que arma `importDeck` se descarta al terminar el import). Hay que
  exportar una lectura síncrona por código, o guardar el resultado del import en el store, para que
  la mano pueda mostrar nombres sin llamadas nuevas a la API.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

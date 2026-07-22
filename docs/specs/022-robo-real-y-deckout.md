# SPEC-022: Robo real (hasta tamaño de mano) y deck-out real

**Estado:** Pendiente
**Sección del GDD:** v3 — mano, mazo, robo, condición de victoria por deck-out (sección 5, línea
153). Corrige las piezas provisionales de SPEC-018/019 con la regla real del reglamento (RR pg
19-20, 22, 25 — ver `docs/reglamento/03-areas-de-juego.md`, `04-estructura-y-customizacion.md`,
`05-conceptos.md`).
**Depende de:** SPEC-018 (mano de cartas), SPEC-019 (robo por ronda, cuya regla de "+1 por ronda"
esta spec sustituye)

## Qué es (2-4 líneas)

Al pulsar **"Nueva ronda"**, cada bando roba cartas hasta llegar a su **tamaño de mano** (5 por
defecto), en vez del "+1 carta" provisional de SPEC-019; no roba si ya tiene 5 o más. El jugador
puede **descartar** cartas de su mano libremente, en cualquier momento, con un botón por carta
(nueva acción, independiente de "Nueva ronda"). El **deck-out** deja de dispararse al intentar
robar con el mazo vacío: ahora se comprueba **al final de cada "Nueva ronda"** (que hace de
mantenimiento) y solo si un bando se queda **sin cartas en mano Y sin mazo a la vez**.

## Criterios de aceptación

- Al pulsar "Nueva ronda", cada bando roba cartas de su mazo hasta llegar a 5 en mano (si ya tenía
  menos de 5); si ya tenía 5 o más, no roba ninguna.
- El jugador puede descartar una carta cualquiera de su mano pulsando un botón en ella, en
  cualquier momento (no solo durante "Nueva ronda"); la carta desaparece de la mano (se pierde,
  no hay pila de descarte visible todavía — ver Fuera de alcance).
- El enemigo (autómata) nunca descarta: en "Nueva ronda" simplemente roba hasta su tamaño de mano,
  igual que el jugador, sin ninguna lógica de selección.
- El botón manual "Robar" (SPEC-018) sigue funcionando exactamente igual: puede hacer que la mano
  supere las 5 cartas, sin límite.
- Si al finalizar el robo de "Nueva ronda" un bando se queda con **0 cartas en mano y 0 en el
  mazo**, la partida termina en el acto: Derrota si es el jugador, Victoria si es el enemigo.
- Si un bando tiene mano o mazo (uno de los dos, no ambos vacíos), "Nueva ronda" no termina la
  partida por ese bando, aunque no le queden cartas que robar.
- El botón "Robar" manual (SPEC-018) y el intento de robo automático en "Nueva ronda" **ya no**
  terminan la partida por sí solos al encontrar el mazo vacío (a diferencia de SPEC-018/019): si
  el mazo está vacío, simplemente no se roba nada en ese momento (regla real: "si no puedes robar,
  no pasa nada"); el deck-out solo se comprueba al final de "Nueva ronda", y solo con mano+mazo
  ambos a 0.

## Fuera de alcance (explícito)

- Pila de descarte visible/consultable: descartar hace desaparecer la carta sin más, no hay UI de
  pila de descarte todavía (igual que las mejoras/apoyos descartados por KO/Reset total).
- Tamaño de mano distinto de 5, o modificable por texto de carta: no hay keywords todavía; 5 fijo
  para ambos bandos.
- Cualquier lógica de qué descartar por parte del autómata: nunca descarta en esta spec.
- La acción de "rerollear dados descartando una carta" (RR pg 21): es una acción de turno distinta,
  no de mantenimiento; queda para una spec posterior.
- Campo de batalla y su desempate real en doble deck-out simultáneo: no implementado; ver Casos
  límite para la solución temporal.
- Fase de acción con turnos alternados reglamentaria: sigue sin existir; "Nueva ronda"/"Turno
  enemigo"/botones sueltos siguen siendo el estand-in ya documentado en el GDD.

## Casos límite

- Bando con más de 5 cartas en mano (por descartes insuficientes en rondas previas, o por usar
  "Robar" manual varias veces): "Nueva ronda" no roba nada para ese bando (ya está en o por encima
  del tamaño de mano).
- Bando con mazo vacío pero mano no vacía: "Nueva ronda" no roba nada para ese bando (nada que
  robar), pero **no** termina la partida (tiene mano).
- Bando con mano vacía pero mazo no vacío: "Nueva ronda" le roba hasta 5; no hay deck-out (tiene
  mazo).
- Bando con mano Y mazo vacíos a la vez tras el robo de "Nueva ronda": deck-out inmediato
  (Derrota/Victoria según el bando).
- **Ambos bandos con mano y mazo vacíos a la vez** en la misma "Nueva ronda" (caso raro, sin campo
  de batalla implementado para desempatar según la regla real): se resuelve **Victoria** — se
  comprueba primero el deck-out del enemigo, igual que el criterio ya usado en SPEC-019 para el
  caso análogo. Documentado como simplificación temporal hasta que exista campo de batalla
  (entonces el desempate real pasaría a depender de quién lo controle).
- Descartar la última carta de la mano: la mano queda a 0, sin error ni caso especial.
- Descartar con la mano ya vacía: no hay nada que descartar, el botón no aparece (no hay cartas
  que listar).
- "Reset total" con más/menos de 5 cartas en mano: sigue vaciando la mano y reconstruyendo el mazo
  completo (drawPile + hand + mejoras + apoyos en juego, rebarajado), sin relación con el tamaño
  de mano.
- "Nueva ronda" pulsada con la partida ya terminada (outcome no nulo): sigue siendo no-op.

## Notas técnicas (opcional)

- `newRound()` (`src/store/gameStore.ts`) cambia su lógica de robo: en vez de mover siempre 1
  código de `drawPile` a `hand`, mueve códigos hasta que `hand.length` llegue a `HAND_SIZE` (5) o
  `drawPile` se quede sin cartas, lo que pase antes. Se aplica igual a ambos bandos.
- El chequeo de deck-out dentro de `newRound()` se mueve de **antes** de robar (guarda previa,
  SPEC-019) a **después** de robar, y su condición cambia de `drawPile.length === 0` a
  `drawPile.length === 0 && hand.length === 0`. Sigue comprobándose primero el enemigo (Victoria)
  y luego el jugador (Derrota), mismo orden que `computeOutcome`.
- El botón manual "Robar" (`drawCard`, SPEC-018) **no** cambia: sigue disparando deck-out al
  intentar robar con el mazo vacío. Esto es una inconsistencia deliberada y temporal frente al
  nuevo comportamiento de "Nueva ronda" (que ya no dispara deck-out al robar, solo lo comprueba al
  final) — a decidir en una spec futura si "Robar" también deja de disparar deck-out directamente
  y pasa a depender del mismo chequeo de fin de ronda, una vez se entienda mejor cómo encaja el
  botón manual (provisional, SPEC-018) con la regla real de robo.
- Nueva acción `discardCard(side, code)` o similar en el store: quita una carta de `hand` por
  código/índice, sin más efecto (no hay pila de descarte que alimentar todavía).
- Nueva UI: un botón "Descartar" por carta en `Hand.tsx`, visible solo para el jugador (igual que
  el resto de acciones de mano).

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

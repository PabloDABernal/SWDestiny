# SPEC-028: Daño indirecto (◎) real, segunda pieza — el enemigo ataca, el jugador reparte

**Estado:** Pendiente
**Sección del GDD:** §3 (símbolos de dado), completa la corrección de SPEC-026 (que solo cubrió
"el jugador ataca, el autómata reparte solo").
**Depende de:** SPEC-026 (daño indirecto real, primera pieza), SPEC-013 (autómata combina
modificadores y costes), SPEC-025 (turnos reales), SPEC-023 (precedente de clic sobre cualquier pool
para Reroll de dado)

## Qué es (2-4 líneas)

Completa la corrección del símbolo de daño indirecto (◎) para la dirección que SPEC-026 dejó fuera:
cuando es el **autómata** quien ataca con uno o varios dados indirecto, no elige él el objetivo —
es el **jugador**, como defensor, quien reparte ese valor entre sus propios personajes, clic a clic,
como quiera (incluido dejarlo todo en uno solo). El autómata, como atacante, sigue pudiendo combinar
varios dados indirecto en un único total (a diferencia del jugador, que los resuelve uno a uno,
SPEC-026) — no cambia respecto a cómo combina hoy melee/ranged.

## Criterios de aceptación

- [ ] Cuando el autómata resuelve daño indirecto (uno o varios dados indirecto combinados en un solo
  total, igual que hoy combina melee/ranged), el juego NO le deja elegir objetivo por sí mismo: pasa a
  un modo de reparto donde el jugador clica sus propios personajes.
- [ ] Cada clic del jugador sobre uno de sus personajes no-KO aplica **1 punto** del valor total al
  personaje clicado (escudos absorben primero, SPEC-005); puede clicar el mismo personaje varias veces
  seguidas o repartir entre varios, sin ninguna restricción de reparto "sin overkill" (a diferencia del
  reparto automático de SPEC-026, aquí decide el jugador con libertad total, fiel al reglamento: puede
  concentrar todo el valor en un solo personaje aunque quede KO).
- [ ] Mientras quede valor por repartir, el juego bloquea cualquier otra acción del jugador (no puede
  activar personajes, jugar cartas, pasar, etc.) — solo puede seguir clicando sus propios personajes
  hasta agotar el valor. No hay botón "Cancelar": hay que completar el reparto.
- [ ] El turno **sigue siendo del autómata** mientras el jugador reparte (no es una acción del
  jugador): al terminar de repartir todo el valor, se completa la acción del autómata y el turno pasa
  al jugador con normalidad (SPEC-025), igual que si el autómata hubiera resuelto solo.
- [ ] El autómata sigue pudiendo combinar varios dados indirecto propios en un único total al atacar
  (sin cambios respecto a cómo combina hoy melee/ranged, SPEC-013/014); lo único que cambia es que el
  reparto del total resultante lo hace el jugador, no un algoritmo.
- [ ] **Prioridad en la tabla del autómata** (decisión del usuario, corrige GDD §4): la fila 1 (daño)
  comprueba primero si hay una tanda combinable de indirecto; si la hay, se resuelve esa (el jugador
  reparte); si no, sigue con melee/ranged como hasta ahora. Es decir, indirecto y melee/ranged
  comparten el mismo puesto (fila 1) de la tabla, pero indirecto se prueba primero en caso de que el
  autómata tenga dados sin resolver de ambos tipos a la vez.
- [ ] Si el reparto deja KO a uno o más personajes del jugador, sus dados del pool se retiran (mismo
  patrón que cualquier KO); si deja al jugador entero KO, dispara Derrota igual que cualquier otro caso
  de KO total.

## Fuera de alcance (explícito)

- **El jugador ataca con indirecto**: ya cubierto por SPEC-026 (el autómata reparte solo). No cambia.
- **Reparto "sin overkill" o cualquier ayuda automática** para el jugador al repartir: el jugador
  decide con libertad total, sin ninguna sugerencia ni restricción del juego.
- Daño indirecto proveniente de texto de carta (no de un dado): no hay texto de carta implementado
  todavía.
- Combinar el reparto de un dado indirecto del autómata con su propio coste de daño indirecto
  (`i<n>`, SPEC-010/013): se sigue pagando igual que hoy (el autómata se lo aplica a sí mismo con
  `indirectCostReceiverIndex`, sin cambios); no hay datos reales de una cara que combine ambos.
- Cualquier cambio a cómo el autómata combina/reparte melee o ranged al atacar: sigue igual
  (SPEC-013/014), esta spec solo separa el símbolo indirecto de esa combinación para tratarlo distinto.

## Casos límite

- **El valor total no cabe sin matar a nadie**: el jugador puede repartirlo como quiera, incluido
  dejar KO a uno o más personajes; no hay ningún aviso ni bloqueo por "overkill", a diferencia del
  reparto automático de SPEC-026.
- **Un único personaje no-KO del jugador**: todos los clics tienen que ir ahí (es el único objetivo
  posible); si el valor lo deja KO, sale KO con normalidad.
- **El jugador se queda sin ningún personaje no-KO a mitad de repartir** (por haber dejado KO a uno
  con clics previos de la misma tanda): no puede pasar mientras quede valor por repartir y siga
  habiendo al menos un personaje no-KO; si el último clic deja a TODOS los personajes del jugador KO
  a la vez con valor exacto restante 0, dispara Derrota con normalidad, sin caso especial.
- **Coste de recurso en la cara del autómata** (p. ej. `3ID2`): se paga igual que siempre al resolver
  (SPEC-008b/013), antes de repartir; si no le llega, no se resuelve esa tanda (mismo criterio que
  hoy).
- **Modificador `+X` o `+X*` (SPEC-010/027) en las caras indirecto del autómata**: se suma al total
  antes de repartir, igual que ya suman a cualquier otra tanda combinada del autómata.
- **Fin de partida ya decidido** (por otra vía) antes de que el jugador termine de repartir: el
  reparto se cancela sin aplicar el resto pendiente, mismo criterio que el resto de acciones
  (SPEC-008a/025).

## Notas técnicas (opcional)

- `isDamageSymbol` (`src/game/automaton.ts`) agrupa hoy melee+ranged+indirecto en una sola tanda que
  el propio autómata combina y aplica a un objetivo que él mismo elige. Hay que separar indirecto de
  esa agrupación en un predicado propio (p. ej. `isIndirectSymbol`) y comprobarlo primero, antes de
  melee/ranged (ver criterio de prioridad arriba). El autómata sigue combinando sus propios dados
  indirecto entre sí reutilizando **solo** `combineAutomatonBatch` (agrupar base + modificadores,
  pagando el coste de recurso mientras alcance) — **no** `capBatchToMargin`/`pickTargetAndBatch`: esa
  maquinaria sirve para "elegir un objetivo propio y no pasarse de margen" (sin overkill), que no
  aplica aquí porque el autómata no elige objetivo y el jugador reparte con libertad total, sin
  ningún límite de overkill (decisión ya tomada). El resultado (dieIndices + valor total, tras coste
  de recurso) no se aplica solo — se ofrece al jugador para repartir.
- GDD §4 (tabla de prioridades) ya está actualizado con la fila 1 corregida (indirecto se comprueba
  antes que melee/ranged) como parte de esta spec — no hace falta tocarlo de nuevo al implementar.
- Nuevo sub-modo de resolución en `src/store/gameStore.ts` (análogo a como Reroll de dado, SPEC-023,
  permite clicar cualquier pool aunque no sea el turno de quien clica): mientras esté activo, el
  jugador puede clicar sus propios personajes (no dados) aunque el `turn` siga siendo `'enemy'`; cada
  clic resta 1 al valor pendiente y aplica 1 de daño indirecto (con escudo absorbiendo primero,
  `resolveShieldedDamage`) al personaje clicado. Al llegar el pendiente a 0, se completa la acción del
  autómata (equivalente a lo que hoy hace `nextAutomatonAction`/su aplicación en el store) y el turno
  pasa a `'player'` (SPEC-025).
- Guard de turno: a diferencia de Reroll de dado (que es una acción DEL JUGADOR que además le deja
  clicar el pool rival), aquí la acción sigue siendo DEL AUTÓMATA — el jugador no "actúa" en su
  turno, solo resuelve un paso obligatorio de la acción del autómata. Hay que fijar explícitamente
  este guard en el store (no es un calco directo del de Reroll de dado) para no dejar huecos por los
  que el jugador cuele una acción propia mientras reparte.
- No hay botón "Cancelar" para este sub-modo (a diferencia de los modos de resolución del jugador,
  SPEC-008a): hay que completar el reparto sí o sí.
- `indirectCostReceiverIndex` (ya usado por el autómata para su propio coste de daño indirecto,
  SPEC-013) no cambia: sigue aplicándose al bando del autómata, sin relación con este reparto.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

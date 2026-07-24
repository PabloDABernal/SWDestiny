# SPEC-026: Daño indirecto (◎) real — el jugador ataca, el autómata reparte

**Estado:** Pendiente
**Sección del GDD:** §3 (símbolos de dado), corrige la simplificación de v1 de SPEC-008a ("melee,
ranged e indirecto... en v1 los tres restan vida por igual").
**Depende de:** SPEC-008a (resolver por símbolo), SPEC-013 (autómata paga costes), SPEC-025 (turnos
reales)

## Qué es (2-4 líneas)

El símbolo de daño **indirecto** (◎, cara `<n>ID`) deja de tratarse igual que melee/ranged cuando lo
resuelve el **jugador**. Por regla real, quien ataca con un dado indirecto no elige el objetivo: es
el **defensor** quien reparte ese valor entre sus propios personajes, pudiendo dividirlo entre
varios. Esta spec cubre solo la dirección **jugador ataca → autómata (defensor) reparte solo**; la
dirección contraria (enemigo ataca con indirecto → el jugador reparte interactivamente) queda para
una spec posterior (ver Fuera de alcance), al ser bastante más compleja de turnos/UI.

No confundir con el **coste de daño indirecto propio** (sufijo `i<n>`, SPEC-010, ya corregido): son
dos mecánicas distintas que comparten nombre.

## Criterios de aceptación

- [ ] El jugador marca un único dado base de indirecto (símbolo `ID`) propio y pulsa un botón
  "Resolver indirecto" (sin elegir objetivo, como recurso/especial); el enemigo recibe el valor
  total del dado, repartido automáticamente entre sus propios personajes.
- [ ] El reparto automático del autómata reutiliza el criterio de `indirectCostReceiverIndex`
  (prioriza que sobrevivan, con escudos primero; empates deterministas), extendido a repartir entre
  **varios** de sus personajes cuando el valor total no cabe en uno solo sin matarlo
  innecesariamente (mismo espíritu "sin overkill" que ya usa el autómata para repartir daño/escudo
  recibido entre varios objetivos, SPEC-014 — `pickTargetAndBatch`/`capBatchToMargin`).
- [ ] Dos dados indirecto en el pool del jugador (p. ej. valor 4 y valor 2) se resuelven **por
  separado**: no se pueden combinar en un total de 6. Solo se puede tener **un** dado base de
  indirecto marcado (sin resolver) a la vez; marcar un segundo mientras el primero sigue pendiente
  es no-op.
- [ ] Un modificador `+X` de indirecto marcado junto al único dado base de indirecto suma su valor
  al mismo reparto (el modificador no cuenta como un segundo dado base).
- [ ] Resolver un dado indirecto (marcar + pulsar "Resolver indirecto") es una acción completa: como
  el reparto es automático e instantáneo (sin ningún clic más del jugador), cierra el turno del
  jugador de inmediato, igual que resolver recurso o especial (SPEC-025).

## Fuera de alcance (explícito)

- **Enemigo ataca con indirecto → el jugador reparte**: dirección contraria a esta spec. El jugador,
  como defensor, no tiene en esta spec ninguna forma interactiva de repartir el daño indirecto que
  reciba — spec futura (candidata a SPEC-027), que también deberá separar el símbolo indirecto del
  resto de "daño" en el motor del autómata como **atacante** (`isDamageSymbol`/
  `combineAutomatonBatch` en `src/game/automaton.ts`, hoy agrupan melee+ranged+indirect en una sola
  tanda que el propio autómata aplica a un objetivo que él mismo elige — habrá que separarlos ahí).
- **Cuántos dados indirecto puede combinar el autómata cuando ataca**: no aplica a esta spec (el
  autómata no ataca con indirecto aquí, es el defensor). Decisión ya tomada para cuando llegue esa
  spec futura: el autómata, como atacante, sí puede seguir combinando varios dados indirecto en un
  único total (a diferencia del jugador, que resuelve uno a uno) — anotado en BACKLOG para no
  perderlo.
- Daño indirecto proveniente de texto de carta (no de un dado): no hay texto de carta implementado
  todavía.
- Cualquier restricción de "evitar overkill" en el reparto del autómata **atacante** con melee/ranged
  (sigue igual, SPEC-013/014): esta spec solo cambia el reparto cuando el símbolo es indirecto y el
  autómata es el **defensor**.
- Combinar el reparto de un dado indirecto con el coste de daño indirecto propio (`i<n>`) de la
  misma cara: no hay datos reales conocidos de una cara `<n>IDi<n>`; si aparece, se trata aparte.

## Casos límite

- **Autómata con un único personaje no-KO**: todo el valor recae ahí (no hay otro sitio); si lo deja
  KO, sus dados del pool se retiran, igual que cualquier otro KO por daño.
- **Autómata sin ningún personaje no-KO**: no puede pasar si el bando sigue en juego (mismo
  invariante que ya usa `indirectCostReceiverIndex` hoy); si ocurriera, la tanda no se resuelve.
- **Reparto deja KO a uno o más personajes del autómata**: sus dados del pool se retiran (mismo
  patrón que cualquier KO); si deja al bando entero KO, dispara fin de partida (Victoria) igual que
  cualquier otro caso de KO total — sin caso especial.
- **Coste de recurso en la misma cara** (p. ej. `3ID2`, coste de recurso 2): se paga igual que
  siempre al resolver (SPEC-008b), antes de aplicar el reparto; si no hay recursos suficientes, no
  se resuelve (aviso), y no se reparte nada.
- **Modificador de indirecto sin dado base marcado**: como cualquier otro modificador (SPEC-010), no
  se resuelve solo (aviso "necesita un dado base del mismo símbolo").
- **Fin de partida ya decidido** (por otra vía, entre marcar el dado y resolverlo): el botón
  "Resolver indirecto" es no-op, mismo criterio que el resto de acciones de resolución (SPEC-008a/
  025).

## Notas técnicas (opcional)

- `dieSymbol`/`parsePlayerFace` ya distinguen `'indirect'` como símbolo propio (SPEC-008a); no hace
  falta tocar el parser.
- `selectDie`: para símbolo `'indirect'`, forzar que `marked` contenga como máximo **un** dado base
  (los modificadores sí se pueden sumar); intentar marcar un segundo dado base de indirecto mientras
  hay uno sin resolver es no-op (mismo espíritu que el bloqueo ya existente de "no reemplazar un modo
  abierto de otro símbolo", SPEC-025).
- Nueva función en `src/game/automaton.ts`, hermana de `indirectCostReceiverIndex`, que reparte un
  valor de daño **entrante** entre varios personajes no-KO del bando defensor evitando KOs
  innecesarios cuando sea posible (reutilizar la lógica de `pickTargetAndBatch`/`capBatchToMargin`
  ya usada para repartir sin overkill, adaptada de "elegir tanda propia a resolver" a "repartir un
  valor recibido").
- En `src/store/gameStore.ts`: nuevo camino de resolución para symbol `'indirect'` (parecido a
  `resolveResources`/`resolveSpecial`: botón sin elegir objetivo), que en vez de aplicar el efecto a
  un `effectIndex` fijo, llama a la nueva función de reparto automático sobre `state.sides.enemy`
  (el bando contrario a quien resuelve, siempre el autómata en esta spec) y aplica el resultado a
  varios personajes a la vez (no solo uno, a diferencia de `resolvePlayerBatch` hoy).
- El flip de turno (SPEC-025) ocurre en el mismo clic que resuelve (no hay pasos intermedios en esta
  spec, al ser automático el reparto) — mismo patrón que `resolveResources`/`resolveSpecial`.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

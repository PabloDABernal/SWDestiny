# SPEC-013: El autómata combina modificadores y paga costes

**Estado:** Pendiente
**Sección del GDD:** §4 (El autómata enemigo — tabla de prioridades y "Tandas combinadas y costes")
**Depende de:** SPEC-007 (autómata escudo/recurso), SPEC-008b (costes de recurso), SPEC-010
(modificadores `+X` y coste indirecto)

## Qué es (2-4 líneas)

Hoy el autómata solo reconoce las caras de dado "peladas" (`parseDamage`/`parseShield`/
`parseResource`): si una cara tiene un modificador `+X` o un coste (de recurso o de daño indirecto
propio), la ignora por completo, como si no estuviera en el pool. Con esta spec, el autómata junta
los dados base y sus modificadores del mismo símbolo, paga el coste de recurso con su propio
contador, y resuelve el coste de daño indirecto propio sobre uno de sus personajes, siguiendo las
reglas fijadas con el usuario (ver GDD §4).

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] El enemigo tiene un dado `2MD` y un `+1MD` en su pool (sin coste, recursos suficientes) →
      "Turno enemigo" resuelve **ambos en una sola tanda** (3 de daño total) contra el jugador de
      menos vida; el mensaje de "última acción del enemigo" refleja el total combinado.
- [ ] El enemigo tiene dos dados base de daño distintos (p. ej. `2MD` y `1RD`, sin coste) → se
      combinan en una sola tanda (3 de daño total) al mismo objetivo (menor vida), igual que antes
      pero sumados en vez de resolver solo el mayor.
- [ ] El enemigo tiene un dado `2MD3` (coste 3 recursos) y **recursos ≥ 3** → lo resuelve y paga el
      coste (el contador de recursos del enemigo baja en 3).
- [ ] El enemigo tiene un dado `2MD3` y **recursos < 3**, pero también tiene un `1MD` (sin coste) →
      descarta el `2MD3` (impagable) y resuelve el `1MD` en su lugar.
- [ ] El enemigo tiene varios dados de daño pagables y uno impagable de mayor valor → la tanda
      incluye los pagables (ordenados de mayor a menor) y **excluye** el impagable, que queda en el
      pool para una pasada futura (no se descarta del pool, solo no entra en esta tanda).
- [ ] El enemigo tiene un dado `2IDi1` (coste de daño indirecto propio, 1 de daño) → al resolverlo,
      **uno de sus propios personajes** recibe 1 de daño según la regla de receptor (ver más abajo);
      si ese personaje tenía escudo, se descuenta de ahí primero.
- [ ] Receptor del coste indirecto — con dos aliados no-KO, uno con escudos y otro sin, ambos
      sobrevivirían al coste → el escudo del primero absorbe el coste (no baja su vida).
- [ ] Receptor del coste indirecto — ningún aliado tiene escudos → recibe el coste el de **más
      vida** entre los que sobrevivirían.
- [ ] Receptor del coste indirecto — el coste mataría a cualquier aliado que se elija → se aplica al
      de **más vida** (inevitable, el autómata no se bloquea ni pasa el turno por esto).
- [ ] Combinar + pagar coste de recurso aplica igual a **escudo** y a **recurso** (el coste
      indirecto, en cambio, solo se resuelve en tandas de daño — ver "Fuera de alcance"): una tanda
      de dados de escudo con modificador `+X` se resuelve combinada sobre el aliado de menor vida
      (regla ya existente, SPEC-007); una tanda de recurso con modificador se resuelve combinada,
      sumando el total al contador propio.
- [ ] Si tras aplicar las reglas anteriores **ningún dado de un símbolo es pagable ni combinable**
      (p. ej. todos los dados de daño tienen coste superior a los recursos disponibles), esa
      prioridad de la tabla no aplica: el autómata pasa a evaluar la siguiente (escudo → activar →
      recurso → reroll → pasar), igual que hoy cuando no hay dados de un tipo.

## Fuera de alcance (explícito)

- **Multi-objetivo**: el autómata sigue mandando cada tanda a **un único objetivo** (SPEC-011 no se
  extiende al autómata). Repartir dados de una tanda entre varios enemigos queda fuera.
- **Empates de objetivo**: cuando varios personajes del jugador (o aliados propios) empatan en vida
  para ser el objetivo/receptor, el desempate es **determinista** (mismo criterio ya implementado
  desde SPEC-007, sin azar); no se implementa un árbol de decisión más fino.
- **Coste de daño indirecto propio en escudo/recurso**: esta spec solo resuelve el receptor de coste
  indirecto para tandas de **daño**. Si una cara de escudo o recurso trajera ese coste (`…i<n>`), se
  deja fuera de esta spec (se trataría en una spec aparte si llega a hacer falta).
- **Selector de dificultad en la UI**: sigue en BACKLOG, no entra aquí.
- **Trampa "ignorar costes"**: no se activa en esta spec (el GDD la reserva para v4/cartas); el
  autómata paga sus costes con recursos reales, como el jugador.
- Optimizar la combinación para maximizar daño total eligiendo qué subconjunto de dados excluir
  cuando hay varias formas de quedar por debajo del presupuesto: se usa el algoritmo greedy simple
  descrito en Notas técnicas (ordenar de mayor a menor, incluir mientras sea pagable), no una
  búsqueda óptima.

## Casos límite

- **Recursos exactamente igual al coste** → se paga, el contador queda en 0 (no en negativo).
- **Ningún dado de daño en el pool** → sin cambios: pasa a evaluar escudo (prioridad 2), como hoy.
- **Solo hay modificadores `+X`, sin ningún dado base del mismo símbolo** → no se resuelve nada de
  ese símbolo (un modificador solo no se resuelve, igual que en la regla del jugador desde
  SPEC-010); el autómata pasa a la siguiente prioridad.
- **Coste indirecto con todos los aliados ya KO** → no puede haber tanda con coste indirecto si no
  hay receptor válido; en ese caso esa tanda tampoco se resuelve (se excluye del combo, igual que un
  dado impagable) y se prueba con el resto de dados del símbolo.
- **Reroll de blancos y activar personajes** → sin cambios; estas dos filas de la tabla no tienen
  coste ni modificador.

## Notas técnicas (opcional)

- Nuevo parser a reutilizar: `parsePlayerFace` (ya existe en `src/game/damage.ts`, SPEC-010) da
  `{ symbol, amount, resourceCost, indirectCost, isModifier }` para cualquier cara con o sin coste/
  modificador. El autómata debe usar este parser en vez de `parseDamage`/`parseShield`/
  `parseResource` "pelados" para detectar candidatos.
- Algoritmo de combinación (por símbolo, en cada paso de la tabla de prioridades):
  1. Reunir los índices del pool cuyo `parsePlayerFace(...).symbol` coincide con el símbolo buscado.
  2. Ordenarlos de mayor a menor `amount` (modificadores y base mezclados en el mismo orden).
  3. Recorrer la lista ordenada acumulando `resourceCost`; añadir cada dado a la tanda mientras
     `recursos_disponibles - costeAcumulado >= 0`; el primer dado que no quepa se **salta** (no se
     descarta del pool, simplemente no entra en esta tanda) y se sigue probando con el resto de la
     lista (para no descartar toda la tanda por un solo dado caro intercalado).
  4. Si tras recorrer toda la lista no queda ningún dado **base** en la tanda (solo modificadores),
     esa prioridad no aplica (ver caso límite).
  5. Si la tanda incluye coste de daño indirecto propio, calcular el receptor (regla del GDD §4)
     antes de confirmar la tanda; si no hay receptor válido en absoluto (todos KO), excluir de la
     tanda los dados con `indirectCost > 0` y recalcular (puede dejar la tanda vacía → no aplica).
- Receptor del coste indirecto: reutilizar la noción de "aliado no-KO" ya usada en
  `lowestHealthTargetIndex` (SPEC-007) pero con la lógica inversa descrita en el GDD (preferir
  supervivientes, luego con escudo, luego más vida; si nadie sobrevive, más vida sin más).
  `resolveShieldedDamage` (ya existe) sirve para calcular si un candidato "sobrevive" al coste.
  Puede necesitar una función nueva en `src/game/automaton.ts`, distinta de
  `lowestHealthTargetIndex`.
- `nextAutomatonAction` (`src/game/automaton.ts`) deja de devolver un solo `dieIndex`; las acciones
  `attack`/`shield`/`resource` pasan a llevar un **array** de índices de dado (la tanda). Solo
  `attack` puede llevar además el índice del receptor de coste indirecto (`costReceiverIndex`), ya
  que el coste indirecto solo se resuelve en tandas de daño (ver "Fuera de alcance"); `shield` y
  `resource` no necesitan ese campo. Ajustar el tipo `AutomatonAction` y el `switch` en `enemyTurn`
  (`src/store/gameStore.ts`) para resolverlos todos (reutilizar `resolvePlayerBatch` si encaja, o una
  variante equivalente para el autómata).
- El mensaje de `lastEnemyAction` debe seguir siendo legible con varios dados (p. ej. listar caras o
  el total combinado), sin necesidad de un formato elaborado.

## Nota de tamaño (regla 4 CLAUDE.md)

Mediana: toca `src/game/automaton.ts` (nueva lógica de combinación + receptor de coste indirecto) y
`src/store/gameStore.ts` (`enemyTurn`, tipo `AutomatonAction`). Sin UI nueva. Si al implementar
parece que se pasa de ~300 líneas, avisar y valorar mover el receptor de coste indirecto a un spec
aparte.

## Resultado del playtest

(pendiente)

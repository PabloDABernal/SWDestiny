# SPEC-014: El autómata gana coste indirecto en escudo/recurso y multi-objetivo

**Estado:** Pendiente
**Sección del GDD:** §4 (El autómata enemigo — "Tandas combinadas y costes" y "Multi-objetivo del
autómata")
**Depende de:** SPEC-013 (autómata combina modificadores y paga costes), SPEC-011 (multi-objetivo
del jugador)

## Qué es (2-4 líneas)

Cierra dos huecos que quedaron explícitamente fuera de SPEC-013: (1) el coste de daño indirecto
propio (`…i<n>`) hoy solo se resuelve si aparece en una tanda de **daño**; con esta spec también se
resuelve en tandas de **escudo** y **recurso**. (2) El autómata siempre manda su tanda de daño (o de
escudo) a un **único** objetivo aunque sobren dados para más; con esta spec evita el *overkill* /
pasarse del tope de 3 en escudo, dejando lo que no quepa para una **pulsación futura** de "Turno
enemigo" — igual que el jugador reparte entre varios objetivos con varios clics desde SPEC-011, no
en uno solo.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Coste indirecto en escudo/recurso

- [ ] El enemigo tiene un dado de escudo con coste indirecto (p. ej. `3Shi1`) → al resolverlo, el
      aliado elegido recibe el escudo y **otro** personaje propio (el receptor del coste, misma
      regla que en daño desde SPEC-013) recibe 1 de daño indirecto.
- [ ] El enemigo tiene un dado de recurso con coste indirecto (p. ej. `2Ri1`) → al resolverlo, suma
      el recurso al contador y aplica el coste indirecto a un personaje propio.
- [ ] El receptor del coste indirecto en escudo/recurso sigue la misma prioridad ya fijada en
      SPEC-013 (sobrevivientes con escudo > sobrevivientes por vida > cualquiera por vida).

### Multi-objetivo en daño (varias pulsaciones)

- [ ] El enemigo tiene dados de daño suficientes para dejar en 0 al objetivo de menos vida **y**
      sobran dados → esa pulsación de "Turno enemigo" solo aplica los dados que caben sin pasarse
      (overkill); los que sobran se quedan en el pool.
- [ ] Pulsando "Turno enemigo" otra vez tras lo anterior (el objetivo anterior ya quedó KO) → el
      autómata dirige los dados sobrantes al **siguiente** jugador de menos vida.
- [ ] Si **ningún** objetivo vivo puede recibir ni el dado más pequeño disponible sin pasarse (todos
      tienen menos vida que el dado más barato disponible) → se aplica igual al de menos vida,
      aceptando el exceso (un dado no se divide).
- [ ] Con un solo objetivo vivo, o con dados que en conjunto no llegan a dejarlo en 0, el
      comportamiento es idéntico al de SPEC-013 (toda la tanda combinable a ese único objetivo, en
      una sola pulsación).

### Multi-objetivo en escudo (varias pulsaciones)

- [ ] El enemigo tiene dados de escudo suficientes para llevar a un aliado a 3 **y** sobran dados →
      esa pulsación solo aplica los que caben sin pasar de 3; los que sobran se quedan en el pool.
- [ ] Pulsando otra vez (el aliado anterior ya está a tope) → el autómata dirige los dados sobrantes
      al **siguiente** aliado que más lo necesite (menos vida, mismo desempate de siempre, entre los
      que aún tienen hueco).
- [ ] Si el aliado de menos vida ya está a tope de escudo, esa pulsación pasa directamente al
      siguiente candidato con hueco (no se "pierde" la prioridad de escudo mientras quede alguien con
      hueco y algún dado de escudo en el pool).
- [ ] Con un solo aliado vivo, o si nadie tiene hueco (todos a tope de 3), el comportamiento es
      idéntico al de SPEC-007/013 (todo a un único aliado, o esa prioridad no aplica si nadie tiene
      hueco).

## Fuera de alcance (explícito)

- **Resolverlo todo en una sola pulsación de "Turno enemigo"**: repartir entre varios objetivos
  puede llevar varias pulsaciones, exactamente igual que el jugador reparte con varios clics desde
  SPEC-011 (el modo nunca resuelve dos objetivos a la vez en un solo clic, ni para el jugador ni
  ahora para el autómata).
- **Selector de dificultad en la UI**: sigue en BACKLOG.
- **Focus, especial, disrupt, descarte**: siguen sin resolverse (ni el jugador los tiene aún, v3/v4).
- Optimizar qué objetivo se elige para maximizar algo más allá de "el más débil que tenga hueco": no
  se busca la combinación óptima entre todos los repartos posibles, solo el criterio determinista
  descrito en Notas técnicas.
- Multi-objetivo en **recurso**: no tiene objetivo, no aplica (solo puede llevar coste indirecto,
  como los otros dos símbolos).

## Casos límite

- **Coste indirecto en escudo/recurso con todos los aliados propios KO** → igual que en daño
  (SPEC-013): el dado con ese coste se excluye de la tanda (no se resuelve esa parte), el resto de
  la tanda (si queda algo pagable/combinable) sigue su curso normal.
- **Reparto de daño con exactamente los dados justos para dejar al objetivo en 0** → se aplican
  todos en esa misma pulsación, sin sobrante.
- **Todos los aliados ya están a tope de escudo (3) antes de empezar** → esa prioridad de la tabla no
  aplica esa pulsación (se comporta como si no hubiera candidato, cae a la siguiente prioridad),
  igual que hoy cuando no hay ningún aliado no-KO.
- **Reroll y activar** → sin cambios.

## Notas técnicas (opcional)

- `combineAutomatonBatch` (`src/game/automaton.ts`, SPEC-013) deja de recibir `allowIndirect` fijo
  por fila; ahora escudo y recurso también permiten coste indirecto (`allowIndirect` pasa a ser
  siempre `hasNonKoAlly`, igual que en daño). `AutomatonAction` gana `costReceiverIndex` también en
  `shield`/`resource` (antes solo en `attack`), con el mismo significado que ya tiene ahí.
- **`AutomatonAction` NO cambia de forma para el reparto**: sigue siendo `dieIndices: number[]` +
  `targetIndex: number` (+ `costReceiverIndex` donde aplique) — una sola tanda a un solo objetivo por
  acción, como en SPEC-013. Lo que cambia es **cómo se elige `targetIndex` y qué dados entran en
  `dieIndices`** en las filas de daño/escudo:
  1. Construir la lista de candidatos vivos (daño: todo no-KO del jugador; escudo: todo no-KO propio
     **con hueco**, es decir `shields[i] < MAX_SHIELDS`), ordenada de menor a mayor vida restante
     (mismo desempate determinista existente).
  2. Para cada candidato, en ese orden: tomar el batch ya calculado por `combineAutomatonBatch`
     (orden de mayor a menor valor, ya filtrado por coste de recurso pagable) y quedarse con el
     **prefijo** de esa lista que, sumado, no supere el margen del candidato (vida restante para
     daño; `MAX_SHIELDS - shields[i]` para escudo) — recorriendo en orden e incluyendo cada dado
     mientras siga sin pasarse (mismo patrón "saltar y seguir probando" que ya usa el coste de
     recurso). Si el resultado tiene al menos un dado **base**, ese candidato y ese subconjunto son
     la acción de esta pulsación; parar aquí.
  3. Si ningún candidato acepta ni un solo dado base sin pasarse, usar el **primer candidato** de la
     lista (el más débil/con más prioridad) con el batch **completo sin recortar** (overkill
     aceptado, inevitable).
  4. Si la lista de candidatos está vacía (escudo: nadie tiene hueco; daño: no debería pasar, el
     jugador entero KO ya termina la partida), esa fila de la tabla no aplica esta pulsación.
- El coste indirecto (`indirectCost`) y su receptor (`indirectCostReceiverIndex`, ya existente) se
  calculan sobre el **subconjunto elegido** en el paso 2/3 (no sobre el batch completo), igual que ya
  hace SPEC-013 con su único subconjunto.
- Nada cambia en `resolvePlayerBatch` ni en `enemyTurn` más allá de: (a) pasar el `targetIndex`/
  `dieIndices`/`costReceiverIndex` ya recortados que devuelva `nextAutomatonAction`, y (b) que
  `shield`/`resource` ahora también puedan traer `costReceiverIndex` no nulo.
- El mensaje de `lastEnemyAction` no necesita cambios de formato (sigue describiendo una tanda a un
  objetivo, como ya hace).

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña/mediana: toca solo `src/game/automaton.ts` (elegir candidato + recortar el batch existente,
sin tocar la forma de `AutomatonAction` salvo añadir `costReceiverIndex` a escudo/recurso) y un ajuste
mínimo en `src/store/gameStore.ts` (`enemyTurn` ya sabe pasar `costReceiverIndex` a
`resolvePlayerBatch`, solo hace falta hacerlo también para `shield`/`resource`). Muy por debajo de
~300 líneas.

## Resultado del playtest

(pendiente)

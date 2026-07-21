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
escudo) a un **único** objetivo; con esta spec reparte los dados de la tanda entre varios objetivos
cuando conviene, sin *overkill* en daño ni pasarse del tope de 3 en escudo — igual que ya puede hacer
el jugador desde SPEC-011.

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

### Multi-objetivo en daño

- [ ] El enemigo tiene dados de daño suficientes para dejar en 0 al objetivo de menos vida **y**
      sobran dados → el sobrante se dirige al **siguiente** jugador de menos vida (no al mismo,
      no se pierde).
- [ ] Ningún dado se aplica de forma que dejaría al objetivo actual con vida negativa **si existe
      una alternativa**: el reparto evita el *overkill* siempre que se pueda repartir sin dividir un
      dado.
- [ ] Si el dado de mayor valor de la tanda por sí solo ya supera la vida del último objetivo
      disponible (no hay forma de evitar el *overkill*), se aplica igual ahí — un dado no se divide.
- [ ] Con un solo objetivo vivo, el comportamiento es idéntico al de SPEC-013 (toda la tanda a ese
      objetivo).

### Multi-objetivo en escudo

- [ ] El enemigo tiene dados de escudo suficientes para llevar a un aliado a 3 escudos **y** sobran
      dados → el sobrante se dirige al **siguiente** aliado que más lo necesite (menos vida, mismo
      desempate que hoy), sin superar su tope de 3.
- [ ] Con un solo aliado vivo, o con dados que no llegan a completar el tope de ninguno, el
      comportamiento es idéntico al de SPEC-007/013 (todo a un único aliado).

## Fuera de alcance (explícito)

- **Selector de dificultad en la UI**: sigue en BACKLOG.
- **Focus, especial, disrupt, descarte**: siguen sin resolverse (ni el jugador los tiene aún, v3/v4).
- Optimizar el reparto para maximizar algo más allá de "sin overkill / sin pasar del tope": no se
  busca la combinación óptima entre todos los repartos posibles, solo el algoritmo determinista
  descrito en Notas técnicas (recorrer objetivos de menos a más vida, llenar y pasar al siguiente).
- Cambiar el criterio de qué objetivo recibe la tanda en **recurso** (no tiene objetivo, no aplica
  multi-objetivo ahí; solo puede llevar coste indirecto).

## Casos límite

- **Coste indirecto en escudo/recurso con todos los aliados propios KO** → igual que en daño
  (SPEC-013): el dado con ese coste se excluye de la tanda (no se resuelve esa parte), el resto de
  la tanda (si queda algo pagable/combinable) sigue su curso normal.
- **Reparto de daño con exactamente los dados justos para dejar a todos los objetivos en 0** → se
  reparten sin sobrante ni overkill.
- **Todos los objetivos ya están a tope de escudo (3) antes de empezar** → esa tanda de escudo no
  tendría a quién repartir más; se comporta como si no hubiera candidato (cae a la siguiente
  prioridad), igual que hoy cuando no hay ningún aliado no-KO.
- **Reroll y activar** → sin cambios.

## Notas técnicas (opcional)

- `combineAutomatonBatch` (`src/game/automaton.ts`, SPEC-013) deja de recibir `allowIndirect` fijo
  por fila; ahora escudo y recurso también permiten coste indirecto (`allowIndirect` pasa a ser
  siempre `hasNonKoAlly`, igual que en daño).
- Nueva función de reparto (p. ej. `splitAssignments(dieIndices, pool, targets)`): dado el orden ya
  establecido de la tanda (mayor a menor valor) y una lista de objetivos ordenada de menor a mayor
  vida restante (mismo desempate determinista existente), recorre los dados asignándolos al objetivo
  actual mientras no lo pase de 0 (daño) o de `MAX_SHIELDS` (escudo); en cuanto un dado no cabe sin
  pasarse, avanza al siguiente objetivo y sigue intentando con ese dado y los restantes. Si un dado
  no cabe en **ningún** objetivo restante sin pasarse, se aplica al último objetivo disponible
  (overkill inevitable, no se descarta el dado).
- `AutomatonAction` (SPEC-013) cambia `targetIndex: number` por una lista de asignaciones para
  `attack`/`shield` (p. ej. `assignments: { targetIndex: number; dieIndices: number[] }[]`);
  `costReceiverIndex` sigue siendo uno solo para toda la tanda (el coste indirecto no depende de a
  cuántos objetivos se reparta el efecto). `enemyTurn` (`src/store/gameStore.ts`) pasa a llamar
  `resolvePlayerBatch` **una vez por asignación** (cada una con su propio `marked`/`effectIndex`),
  reutilizando la función tal cual, y solo pasa `costReceiverIndex` en la **primera** llamada (o en
  la única tanda que lleve el coste; el coste se paga una vez, no por asignación).
- El mensaje de `lastEnemyAction` debe reflejar varios objetivos si aplica (p. ej. listar cada
  personaje afectado), sin necesidad de un formato elaborado.

## Nota de tamaño (regla 4 CLAUDE.md)

Mediana: toca `src/game/automaton.ts` (nueva función de reparto, `AutomatonAction` cambia de forma
otra vez) y `src/store/gameStore.ts` (`enemyTurn` resolviendo varias asignaciones). Sin UI nueva. Si
al implementar se nota que el reparto de escudo complica demasiado, avisar y valorar dejarlo para un
spec aparte (mantener solo el de daño en esta).

## Resultado del playtest

(pendiente)

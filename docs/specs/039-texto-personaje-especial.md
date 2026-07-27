# SPEC-039: Texto de personaje — Especial real para Luminara Unduli, Zuckuss y Darth Vader

**Estado:** Pendiente
**Sección del GDD:** §5 nota "Focus, reroll y especial" (SPEC-023); primera pieza de "texto de
cartas" (v4, ver roadmap)
**Depende de:** SPEC-023 (símbolo Especial, hoy placeholder), SPEC-010/013/014 (resolución de tandas
jugador/autómata), SPEC-034/036/038 (ficha de carta en la DB)

## Qué es (2-4 líneas)

La cara **Especial** deja de ser siempre un placeholder: para los **tres personajes que ya la traen**
en los mazos precargados (Luminara Unduli, Zuckuss, Darth Vader) se resuelve con su **efecto real de
texto**, tanto si los controla el jugador como el autómata. Cualquier otro personaje con Especial
(no cubierto) sigue mostrando el aviso genérico de siempre. De paso, el texto de las cartas se
muestra legible en la ficha de la DB (sin las etiquetas `[special]`/`<i>`/`<b>` en crudo).

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Interacción: marcar un Especial dispara su propio flujo

- [ ] A diferencia del resto de símbolos (que se marcan varios y se resuelven con un botón común),
      **marcar un dado de Especial concreto dispara de inmediato el flujo propio de su dueño**: el
      selector de dado (Luminara), el selector de personaje (Vader) o la resolución directa sin
      elección (Zuckuss). No se pueden marcar Especiales de **dueños distintos** a la vez en el mismo
      modo de resolución.
- [ ] **Excepción deliberada a "una acción por turno" (SPEC-025), solo para Especial**: si en el pool
      quedan **más dados de Especial sin resolver** después de resolver uno (del mismo dueño u otro),
      el turno **no cambia** — se puede seguir marcando y resolviendo Especiales, uno tras otro, sin
      pasar al bando contrario. En cuanto se hace **cualquier otra acción** (daño, escudo, activar,
      pasar, jugar una carta...) el turno se cierra con total normalidad, igual que hoy; la excepción
      es únicamente "resolver un Especial", no un modo general de acciones libres.

### Luminara Unduli — "Resuelve uno de tus dados, +2 (+3 si no es único)"

- [ ] Al marcar el Especial de Luminara (jugador o autómata la controla), se puede elegir
      **cualquier dado propio ya tirado y sin resolver** (de cualquier personaje, mejora o apoyo del
      mismo bando, incluida ella misma) **que tenga un valor numérico asociado** (daño, escudo,
      recurso, focus, reroll, disrupt, descarte) — **no** otro Especial ni una cara en blanco `-`.
- [ ] Al elegir el dado objetivo, se resuelve **en el mismo momento** con su valor **+2**, o **+3**
      si el personaje dueño de ese dado es de tipo no-único (`is_unique: false`); ambos dados (el
      Especial de Luminara y el dado objetivo) se consumen juntos como una sola acción.
- [ ] Si Luminara no tiene ningún dado propio elegible (todos resueltos, o solo quedan Especiales/
      blancos), su Especial no tiene objetivo válido: se resuelve sin efecto (mismo aviso que hoy:
      "no hay dado válido", sin romper).

### Zuckuss — "Gana 1 recurso" (versión simplificada, sin bounty)

- [ ] Al marcar el Especial de Zuckuss, se resuelve **de inmediato sin elección**: el bando que lo
      controla **gana 1 recurso** (equivalente a un `1R` normal). La rama de texto real ligada a la
      keyword **bounty** no se implementa (no existen cartas bounty en el juego); queda anotada en
      BACKLOG para cuando existan.

### Darth Vader — "3 de daño a un personaje, luego 1 a Vader"

- [ ] Al marcar el Especial de Vader, se elige un **personaje objetivo** (propio o rival,
      cualquiera, como dice el texto real) y recibe **3 de daño** (mismo reparto de escudo/vida que
      el daño normal). Inmediatamente después, **Vader recibe 1 de daño** (a él mismo, sin poder
      evitarlo ni elegir otro receptor).
- [ ] Si el daño de 3 o el de 1 dejan a algún personaje (incluido Vader) a 0 de vida, se resuelve el
      KO igual que cualquier otro daño (SPEC-003 y siguientes).

### Autómata

- [ ] Si el autómata controla a Luminara/Zuckuss/Vader, su Especial se resuelve con el mismo efecto
      real (no el placeholder), en el lugar que ya ocupa "especial" en su tabla de prioridades
      (SPEC-023): Luminara elige el dado propio sin resolver de mayor valor numérico entre los
      elegibles; Zuckuss gana 1 recurso; Vader ataca al personaje rival de menor vida (o propio si
      no hay rival vivo, siguiendo el mismo criterio que el resto de daño automático) y se
      autoinflige 1 después.
- [ ] **El autómata resuelve UN dado de Especial de UN dueño por acción**, nunca varios dueños
      combinados en el mismo lote (aunque su pool tenga Especiales de más de un personaje a la vez).
      No hace falta un orden determinista entre dueños distintos: basta con que cada acción de
      Especial del autómata se quede con un único dueño (p. ej. el primero que encuentre recorriendo
      su pool); el resto de Especiales pendientes se resuelven en tandas/acciones futuras, igual que
      el resto de su tabla de prioridades ya deja trabajo pendiente para después.

### Aviso para personajes no cubiertos

- [ ] Cualquier Especial de un personaje **distinto** de estos tres sigue mostrando el aviso ya
      existente ("Habilidad especial de la carta, pendiente de implementar") sin efecto real, igual
      que hoy.

### Texto legible en la ficha DB

- [ ] En la ficha de una carta (sección DB, pestaña Cartas), el campo de texto ya no muestra las
      etiquetas en crudo: los tokens entre corchetes que sí aparecen en el snapshot real (`[special]`,
      `[melee]`, `[ranged]`, `[indirect]`, `[shield]`, `[resource]`, `[discard]`, `[disrupt]`,
      `[focus]`, `[blank]`) se sustituyen por una palabra/etiqueta legible; `<i>...</i>`, `<b>...</b>`
      **y `<em>...</em>`** se muestran en cursiva/negrita en vez de con las etiquetas literales (las
      tres aparecen mezcladas en textos reales del snapshot, confirmado).
- [ ] Un token entre corchetes **no reconocido** (keyword rara que no está en la tabla) se deja tal
      cual entre corchetes, sin romper el resto del texto.

## Fuera de alcance (explícito)

- **Cualquier otro personaje o keyword de texto** (Sentinel, Legacy, Redeploy, bounty, etc.): no
  entra en esta spec; solo estos 3 personajes concretos. Añadir más es una spec futura numerada.
- **Cartas bounty**: no existen en el juego; la rama de Zuckuss que las usa queda fuera (ver arriba).
- **Motor de keywords genérico** (parser de texto arbitrario → efecto): no se construye; cada efecto
  es código propio por `code` de personaje (una tabla de dispatch, no un intérprete).
- **Mejoras/apoyos con texto** (no personajes): fuera; esta spec es solo Especial de personaje.
- **Deshacer** la elección de objetivo de Luminara/Vader una vez resuelta: no.

## Casos límite

- **Luminara y Vader tiran Especial en la misma activación**: no se combinan; se resuelven de uno en
  uno marcando cada dado por separado (ver "Interacción" arriba), sin cambiar de turno entre ambos.
- **Vader elige a sí mismo como objetivo del 3 de daño** (el texto real "a character" lo permite, no
  se restringe): recibe 3 + 1 (el fijo) = **4 de daño en la misma resolución**; se procesa igual que
  cualquier otro objetivo (el 3 primero, reparto de escudo/vida normal; el 1 fijo después, sobre lo
  que quede).
- **Luminara sube el valor de un dado de recurso/daño que ya tiene coste**: el coste (recurso o
  indirecto propio) de ese dado se sigue pagando igual; el +2/+3 solo afecta al valor de daño/
  escudo/recurso/focus/reroll, no al coste.
- **Luminara elige subir el valor de un dado de Disrupt/Descarte**: válido (tienen valor numérico);
  el efecto de disrupt/descarte se resuelve con el valor aumentado.
- **Vader se inflige el 1 de daño a sí mismo estando ya en su última vida** (el 3 de daño a otro no
  lo afecta a él): quedaría a 0 y se resuelve su propio KO con normalidad.
- **Zuckuss sin recursos machacando el tope**: no hay tope de recursos (SDD); gana 1 con normalidad.
- **El autómata controla a Luminara sin ningún dado propio elegible**: mismo caso límite que el
  jugador — su Especial no tiene objetivo, se resuelve sin efecto, sigue con el resto de su tabla de
  prioridades (no se cuelga).
- **El autómata controla dos de estos personajes a la vez** (posible con mazos de comunidad) y su
  pool tiene Especiales de ambos en el mismo momento: cada acción de Especial del autómata resuelve
  **un solo dueño** (cualquiera, sin orden fijo entre ellos); el otro queda pendiente para una
  acción futura, igual que el resto de su tabla de prioridades ya deja trabajo para después.

## Notas técnicas (opcional)

- **Dispatch por código**: tabla `Record<string, (ctx) => Efecto>` (o similar) en un módulo nuevo
  (p. ej. `src/game/characterAbilities.ts`) keyed por `code` de personaje (`02036` Luminara, `11041`
  Zuckuss, `02010` Vader); `resolveSpecial` (jugador, `gameStore.ts`) y la rama `special` del
  autómata (`automaton.ts`) consultan esta tabla por el `code` de la carta dueña del dado Especial
  marcado; si no hay entrada, cae al aviso placeholder actual (sin tocar ese camino).
- **"Dado propio con valor numérico"**: usar `parsePlayerFace(face)` (`damage.ts`) — cualquier
  resultado no nulo con `symbol !== 'special'` cuenta (ya incluye daño/escudo/recurso/focus/reroll/
  disrupt/descarte con su `amount`); una cara `-` da `parsePlayerFace` nulo, se excluye igual que un
  Especial.
- **No-único vs. único**: usar `is_unique` de la carta dueña del dado objetivo (mismo campo que
  `characterPoints`/elite en SPEC-037), no del propio personaje que tira el Especial.
- **`selectDie` debe impedir marcar un segundo Especial de dueño distinto** mientras el flujo de
  Luminara/Vader sigue abierto esperando su objetivo: hoy el guard de esa función solo compara
  `side`+`symbol` (ambos `'special'` pasarían) — hace falta comparar también el `code` del dado ya
  marcado contra el del nuevo, y bloquear si difieren (mismo patrón que ya usa para no mezclar
  bando/símbolo distintos).
- **Excepción de turno acotada a Especial**: `afterApply` (y el resto de sitios que hacen
  `turn: opposite(side)` tras una resolución) deben comprobar si, tras resolver un Especial, el
  pool del bando que acaba de actuar **todavía tiene otro dado de Especial sin resolver**; si es
  así, el turno se queda en el mismo bando (no se llama a `opposite`); en cualquier otra resolución
  (daño, escudo, foco, etc.) el turno cambia exactamente igual que hoy, sin tocar ese camino.
- **Autómata — dividir el lote de Especial por dueño**: `combineAutomatonBatch(enemy.pool,
  isSpecialSymbol, ...)` (`automaton.ts`) hoy agrupa **todos** los índices de Especial del pool en un
  único lote, sin distinguir dueño; para esta spec hace falta que la rama `'special'` de la tabla de
  prioridades agrupe esos índices **por `code`** primero y opere sobre un solo grupo (el primero que
  encuentre) cada vez, dejando el resto del pool intacto para una acción futura — igual que ya pasa
  con el resto de acciones que no agotan todo el trabajo pendiente en una sola pulsación.
- **Texto real de Luminara es más estricto** ("one of your character dice": solo dados de personaje);
  esta spec lo amplía deliberadamente a dados de mejora/apoyo también (decisión del usuario). Dejar
  un comentario en el código señalándolo, para que no se lea como error de transcripción del texto
  real.
- **Vader — daño propio y objetivo propio/rival**: reutilizar el motor de resolución existente
  (`resolvePlayerBatch`/lo que ya reparte daño) para el 3 de daño con selección de objetivo libre
  (propio o rival); el 1 de daño a Vader es un segundo paso fijo (receptor = el propio Vader, sin
  elección), encadenado tras confirmar el primero.
- **Autómata — elección de objetivo de Vader/Luminara**: seguir el mismo criterio ya usado por el
  resto de la tabla de prioridades del autómata (SPEC-013/014/015): daño al personaje rival vivo de
  menor vida; Luminara boostea el dado propio sin resolver de mayor valor entre los elegibles (mejor
  jugada disponible, mismo espíritu que el resto de heurística fija del autómata, sin evaluación de
  jugadas más allá de eso).
- **Texto legible (ficha DB)**: único punto a tocar hoy es `src/components/DbSection.tsx` (donde se
  imprime `selected.text` en crudo). Pequeña función de formateo (en el mismo archivo o módulo
  aparte) que (a) reemplaza los tokens `[special]`, `[melee]`, `[ranged]`, `[indirect]`, `[shield]`,
  `[resource]`, `[discard]`, `[disrupt]`, `[focus]`, `[blank]` (confirmados contra
  `src/data/cards.json`) por una tabla fija de etiquetas legibles, dejando cualquier otro token entre
  corchetes tal cual; (b) convierte `<i>…</i>`, `<b>…</b>` **y `<em>…</em>`** en elementos React
  (`<em>`/`<strong>`) en vez de imprimir las etiquetas — las tres aparecen mezcladas en textos reales
  del snapshot. No es un renderer HTML genérico (nada de `dangerouslySetInnerHTML`): parseo manual
  acotado a estos patrones conocidos.
- Sin cambios en el pipeline de import, en las reglas de construcción, ni en otros símbolos de dado.

## Nota de tamaño (regla 4 CLAUDE.md)

Media-grande, en el límite: tres efectos de personaje distintos (cada uno con su propia lógica de
selección de objetivo) + su versión automática + un formateador de texto de ficha. Si al implementar
se dispara, priorizar dejar **Luminara + Vader + el aviso placeholder ya existente** en SPEC-039 y
mover **Zuckuss** y/o **el formateo de texto en la ficha DB** a SPEC-040, avisando antes (no
subdividir con sufijos).

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

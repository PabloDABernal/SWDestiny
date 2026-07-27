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

### Luminara Unduli — "Resuelve uno de tus dados, +2 (+3 si no es único)"

- [ ] Al marcar y resolver el Especial de Luminara (jugador o autómata la controla), se puede elegir
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

- [ ] Al marcar y resolver el Especial de Zuckuss, el bando que lo controla **gana 1 recurso**
      (equivalente a un `1R` normal). La rama de texto real ligada a la keyword **bounty** no se
      implementa (no existen cartas bounty en el juego); queda anotada en BACKLOG para cuando
      existan.

### Darth Vader — "3 de daño a un personaje, luego 1 a Vader"

- [ ] Al marcar y resolver el Especial de Vader, se elige un **personaje objetivo** (propio o rival,
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

### Aviso para personajes no cubiertos

- [ ] Cualquier Especial de un personaje **distinto** de estos tres sigue mostrando el aviso ya
      existente ("Habilidad especial de la carta, pendiente de implementar") sin efecto real, igual
      que hoy.

### Texto legible en la ficha DB

- [ ] En la ficha de una carta (sección DB, pestaña Cartas), el campo de texto ya no muestra las
      etiquetas en crudo: `[special]`, `[force]` (u otro token entre corchetes reconocido) se
      sustituyen por una palabra/etiqueta legible; `<i>...</i>` y `<b>...</b>` se muestran en
      cursiva/negrita en vez de con las etiquetas literales.
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

- **Varios Especiales marcados a la vez** (p. ej. Luminara y Vader tiran Especial en la misma
  activación): se resuelven **uno a uno** dentro de la misma acción/turno (mismo patrón ya usado por
  el reparto multi-objetivo de daño/escudo, SPEC-011): cada clic resuelve un Especial concreto con su
  propio efecto/objetivo; el turno no cambia hasta que no queda ningún Especial marcado sin resolver
  (o el jugador cancela/pasa). No se combinan ni se suman entre sí.
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
- **Vader — daño propio y objetivo propio/rival**: reutilizar el motor de resolución existente
  (`resolvePlayerBatch`/lo que ya reparte daño) para el 3 de daño con selección de objetivo libre
  (propio o rival); el 1 de daño a Vader es un segundo paso fijo (receptor = el propio Vader, sin
  elección), encadenado tras confirmar el primero.
- **Autómata — elección de objetivo de Vader/Luminara**: seguir el mismo criterio ya usado por el
  resto de la tabla de prioridades del autómata (SPEC-013/014/015): daño al personaje rival vivo de
  menor vida; Luminara boostea el dado propio sin resolver de mayor valor entre los elegibles (mejor
  jugada disponible, mismo espíritu que el resto de heurística fija del autómata, sin evaluación de
  jugadas más allá de eso).
- **Texto legible (ficha DB)**: pequeña función de formateo en `DbSection.tsx` (o módulo aparte) que
  (a) reemplaza tokens `[token]` reconocidos por una tabla fija (al menos `special`→"Especial",
  `force`→"Fuerza"; ampliar según se encuentren jugando) y deja los no reconocidos tal cual entre
  corchetes; (b) convierte `<i>…</i>`/`<b>…</b>` en elementos React (`<em>`/`<strong>`) en vez de
  imprimir las etiquetas. No es un renderer HTML genérico (nada de `dangerouslySetInnerHTML`): parseo
  manual acotado a estos patrones conocidos.
- Sin cambios en el pipeline de import, en las reglas de construcción, ni en otros símbolos de dado.

## Nota de tamaño (regla 4 CLAUDE.md)

Media-grande, en el límite: tres efectos de personaje distintos (cada uno con su propia lógica de
selección de objetivo) + su versión automática + un formateador de texto de ficha. Si al implementar
se dispara, priorizar dejar **Luminara + Vader + el aviso placeholder ya existente** en SPEC-039 y
mover **Zuckuss** y/o **el formateo de texto en la ficha DB** a SPEC-040, avisando antes (no
subdividir con sufijos).

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

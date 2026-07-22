# SPEC-020: Jugar mejoras vanilla desde la mano

**Estado:** Pendiente
**Sección del GDD:** v4 — cartas jugables por capas, primera capa: "mejoras/apoyos vanilla"
(sección 5, línea 155-156). Esta spec cubre solo **mejoras** (upgrades); apoyos quedan para una
spec posterior.
**Depende de:** SPEC-018 (mano de cartas), SPEC-019 (robo por ronda)

## Qué es (2-4 líneas)

El jugador puede jugar una carta de **mejora** (upgrade) desde su mano sobre uno de sus personajes
no-KO, pagando el coste de recursos impreso en la carta. La mejora pasa de la mano a estar "en
juego", ligada a ese personaje: a partir de ahí, sus dados se activan y tiran junto con los del
personaje (mismo botón "Activar"). Es "vanilla": la carta no tiene ningún texto ni efecto propio
más allá de sus dados — no hay keywords todavía (eso es la siguiente capa de v4). Solo el jugador
juega cartas en esta spec; el autómata sigue sin poder hacerlo (v5, GDD).

## Criterios de aceptación

- En la mano del jugador, una carta de mejora se puede seleccionar y jugar sobre uno de sus
  personajes no-KO, pagando su coste impreso; tras jugarla, desaparece de la mano y se ve "en
  juego" junto a ese personaje (p. ej. su nombre listado en la ficha del personaje).
- Si el jugador no tiene recursos suficientes para el coste, no puede jugar la carta (mensaje de
  aviso, igual que "Recursos insuficientes" al resolver un coste de cara de dado).
- Al pulsar "Activar" sobre un personaje con una mejora en juego, se tiran también los dados de esa
  mejora (además de los del propio personaje) y se añaden al pool del bando con el resto.
- Los dados de una mejora en juego se resuelven exactamente igual que los de un personaje (mismo
  símbolo, mismo motor de resolución/coste): no hay ninguna diferencia de comportamiento.
- Si el personaje al que está ligada una mejora queda KO, la mejora sale de juego junto con él (se
  descarta): sus dados dejan de estar disponibles, y ya no se muestra como "en juego".
- Una carta de la mano que no sea de tipo mejora (evento, apoyo, etc.) no se puede jugar en esta
  spec: no aparece ninguna opción de jugarla (sigue en mano, solo visible).

## Fuera de alcance (explícito)

- Apoyos (supports): quedan para una spec posterior (mismo GDD v4, siguiente pieza).
- Cualquier texto o keyword de carta (focus, reroll, especial, Ambush, etc.): eso es la siguiente
  capa de v4 tras esta y la de apoyos.
- El autómata jugando cartas: v5 (GDD), no esta spec.
- Descartar una mejora manualmente sin que su personaje esté KO, o mover una mejora de un personaje
  a otro.
- Límite de cuántas mejoras puede tener un mismo personaje en juego a la vez, o restricciones de
  "slot" de la regla RR (p. ej. una mejora de tipo arma por personaje): sin límite en esta spec.
- Pila de descarte visible/consultable: cuando una mejora se descarta (por KO de su personaje), 
  simplemente deja de estar en juego; no hay UI de pila de descarte todavía.
- Jugar una mejora sobre un personaje enemigo, o sobre un personaje ya KO.

## Casos límite

- Intentar jugar una mejora sin recursos suficientes → no se resuelve, aviso de recursos
  insuficientes, la carta sigue en la mano.
- Personaje objetivo ya activado esta ronda: jugar una mejora sobre él es válido igual (jugar la
  carta no depende de si el personaje está activado); sus dados se tirarán en la próxima activación
  (siguiente ronda) o si aún no se ha activado esta ronda, al activarlo.
- Personaje con dos o más mejoras en juego: todas se activan/tiran juntas al activar el personaje.
- Personaje con mejora(s) en juego pasa a KO por daño del enemigo (no solo por deck-out ni por
  acción propia): las mejoras se descartan igual, en el mismo momento en que el personaje queda KO.
- "Reset total": las mejoras en juego se descartan (vuelven a estar disponibles solo si estaban en
  la mano o el mazo antes de jugarlas — pero SPEC-009 reconstruye personajes desde cero, así que no
  hay "mano"/"mazo" que restaurar con el estado exacto anterior; a definir en implementación cómo
  encaja esto con `resetAll`, ver Notas técnicas).
- Recarga de página con una mejora en juego: debe persistir igual que el resto del estado de mazo
  (`drawPile`/`hand`), no solo el estado de partida no persistido.

## Notas técnicas (opcional)

- Esto es un cambio de **arquitectura**, no solo de spec (regla de CLAUDE.md: "ningún cambio de
  arquitectura se implementa si no está en `docs/SDD.md`"). Antes de implementar hay que decidir y
  documentar en el SDD, como mínimo:
  - Cómo se representa una "mejora en juego" en el estado (`SideState`): ¿un array paralelo a
    `characters` con las mejoras ligadas a cada índice, o una estructura nueva con su propia
    persistencia (igual que `drawPile`/`hand`, SPEC-016/018)?
  - Cómo se extiende `PooledDie`/`rollCharacter` (`src/game/roll.ts`) para que activar un personaje
    también tire los dados de sus mejoras — hoy `PooledDie.characterIndex` asume que todo dado
    pertenece a un personaje del array `characters`; una mejora no es un personaje.
  - `ArhCard` (`src/model/types.ts`) no tiene campo de coste de carta hoy (solo `sides` para las
    caras de dado); hay que confirmar contra la API real el nombre del campo de coste impreso de
    una carta (probablemente `cost`) y añadirlo al modelo.
- El coste de jugar una mejora es un coste **de carta** (recursos, pagado una vez al jugarla), no el
  coste de cara de dado (SPEC-008b) que ya existe — son dos mecanismos de coste distintos que
  conviven; no confundirlos en la implementación.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

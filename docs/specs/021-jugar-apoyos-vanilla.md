# SPEC-021: Jugar apoyos vanilla desde la mano

**Estado:** Pendiente
**Sección del GDD:** v4 — cartas jugables por capas, primera capa: "mejoras/apoyos vanilla"
(sección 5, línea 155-156). Segunda pieza de esa capa; SPEC-020 cubrió mejoras, esta cubre
**apoyos** (supports).
**Depende de:** SPEC-020 (jugar mejoras vanilla)

## Qué es (2-4 líneas)

El jugador puede jugar una carta de **apoyo** (support) desde su mano, pagando su coste de carta
impreso. A diferencia de una mejora, un apoyo **no** va ligado a ningún personaje: entra en juego
como una entidad propia del bando, con su propio botón **"Activar"** (igual que un personaje) que
tira su dado y lo añade al pool. Es "vanilla": sin texto ni keywords todavía. Solo el jugador juega
cartas en esta spec; el autómata sigue sin poder hacerlo (v5, GDD).

## Criterios de aceptación

- En la mano del jugador, una carta de apoyo se puede seleccionar y jugar (sin elegir objetivo,
  a diferencia de una mejora), pagando su coste impreso; tras jugarla, desaparece de la mano y
  aparece en una lista de "apoyos en juego" del bando, con su propio botón "Activar".
- Si el jugador no tiene recursos suficientes para el coste, no puede jugar la carta (mismo aviso
  que con mejoras/costes de cara de dado).
- Pulsar "Activar" sobre un apoyo en juego tira su dado y lo añade al pool del bando, igual que
  activar un personaje; una vez activado en la ronda, el botón queda deshabilitado hasta la
  siguiente "Nueva ronda".
- El dado de un apoyo se resuelve exactamente igual que cualquier otro dado del pool (mismo
  símbolo, mismo motor de resolución/coste): no hay ninguna diferencia de comportamiento.
- "Nueva ronda" resetea la activación de los apoyos en juego (vuelven a estar activables), igual
  que ya hace con los personajes.
- "Reset total" devuelve los apoyos en juego al mazo de robo del bando, rebarajados junto con
  `drawPile`/`hand`/mejoras en juego (mismo patrón que SPEC-020), y la lista de apoyos en juego
  queda vacía.
- Una carta de la mano que no sea de tipo apoyo (mejora, evento, etc.) sigue jugándose o no según
  las reglas ya existentes (mejoras) o sigue sin poder jugarse (el resto, fuera de alcance).

## Fuera de alcance (explícito)

- Cualquier texto o keyword de carta: siguiente capa de v4, tras mejoras y apoyos vanilla.
- El autómata jugando cartas: v5 (GDD), no esta spec.
- Destruir, dañar o descartar un apoyo salvo con "Reset total": sin keywords ni ataques dirigidos a
  apoyos en esta spec, se queda en juego indefinidamente hasta entonces.
- Límite de cuántos apoyos puede tener un bando en juego a la vez: sin límite en esta spec.
- Mover o intercambiar apoyos entre bandos, o jugar un apoyo "para" el enemigo.

## Casos límite

- Intentar jugar un apoyo sin recursos suficientes → no se resuelve, aviso de recursos
  insuficientes, la carta sigue en la mano.
- Activar un apoyo ya activado esta ronda → botón deshabilitado, sin efecto.
- Varios apoyos en juego a la vez: cada uno se activa por separado con su propio botón; activar
  uno no afecta a los demás.
- Jugar un apoyo mientras hay una resolución de coste indirecto pendiente
  (`resolve.pendingEffect`, SPEC-010) o mientras se está eligiendo objetivo para una mejora
  (`playUpgrade`, SPEC-020): bloqueado, mismo criterio de exclusión mutua que ya aplica entre esos
  dos modos.
- Coste de carta en 0 (o sin campo `cost`): se juega gratis, igual que con mejoras (SPEC-020).
- "Reset total" con apoyos en juego (activados o no): todos vuelven al mazo, rebarajados; el
  estado de activación no importa, se descarta junto con el resto.
- Recarga de página con apoyos en juego: deben persistir igual que el resto del estado de mazo
  (`drawPile`/`hand`/mejoras), incluido si estaban activados o no esta ronda.
- Caché de la lista de apoyos en juego corrupta o con forma inesperada al cargar: se descarta y
  arranca vacía, mismo patrón que ya cubren `drawPile`/`hand`/mejoras (SPEC-016/018/020).

## Notas técnicas (opcional)

- Extiende el mismo patrón de "cartas en juego" que introdujo SPEC-020 (ya documentado en el SDD),
  pero como una lista **por bando**, no paralela a `characters`: `SideState.supports:
  { code: string; activated: boolean }[]`, persistida igual que `upgrades` (SPEC-020).
- `PooledDie.characterIndex` no tiene sentido para un dado de apoyo (no hay personaje anfitrión).
  Como ningún camino de esta spec necesita filtrar el pool por apoyo al "KO" (los apoyos no se
  destruyen aquí, ver Fuera de alcance), basta con un valor centinela que nunca coincida con un
  índice real de personaje (p. ej. `-1`) para reutilizar `rollUpgradeDie`
  (`src/game/roll.ts`) sin más cambios; no hace falta un nuevo tipo de `PooledDie` en esta spec.
- Nueva UI: una lista de "apoyos en juego" por bando (fuera de la rejilla de personajes,
  `roster__grid`), cada uno con nombre, sus caras de dado y un botón "Activar"/"Activado" — visual
  y funcionalmente parecido a `CharacterCard`, pero sin vida/escudos/KO.
- `newRound()` (`src/store/gameStore.ts`) resetea `activated` de cada apoyo en juego, igual que ya
  hace con `activated` de personajes.
- El coste de jugar un apoyo reutiliza el mismo mecanismo que las mejoras (SPEC-020): coste de
  carta impreso (`ArhCard.cost`), pagado una vez al jugarla, distinto del coste de cara de dado
  (SPEC-008b).
- Confirmar contra la API real el `type_code` que usa ARH DB para apoyos (probablemente
  `'support'`), igual que se confirmó `'upgrade'` en SPEC-020.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

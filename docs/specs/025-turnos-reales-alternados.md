# SPEC-025: Turnos reales alternados

**Estado:** Pendiente
**Sección del GDD:** Bloque nuevo (reordenado 2026-07-23) tras SPEC-024; sustituye el estand-in de
"Nueva ronda"/"Turno enemigo" por la fase de acción real (RR pg 19-22,
`docs/reglamento/04-estructura-y-customizacion.md`).
**Depende de:** SPEC-024 (reparto inicial y mulligan), y de todo el motor de resolución existente
(SPEC-008a/008b/010/011/013/014, SPEC-023 focus/reroll/especial)

## Qué es (2-4 líneas)

La partida deja de resolverse con botones sueltos ("Nueva ronda", "Turno enemigo", "Robar",
"Descartar") y pasa a alternar turnos reales: en tu turno haces **una acción** (activar, jugar una
carta, o resolver un lote completo de dados del mismo símbolo) o pasas; el enemigo hace lo mismo
automáticamente en el suyo, sin que el jugador pulse nada. Cuando ambos bandos pasan seguido, se
dispara el mantenimiento (recursos, robo, reset de pool/activaciones — misma lógica que ya existía)
y empieza una ronda nueva, siempre con el jugador tomando el primer turno (no hay campo de batalla
que decida quién empieza).

## Criterios de aceptación

- [ ] Tras "Nueva partida" y confirmar el mulligan, es el turno del **jugador** (siempre empieza él,
  sin campo de batalla implementado).
- [ ] El jugador puede, en su turno: activar un personaje o apoyo, jugar una mejora (eligiendo
  objetivo) o un apoyo, o resolver un lote completo de dados del mismo símbolo (incluido
  multi-objetivo, Focus, Reroll de dado o coste indirecto, aunque requiera varios clics internos).
  Al completarse cualquiera de esas acciones, el turno pasa al enemigo.
- [ ] El jugador puede pulsar un botón nuevo **"Pasar"** para ceder el turno sin hacer nada.
- [ ] Cuando es el turno del enemigo, aparece un aviso ("Turno del enemigo...") y el autómata
  ejecuta automáticamente su siguiente acción de la tabla de prioridades ya existente (o pasa, si no
  tiene ninguna acción legal), sin que el jugador pulse ningún botón; hecho esto, el turno vuelve al
  jugador.
- [ ] Si el jugador pasa y a continuación el enemigo también pasa (dos pases seguidos, uno de cada
  bando), se dispara automáticamente el mantenimiento: +2 recursos, robo hasta tamaño de mano, reset
  de pool/activaciones/apoyos activados — misma lógica que ya tenía `newRound()` hoy — y empieza una
  ronda nueva con el turno otra vez para el jugador.
- [ ] Si un bando actúa (no pasa) en su turno, el contador de pases seguidos se reinicia: hacen falta
  dos pases **consecutivos** (sin ninguna acción real entre medias) para cerrar la fase.
- [ ] Los botones "Nueva ronda" y "Turno enemigo" desaparecen de la UI (ya no son necesarios: el
  mantenimiento y la acción del autómata son automáticos).
- [ ] El botón "Robar" manual y el botón "Descartar" suelto desaparecen de la UI (no son acciones de
  turno reales; el robo sigue ocurriendo únicamente dentro del mantenimiento automático, igual que
  hoy, sin ningún paso de descarte interactivo en esta spec).
- [ ] Fuera de tu turno, ninguna de tus acciones (activar, jugar carta, marcar/resolver dados) tiene
  efecto: hay que esperar a que vuelva a ser tu turno.
- [ ] Si marcas un dado (arrancas un modo de resolución, sin llegar a confirmarlo), el resto de
  acciones (activar, jugar una carta, empezar a resolver otro símbolo) quedan bloqueadas hasta que
  confirmes esa resolución (cierra tu turno) o la canceles con "Cancelar" (no gasta tu turno, vuelves
  a poder elegir cualquier acción) — mismo patrón de exclusión mutua que ya usan `playUpgrade`/
  `mulligan` para bloquear el resto de acciones.

## Fuera de alcance (explícito)

- Campo de batalla y su Claim: no implementado; el jugador siempre empieza cada ronda.
- Descarte interactivo dentro del mantenimiento (RR: "descarta lo que quieras" antes de robar): el
  mantenimiento automático de esta spec solo roba, igual que hacía `newRound()` hasta ahora. Anotado
  en BACKLOG como pieza futura, reutilizando el patrón visual del mulligan (SPEC-024).
- Acción de turno "rerollear dados descartando una carta" (RR pg 21): sigue sin implementar (ya
  estaba en BACKLOG desde SPEC-022).
- "Usar acción de carta" y "Reclamar el campo de batalla" (dos de las seis acciones del reglamento):
  no aplican todavía (no hay keywords de carta ni campo de batalla).
- Ritmo/animación de la acción automática del enemigo (p. ej. una pausa visible antes de que
  resuelva): se ejecuta de inmediato en esta spec: sin delay artificial.
- Cualquier cambio a la tabla de prioridades del autómata o a cómo decide su siguiente acción
  (`nextAutomatonAction`): se reutiliza tal cual, solo cambia CUÁNDO y CÓMO se invoca (automático,
  una vez por turno del enemigo, en vez de manual con "Turno enemigo").
- Deshacer un pase o una acción ya realizada.

## Casos límite

- Cancelar una resolución en curso sin haber resuelto nada (`cancelResolve`, o `cancelPlayUpgrade`
  sin haber jugado la carta): **no** cuenta como acción ni como pase — el turno sigue siendo del
  mismo bando, que puede elegir otra cosa (equivalente a "una acción que no hace nada cuenta como
  pasar" del reglamento, pero aquí se simplifica a que cancelar no gasta el turno en absoluto, para
  no penalizar arrepentirse a mitad de elegir).
- Resolver un lote de dados que necesita varios clics para repartir el daño/escudo entre varios
  objetivos (SPEC-011/014): el turno **no** cambia entre esos clics; solo cambia cuando el modo de
  resolución se cierra del todo (no queda ningún dado base sin resolver de ese símbolo en el pool),
  igual que ya determina `nextResolveAfterApply` hoy.
- Resolución de coste indirecto (SPEC-010, `pendingEffect`, elegir quién recibe el daño) o de Focus
  (elegir cara nueva del dado, SPEC-023): son parte de la misma acción en curso, no cierran el turno
  hasta que la resolución completa termina.
- El autómata no tiene ninguna acción legal en su turno (tabla de prioridades agotada): pasa
  automáticamente, sin ninguna acción visible más allá del aviso de turno.
- El jugador pasa, el enemigo actúa (no pasa): el contador de pases se reinicia a 0; hace falta que
  el jugador pase de nuevo Y el enemigo pase inmediatamente después para cerrar la fase.
- "Reset total": sigue reconstruyendo ambos bandos al estado inicial; el turno vuelve a
  `'player'` y el contador de pases a 0, igual que cualquier otro estado de ronda no persistido.
- Reimportar un mazo (`importDeck`) a mitad de partida: además de limpiar `playUpgrade`/`mulligan`
  (ya lo hace desde SPEC-024), también resetea `turn: 'player'` y `passStreak: 0` — mismo criterio
  que "Reset total", para no dejar un turno/contador de pases apuntando a un estado que ya no
  corresponde tras reimportar.
- Recarga de página a mitad de partida: el turno actual (`turn`) y el contador de pases **no se
  persisten** (mismo patrón que `resolve`/`playUpgrade`/`mulligan`: es estado de partida, no de
  mazo). Tras recargar, la partida vuelve a estado fresco de ronda: turno del jugador, sin pases
  acumulados — aceptado como el mismo tipo de pérdida de estado ya existente en el proyecto.
- Outcome de partida ya decidido (Victoria/Derrota): ninguna acción de turno, pase, ni el
  mantenimiento automático tienen efecto.
- Primera ronda de la partida (tras "Nueva partida" y mulligan): el turno empieza en `'player'`
  directamente, sin pases previos que contar.

## Notas técnicas (opcional)

- Nuevo estado en el store: `turn: Side` (quién puede actuar ahora) y `passStreak: number` (pases
  consecutivos sin ninguna acción real entre medias). Ninguno de los dos se persiste (mismo patrón
  que `resolve`/`playUpgrade`/`mulligan`).
- Nueva acción `pass(side)`: solo válida si `state.turn === side`; incrementa `passStreak`, cambia
  `turn` al otro bando. Si `passStreak` llega a 2, dispara el mantenimiento (misma lógica interna que
  hoy tiene `newRound()`, reutilizada como función, no como acción pública del store) y reinicia
  `turn: 'player'`, `passStreak: 0`.
- Toda acción real que hoy muta el estado de partida (`activate`, `playUpgradeOn` al completarse,
  `playSupport`, `activateSupport`, y el cierre de `resolvePlayerBatch`/`confirmFocus`/
  `confirmReroll`/`resolveResources`/`resolveSpecial` cuando el modo se cierra del todo) necesita: (a)
  guard nuevo `state.turn !== side` → no-op, y (b) al aplicarse, `turn: opposite(side)`,
  `passStreak: 0`.
- Guard nuevo `state.turn !== side` (fuera de tu turno, no-op) a añadir también en: `selectDie`
  (arrancar/seguir marcando dados), `selectUpgradeCard` (seleccionar mejora a jugar),
  `pickFocusTarget`, `chooseFocusFace`, `pickRerollTarget` (elegir dado/cara objetivo dentro de una
  resolución de Focus/Reroll en curso) — cualquier paso que construye la "una acción" de este turno,
  no solo el que la cierra. `applyDieTo`, `resolveResources`, `resolveSpecial`, `confirmFocus`,
  `confirmReroll`, `playUpgradeOn`, `cancelResolve`, `cancelPlayUpgrade` ya quedan cubiertos por el
  mismo guard al ser parte de la misma acción en curso (mismo `side` que la abrió).
- Guard adicional para bloquear "empezar otra cosa" mientras hay un `resolve` abierto sin
  `pendingEffect`/`focusFaceChoice` (dados marcados sin confirmar): `activate`, `selectUpgradeCard` y
  `playSupport` necesitan un guard nuevo `state.resolve !== null && state.resolve.side === side` →
  no-op, análogo al que ya existe hoy para `playUpgrade`/`mulligan` (decisión del usuario, 2026-07-23:
  marcar un dado bloquea el resto de acciones hasta resolver o cancelar, igual que las mejoras).
- El disparo automático de la acción del enemigo (cuando `turn === 'enemy'`) necesita un mecanismo
  fuera de una acción de usuario — no hay ningún clic que lo dispare. Opciones a valorar en
  implementación: un `useEffect` en `App.tsx` que observe `turn` y llame a una acción del store
  (p. ej. `runEnemyTurn()`, la lógica que hoy tiene `enemyTurn()`) en cuanto detecte
  `turn === 'enemy'`; o una suscripción dentro del propio store. Cuidado con no disparar dos veces en
  React StrictMode/doble render.
- `enemyTurn()` (o su reemplazo `runEnemyTurn()`) ya hace hoy exactamente "una acción de la tabla de
  prioridades por invocación" (confirmado en `src/game/automaton.ts`/`gameStore.ts`: nunca resuelve
  más de un objetivo por llamada, SPEC-013/014) — no hace falta cambiar `nextAutomatonAction`, solo
  quién y cuándo la invoca, y que ahora también cuenta como pase si no tiene acción legal (en vez de
  simplemente no hacer nada como hoy).
- Botones a eliminar: "Nueva ronda" y "Turno enemigo" (`src/App.tsx`, controls), **y también el
  segundo botón "Nueva ronda"** que hoy existe en `src/components/DicePool.tsx` (`pool__reset`,
  llama a `newRound()` directamente — fácil de pasar por alto porque no está en `App.tsx`); "Robar"
  (`hand__draw-button`, `App.tsx`) y "Descartar" (`hand__discard-button`, `Hand.tsx`). Añadir botón
  "Pasar", deshabilitado en los mismos casos en que hoy se deshabilita "Turno enemigo"
  (`state.resolve` con dados marcados, `playUpgrade`/`mulligan` abiertos) — no tiene sentido pasar
  con una acción a medio construir; hay que cancelarla primero.
- `drawCard`/`discardCard` como acciones del store pueden eliminarse o quedar sin UI que las invoque
  (a decidir en implementación cuál es más limpio; si no se llama nunca, mejor eliminarlas que dejar
  código muerto).
- Aviso de turno: nuevo mensaje visible (p. ej. "Turno del enemigo..." / "Tu turno") — reutiliza el
  patrón ya existente de `lastEnemyAction`/`app__hint`.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

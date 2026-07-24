# SPEC-029: Símbolos de dado Disrupt (quita recursos) y Descarte (descarta al azar)

**Estado:** Pendiente
**Sección del GDD:** §3 (símbolos de dado)
**Depende de:** SPEC-006/009 (recursos), SPEC-018/022 (mano y descarte real), SPEC-013 (autómata
combina modificadores/costes)

## Qué es (2-4 líneas)

Dos símbolos de dado nuevos, del reglamento real (RR pg 11-12), pendientes desde que se detectaron
jugando: **Disrupt** (cara `Dr`, el rival pierde recursos = valor, sin bajar de 0) y **Descarte**
(cara `Dc`, el rival descarta cartas al azar de su mano = valor). Ninguno de los dos tiene un
personaje como objetivo: afectan al bando rival entero. Resolubles tanto por el jugador como por el
autómata (paridad con el resto de símbolos, SPEC-013).

## Criterios de aceptación

- [ ] Una cara `Dr` (p. ej. `1Dr`) es **seleccionable** (nuevo símbolo `disrupt`); el jugador la
  marca y pulsa un botón propio "Resolver disrupt" (sin elegir objetivo, igual que recurso/especial):
  el bando rival **pierde** esa cantidad de su contador de recursos, sin bajar de 0. El bando que
  resuelve **no gana nada** a cambio (los recursos quitados simplemente desaparecen).
- [ ] Una cara `Dc` (p. ej. `1Dc`) es **seleccionable** (nuevo símbolo `discard`); el jugador la marca
  y pulsa un botón propio "Resolver descarte" (sin elegir objetivo): el bando rival descarta esa
  cantidad de cartas **al azar** de su mano (aleatoriedad real, no determinista) a su pila de
  descarte. Si su mano tiene menos cartas que el valor, descarta todas las que tenga y ya está (sin
  aviso de error).
- [ ] Cuando el **autómata** resuelve `Dr`/`Dc` contra el jugador (misma tabla de prioridades,
  combinando base+modificadores y pagando coste igual que el resto de símbolos, SPEC-013), el
  resultado se aplica igual: recursos del jugador bajan (sin bajar de 0) o su mano pierde cartas al
  azar a la pila de descarte.
- [ ] Al descartar una carta (por cualquiera de los dos bandos) con `Dc`, el aviso de "última acción"
  muestra el **nombre** de la carta descartada, aunque sea de la mano oculta del rival (se revela al
  pasar a la pila de descarte, zona pública).
- [ ] Ambos símbolos admiten modificador `+X` y coste de recurso/coste de daño indirecto propio en la
  misma cara, con las mismas reglas ya existentes (SPEC-010): un modificador solo no se resuelve.

## Fuera de alcance (explícito)

- Cualquier variante de "Disrupt"/"Descarte" que venga de texto de carta (no de un dado): no hay
  texto de carta implementado todavía (v4).
- Elegir **qué** carta descartar (siempre al azar, tanto si lo sufre el jugador como el autómata):
  el reglamento no da opción de elegir.
- Cualquier límite de recursos negativos: "no baja de 0" ya lo cubre, no hace falta un caso especial
  de "recursos negativos".

## Casos límite

- **Rival con 0 recursos y se le aplica Disrupt**: se queda en 0, sin error ni aviso especial.
- **Rival con mano vacía y se le aplica Descarte**: no descarta nada (0 cartas), sin aviso de error;
  la tanda se resuelve igual (se consumen los dados, se paga cualquier coste), simplemente no hay
  ninguna carta que quitar.
- **Descarte con valor mayor que las cartas en mano**: descarta todas las que tenga, no falla ni dice
  "necesitas más cartas".
- **Modificador `+X` de disrupt/descarte sin dado base del mismo símbolo**: como cualquier otro
  modificador (SPEC-010), no se resuelve solo (aviso "necesita un dado base").
- **Coste de recurso en la misma cara** (p. ej. `2Dr1`): se paga igual que siempre al resolver
  (SPEC-008b); si no hay recursos suficientes, no se resuelve (aviso), y no se aplica nada.
- **Coste de daño indirecto propio en la misma cara** (p. ej. `2Dci1`): se aplica igual que en
  cualquier otra tanda (SPEC-010), sin relación con el efecto de descarte.

## Notas técnicas (opcional)

- `parsePlayerFace` (`src/game/damage.ts`): añadir `Dr`→`disrupt` y `Dc`→`discard` al regex/token
  map existente (mismo patrón `[+]<valor><TOKEN>[i]<coste>` que ya soporta MD/RD/ID/Sh/R/F/Re). Los
  dos símbolos nuevos se suman al union type `DieSymbol`.
- `dieSymbol`: pasa a reconocer `disrupt`/`discard` en vez de devolver `null` para esas caras (hoy
  los tests de `damage.test.ts` esperan `null` para `'Dr'`/`'Dc'` sin valor — revisar si esas caras
  "sin valor" son reales o si ARH DB siempre trae un valor prefijo; si no hay valor real conocido sin
  prefijo, esos tests quedan obsoletos y hay que actualizarlos).
- Nueva acción en `src/store/gameStore.ts`, p. ej. `resolveDisrupt()`/`resolveDiscard()` (misma forma
  que `resolveResources`/`resolveSpecial`): aplican el efecto al bando **contrario** a quien resuelve
  (a diferencia de recurso/especial, que son sobre el propio bando).
- Descarte al azar: usar `Math.random()` sobre el array `hand` del bando rival para elegir índices
  sin repetir hasta agotar el valor o la mano; mover los códigos elegidos a `discardPile` (reutilizar
  el patrón ya existente de `persistDiscardPile`, SPEC-022) y persistir also la mano resultante.
- El autómata (`src/game/automaton.ts`): nuevos predicados `isDisruptSymbol`/`isDiscardSymbol`,
  nuevas filas en `nextAutomatonAction` reutilizando `combineAutomatonBatch` (sin objetivo, como
  recurso); aplicar contra `player.resources`/`player.hand` en el store al ejecutar la acción.
- Aviso de última acción (jugador y autómata): nombrar la(s) carta(s) descartada(s) usando
  `readCache(code)?.name` (mismo patrón que ya se usa para mostrar nombres de mano, SPEC-018).

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

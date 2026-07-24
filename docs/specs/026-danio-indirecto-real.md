# SPEC-026: Daño indirecto (◎) real — lo reparte el defensor

**Estado:** Pendiente
**Sección del GDD:** §3 (símbolos de dado), corrige la simplificación de v1 de SPEC-008a ("melee,
ranged e indirecto... en v1 los tres restan vida por igual").
**Depende de:** SPEC-008a (resolver por símbolo), SPEC-011 (multi-objetivo), SPEC-025 (turnos reales)

## Qué es (2-4 líneas)

El símbolo de daño **indirecto** (◎, cara `<n>ID`) deja de tratarse igual que melee/ranged. Por
regla real, quien **ataca** con un dado indirecto no elige el objetivo: es el **defensor** quien
reparte ese valor entre sus propios personajes, como quiera (puede repartirlo entre varios). No
confundir con el **coste de daño indirecto propio** (sufijo `i<n>`, SPEC-010, ya corregido): son dos
mecánicas distintas que comparten nombre.

## Criterios de aceptación

- [ ] El jugador marca un dado indirecto propio (símbolo `ID`) y pulsa un botón para resolverlo (sin
  elegir objetivo, como recurso/especial); el enemigo (defensor) recibe el valor total del dado.
- [ ] El autómata (como defensor) reparte ese valor entre sus propios personajes automáticamente,
  reutilizando el criterio de `indirectCostReceiverIndex` (prioriza que sobrevivan, con escudos
  primero), extendido a repartir entre varios de sus personajes si el valor no cabe en uno sin
  matarlo innecesariamente.
- [ ] Cuando el enemigo resuelve un dado indirecto contra el jugador, el jugador (defensor) reparte
  el valor **él mismo**: ve un presupuesto igual al valor del dado y va clicando sus propios
  personajes, 1 punto por clic (puede repartir entre varios o cargarlo todo en uno), y confirma con
  un botón para aplicarlo de golpe.
- [ ] El reparto del jugador defensor es **libre**: puede dejar KO a un personaje pudiendo evitarlo
  repartiendo distinto (fiel al reglamento, "as they wish", sin restricciones de la UI).
- [ ] Dos dados indirecto en el mismo pool (p. ej. valor 4 y valor 2) se resuelven **por separado**:
  no se pueden combinar en un total de 6 para repartirlo distinto (p. ej. 3 y 3). Solo se puede
  tener **un** dado base de indirecto marcado (sin resolver) a la vez; marcar un segundo mientras el
  primero sigue pendiente es no-op.
- [ ] Un modificador `+X` de indirecto marcado junto al único dado base de indirecto suma su valor
  al mismo reparto (sigue siendo "un dado", el modificador no cuenta como dado base aparte).
- [ ] Mientras el defensor reparte (jugador o automático), sigue siendo la **misma acción** de quien
  atacó: su turno no termina hasta que el reparto se confirma; el resto de acciones de ambos bandos
  quedan bloqueadas igual que en cualquier resolución en curso (SPEC-025), salvo los clics del
  defensor sobre sus propios personajes para repartir.

## Fuera de alcance (explícito)

- Daño indirecto proveniente de texto de carta (no de un dado): no hay texto de carta implementado
  todavía; cuando exista, se decidirá aparte (el usuario ya adelantó que en ese caso sería "todo a
  un único objetivo", pero no se implementa aquí).
- Cualquier restricción de "evitar overkill" en el reparto del jugador defensor: libertad total, sin
  guardarraíles en la UI (decisión explícita del usuario).
- Cambiar el criterio de reparto del autómata como **atacante**: el autómata sigue eligiendo el
  daño combinado igual que antes (SPEC-013/014) para melee/ranged; esta spec solo cambia qué pasa
  cuando el símbolo es **indirecto** y toca ser **defensor**.
- Combinar el reparto de un dado indirecto con el coste de daño indirecto propio (`i<n>`) de la
  misma cara: no hay datos reales conocidos de una cara `<n>IDi<n>`; si aparece, se trata como caso
  aparte, no cubierto aquí.

## Casos límite

- **Defensor con un único personaje no-KO**: el reparto solo tiene un destino posible; el flujo es
  el mismo (presupuesto + clics + confirmar), simplemente no hay otra opción donde clicar.
- **Defensor sin ningún personaje no-KO**: no puede pasar si el bando sigue en juego (mismo
  invariante que ya usa `indirectCostReceiverIndex` hoy); si ocurriera, la tanda no se resuelve.
- **Cancelar el reparto en curso**: descarta toda la resolución (el dado sigue marcado, nada se
  aplica), igual que "Cancelar" en cualquier otra resolución; no gasta el turno de quien atacó
  (mismo criterio ya fijado en SPEC-025 para cancelar sin gastar turno).
- **Coste de recurso en la misma cara** (p. ej. `3ID2`, coste de recurso 2): se paga igual que
  siempre al resolver (SPEC-008b), antes de que el defensor reparte; si no hay recursos suficientes,
  no se resuelve (aviso), y no se llega a pedir reparto.
- **Reparto parcial sin confirmar y recarga de página**: el estado de reparto en curso no se
  persiste (mismo patrón que `resolve`/`playUpgrade`/`mulligan`/`turn`); tras recargar, el dado sigue
  en el pool sin resolver, sin reparto a medias.
- **El jugador ataca con indirecto y el enemigo queda con 0 personajes no-KO tras el reparto
  automático**: dispara fin de partida (Victoria) igual que cualquier otro KO total, sin caso
  especial.
- **Modificador de indirecto sin dado base marcado**: como cualquier otro modificador (SPEC-010), no
  se resuelve solo (aviso "necesita un dado base del mismo símbolo").

## Notas técnicas (opcional)

- `dieSymbol`/`parsePlayerFace` ya distinguen `'indirect'` como símbolo propio (SPEC-008a); no hace
  falta tocar el parser. Lo que cambia es el **flujo de resolución** en `src/store/gameStore.ts`
  cuando `symbol === 'indirect'`.
- `selectDie`: para símbolo `'indirect'`, forzar que `marked` contenga como máximo **un** dado base
  (los modificadores sí se pueden sumar); intentar marcar un segundo dado base de indirecto mientras
  hay uno sin resolver es no-op (mismo espíritu que el bloqueo ya existente de "no reemplazar un
  modo abierto de otro símbolo", SPEC-025).
- Nuevo sub-modo de resolución para el reparto del defensor humano, análogo a `pendingEffect` que ya
  se quitó en SPEC-010 pero con los roles invertidos: ahora es el **bando contrario** al que abrió
  `resolve` quien puede clicar para repartir. Precedente ya existente: Reroll de dado (SPEC-023) ya
  deja que "cualquier pool, propio o rival" acepte clics durante una resolución en curso — mismo
  patrón de excepción a aplicar aquí para el reparto del defensor.
- Automáta como defensor: extender `indirectCostReceiverIndex` (o una función hermana) para devolver
  un reparto **entre varios** personajes cuando el valor total no cabe en uno solo sin matarlo
  innecesariamente — mismo espíritu que `pickTargetAndBatch`/`capBatchToMargin` que ya usa el
  autómata para repartir daño/escudo sin *overkill* entre varios objetivos (SPEC-014), pero aplicado
  ahora a **repartir un único valor recibido**, no a elegir qué dados propios resolver.
- Cuando el jugador ataca con indirecto: sigue habiendo un botón "Resolver indirecto" (sin elegir
  objetivo, como "Resolver recursos"/"Resolver especial") que dispara el reparto automático del
  autómata de inmediato.
- Cuando el enemigo ataca con indirecto: el jugador ve un presupuesto y sus propios personajes se
  vuelven clicables para ir asignando puntos, con un botón "Confirmar reparto"; necesita estado
  nuevo en el store (p. ej. `resolve.indirectSplit?: number[]`, un valor acumulado por índice de
  personaje del defensor) y persistencia de a quién le toca repartir (`resolve.side` ya identifica
  quién *ataca*; el defensor es `opposite(resolve.side)`).
- El flip de turno (SPEC-025) ocurre al **confirmar el reparto** (sea automático o manual), no antes
  — mismo patrón que `afterApply`/`nextResolveAfterApply` ya usa para el resto de símbolos.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

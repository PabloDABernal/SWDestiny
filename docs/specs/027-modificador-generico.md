# SPEC-027: Modificador genérico (+X*)

**Estado:** Pendiente
**Sección del GDD:** §3 (símbolos de dado y modificadores, corrige SPEC-010)
**Depende de:** SPEC-010 (modificadores `+X` atados a símbolo), SPEC-013 (autómata combina
modificadores y costes)

## Qué es (2-4 líneas)

Existe un segundo tipo de modificador, distinto del `+X<SÍMBOLO>` de SPEC-010 (p. ej. `+2RD`, que
solo suma junto a un dado base **ranged**): el modificador **genérico** `+X*` (ejemplo real: Lure of
Power, cara `+2*`). Este no está atado a ningún símbolo — suma su valor a la tanda que se resuelva,
sea cual sea el símbolo base marcado (menos especial, que tiene valor fijo no modificable).

## Criterios de aceptación

- [ ] Un dado con cara `+2*` es **seleccionable** cuando ya hay un modo de resolución abierto de
  cualquier símbolo excepto especial (melee, ranged, indirecto, escudo, recurso, focus, reroll de
  dado), y su valor se suma al total de esa tanda igual que un modificador específico.
- [ ] Marcar **solo** un `+2*` sin ningún dado base marcado y sin modo abierto → no-op, mismo aviso
  que un modificador normal sin base ("necesita un dado base") — SPEC-010.
- [ ] Un `+2*` puede combinarse en la misma tanda con un modificador específico del símbolo (`+1RD`)
  y con un dado base: los valores de ambos modificadores se suman al total.
- [ ] El **autómata** también suma `+X*` a cualquier tanda combinada que resuelva (daño, escudo,
  recurso, focus, reroll de dado), igual que ya hace con los modificadores específicos (SPEC-013).
- [ ] Un `+2*` sigue clasificado como dado no marcable por sí solo para símbolo especial: junto a un
  dado base especial no suma nada (especial tiene valor fijo 0, no modificable).

## Fuera de alcance (explícito)

- Cualquier otro formato de modificador que no sea `+<n>*` (no hay datos reales de otra variante).
- Coste de recurso o coste de daño indirecto propio en la misma cara que un modificador genérico
  (p. ej. hipotético `+2*i1`): no hay datos reales; si aparece, se trata aparte.
- Cambiar el comportamiento de los modificadores específicos de símbolo (`+2RD`, SPEC-010): siguen
  igual, solo suman con su símbolo.

## Casos límite

- **`+2*` marcado junto a un dado base de indirecto**: suma igual que cualquier otro modificador de
  indirecto (un solo dado base a la vez, SPEC-026); no cambia esa restricción.
- **Dos `+X*` marcados junto al mismo dado base**: ambos suman (no hay límite de cuántos
  modificadores genéricos puede haber en una tanda).
- **`+X*` en el pool sin ningún dado del mismo bando resoluble abierto todavía, y se marca un dado
  base de un símbolo distinto después**: el `+X*` solo se puede marcar cuando ya hay un modo abierto
  (ver criterio de aceptación); no se puede "reservar" antes.
- **El autómata tiene un `+X*` pero ningún dado base de ningún símbolo en su tanda combinable**: se
  ignora, igual que cualquier modificador sin base (SPEC-013).

## Notas técnicas (opcional)

- `parsePlayerFace` (src/game/damage.ts) necesita reconocer `+<n>*` como cara válida. Al no tener
  símbolo propio, no puede devolver un `symbol` fijo de `DieSymbol`: se sugiere un campo nuevo
  `isGenericModifier: boolean` (o similar) en el resultado, dejando `symbol` sin usar o marcado
  aparte, y que el llamador (UI y motor del autómata) lo trate como "modificador de cualquier símbolo
  activo" en vez de fijo. Es una decisión de implementación, no de diseño — el criterio de aceptación
  fija el comportamiento observable.
- `selectDie`/`canSelect` (src/store/gameStore.ts, DicePool.tsx): un dado con `isGenericModifier`
  debe considerarse "del símbolo del modo abierto" a efectos de marcarlo/desmarcarlo, para cualquier
  símbolo salvo especial, en vez de compararse contra un símbolo fijo.
- `combineAutomatonBatch` (src/game/automaton.ts): mismo ajuste en el lado del autómata — los dados
  con `isGenericModifier` deben incluirse en la tanda combinable de cualquier símbolo (salvo
  especial), sumando su valor si `hasBase`.
- No tocar `parseDamage`/`parseShield`/`parseResource` (parsers aislados del autómata "viejo", SPEC-
  008b) — el camino del autómata ya usa `parsePlayerFace` vía `combineAutomatonBatch`.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

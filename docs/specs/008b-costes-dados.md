# SPEC-008b: Pagar el coste de recurso de las caras de dado

**Estado:** Pendiente
**Sección del GDD:** §3 (símbolos, resolver dados, costes), §5 (v2: recursos)
**Depende de:** SPEC-006 (recursos), SPEC-008a (modo resolver por símbolo)

## Qué es (2-4 líneas)

Algunas caras de dado llevan un **coste de recurso** que hay que pagar para resolverlas (caja
amarilla del reglamento). Hoy esas caras no son seleccionables (008a las trata como inertes). Esta
spec las hace resolubles gastando recursos del contador del bando: si no hay suficientes, la cara no
se puede resolver. El **coste de daño indirecto propio** (sufijo `i`) queda para **008b-2**.

## Formato de coste en ARH DB (validado con datos reales)

Cara = `<valor><SÍMBOLO>[i]<coste>`. El sufijo numérico es el coste; si va precedido de `i`, el
coste es en **daño indirecto propio** (fuera de esta spec → 008b-2); si no, en **recursos** (esta
spec).

- `2RD1` → daño ranged 2, **coste 1 recurso** (Greef Karga 16096). ← en alcance.
- `2R1` → recurso 2, **coste 1 recurso** (Greef Karga 16096). ← en alcance.
- `3Shi1` → escudo 3, coste 1 daño **indirecto** propio (Allya 23001). ← **fuera** (008b-2).
- `1RD`, `1R`, `2Sh` → sin coste (008a).
- `+…` (modificador) → **fuera** (SPEC-008c).

## Reglas de pago (fijadas con el usuario)

- **Coste de recurso**: al resolver, se gastan N recursos del contador del **propio** bando. Si no
  hay suficientes, la resolución **no se puede** (no se aplica nada; el/los dado(s) siguen en el
  pool).
- **Batch (008a)**: si se marcan varios dados con coste de recurso, los costes **se suman**. Hay que
  poder pagar el **total** o la tanda no se resuelve.
- **Al fallar el pago** (coste total > recursos): no se muta nada, se muestra un **aviso** ("recursos
  insuficientes" en el hint de la app) y los dados marcados **siguen marcados** (para reintentar tras
  generar más recursos). No se desmarcan solos.
- **Autorreferente** (`2R1`): produce 2 recursos pero cuesta 1. Se comprueba el coste **antes** de
  aplicar contra el contador **actual**: con 0 recursos NO se resuelve, aunque el neto sería +1.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Una cara con coste de recurso (p. ej. `2RD1`) ahora **es seleccionable** (entra en el modo de
      su símbolo base: `2RD1` → daño ranged).
- [ ] Con recursos suficientes, al resolver `2RD1` a un enemigo: se **gasta 1** recurso del contador
      y se hace **2** de daño; el dado se consume.
- [ ] Con **0** recursos, `2RD1` no se puede resolver: al aplicarlo no pasa nada (indicación de
      recursos insuficientes) y el dado sigue en el pool.
- [ ] Marcar dos `2RD1` con solo 1 recurso → **no** se resuelve la tanda (coste total 2 > 1); con 2+
      recursos sí (gasta 2, hace 4 de daño al objetivo).
- [ ] `2R1` con **0** recursos → **no** se resuelve (aunque el neto sería +1). Con **1+** recursos →
      se resuelve: gasta 1, gana 2 (neto +1 en el contador).
- [ ] El **contador de recursos** refleja el gasto tras cada resolución con coste.
- [ ] Una cara con coste **indirecto** (`3Shi1`, sufijo `i`) sigue **inerte** (no seleccionable) en
      esta spec (llega en 008b-2).

## Fuera de alcance (explícito)

- **Coste de daño indirecto propio** (`…i<n>`) → **SPEC-008b-2** (necesita elegir receptor del
  coste, paso de interacción extra).
- **Modificadores** `+X` → SPEC-008c.
- **El autómata**: sigue sin pagar costes (ignora sus caras con coste, inertes en su pool).
- **Reparto** del daño indirecto: fuera.
- Focus, disrupt, descarte, especial: fuera.

## Casos límite

- **Batch mixto** (unos con coste de recurso, otros sin) → el coste total = suma de los costosos; si
  supera el contador, no se resuelve la tanda completa; si no, se paga el total de golpe.
- **Reset** vacía recursos (SPEC-006): tras Reset no se pueden pagar costes hasta volver a generar/
  importar.
- **Cara con coste indirecto marcada junto a otras**: no puede marcarse (sigue inerte en 008b); no
  entra en el cálculo.
- **Recargar** → contador y selección se pierden como siempre (estado de sesión salvo mazo).

## Notas técnicas (opcional)

- **Aislamiento del autómata (importante)**: `parseDamage` / `parseShield` / `parseResource` (y por
  tanto `resolveDamage` / `resolveShield` / `resolveResourcePure` y todo `game/automaton.ts`) **NO se
  modifican** y siguen con su ancla `$` (sin reconocer coste). Así el autómata sigue ignorando caras
  con coste. El nuevo parseo de coste es una función **separada** que solo consumen las funciones del
  jugador (`resolveDamageBatch` / `resolveShieldBatch` / `resolveResources` y `selectDie`).
- `parseCostedFace(face) → { symbol, amount, resourceCost } | null` (regex tipo
  `^(\d+)(MD|RD|ID|Sh|R)(\d+)?$`, con el dígito final = coste de recurso; **rechaza** el sufijo `i`
  → esas caras quedan fuera hasta 008b-2). `dieSymbol` (008a) debe pasar a aceptar las caras con
  coste de recurso como seleccionables (hoy las excluye), sin tocar los parsers del autómata.
- Al aplicar una tanda (batch): calcular `coste total = Σ resourceCost de los marcados`; si
  `recursos < coste total` → no resolver (no mutar estado, indicación al usuario). Si procede,
  descontar el coste del contador y aplicar el efecto reutilizando `resolveDamageBatch` /
  `resolveShieldBatch` / `resolveResources` (sumando además el efecto de las caras).
- Ojo con el orden en `resolveResources`: primero **cobrar** el coste, luego **sumar** lo producido,
  o calcular el neto de golpe, pero siempre comprobando el pago contra el contador previo.

## Nota de tamaño (regla 4 CLAUDE.md)

Acotada a coste de recurso: parseo separado, comprobación de pago y descuento del contador en las
funciones batch, y hacer seleccionables las caras con coste de recurso en `selectDie`/`DicePool`.
Bien por debajo de 300 líneas (el coste indirecto, que añadía UI, se movió a 008b-2).

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

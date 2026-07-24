# SPEC-010: Modificadores (+X) y coste de daño indirecto propio

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §3 (símbolos, modificadores, costes, resolver dados), §5 (v2)
**Depende de:** SPEC-008a (modo resolver por símbolo), SPEC-008b (coste de recurso), SPEC-005 (escudos)

## Qué es (2-4 líneas)

Cierra las dos piezas que faltaban para resolver dados como el reglamento: **modificadores** `+X`
(caras azules que solo se resuelven junto a otro dado del mismo símbolo, sumando su valor) y el
**coste de daño indirecto propio** (caras con sufijo `i`, p. ej. `3Shi1`: para resolverlas el bando
se hace ese daño indirecto a un personaje propio que elige el jugador).

## Formatos (validados con datos reales)

Cara de jugador = `[+]<valor><SÍMBOLO>[i]<coste>`:
- Modificador: prefijo `+` → `+2RD`, `+1R` (Imperial Death Trooper 12023). Solo suma junto a un dado
  base del mismo símbolo.
- Coste indirecto: sufijo `i<n>` → `3Shi1` (Allya 23001), coste 1 daño indirecto propio.
- (Coste de recurso `<n>` sin `i` ya lo hace SPEC-008b; sin coste = 008a.)

## Reglas (fijadas con el usuario)

### Modificadores `+X`
- Un modificador entra en el **modo de su símbolo base** (p. ej. `+2RD` → ranged) y es marcable.
- Al resolver una tanda, el valor del modificador **se suma** al total, **solo si** hay al menos un
  dado **base** (no-modificador) del mismo símbolo marcado. **Un modificador sin base no se resuelve**
  (aplicar una tanda de solo modificadores = no pasa nada, aviso).

### Coste de daño indirecto propio (`…i<n>`)
- La cara es seleccionable; su coste indirecto total (Σ de los marcados) lo recibe **un personaje
  propio no-KO**, determinado automáticamente (ver "Corrección 2026-07-24" más abajo — inicialmente
  esta spec dejaba que el jugador lo eligiera con un clic; se corrigió después de jugarla).
- Es daño indirecto normal: los **escudos del receptor lo absorben** primero (SPEC-005); el sobrante
  baja vida y puede dejar KO.

### Flujo de resolución (con todo integrado)
1. Marcas la(s) cara(s) del mismo símbolo (base, modificadores y/o con coste).
2. Clic en el **objetivo del efecto** (enemigo para daño; aliado para escudo; recurso/especial con
   su propio botón; focus/reroll de dado con sus propias acciones, SPEC-023). Aquí se comprueba:
   - que haya ≥1 dado base (si solo hay modificadores → no-op, aviso);
   - que se pueda pagar el **coste de recurso** total (SPEC-008b); si no, aviso, no se resuelve.
3. Se aplica todo a la vez: efecto (base + modificadores) al objetivo, coste de recurso descontado,
   coste indirecto (si lo hay) al receptor determinado automáticamente; los dados marcados se
   consumen. Un único clic (o pulsación de botón) resuelve la tanda entera.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Un modificador `+2RD` es **seleccionable** en modo ranged; marcarlo junto a un `1RD` y aplicar
      a un enemigo hace **3** de daño (1 + 2); ambos dados se consumen.
- [ ] Marcar **solo** un `+2RD` (sin base) y aplicar → **no** pasa nada (aviso "necesita un dado base
      del mismo símbolo"); el modificador sigue en el pool.
- [ ] Un modificador de recurso `+1R` marcado junto a `1R` y **Resolver recursos** → suma **2** al
      contador; `+1R` solo (sin base) no hace nada.
- [ ] Una cara con coste indirecto `3Shi1` es **seleccionable** (modo escudo); al aplicarla: elijo el
      aliado del **escudo (3)** y con ese único clic se resuelve todo, incluido el daño indirecto
      (1) al receptor que se determina automáticamente (sus escudos lo absorben primero).
- [ ] El receptor del coste indirecto, determinado automáticamente, puede quedar **KO** si no tiene
      escudos suficientes (sale KO, sus dados del pool se retiran).
- [ ] Combinar coste de recurso + coste indirecto en la misma tanda: se paga el recurso del contador
      **y** se aplica el daño indirecto al receptor automático; sin recursos suficientes, la tanda
      no se resuelve (aviso) y no se aplica nada.
- [ ] El **autómata** sigue ignorando modificadores y caras con coste (inertes en su pool).

## Fuera de alcance (explícito)

- **El autómata**: no combina modificadores ni paga costes (sigue como SPEC-007).
- **Reparto** del daño (del efecto o del coste indirecto) entre varios personajes: va a **un**
  personaje. (El daño multi-objetivo por dado está anotado en BACKLOG para depurar 008a.)
- Focus, disrupt, descarte, especial: fuera.

## Casos límite

- **Modificador de un símbolo distinto al modo activo** → como cualquier otra cara de otro símbolo:
  clicarlo reemplaza el modo (008a). Un `+2RD` no se mezcla con melee.
- **Tanda con base + modificador + coste de recurso + coste indirecto** a la vez → se resuelve todo
  de un clic: total efecto = base+modificadores; se cobra recurso; se aplica el coste indirecto al
  receptor automático.
- **Receptor del coste indirecto = mismo personaje** que el objetivo del efecto (p. ej. darse escudo
  y el coste) → permitido, si el algoritmo automático lo determina así.
- **Sin aliado válido** para el coste indirecto (todos KO) → no puede pasar si el bando sigue en
  juego; si ocurriera, la tanda no se resuelve.
- **Modificador con su propio coste** (p. ej. hipotético `+2RDi1`) → se trata igual (suma su valor y
  aporta su coste); si no aparece en datos reales, no bloquea.

## Notas técnicas (opcional)

- Un solo parser de cara de jugador: `parsePlayerFace(face) → { symbol, amount, resourceCost,
  indirectCost, isModifier } | null` con regex `^(\+)?(\d+)(MD|RD|ID|Sh|R)(i)?(\d+)?$`. `dieSymbol`
  pasa a usarlo (modificadores y caras con coste indirecto ya seleccionables). **No** tocar
  `parseDamage`/`parseShield`/`parseResource` (aislamiento del autómata, SPEC-008b).
- `sumMarked` pasa a devolver `{ baseAmount, modifierAmount, resourceCost, indirectCost, hasBase }`.
  El efecto total = `baseAmount + modifierAmount` (solo si `hasBase`).
- **Dos avisos distintos** en `resolveError`: "Recursos insuficientes…" (008b) y uno nuevo tipo
  "Necesitas un dado base del mismo símbolo" cuando se aplica una tanda de solo modificadores.
- Reutilizar `resolveShieldedDamage` para el coste indirecto (escudos absorben). Reutilizar el
  descuento de recurso de 008b. No duplicar KO ni absorción.
- Path de recurso (botón "Resolver recursos"): también admite modificadores (`+1R`) y, si hay coste
  indirecto, se aplica al receptor automático en el mismo clic.

### Corrección 2026-07-24 (tras jugar SPEC-025)

Esta spec, tal como se jugó originalmente (2026-07-20), dejaba que **el jugador eligiera** con un
clic quién recibía el coste indirecto (paso 3 atómico, `pendingEffect`). Jugando ya con turnos
reales (SPEC-025), el usuario señaló que esto contradice el propio nombre de la mecánica: si el
jugador elige el receptor, el coste deja de ser "indirecto". Decisión del usuario: el receptor debe
determinarse **solo**, igual que ya hacía el autómata consigo mismo desde SPEC-013
(`indirectCostReceiverIndex`, `src/game/automaton.ts` — ahora exportada y reutilizada también para
el jugador). El paso 3 (clic en el receptor) y el estado `pendingEffect` desaparecen del todo: una
tanda con coste indirecto se resuelve en el mismo clic que el resto (efecto + recurso + indirecto,
todo junto). Afecta a `applyDieTo`, `resolveResources`, `resolveSpecial`, `confirmFocus` y
`confirmReroll` en `src/store/gameStore.ts`. El autómata no cambia: seguía haciendo esto desde
SPEC-013, la corrección solo alinea al jugador con lo que ya hacía el autómata.

## Nota de tamaño (regla 4 CLAUDE.md)

Dos mecánicas + un paso de interacción nuevo (receptor del coste indirecto). Cabe, pero está cerca
del límite. Si al implementar se dispara por encima de ~300 líneas, mover **el coste indirecto en el
path de recurso** (caso más raro) a **SPEC-011** y dejar aquí modificadores + coste indirecto en
daño/escudo. Decidir al empezar.

## Resultado del playtest

2026-07-20: playtest manual OK (mazo Allya 23001 elite + 2 Death Trooper 02001). Confirmado:
modificadores +X suman a un dado base (modificador solo = aviso), coste indirecto (3Shi1) con paso
2 atómico (objetivo del efecto → receptor del coste; escudos absorben; puede KO), recurso +
modificador con "Resolver recursos". Tras iterar la UX: el bar del pool muestra en rojo el "Paso
2/2: elige el aliado que recibe el coste indirecto (N)". revisor-codigo: CUMPLE. Confirmado por el
usuario.

2026-07-24: corrección jugando SPEC-025 (ver "Corrección 2026-07-24" arriba) — el receptor del coste
indirecto pasa a determinarse automáticamente, sin el paso 3 de elegirlo a mano. Probado en
navegador (Playwright): un dado `2MDi1` resuelto de un solo clic aplica 2 de daño al objetivo elegido
y 1 de daño indirecto al personaje propio con más vida (mismo criterio que ya usaba el autómata),
sin pedir ningún clic adicional. Confirmado por el usuario.

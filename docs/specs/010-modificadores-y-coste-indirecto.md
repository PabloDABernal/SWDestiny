# SPEC-010: Modificadores (+X) y coste de daño indirecto propio

**Estado:** Pendiente
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
  propio no-KO que elige el jugador**, **después** de elegir el objetivo del efecto.
- Es daño indirecto normal: los **escudos del receptor lo absorben** primero (SPEC-005); el sobrante
  baja vida y puede dejar KO.

### Flujo de resolución (con todo integrado)
1. Marcas la(s) cara(s) del mismo símbolo (base, modificadores y/o con coste).
2. Clic en el **objetivo del efecto** (enemigo para daño; aliado para escudo). Aquí se comprueba:
   - que haya ≥1 dado base (si solo hay modificadores → no-op, aviso);
   - que se pueda pagar el **coste de recurso** total (SPEC-008b); si no, aviso, no se resuelve.
3. Si el total de **coste indirecto** > 0 → se pide el **receptor del coste**: clic en un aliado
   propio no-KO. Si es 0, se resuelve directamente en el paso 2.
4. Se aplica todo a la vez: efecto (base + modificadores) al objetivo, coste de recurso descontado,
   coste indirecto al receptor; los dados marcados se consumen.

**Bloqueo durante el paso 3 (fijado con el usuario):** mientras se espera el receptor del coste
indirecto, la resolución es **atómica**: NO se puede marcar/desmarcar dados ni **Activar**; solo
vale clicar un aliado propio no-KO (el receptor) o **Cancelar**. Cancelar descarta toda la tanda
(no se aplica nada, los dados siguen marcados). Clic en enemigo o en aliado KO durante el paso 3 =
no-op.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Un modificador `+2RD` es **seleccionable** en modo ranged; marcarlo junto a un `1RD` y aplicar
      a un enemigo hace **3** de daño (1 + 2); ambos dados se consumen.
- [ ] Marcar **solo** un `+2RD` (sin base) y aplicar → **no** pasa nada (aviso "necesita un dado base
      del mismo símbolo"); el modificador sigue en el pool.
- [ ] Un modificador de recurso `+1R` marcado junto a `1R` y **Resolver recursos** → suma **2** al
      contador; `+1R` solo (sin base) no hace nada.
- [ ] Una cara con coste indirecto `3Shi1` es **seleccionable** (modo escudo); al aplicarla: elijo el
      aliado del **escudo (3)**, luego elijo el aliado que **recibe 1 de daño indirecto** (sus escudos
      lo absorben primero); ambos pasos, y el dado se consume.
- [ ] El receptor del coste indirecto puede quedar **KO** si no tiene escudos (sale KO, sus dados del
      pool se retiran).
- [ ] Combinar coste de recurso + coste indirecto en la misma tanda: se paga el recurso del contador
      **y** se aplica el daño indirecto al aliado elegido; sin recursos suficientes, la tanda no se
      resuelve (aviso) y **no** se pide receptor.
- [ ] Durante el paso "elige receptor del coste indirecto" aparece el hint **"Elige el personaje de
      tu bando que recibe el coste indirecto."**; los dados y Activar no responden; **Cancelar**
      descarta toda la tanda sin aplicar nada (los dados siguen marcados).
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
  en el flujo (paso 2 y 3): total efecto = base+modificadores; se cobra recurso; se pide receptor
  del coste indirecto.
- **Cancelar** en mitad del paso 3 (tras elegir objetivo, antes del receptor) → cancela toda la
  resolución, no se aplica nada, los dados siguen marcados. (Botón Cancelar.)
- **Receptor del coste indirecto = mismo personaje** que el objetivo del efecto (p. ej. darse escudo
  y el coste) → permitido.
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
- El modo `resolve` gana un paso pendiente para el receptor del coste indirecto: p. ej.
  `pendingEffect: { targetSide, targetIndex } | null`. Con `pendingEffect` activo, el siguiente clic
  en un aliado no-KO es el **receptor del coste** y finaliza la resolución; `selectDie` y `activate`
  quedan bloqueados mientras `pendingEffect !== null` (paso atómico). `cancelResolve` limpia también
  `pendingEffect` (ya pone `resolve: null`; confirmarlo).
- **Dos avisos distintos** en `resolveError`: "Recursos insuficientes…" (008b) y uno nuevo tipo
  "Necesitas un dado base del mismo símbolo" cuando se aplica una tanda de solo modificadores.
- **`App.tsx`** (`targetableSide`/`hint` en `BattleSide`) cambia: con `pendingEffect` activo, el
  objetivo clicable pasa a ser el **propio bando** (receptor del coste), y el hint indica "elige el
  personaje que recibe el coste indirecto", sea el efecto original daño o escudo.
- Reutilizar `resolveShieldedDamage` para el coste indirecto (escudos absorben). Reutilizar el
  descuento de recurso de 008b. No duplicar KO ni absorción.
- Path de recurso (botón "Resolver recursos"): también admite modificadores (`+1R`) y, si hay coste
  indirecto, pide receptor tras el botón.

## Nota de tamaño (regla 4 CLAUDE.md)

Dos mecánicas + un paso de interacción nuevo (receptor del coste indirecto). Cabe, pero está cerca
del límite. Si al implementar se dispara por encima de ~300 líneas, mover **el coste indirecto en el
path de recurso** (caso más raro) a **SPEC-011** y dejar aquí modificadores + coste indirecto en
daño/escudo. Decidir al empezar.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

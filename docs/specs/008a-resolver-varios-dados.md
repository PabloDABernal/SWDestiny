# SPEC-008a: Resolver varios dados del mismo símbolo en una acción

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §3 (símbolos, resolver dados), §5 (v1/v2: daño, escudos, recursos)
**Depende de:** SPEC-003 (daño), SPEC-005 (escudos), SPEC-006 (recursos)

## Qué es (2-4 líneas)

Hoy el jugador resuelve los dados de uno en uno y sin distinguir el símbolo de daño. Esta spec
introduce un **"modo resolver" por símbolo**: al elegir un dado del pool, solo quedan disponibles
los dados de **ese mismo símbolo** (melee, ranged, indirecto, escudo o recurso), y se resuelven
varios en la misma tanda. Melee, ranged e indirecto son símbolos **distintos** y no se mezclan.

## Modelo de interacción (fijado con el usuario)

- **Solo el pool propio**: el jugador solo resuelve dados de **su** pool (regla del reglamento). Los
  dados del pool enemigo nunca son seleccionables por el jugador (no entran en el modo).
- **Entrar en modo**: clic en un dado del pool del jugador → se entra en "modo resolver" de su
  símbolo. Mientras dure, los dados de **otro símbolo** se muestran atenuados y **no** son
  seleccionables.
- **Botones del modo** (Cancelar / "Resolver recursos") se renderizan en el `DicePool` del bando
  jugador. **"Resolver recursos"** está **deshabilitado con 0 dados marcados**.
- **Reset** se muestra junto a **cada** pool (comodidad, para no desplazarse); llama a la acción
  `reset` global de siempre (vacía pools/activaciones/recursos de ambos bandos, no cura).
- **Tras aplicar** una tanda de daño/escudo (todos los marcados al objetivo), el modo se **cierra**
  (una resolución = una acción); para otra tanda se vuelve a marcar.
- **Activar sigue disponible**: se puede activar un personaje aunque haya un modo resolver abierto;
  los dados nuevos se añaden al final del pool sin afectar la selección en curso.
- **Cambiar de símbolo**: clic en un dado de otro símbolo **reemplaza** el modo (empieza uno nuevo
  de ese símbolo). Nunca quedan símbolos mezclados.
- **Cancelar**: un botón/acción **Cancelar** sale del modo sin resolver nada.
- **Daño (melee/ranged/indirecto)**: puedes **marcar uno o varios** dados del mismo símbolo (toggle;
  se resaltan). Clic en un personaje **enemigo no-KO** aplica **todos** los marcados a **ese mismo**
  objetivo (la suma; los escudos absorben primero, SPEC-005) y los consume. No se reparten entre
  objetivos: todos van al que elijas. Puedes marcar uno solo o varios, como en el juego original.
- **Escudo**: igual (marcar uno o varios), pero todos los marcados van a un **aliado no-KO** del
  propio bando (suma, tope 3).
- **Recurso**: no hay objetivo. **Marcas** (toggle) los dados de recurso que quieras y pulsas
  **"Resolver recursos"** → suma **todos** los marcados al contador del bando y los consume.

## Fuera de alcance (explícito)

- **Costes** de las caras (recurso / daño indirecto propio) → **SPEC-008b**. Sus caras **no** entran
  en ningún modo (no seleccionables), como hoy.
- **Modificadores** `+X` → **SPEC-008c**. Un modificador **no** es seleccionable aquí.
- **Reparto del daño indirecto** entre varios personajes: en v1 el indirecto va a **un** objetivo por
  dado, igual que melee/ranged.
- **Especial** y **descarte**: fuera hasta que exista la mano (v3+).
- **El autómata**: no cambia (resuelve una cara por pulsación, SPEC-007; usa las funciones puras
  directamente, no la `selection` del jugador).
- Focus, disrupt: fuera.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Al hacer clic en un dado de **daño melee** del pool, entro en modo resolver melee: los dados de
      ranged/indirecto/escudo/recurso quedan **atenuados y no seleccionables**.
- [ ] Con modo melee activo puedo **marcar varios** dados melee (se resaltan); al clicar un enemigo,
      **todos** los marcados le pegan (la suma; escudos primero) y se consumen. Marcar un solo dado
      también vale (caso trivial).
- [ ] Clic en un dado **ranged** mientras estoy en modo melee → **cambia** a modo ranged (la
      selección melee se descarta); nunca se resuelven melee y ranged en la misma tanda.
- [ ] Pulsar **Cancelar** sale del modo sin resolver ni consumir dados.
- [ ] Con modo **escudo**, aplico varios dados de escudo a aliados no-KO (uno por dado), tope 3.
- [ ] En modo **recurso**, marco varios dados de recurso y pulso **"Resolver recursos"**: el contador
      sube por la **suma** de sus valores y todos se consumen. (Un solo dado marcado = caso trivial.)
- [ ] Un dado con **coste** o un **modificador** `+X` **no** se puede seleccionar (sigue inerte).

## Casos límite

- **Objetivo se queda KO a mitad** de resolver varios dados de daño → sus dados restantes salen del
  pool (SPEC-003); sigo en modo con los dados aún no aplicados, que puedo mandar a otros objetivos.
- **Desmarcar / cambiar de idea**: en modo daño/escudo puedo elegir otro dado "actual" antes de
  clicar objetivo; en modo recurso puedo desmarcar dados antes de pulsar el botón. Cancelar siempre
  disponible.
- **Fin de partida (Victoria/Derrota) durante la resolución** → se sale del modo (selección
  cancelada), coherente con SPEC-004.
- **Clic en un objetivo inválido** (KO, o bando equivocado según el símbolo) → no hace nada; sigo en
  modo.
- **Recargar** → el modo/selección se pierde (estado de sesión), como el resto.

## Notas técnicas (opcional)

- Distinguir el **símbolo** de daño: nueva `parseDamageDie(face) → { kind: 'melee'|'ranged'|
  'indirect', amount } | null` (`MD`/`RD`/`ID`). `parseDamage` actual (solo `amount`) puede quedarse
  para `resolveDamage`/autómata o reimplementarse encima de `parseDamageDie`; a decidir en
  implementación sin cambiar su contrato observable.
- La `selection` del store pasa de `{ side, poolIndex }` a un modo:
  `resolve: { side, symbol: 'melee'|'ranged'|'indirect'|'shield'|'resource', marked: number[] } |
  null`. `marked` es un **conjunto** (uno o varios) del mismo símbolo. Daño/escudo: al clicar un
  objetivo se aplican TODOS los marcados a ese objetivo (`resolveDamageBatch`/`resolveShieldBatch`,
  suma). Recurso: botón "Resolver recursos" suma los marcados. El clic en otro símbolo reemplaza.
- **Archivos afectados** (además del store): `src/components/DicePool.tsx` (marcado/atenuado por
  símbolo, botón "Resolver recursos", botón "Cancelar") y `src/App.tsx` (hoy lee `selection.poolIndex`
  y `parseShield(selectedDie.face)` en las líneas del hint/`targetable`; hay que adaptarlo al nuevo
  modo: `targetable` depende de `resolve.symbol` — daño → bando contrario; escudo → propio).
- Reutilizar `resolveDamage` / `resolveShield` / `resolveResourcePure` **sin cambios** (uno por dado
  aplicado); no duplicar absorción de escudo ni lógica de KO.
- Al consumir varios dados de recurso a la vez, filtrar el pool de una sola pasada (por conjunto de
  índices) para no descuadrar posiciones.

## Nota de tamaño (regla 4 CLAUDE.md)

Toca store (nuevo modo `resolve` + acciones seleccionar/aplicar/resolver-recursos/cancelar),
`DicePool.tsx`, `App.tsx` y `damage.ts` (parseDamageDie) + tests. Contenida en ~300 líneas si se
apoya en los helpers puros existentes; confirmar al empezar.

## Resultado del playtest

2026-07-20: playtest manual OK (mazo Death Trooper 02001 x3 para daño ranged repetido). Confirmado:
modo resolver por símbolo, marcar uno o varios del mismo símbolo, aplicar todos al mismo objetivo
(suma; escudos absorben), recurso batch + botón, +2RD (modificador) no seleccionable, Reset por
pool. revisor-codigo: CUMPLE. Confirmado por el usuario tras iterar la UX (marcar varios → mismo
objetivo, sin repartir).

# SPEC-006: Recursos (generación, contador único por bando)

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §5 "Recursos (primera pieza — solo generación, GDD v2)"
**Depende de:** SPEC-001 (personajes/dados), SPEC-002 (pool de dados), SPEC-004 (dos bandos)

## Qué es (2-4 líneas)

Con un dado mostrando `1R` en el pool, el jugador (o el autómata, ver Fuera de alcance) lo resuelve
con un solo clic (sin elegir objetivo) y su bando gana **1 recurso**, sumado a un **contador único
por bando** (no por personaje). El dado se consume. En esta spec los recursos solo se generan y se
ven acumular; todavía no hay nada en qué gastarlos.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Con un dado `1R` en el pool del jugador, el jugador hace clic en él → el contador de recursos
      del bando **jugador** sube en 1 (visible en la UI) y el dado desaparece del pool.
- [ ] Resolver un dado `1R` **no** pide elegir objetivo ni personaje (a diferencia de daño/escudo):
      un solo clic basta.
- [ ] Resolver varios dados `1R` sucesivos en el mismo pool suma cada uno al contador (p. ej. 3
      dados `1R` resueltos → contador en 3).
- [ ] El contador de recursos es **por bando**, no por personaje: da igual qué personaje tiró el
      dado, el recurso va al total compartido de su bando.
- [ ] Pulsar **Reset** vacía el contador de recursos de **ambos** bandos a 0 (junto con el pool y
      las activaciones, como ya hacía).
- [ ] **Reimportar** un mazo pone el contador de recursos de ese bando a **0**.
- [ ] Con un dado de **daño o escudo ya seleccionado** (esperando objetivo), los dados `1R` del pool
      aparecen **deshabilitados**: no se pueden resolver hasta elegir objetivo para el dado
      seleccionado (o cancelar esa selección haciendo clic de nuevo sobre él).

## Fuera de alcance (explícito)

- **Gastar recursos.** No hay caras de dado con coste que se puedan pagar en esta spec (siguen
  tratándose como blanco, según SDD); no hay cartas que cuesten recursos (v4). Esta spec es solo
  generación/acumulación.
- **Determinar el formato de las caras de dado con coste** en los datos de ARH DB. Se investiga en
  una spec posterior, cuando exista un consumidor real de recursos.
- **El autómata enemigo no resuelve dados `1R` por sí mismo.** Igual que con los escudos
  (SPEC-005), la tabla de prioridades del GDD §4 (SPEC-004b) no se toca en esta spec: un dado `1R`
  en el pool enemigo no es "daño" ni "blanco", así que el autómata no lo elige y se queda inerte en
  su pool hasta el siguiente Reset. Anotar en BACKLOG.
- **Recursos por personaje o límite máximo de recursos.** El contador de bando no tiene tope en
  esta spec (a diferencia de los escudos, que sí tienen máximo 3).

## Casos límite

- **Bando sin ningún dado `1R` resuelto** → mismo patrón que SPEC-005 con los escudos: el contador
  no se muestra si está en 0 (nada que ver todavía), solo aparece desde 1 en adelante.
- **Reset con recursos acumulados** → el contador vuelve a 0 en ambos bandos, igual que el pool.
- **Reimportar con recursos acumulados** → el bando reimportado vuelve a 0; el otro bando no se
  toca.
- **Recargar la página a mitad de partida** → el contador se pierde, igual que pool/activaciones/
  daño/escudos (estado de sesión no persistido).
- **Dado `1R` en el pool cuando la partida ya terminó (Victoria/Derrota)** → no resoluble, igual
  que el resto de acciones se bloquean con `outcome !== null`.

## Notas técnicas (opcional)

- **Parseo de la cara**: la cara de recurso es exactamente `1R` (no confundir con `1RD`, que es
  daño ranged — ya distinguido por `parseDamage`). Nueva función pura `parseResource(face): number
  | null` en `src/game/damage.ts` (o módulo hermano), análoga a `parseShield`/`parseDamage`.
- **Estado**: nuevo campo `resources: number` en `SideState` (no un array por instancia, a
  diferencia de `damage`/`shields`: es un total de bando). Inicializado a 0 en `freshSide`. Se
  resetea en `reset()` para ambos bandos, igual que `rerollsUsed`.
- **Interacción de un solo clic**: a diferencia de daño/escudo (seleccionar dado → elegir objetivo,
  vía `selection`/`applyDieTo`), resolver un dado de recurso no pasa por ese flujo de selección: un
  clic en el dado del pool lo resuelve directamente (incrementa `resources` del bando dueño del
  dado, retira el dado del pool).
- **Con `selection !== null`** (hay un dado de daño/escudo esperando objetivo): los dados `1R`
  quedan deshabilitados (igual visualmente que un dado no accionable), en cualquier bando, hasta
  que la selección se resuelva o se cancele. Evita el riesgo de reindexar `selection.poolIndex` al
  filtrar el pool si se resolviera un `1R` a mitad.
- **`DicePool.tsx`**: los dados `1R` deben ser "accionables" (clicables) igual que daño/escudo, pero
  con un manejador distinto (resolución directa, no `selectDie`).
- **UI**: mostrar el contador de recursos del bando en algún punto de `BattleSide` (p. ej. junto al
  título "Enemigo"/"Jugador" o junto al pool), no en cada `CharacterCard` (no es por personaje).
- Priorizar **test unitario** de `parseResource` (sin función de tope que testear: la suma es
  directa, sin máximo, a diferencia de `addShields`), manteniendo el patrón de SPEC-005 de motor
  puro + tests antes que solo playtest.

## Nota de tamaño (regla 4 CLAUDE.md)

Toca: `damage.ts` (parseResource), `gameStore.ts` (estado `resources` por bando, nueva acción de
resolución de un solo clic, ajuste de `reset()`/`freshSide()`), `DicePool.tsx` (dados `1R`
accionables con su propio manejador), `App.tsx`/`BattleSide` (mostrar el contador). Alcance más
pequeño que SPEC-005 (sin selección de objetivo, sin tope, sin interacción con el motor de daño);
no se espera superar ~300 líneas ni necesitar división.

## Resultado del playtest

2026-07-20: playtest manual completo, jugado en GitHub Pages (https://pablodabernal.github.io/SWDestiny/).
Todos los criterios y casos límite pasaron: resolver `1R`/`2R` de un solo clic suma al contador
💰 del bando dueño y retira el dado del pool, contador acumulativo sin tope, dados de recurso
deshabilitados en ambos pools mientras hay una selección de daño/escudo pendiente, Reset vacía los
recursos de ambos bandos (a diferencia de vida/escudos), reimportar pone a 0 solo el bando
reimportado; regresión SPEC-001 a SPEC-005 sin problemas. Confirmado por el usuario.

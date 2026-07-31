# SPEC-043: Red de seguridad — tests del store (turnos, activación, resoluciones)

**Estado:** Pendiente
**Sección del GDD:** ninguna (no cambia el juego; es deuda técnica del SDD)
**Depende de:** SPEC-025 (máquina de turnos), y en general todo lo ya implementado en
`src/store/gameStore.ts`

## Qué es (2-4 líneas)

**No cambia nada de lo que se juega.** Es la red de seguridad que falta antes de operar el corazón del
juego: hoy el store de Zustand —turnos, activación, resoluciones, mantenimiento— **no tiene un solo
test**, y SPEC-042 va a diferir el cambio de turno de `activate()` y a generalizar la maquinaria de
Focus, las dos cosas sobre código ya jugado. Esta spec fija el comportamiento actual en tests para que,
si SPEC-042 lo rompe, salte aquí y no en tu partida.

## Por qué ahora (y no antes)

Señalado por `revisor-codigo` al revisar SPEC-025 (2026-07-23) y anotado en el BACKLOG desde entonces:
el proyecto solo tiene tests de funciones puras (`src/game/*.test.ts`, `src/import/*.test.ts`), ninguno
del store. Se ha ido posponiendo bien, porque hasta ahora las specs **añadían** encima. SPEC-042 es la
primera que va a **modificar** la máquina de turnos, y el aviso de la revisión de SPEC-042 lo dejó
claro. Es el momento.

## Criterios de aceptación

Esta spec **no se verifica jugando**, se verifica con `npm test` en verde. Es la excepción explícita a
la regla 3 de CLAUDE.md, acordada con el usuario (2026-07-31): no hay nada que jugar porque no cambia
ningún comportamiento. Lo que sí debe cumplirse:

- [ ] `npm test` sigue en verde, con los **195 tests actuales intactos** más los nuevos.
- [ ] Los tests nuevos son del **store**, no de funciones puras: se llama a `useGameStore.getState()`
      y se comprueba el estado resultante.
- [ ] Cada test es **determinista**: la aleatoriedad de las tiradas se fija (stub de `Math.random` o
      del `rng` inyectable de `src/game/roll.ts`), y el estado se resetea entre tests.
- [ ] **Ningún test toca la red ni depende de `localStorage`** real.
- [ ] Si alguien rompe la máquina de turnos, **falla al menos un test con un nombre que lo explica**
      (verificable rompiendo algo a propósito y viendo qué salta).

## Qué se cubre

Lo mínimo para que SPEC-042 se pueda hacer con red, no cobertura total:

- **Turnos (SPEC-025)**: tras una acción el turno pasa al rival; `pass` cede sin hacer nada; **dos
  pases consecutivos** disparan el mantenimiento (roba, +2 recursos, nueva ronda) y devuelven el turno
  al jugador; un pase suelto **no** lo dispara.
- **`activate()`**: activar tira los dados del personaje al pool y **pasa el turno** (el
  comportamiento atómico que SPEC-042 va a cambiar: este test es justo el que debe hacerse cambiar a
  conciencia, no romperse por accidente); activar **fuera de tu turno** no hace nada; activar un
  personaje **ya activado** o **KO** no hace nada.
- **Guardas de exclusión mutua**: con una resolución abierta (`resolve`), con una mejora pendiente de
  objetivo (`playUpgrade`) o con un mulligan sin confirmar (`mulligan`), las demás acciones de turno
  **no tienen efecto**.
- **Fin de partida**: con `outcome !== null`, ninguna acción de turno tiene efecto.
- **Resolución de daño**: un dado de daño aplicado a un personaje enemigo baja su vida y, al llegar a
  0, lo deja KO; el KO del último personaje de un bando fija Victoria/Derrota.
- **Focus (SPEC-023)**: el flujo `pickFocusTarget` → `chooseFocusFace` → `confirmFocus` gira el dado
  elegido y consume los dados de Focus marcados; el presupuesto (`sumPlayerMarked`) limita cuántos
  dados se pueden elegir. *(Esta es la maquinaria que SPEC-042 va a generalizar, así que interesa
  especialmente tenerla clavada.)*

## Fuera de alcance (explícito)

- **Cobertura completa del store**: no se persigue un porcentaje. Solo lo que SPEC-042 va a tocar y
  las invariantes de turno que ya han fallado antes.
- **Tests del autómata**: `src/game/automaton.test.ts` ya tiene 98 tests de sus funciones puras. Su
  bucle dentro del store (`enemyTurn`) queda fuera salvo lo que caiga de refilón en los de turnos.
- **Tests de componentes React** (`DbSection`, `UpdateBanner`, `ImageDownload`…): no entra montar
  Testing Library. Sería otra spec y otra decisión.
- **Refactorizar el store** para hacerlo más testeable: los tests se escriben contra el código **tal
  como está hoy**. Si algo resulta intestable sin tocarlo, se anota y se decide aparte — cambiar el
  código y sus tests a la vez anularía el sentido de esta red.

## Casos límite

- **El store es un singleton de módulo**: hay que poder devolverlo a un estado conocido entre tests
  (usar `resetAll`/`startGame`, o recargar el módulo). Si no se resetea bien, los tests se contaminan
  entre sí y la red no vale nada.
- **`localStorage` no existe en el entorno de tests** (vitest corre en node): hoy los accesos van en
  `try/catch` y degradan a vacío, así que **debería** funcionar sin `jsdom`. Verificarlo al empezar;
  si algún camino peta, se añade un stub mínimo, no se cambia el store.
- **Tiradas aleatorias**: sin fijar el azar, un test de daño falla un día de cada tres. Todo test que
  active personajes debe fijar el `rng`.

## Notas técnicas

- Fichero(s) nuevos `src/store/gameStore.test.ts` (o varios por tema si crece), al lado del código,
  como ya se hace en `src/game/` y `src/import/`.
- `useGameStore` es un store de Zustand: fuera de React se usa `useGameStore.getState()` y
  `useGameStore.setState()`, sin necesidad de renderizar nada.
- Para montar una partida de prueba, reutilizar los **mazos precargados** (`src/data/decks.ts`,
  SPEC-031) en vez de inventar fixtures: son datos reales y ya cargan offline desde el snapshot.

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña-media y de riesgo bajo: no toca código de producción, solo añade ficheros de test. El único
riesgo real es descubrir que algo del store no es testeable sin refactor; si pasa, se anota y se
decide, no se arregla sobre la marcha.

## Resultado del playtest

No aplica: esta spec no cambia nada jugable. Se da por completada con `npm test` en verde y los tests
nuevos fallando cuando deben (comprobado rompiendo algo a propósito).

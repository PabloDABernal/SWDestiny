# SPEC-002: Activar personajes y tirar sus dados a un pool

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §3 (pool de dados, símbolos, fases de acción), §5 (alcance v1)
**Depende de:** SPEC-001 (mazo importado con personajes y sus dados)

## Qué es (2-4 líneas)

Con un mazo ya importado, el jugador pulsa "Activar" en un personaje y todos los dados de ese
personaje se **tiran** (cada dado cae en una de sus 6 caras al azar) y aparecen en un **pool de
dados** compartido en pantalla. Un personaje activado queda marcado y no puede volver a activarse
hasta pulsar "Reset", que vacía el pool y deja a todos los personajes listos otra vez. Las caras
se muestran crudas; no se resuelve ningún efecto todavía.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Con el mazo Unduli importado, el jugador pulsa **Activar** en Luminara Unduli → aparecen
      **2 dados** en el pool, cada uno mostrando una de las 6 caras de Unduli.
- [ ] El jugador pulsa **Activar** en un Clone Trooper → se **añade 1 dado** más al pool (el pool
      acumula: ahora 3 dados). El otro Clone sigue sin activar.
- [ ] Un personaje ya activado muestra su botón **deshabilitado / marcado como activado** y no
      puede volver a tirar.
- [ ] La cara que sale es de las 6 caras de ese dado y **varía** entre tiradas (al resetear y
      reactivar, no siempre sale la misma).
- [ ] El jugador pulsa **Reset** → el pool queda **vacío** y todos los personajes vuelven a estar
      **activables**.
- [ ] Con parte de los personajes activados y parte no (caso mixto), pulsar **Reset** deja a
      **todos** activables por igual (no solo a los que quedaban).
- [ ] Las caras del pool se muestran **crudas** (p. ej. `2MD`, `1R`, `-`, `Sp`), sin aplicar
      ningún efecto (la vida de los personajes no cambia).

## Fuera de alcance (explícito)

- **Resolver daño o cualquier efecto** de las caras (melee/ranged/indirecto → vida, recurso,
  focus, disrupt, escudo, especial). Solo se muestran. Será una spec posterior.
- **Reroll, focus y resolución de especiales** — nada de re-tirar ni cambiar caras.
- **Manipular el pool a mano** — no se pueden retirar dados sueltos; solo Activar y Reset.
- **El enemigo** y su tirada (llega con el autómata; aún no hay mazo enemigo).
- Sistema real de **rondas/turnos/fases** — "Reset" es un stand-in manual, no el mantenimiento
  reglamentario.

## Casos límite

- **Reset con el pool vacío / nadie activado** → no pasa nada malo, todo sigue activable.
- **Activar cuando no hay mazo importado** → no hay personajes que activar; no debe romper
  (pantalla de roster vacía como en SPEC-001).
- **Cara en blanco (`-`)** → se muestra como un dado más en el pool con su símbolo `-`, no se
  omite.
- **"La cara varía"** no es una prueba estadística: en el playtest basta con observar que en
  varias tiradas manuales (reset + reactivar) no sale siempre la misma cara. No se exige "siempre
  distinto".
- **Todos los personajes activados** → todos los botones deshabilitados; solo Reset reactiva.
- **Recargar la página** → ver Notas técnicas (decisión de persistencia del estado de tirada).

## Notas técnicas (opcional)

- Aleatoriedad: cada dado elige **una cara uniforme** entre sus 6 (`sides`). Función de tirada
  aislada (pura salvo la fuente de azar) para poder testear la distribución/selección.
- Modelo: el pool es estado de partida en el store Zustand existente (`gameStore`). Un dado en el
  pool referencia de qué personaje/carta salió y qué cara mostró.
- Estado de activación por personaje (p. ej. `activated: boolean`) en el modelo de partida, no en
  el `Character` importado/persistido de SPEC-001 (ese es el "molde"; la activación es estado de
  la sesión de juego).
- **Identidad de instancia**: los dos Clone Trooper comparten `code`, así que NO se puede
  identificar una ficha por su código. Se identifica cada instancia por su **índice en el array
  `characters`** (o un id de sesión asignado al iniciar la partida). El estado de activación y los
  dados del pool referencian ese índice/id, no el `code`.
- **Persistencia**: el pool y las activaciones son estado de partida efímero; **no** se persisten
  en localStorage (recargar deja el pool vacío y todos activables). Solo el mazo importado
  persiste (SPEC-001). Confirmar en implementación que esto no rompe el criterio de recarga de
  SPEC-001.

## Nota de tamaño (regla 4 CLAUDE.md)

Toca `gameStore.ts` (estado `pool`/`activated` + acciones `activate`/`reset`), un módulo nuevo de
tirada pura, el botón Activar en `CharacterCard.tsx` y un componente nuevo de pool. Debería caber
en ~300 líneas; confirmar al empezar a implementar y, si se dispara, separar pool-view de la
lógica de tirada.

## Resultado del playtest

2026-07-17: playtest manual completo. Todos los criterios y casos límite pasaron (activar/pool
acumulativo, no-reactivable, Reset incl. caso mixto, no persistencia + regresión SPEC-001).
Confirmado por el usuario.

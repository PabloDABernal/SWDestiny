# SPEC-004: Importar mazo enemigo, dos bandos y fin de partida por KO

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §2 (jugador vs enemigo, ambos con mazo), §3 (condiciones de victoria), §5 (v1)
**Depende de:** SPEC-001 (importar), SPEC-002 (activar/pool), SPEC-003 (daño/KO)

## Qué es (2-4 líneas)

El jugador importa **dos** mazos: el suyo y el del **enemigo**. La pantalla muestra **dos bandos**
(enemigo arriba, jugador abajo), cada uno con sus personajes. El jugador activa y tira solo los
dados de **sus** personajes (a **su** pool); los dados de daño solo pueden aplicarse a personajes
del **bando contrario**. El enemigo es de momento **pasivo** (no se activa ni tira). Cuando un
bando se queda **sin personajes en pie** (todos KO), se muestra **Victoria** (si cae el enemigo) o
**Derrota** (si cae el jugador).

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] El jugador importa su mazo en un panel y el mazo enemigo en otro → se ven **dos bandos**
      separados: enemigo arriba, jugador abajo, cada uno con sus fichas.
- [ ] El jugador pulsa **Activar** en un personaje **suyo** → sus dados van a **su** pool. Los
      personajes del **enemigo no tienen botón Activar** (pasivos).
- [ ] Con un dado de daño del pool del jugador seleccionado, solo las fichas del **enemigo** son
      objetivo válido; las fichas **propias** no son seleccionables como objetivo.
- [ ] Aplicar daño a un enemigo baja su vida / lo deja KO igual que en SPEC-003 (consume el dado,
      clamp a 0, retira dados del KO de su pool).
- [ ] Cuando **todos** los personajes del enemigo están KO → aparece mensaje de **Victoria** y no
      se puede seguir aplicando daño.
- [ ] Recargar la página mantiene **ambos** mazos importados (cada uno persiste); el estado de
      partida (pools, activaciones, daño, fin) se pierde, como en specs anteriores.
- [ ] Importar de nuevo un mazo (cualquiera de los dos) reinicia el estado de partida de ese bando
      a vida completa y limpia el fin de partida.

## Fuera de alcance (explícito)

- **Autómata / IA del enemigo** (tabla de prioridades): el enemigo no juega aún; es SPEC-004b.
- **Trampas / dificultad** (multiplicador de vida enemiga, reroll extra) — con el autómata.
- **Que el enemigo tire dados o haga daño al jugador** — pasivo en esta spec. En consecuencia la
  **Derrota** no es alcanzable jugando a mano todavía (nada daña al jugador); la lógica se
  implementa, pero solo se disparará cuando el autómata ataque (SPEC-004b).
- Recursos, mano, cartas jugables, escudos, campo de batalla (v2+).
- Emparejamiento/selección de mazos de una lista: se pegan a mano como en SPEC-001.

## Casos límite

- **Solo un mazo importado** (falta el enemigo o el jugador) → se ve ese bando; no hay fin de
  partida ni objetivos del bando ausente. No debe romper.
- **Importar enemigo cuando ya había partida en curso** → reinicia el estado del bando enemigo
  (vida completa, sin KO) y limpia el fin de partida; el bando del jugador se mantiene.
- **Importar el mazo del jugador con partida en curso** (caso simétrico) → reinicia el estado del
  bando jugador (vida completa, sin KO, pool y activaciones vacíos) y limpia el fin de partida; el
  bando enemigo se mantiene.
- **Alcanzar Victoria con un dado seleccionado** (modo "elegir objetivo" a medias) → la selección
  se cancela; no quedan objetivos válidos.
- **Aplicar daño tras la Victoria** → bloqueado (no hay más objetivos; el mensaje permanece).
- **Mismo personaje en ambos bandos** (p. ej. los dos importan Clone Trooper) → son instancias
  independientes por bando; el daño a un bando no afecta al otro.
- **Enemigo sin personajes** (mazo raro sin characters) → ya lo cubre SPEC-001 (error de import
  "sin personajes"); no llega a pintarse un bando vacío.
- **Recargar** → ambos mazos siguen; pools/daño/fin se pierden.

## Notas técnicas (opcional)

- **Refactor a estado por bando.** El estado de partida pasa de plano a dos lados. Sugerencia:
  `type Side = 'player' | 'enemy'` y por cada bando `{ characters, activated, damage, pool }`. El
  pool deja de ser único: cada bando tiene el suyo (el enemigo no lo llena aún). Ajustar
  SPEC-002/003 a esta estructura sin cambiar su comportamiento dentro de un bando.
- **Persistencia**: dos claves separadas (p. ej. `swd:deck:player`, `swd:deck:enemy`). El resto
  (pools, activaciones, daño, fin) sigue sin persistir.
- **Selección de dado y objetivo**: el dado seleccionado pertenece al pool de un bando; solo son
  objetivo válido las fichas del bando **contrario** y no-KO. En esta spec solo el jugador tiene
  pool, así que en la práctica el daño va jugador→enemigo.
- **Fin de partida**: `outcome: 'victory' | 'defeat' | null`. Victoria cuando todas las instancias
  enemigas están KO; Derrota cuando lo están las del jugador. Recalcular tras cada daño. Bloquear
  `applyDamageTo` (y cancelar la selección de dado) si `outcome !== null`.
- **Validación de la Derrota** (no jugable a mano en esta spec): comprobarla con **test unitario**
  del cálculo de `outcome` (simulando daño al bando jugador en el store/función pura), ya que la
  UI no permite dañar el propio bando. El revisor de código verifica esto por test, no por
  playtest.
- Identidad de instancia por índice **dentro de su bando** (los Clone comparten `code`), coherente
  con SPEC-002/003.

## Nota de tamaño (regla 4 CLAUDE.md)

Es un refactor transversal (store por bando, dos ImportPanel, layout de dos zonas, restricción de
objetivo por bando, fin de partida). Muy probablemente **>300 líneas**. Al empezar a implementar,
valorar dividir en: **(004a-1)** refactor a estado por bando + segundo import + layout; **(004a-2)**
restricción de daño al bando contrario + fin de partida (Victoria/Derrota).

**Decisión:** se intenta implementar de una sola vez; si a mitad se confirma que supera ~300
líneas de cambios, se corta por la división 004a-1 / 004a-2 de arriba y la segunda mitad pasa a
su propia sesión.

## Resultado del playtest

2026-07-19: playtest manual completo. Todos los criterios y casos límite pasaron (dos bandos +
import por bando, enemigo pasivo, daño solo al contrario, KO, Victoria y bloqueo posterior,
reimport por bando reinicia + limpia outcome, recarga mantiene ambos mazos; Reset no deshace el
fin; regresión SPEC-001/002/003). Derrota cubierta por test unitario. Confirmado por el usuario.

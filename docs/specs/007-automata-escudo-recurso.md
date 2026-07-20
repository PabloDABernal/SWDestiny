# SPEC-007: El autómata resuelve sus propios dados de escudo y de recurso

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §4 (tabla de prioridades del autómata), §5 (v2: escudos y recursos)
**Depende de:** SPEC-004b (autómata + tabla de prioridades), SPEC-005 (escudos), SPEC-006 (recursos)

## Qué es (2-4 líneas)

Hoy el autómata enemigo ignora los dados de **escudo** (`NSh`) y de **recurso** (`NR`) que le
salen: se quedan inertes en su pool. Esta spec amplía su tabla de prioridades para que también los
resuelva: un dado de escudo lo aplica a su aliado no-KO de **menor vida restante**; un dado de
recurso suma al **contador de recursos del bando enemigo**. Todo dentro del flujo de "Turno
enemigo" (una acción legal por pulsación) ya existente.

## Nueva tabla de prioridades (reemplaza la de SPEC-004b)

De arriba abajo, primera acción legal:

1. **Atacar**: dado de daño de mayor valor → personaje del jugador no-KO de menor vida restante.
2. **Resolver escudo**: si hay dado de escudo en su pool, aplicar el de mayor valor a su aliado
   no-KO de **menor vida restante** (mismo desempate determinista que el ataque).
3. **Activar**: personaje enemigo no-KO sin activar de mayor vida restante.
4. **Resolver recurso**: si hay dado de recurso en su pool, resolver el de mayor valor sumándolo al
   contador de recursos del bando enemigo.
5. **Reroll**: 2+ blancos → reroll gratuito, luego el reroll extra de la trampa.
6. **Pasar**.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Con un dado de **escudo** (`1Sh`/`2Sh`/`3Sh`) en el pool enemigo y **sin** dados de daño →
      pulsar "Turno enemigo" aplica ese escudo a un personaje enemigo no-KO de **menor vida
      restante**; ese personaje muestra sus escudos (tope 3) y el dado desaparece del pool enemigo.
- [ ] Si el enemigo tiene a la vez dado de daño y dado de escudo → **primero ataca** (prioridad 1);
      el escudo se resuelve en una pulsación posterior, cuando ya no queden dados de daño.
- [ ] Con un dado de **recurso** (`1R`/`2R`) en el pool enemigo, sin daño, sin escudo y sin
      personajes por activar → pulsar "Turno enemigo" **suma** esa cantidad al contador de recursos
      del enemigo (visible) y el dado desaparece de su pool.
- [ ] El escudo del enemigo **absorbe daño** del jugador igual que el del jugador (SPEC-005): al
      pegar a un enemigo con escudos, primero bajan los escudos y el sobrante va a vida.
- [ ] Aplicar un escudo que superaría 3 deja al personaje en **3** (excedente perdido, dado
      consumido igual), como en SPEC-005.
- [ ] Cuando no hay nada que atacar, escudar, activar, generar recurso ni rerollear → el enemigo
      **pasa** (mensaje de "pasa").

## Fuera de alcance (explícito)

- **Gastar recursos** del enemigo: solo los **genera** (sube el contador). Gastar sigue fuera
  (falta confirmar el formato de coste en ARH DB; ya anotado en BACKLOG).
- **Focus, especial, disrupt, descarte**: el autómata sigue sin resolverlos; esta spec solo añade
  escudo y recurso.
- **Cómo juega el jugador**: la resolución manual de escudo/recurso del jugador (SPEC-005/006) no
  cambia.
- Selector de dificultad de trampas (sigue en BACKLOG).

## Casos límite

- **Dado de escudo pero todos los aliados no-KO... siempre hay al menos uno** si el enemigo aún
  juega (si estuvieran todos KO habría Derrota→fin). Si por alguna razón no hay objetivo válido, el
  paso 2 no aplica y se evalúa el siguiente de la tabla.
- **Varios dados de escudo / recurso a la vez** → se resuelve **uno por pulsación** (el de mayor
  valor primero), coherente con "una acción legal por Turno enemigo".
- **Empate de aliados en vida mínima** para el escudo → desempate determinista (mismo criterio que
  el objetivo de ataque), no aleatorio.
- **Recurso y reroll disponibles a la vez** → primero recurso (prioridad 4 antes que reroll).
- **Reset** → vacía pool y contador de recursos del enemigo (SPEC-006), igual que antes; los
  escudos ya aplicados **no** se curan con Reset (SPEC-005).
- **"Turno enemigo" con una selección del jugador pendiente** (dado de daño/escudo propio a medio
  seleccionar) → el autómata resuelve su acción con normalidad, incluida la de recurso (ver la nota
  técnica del guard); no debe fallar en silencio ni mentir en `lastEnemyAction`. La selección del
  jugador se mantiene o se cancela, pero nunca bloquea la acción del enemigo.

## Notas técnicas (opcional)

- Ampliar `AutomatonAction` con `{ type: 'shield'; dieIndex; targetIndex }` y
  `{ type: 'resource'; dieIndex }`. `nextAutomatonAction` (función pura) evalúa la nueva tabla.
- Reutilizar `parseShield` / `parseResource` (`src/game/damage.ts`) para detectar y valorar caras.
- Selección de dado: "de mayor valor" como en `highestDamageDieIndex` (helpers análogos
  `highestShieldDieIndex` / `highestResourceDieIndex`).
- Objetivo de escudo: reutilizar `lowestHealthTargetIndex` pero sobre el **propio** bando enemigo.
- `enemyTurn` (store) ejecuta las nuevas acciones reutilizando la resolución de escudo/recurso ya
  usada por el jugador (SPEC-005/006), fijando `lastEnemyAction` con un mensaje descriptivo.
- **Ojo (recurso)**: la acción pública `resolveResource(side, poolIndex)` del store lleva un guard
  `if (selection !== null) return` pensado para el flujo de clic del jugador. El autómata NO debe
  invocar esa acción tal cual (fallaría en silencio si el jugador tuviera una selección abierta, y
  aun así se fijaría `lastEnemyAction`). Extraer una **función pura** análoga a la del escudo (sin
  el guard de `selection`) y que la usen tanto `enemyTurn` como la acción del jugador.
- Mantener el determinismo: la función pura no tira dados (los rerolls/tiradas los hace el store).

## Nota de tamaño (regla 4 CLAUDE.md)

Contenida: dos ramas nuevas en `nextAutomatonAction`, dos helpers de selección, dos casos en
`enemyTurn`, y tests. Muy por debajo de 300 líneas; una sola rebanada.

## Resultado del playtest

2026-07-20: playtest manual OK (mazo enemigo Unduli 15040 con caras 2MD/2Sh/1R). Confirmado que el
autómata ataca > escuda a su aliado de menor vida > activa > genera recurso > reroll > pasa, una
acción por pulsación de "Turno enemigo". revisor-codigo: CUMPLE. Confirmado por el usuario.

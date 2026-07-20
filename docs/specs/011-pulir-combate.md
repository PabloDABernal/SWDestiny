# SPEC-011: Pulir combate — +2 recursos por ronda y daño multi-objetivo

**Estado:** Pendiente
**Sección del GDD:** §3 (resolver dados), §5 (v2: recursos)
**Depende de:** SPEC-009 (Nueva ronda / recursos), SPEC-008a/010 (resolución de dados)

## Qué es (2-4 líneas)

Dos ajustes de fidelidad al combate ya existente: (1) **"Nueva ronda" da +2 recursos** a cada bando
(el mantenimiento reglamentario, RR pg 19/25); y (2) **daño multi-objetivo**: al resolver dados del
mismo símbolo puedes mandar unos a un enemigo y otros a otro (sin cerrar el modo tras cada
aplicación). No se puede dividir el daño de **un** dado entre dos (eso ya está bien).

## Reglas (fijadas con el usuario)

### +2 recursos por ronda
- **"Nueva ronda"** pasa a ser el mantenimiento: además de re-tirar dados (vaciar pools/activaciones/
  rerolls), **suma +2** al contador de recursos de **cada** bando, sobre lo que ya tuvieran (persisten,
  SPEC-009). Sin tope. Sigue sin curar vida/escudos ni deshacer el fin; sigue siendo no-op si la
  partida terminó.
- **Corrige SPEC-009**, que dejó "Nueva ronda" sin tocar recursos (el +2 estaba pospuesto). "Reset
  total" sigue poniendo los recursos a 2 (estado inicial), no +2.

### Daño multi-objetivo (depura SPEC-008a/010)
- Al resolver una tanda (marcar dado(s) del mismo símbolo → aplicar a un objetivo), el **modo NO se
  cierra**: queda abierto (mismo símbolo, `marked` vacío) para marcar y aplicar **otra** tanda a
  **otro** objetivo. Así unos dados van a un enemigo y otros a otro, todos en la misma "resolución".
- Sigue valiendo marcar **varios a un mismo** objetivo (suman) — no cambia. Lo que no se puede es
  dividir el daño de **un** dado.
- El modo se **cierra solo** cuando ya no queda en el pool ningún dado seleccionable de ese símbolo;
  o con **Cancelar** / "Nueva ronda" / "Reset total".
- Aplica igual a **escudo** (repartir escudos entre aliados) y **recurso** (aunque el recurso no
  tiene objetivo, tras "Resolver recursos" el modo se cierra si no quedan más dados de recurso).

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Con 💰 3 y pulsando **"Nueva ronda"** → 💰 pasa a **5** (ambos bandos ganan +2); el pool se
      re-tira. Pulsarla otra vez → 💰 7.
- [ ] **"Reset total"** deja 💰 en **2** (no +2 sobre lo anterior).
- [ ] "Nueva ronda" tras Victoria/Derrota sigue siendo **no-op** (no da +2).
- [ ] Marco un dado de daño melee → aplico a **Enemigo A** (baja su vida) → el modo **sigue abierto**
      (barra "Resolviendo: daño melee") → marco otro dado melee → aplico a **Enemigo B**: cada uno a
      su objetivo, mismo turno.
- [ ] Sigo pudiendo marcar **varios** dados melee y mandarlos **al mismo** enemigo (suman), como antes.
- [ ] Cuando ya no queda ningún dado **base** de ese símbolo en el pool tras aplicar (aunque queden
      **modificadores** sueltos, que solos no se resuelven), el modo se **cierra** solo.
- [ ] **Cancelar** cierra el modo en cualquier momento sin aplicar los marcados.
- [ ] Modificadores y costes (SPEC-010) siguen funcionando dentro de cada tanda (base+modificador a un
      objetivo; coste de recurso/indirecto se pagan por tanda).

## Fuera de alcance (explícito)

- **El autómata** combinando modificadores o pagando costes: sigue en BACKLOG (no entra aquí).
- Dividir el daño de **un** dado entre varios objetivos: no se permite (ni se permitía).
- Focus, disrupt, descarte, especial: fuera.

## Casos límite

- **Aplicar y quedarse el modo con 0 marcados** → la barra muestra "Resolviendo: … (0 marcado/s)";
  marcar otro dado continúa; si no quedan dados del símbolo, se cierra.
- **Coste indirecto en una tanda multi-objetivo** → el paso 2 (receptor) sigue igual; tras
  completarlo, el modo queda abierto para más tandas del mismo símbolo.
- **"Nueva ronda" con recursos altos** → +2 sin tope.
- **Bando sin recursos previos** (0) → "Nueva ronda" lo deja en 2 (0+2).
- **Recargar** no cambia (estado de sesión; el mazo persiste, recursos a 2 al reconstruir).

## Notas técnicas (opcional)

- `newRound()` (store): además de vaciar dados, `resources: s.resources + 2` en ambos bandos.
  `resetAll()` no cambia (freshSide → 2). Ajustar la nota de SPEC-009 en GDD/SDD.
- Resolución (SPEC-010): en `applyDieTo`/`resolveResources`, tras un `resolvePlayerBatch` con éxito,
  en vez de `resolve: null`, **mantener el modo**: `resolve: { side, symbol, marked: [], pendingEffect:
  null }`, **salvo** que (a) el nuevo `outcome !== null` (partida terminada), o (b) en el nuevo pool
  **del bando que resuelve** ya no quede ningún dado **base** de ese símbolo (`parsePlayerFace` con
  `symbol === mode.symbol && !isModifier`; un modificador solo no se resuelve) → entonces
  `resolve: null`. El chequeo (b) se hace sobre `nextSides[mode.side].pool`, no sobre el del objetivo.
- Cuidado: al mantener el modo, los índices de `marked` se limpian (evita índices obsoletos tras
  consumir dados). El siguiente marcado parte de los índices nuevos del pool.
- El autómata (`enemyTurn`) no se toca.

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña: `newRound` (+2), y cambiar el cierre del modo por "mantener si quedan dados del símbolo" en
dos acciones. Muy por debajo de 300 líneas.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

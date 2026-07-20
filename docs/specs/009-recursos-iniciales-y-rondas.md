# SPEC-009: Recursos iniciales, persistencia entre rondas y separar "Nueva ronda" / "Reset total"

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §3 (recursos, fases), §5 (v2: recursos)
**Depende de:** SPEC-006 (recursos) — **corrige** su comportamiento de Reset. SPEC-002 (pool/activar).

## Qué es (2-4 líneas)

Corrige la fidelidad de los recursos (RR pg 19/25): cada bando **empieza con 2 recursos** al importar
y los recursos **persisten** entre rondas (no se vacían). Además separa el botón actual en dos: **"Nueva
ronda"** (solo re-tira dados, mantiene todo lo demás, para seguir jugando/testeando) y **"Reset
total"** (devuelve TODO al estado inicial sin reimportar).

## Contexto: qué corrige de SPEC-006

SPEC-006 vaciaba el contador de recursos con "Reset", con la justificación (errónea) de que "los
recursos no se acumulan entre rondas". El reglamento dice lo contrario: los recursos **no gastados
se conservan** y se ganan +2 en cada mantenimiento. Esta spec lo arregla. *(Ganar +2 por ronda
automáticamente se pospone: va atado al ciclo real de mantenimiento/reclamar, aún no implementado;
"Nueva ronda" NO añade recursos por ahora.)*

## Reglas (fijadas con el usuario)

- **Al importar** un mazo, ese bando arranca con **2 recursos**. Aplica a **ambos** bandos.
- Los recursos **persisten**: gastarlos (SPEC-008b) los baja; generarlos (caras `R`, SPEC-006) los
  sube; nada más los toca.
- **"Nueva ronda"**: re-tira dados. Vacía los **pools** y las **activaciones** de ambos bandos (y
  restablece los rerolls del autómata). Limpia el modo de resolución en curso (`resolve`), el aviso
  (`resolveError`) y el mensaje del autómata (`lastEnemyAction`). **NO** toca recursos, vida,
  escudos, KO ni el fin de partida. **Es no-op si la partida ya terminó** (`outcome` ≠ null): con la
  partida acabada solo "Reset total" reinicia.
- **"Reset total"**: devuelve TODO al estado inicial de los mazos ya importados (sin volver a pegar
  JSON): pools y activaciones vacíos, **vida completa**, **sin escudos**, **sin KO**, **recursos a
  2**, sin fin de partida; limpia `resolve`/`resolveError`/`lastEnemyAction`. No borra los personajes
  importados. Con ambos bandos vacíos es no-op (no crea personajes, no rompe).

## Botones (fijado)

- Barra de controles superior: **"Nueva ronda"**, **"Reset total"**, **"Turno enemigo"**.
- Además, un botón **"Nueva ronda"** junto al pool del jugador (comodidad, el más usado al testear;
  sustituye al "Reset" que había ahí).

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Al importar el mazo del jugador, su contador muestra **💰 2**. Igual el enemigo al importarlo.
- [ ] Genero/gasto recursos y pulso **"Nueva ronda"** → los recursos **se mantienen** (no cambian);
      el pool se vacía y los personajes vuelven a ser activables.
- [ ] Tras hacer daño/escudos a personajes, **"Nueva ronda"** **no** cura vida ni quita escudos ni
      revive KOs; solo re-tira dados.
- [ ] **"Reset total"** → vida completa, sin escudos, sin KO, recursos a **2**, pools vacíos,
      personajes activables, sin banner de fin; el mazo importado sigue (no hay que reimportar).
- [ ] Con recursos acumulados (p. ej. 💰 3), pulsar "Nueva ronda" varias veces **no** los baja.
- [ ] **Reimportar** un mazo con recursos acumulados → ese bando vuelve a **💰 2** (sustituye el
      criterio de SPEC-006 que lo ponía a 0).
- [ ] "Reset total" tras una Victoria/Derrota → limpia el fin de partida (se puede volver a jugar).
- [ ] Tras Victoria/Derrota, **"Nueva ronda"** no hace nada (el banner sigue; solo "Reset total"
      reinicia).
- [ ] Recargar la página → cada bando con mazo vuelve a **💰 2** (estado inicial reconstruido); un
      bando sin mazo muestra 0.

## Fuera de alcance (explícito)

- **Ganar +2 automáticamente por ronda / mantenimiento reglamentario / reclamar battlefield**: se
  pospone (atado al ciclo de ronda real). "Nueva ronda" no añade recursos.
- **El autómata gastando recursos**: sigue fuera; solo los tiene/genera.
- Robo, mano, mazo, deck-out: fuera (v3).

## Casos límite

- **"Nueva ronda" sin nada activado / pool vacío** → no rompe; recursos intactos.
- **Bando sin mazo importado** → su contador no muestra recursos (0) hasta importar; "Reset total"
  con un bando vacío no crea personajes.
- **Recargar** → los recursos NO se persisten en localStorage (estado de sesión); tras recargar,
  cada bando importado vuelve a su estado inicial (2 recursos) al reconstruirse. Confirmar que
  recargar deja los contadores coherentes (2 si hay mazo, 0 si no).
- **"Reset total" no debe borrar** el mazo (los `characters` persistidos siguen).

## Notas técnicas (opcional)

- `freshSide(characters)` pasa a dar **2 recursos** si el bando tiene personajes (0 si está vacío),
  para que importar y "Reset total" dejen 2. El arranque del store con localStorage reutiliza esto.
- Renombrar/duplicar la acción `reset` del store: `newRound()` (solo pools/activaciones/rerolls,
  conserva `resources`/`damage`/`shields`/`outcome`) y `resetAll()` (reconstruye ambos bandos con
  `freshSide(characters)` y recalcula `outcome`). Ajustar `DicePool`/controles: dos botones.
- `newRound` NO debe tocar `resources` (hoy `reset` los ponía a 0 — ese es el bug). Mantener el
  vaciado de `rerollsUsed` (nueva ronda ⇒ reroll gratuito del autómata disponible otra vez).
- Revisar textos: los botones actuales ("Reset", "Reset (nueva ronda)") se sustituyen por "Nueva
  ronda" y "Reset total".

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña: cambiar `freshSide`, separar `reset` en `newRound`/`resetAll`, dos botones y ajustar tests.
Muy por debajo de 300 líneas.

## Resultado del playtest

2026-07-20: playtest manual OK. Confirmado: 2 recursos al importar (ambos bandos), "Nueva ronda"
solo re-tira dados (recursos/vida/escudos/KO intactos), "Reset total" vuelve al estado inicial
(recursos 2, vida llena, sin escudos/KO/fin) sin reimportar, reimportar vuelve a 2, "Nueva ronda"
no-op tras fin. revisor-codigo: CUMPLE. Confirmado por el usuario.

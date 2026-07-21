# SPEC-015: Selector de dificultad en la UI

**Estado:** Pendiente
**Sección del GDD:** §4 ("Asimetría / trampas" — "Selector de dificultad")
**Depende de:** SPEC-004b (trampas del autómata), SPEC-012 (patrón de validación de localStorage)

## Qué es (2-4 líneas)

Hoy el multiplicador de vida enemiga (x1.5) y el reroll extra de blancos (1) son constantes fijas
en el código; el jugador no puede cambiarlos. Con esta spec, junto al panel de importar del enemigo
aparece un selector con tres niveles — **Fácil** (x1 vida, 0 rerolls extra), **Normal** (x1.5 vida,
1 reroll extra — los valores de hoy) y **Difícil** (x2 vida, 2 rerolls extra) — que el jugador puede
cambiar libremente. La elección se recuerda entre recargas de página.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Junto al panel de importar del enemigo aparece un selector con las tres opciones (Fácil,
      Normal, Difícil); **Normal** es la opción por defecto la primera vez que se abre la app.
- [ ] Con **Fácil** seleccionado, al importar el mazo enemigo, la vida de sus personajes es la
      **misma** que la de la carta (sin multiplicar).
- [ ] Con **Normal** seleccionado (comportamiento de hoy), al importar el mazo enemigo, su vida sale
      multiplicada por **1.5** (redondeo hacia arriba, como ya pasa).
- [ ] Con **Difícil** seleccionado, al importar el mazo enemigo, su vida sale multiplicada por **2**.
- [ ] Cambiar el selector **después** de haber importado al enemigo no cambia la vida de la partida
      en curso; solo se aplica la próxima vez que se (re)importe el mazo enemigo.
- [ ] Con **Fácil**, el autómata **nunca** usa el reroll extra de la trampa (solo el gratuito de la
      tabla de prioridades, si aplica); con **Normal**, dispone de 1 reroll extra por ronda; con
      **Difícil**, de 2. Este efecto se aplica de inmediato al cambiar el selector (no depende de
      reimportar).
- [ ] Recargando la página, el selector mantiene la última opción elegida (persistida).

## Fuera de alcance (explícito)

- Trampas que aún no existen en v1 (ignorar costes de recursos, robo extra por ronda): siguen
  documentadas en el GDD como pendientes de v2/v4, no entran aquí.
- Cambiar el multiplicador/rerolls del **jugador**: el selector solo afecta al bando enemigo.
- Niveles adicionales o valores personalizables (un input numérico libre): solo los tres niveles
  fijos definidos.
- Recalcular con efecto retroactivo la vida ya multiplicada de personajes enemigos en una partida en
  curso al cambiar de nivel.

## Casos límite

- **Cambiar el selector con el enemigo ya importado y en pleno combate** → la partida en curso no
  cambia (vida ya aplicada se queda como está); el reroll extra sí cambia para el turno siguiente.
- **Recargar la página sin haber tocado nunca el selector** → Normal (valor por defecto), igual que
  el comportamiento actual.
- **Valor corrupto o inesperado en localStorage** (mismo espíritu que SPEC-012) → se descarta y se
  usa Normal por defecto, sin romper la carga de la app.
- **Reset total** → no cambia el nivel de dificultad elegido (es un ajuste de configuración, no de
  partida); solo "Reset total" reconstruye el mazo enemigo con el multiplicador **vigente en ese
  momento** en el selector (igual que una reimportación).

## Notas técnicas (opcional)

- `ENEMY_HEALTH_MULTIPLIER`/`ENEMY_EXTRA_REROLLS_PER_ROUND` (`src/game/automaton.ts`) dejan de ser
  constantes: se convierten en función de un nivel de dificultad (`'easy' | 'normal' | 'hard'`), p.
  ej. una tabla `DIFFICULTY_SETTINGS: Record<Difficulty, { healthMultiplier: number; extraRerolls:
  number }>`. `applyEnemyHealthMultiplier` pasa a recibir el multiplicador como parámetro en vez de
  usar la constante; `nextAutomatonAction` recibe `extraRerolls` en vez de usar
  `ENEMY_EXTRA_REROLLS_PER_ROUND` directamente (o se sigue leyendo de un valor en el estado global).
- Persistencia: misma clave/patrón que el mazo (`swd:difficulty` en `localStorage`), validando la
  forma igual que SPEC-012 (si no es uno de los tres valores válidos, usar `'normal'`).
- Estado: nuevo campo en el store (`difficulty: Difficulty`) con su setter; `importDeck('enemy', ...)`
  y `resetAll` leen el valor vigente al reconstruir el bando enemigo, en vez de la constante fija.
- UI: un `<select>` o grupo de botones junto a `ImportPanel` del enemigo (`src/components/
  ImportPanel.tsx` o al lado en `App.tsx`), sin bloquear la importación si ya hay mazo (solo
  advierte, si se quiere, que el cambio se aplicará a la próxima importación — la propia spec no
  pide un aviso explícito, es opcional).

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña/mediana: nuevo estado + persistencia (patrón ya conocido de SPEC-001/012) + un selector de
UI + sustituir dos constantes por valores derivados del nivel elegido. Sin lógica de combate nueva.

## Resultado del playtest

(pendiente)

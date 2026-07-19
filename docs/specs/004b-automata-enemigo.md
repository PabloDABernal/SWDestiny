# SPEC-004b: Autómata enemigo (tabla de prioridades) + trampas activas

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §4 (el autómata enemigo, tabla de prioridades y trampas), §5 (alcance v1: "autómata básico con trampas activas desde el inicio")
**Depende de:** SPEC-001 (personajes/dados), SPEC-002 (activar y tirar al pool), SPEC-003 (resolver daño con KO), SPEC-004 (dos bandos, fin de partida)

## Qué es (2-4 líneas)

El jugador pulsa un botón **"Turno enemigo"**. Cada pulsación hace que el autómata evalúe la tabla
de prioridades del GDD de arriba abajo y ejecute la **primera** acción legal: atacar con su dado de
mayor daño, activar un personaje, rerollear blancos, o pasar. El enemigo deja de ser pasivo: puede
hacer daño real al jugador y provocar Derrota. Sus personajes tienen la vida multiplicada **x1.5**
(trampa) y disponen de **1 reroll extra** de blancos por ronda, además del gratuito.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Tras importar el mazo enemigo, sus personajes muestran la vida **ya multiplicada por x1.5**
      (p. ej. vida base 10 → se ve 15; vida base 11 → 16.5 se redondea **hacia arriba** a 17), tanto
      en vida máxima como en la vida inicial disponible.
- [ ] Con el pool enemigo vacío y personajes enemigos sin activar → pulsar "Turno enemigo" **activa**
      el personaje enemigo de más vida restante y tira sus dados a su pool (visible en pantalla). Si
      dos personajes empatan en vida restante, se elige uno de forma determinista (mismo criterio de
      desempate que el objetivo de ataque, ver más abajo), no aleatoria.
- [ ] Con un dado de daño (melee/ranged/indirecto) en el pool enemigo → pulsar "Turno enemigo"
      **aplica** el de mayor valor al personaje del jugador con menos vida restante (no-KO); la vida
      del jugador baja y ese dado desaparece del pool enemigo. Si dos objetivos empatan en vida
      mínima, se elige uno de forma determinista y consistente (p. ej. por orden de bando).
- [ ] Con 2 o más dados mostrando blanco (`—`) en el pool enemigo, sin dados de daño disponibles y
      sin personajes por activar → pulsar "Turno enemigo" los **rerollea** (una vez por ronda,
      "gratuito"). Solo se rerollean los dados que muestran blanco; el resto de dados del pool
      (daño, recurso, focus, etc.) no se tocan.
- [ ] Con el reroll gratuito ya gastado esta ronda y 2+ blancos aún en el pool → pulsar "Turno
      enemigo" gasta el **1 reroll extra de la trampa** (una vez más por ronda) si está disponible.
- [ ] Cuando ninguna de las condiciones anteriores aplica (nada que atacar, nada que activar, no hay
      2+ blancos o ya no quedan rerolls disponibles) → pulsar "Turno enemigo" no hace nada visible
      salvo indicar que el enemigo **pasa**.
- [ ] El autómata deja **KO** al jugador si su daño lleva la vida de un personaje a 0, igual que
      SPEC-003 (vida a 0, no seleccionable, dados suyos retirados del pool).
- [ ] Cuando todos los personajes del jugador quedan KO por acción del autómata → se muestra
      **Derrota**, el tablero se bloquea igual que ya ocurre con Victoria (SPEC-004), y el botón
      "Turno enemigo" queda deshabilitado.
- [ ] Pulsar **Reset** vacía el pool enemigo y reactiva a sus personajes (no evita el próximo
      "Turno enemigo"), y **también** restablece el contador de rerolls gratuitos/extra de la ronda.
- [ ] Reimportar cualquiera de los dos mazos reinicia también el estado del autómata para ese bando
      (rerolls disponibles) igual que ya reinicia pool/activaciones/daño.

## Fuera de alcance (explícito)

- **Sumar varios dados de daño en un solo golpe.** El autómata aplica **un dado a la vez** (el de
  mayor valor disponible); si quedan más dados de daño, se resuelven en pulsaciones sucesivas del
  botón "Turno enemigo". No se amplía el motor de SPEC-003 para combinar dados.
- **Selector de dificultad en la UI.** El multiplicador de vida y el reroll extra son valores fijos
  hardcodeados en esta spec, no configurables por el jugador. (Ver Backlog.)
- **Ronda/mantenimiento reglamentario.** Sigue sin existir el ciclo de rondas; "una vez por ronda"
  para los rerolls se aproxima con el mismo botón **Reset** manual de SPEC-002/003 (Reset marca el
  arranque de una "ronda" nueva a efectos de disponibilidad de rerolls).
- **El enemigo activando/atacando más de una vez por pulsación.** Cada clic en "Turno enemigo"
  ejecuta como máximo **una** acción de la tabla, no un bucle hasta pasar.
- **Recursos, cartas, mano, escudos** — fuera de alcance v1 (sin cambios respecto a specs previas).
- **IA que evalúa jugadas o aprende.** Sigue siendo una tabla de prioridades determinista, sin
  heurísticas.

## Casos límite

- **Pool enemigo con dados de daño Y personajes sin activar a la vez** → gana la prioridad 1
  (atacar) sobre la 2 (activar), tal como está ordenada la tabla del GDD.
- **Todos los personajes enemigos ya activados y pool sin dados de daño ni 2+ blancos** → "Turno
  enemigo" pasa (no hay acción legal).
- **Empate de "menor vida restante" entre varios personajes del jugador** (paso 1, objetivo de
  ataque) **o de "más vida restante" entre personajes enemigos** (paso 2, a quién activar) →
  desempate determinista por orden de aparición/índice de instancia, documentado en Notas técnicas,
  no aleatorio. Mismo criterio en ambos casos.
- **Reroll con menos de 2 blancos en el pool** → no es una acción legal de la tabla; si no hay nada
  más que hacer, se pasa aunque haya 1 blanco suelto.
- **Reroll gratuito y reroll extra ya gastados ambos esta ronda, con 2+ blancos aún presentes** → no
  es acción legal; se pasa (los blancos se quedan tal cual hasta el siguiente Reset).
- **Multiplicador de vida sobre valores no enteros** (p. ej. x1.5 sobre vida impar) → redondear
  siempre **hacia arriba** (`Math.ceil`), nunca hacia abajo ni al más cercano.
- **Botón "Turno enemigo" pulsado sin mazo enemigo importado** → deshabilitado, igual que el resto
  de acciones dependen de tener mazo (coherente con SPEC-004).
- **Partida ya terminada (Victoria o Derrota)** → "Turno enemigo" deshabilitado, igual que el resto
  de acciones (SPEC-004).
- **Recargar la página a mitad de turno enemigo** → se pierde el progreso de esa ronda (pool,
  activaciones, rerolls disponibles), igual que el resto del estado de partida no persistido.

## Notas técnicas (opcional)

- **Motor del autómata**: función pura `nextAutomatonAction(state) → Action | null` que, dado el
  estado del bando enemigo (y el del jugador para elegir objetivo), evalúa la tabla de arriba abajo
  y devuelve la primera acción legal (o `null`/"pasa"). El botón "Turno enemigo" llama a esta
  función y aplica el resultado sobre el store, reutilizando las acciones ya existentes de
  activar/tirar (SPEC-002) y aplicar daño (SPEC-003) en vez de duplicar lógica.
- **Trampas como constantes de configuración** (no UI): `ENEMY_HEALTH_MULTIPLIER = 1.5`,
  `ENEMY_EXTRA_REROLLS_PER_ROUND = 1`, en un único sitio fácil de tocar más adelante cuando exista
  selector de dificultad.
- **Vida multiplicada**: aplicar `Math.ceil(character.health * ENEMY_HEALTH_MULTIPLIER)` a la vida
  base del personaje enemigo en el momento de importar el mazo (o al calcular vida máxima mostrada),
  coherente con cómo SPEC-003 calcula `character.health - damage[i]`.
- **Contador de rerolls por ronda**: nuevo estado en el store por bando enemigo (p. ej.
  `rerollsUsed: { free: boolean, extra: number }`), reiniciado por `reset()` e `importDeck` igual
  que se reinician pool/activated/damage.
- **Desempate de objetivo/activación**: al elegir "personaje con menos/más vida restante" (pasos 1 y
  2 de la tabla), si hay empate usar el mismo criterio de índice de instancia que SPEC-002/003
  (orden estable, no aleatorio) para que el comportamiento sea determinista y testeable.
- Dado que es lógica de reglas sin ambigüedad de interacción de UI, priorizar **tests unitarios**
  del motor `nextAutomatonAction` sobre los distintos casos de la tabla, además del playtest manual
  del flujo con el botón.

## Nota de tamaño (regla 4 CLAUDE.md)

Toca: motor puro del autómata (nuevo módulo + tests), estado de rerolls por ronda en el store,
vida multiplicada al importar, botón "Turno enemigo" en la UI y su integración con
activar/tirar/aplicar daño ya existentes, más el enganche con Derrota (ya calculada desde SPEC-004,
solo falta que se dispare jugando). Riesgo alto de superar ~300 líneas por la combinación
motor+tests+UI.

**Decisión:** se divide de entrada en dos sesiones, sin esperar a confirmarlo a mitad de
implementación:
- **(004b-1)** motor puro del autómata `nextAutomatonAction` + sus tests unitarios (tabla de
  prioridades completa, desempates, trampa de vida multiplicada al importar) — sin UI.
- **(004b-2)** botón "Turno enemigo" en la UI, contador de rerolls por ronda en el store, y enganche
  de la Derrota jugable (bloqueo de tablero) — consume el motor de 004b-1.

## Resultado del playtest

2026-07-19: playtest manual completo (004b-1 + 004b-2 juntas). Todos los criterios y casos límite
pasaron: vida enemiga multiplicada x1.5 al importar (redondeo hacia arriba), botón "Turno enemigo"
ejecuta una acción por pulsación con feedback visible (activar/atacar/reroll gratuito y
extra/pasar), el enemigo ataca siempre al personaje del jugador con menos vida, Derrota jugable
con bloqueo de tablero simétrico a Victoria, Reset reinicia pools/activaciones/rerolls sin curar
ni deshacer el fin, reimportar reinicia el bando completo, botón deshabilitado sin mazo enemigo o
con partida terminada; regresión SPEC-001/002/003/004 sin problemas. Confirmado por el usuario.

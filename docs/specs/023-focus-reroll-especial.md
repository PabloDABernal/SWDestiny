# SPEC-023: Focus, reroll y especial

**Estado:** Pendiente
**Sección del GDD:** 5. Alcance por versión → "Focus, reroll y especial (tercera pieza de v4, SPEC-023)"
**Depende de:** SPEC-010 (costes de recurso), SPEC-013/014 (autómata con modificadores/costes),
SPEC-015 (dificultad), SPEC-020/021 (mejoras/apoyos, por el centinela `characterIndex: -1`)

## Qué es (2-4 líneas)

El jugador (y también el enemigo automático) pueden resolver tres símbolos de dado nuevos: **Focus**
(gira otro dado propio sin resolver a la cara que elijas), **Reroll** (vuelve a tirar dados sin
resolver de cualquier pool, propio o rival) y **Especial** (por ahora un placeholder: consume el
dado con un aviso genérico, sin efecto real de juego todavía).

## Criterios de aceptación

- [ ] El jugador puede resolver un dado que muestre Focus, elegir uno o más dados propios sin
      resolver (distintos del/los dado(s) de Focus usados) y, para cada uno, elegir la cara a la
      que se gira; el dado objetivo pasa a mostrar esa cara y sigue **sin resolver** en el pool.
- [ ] Si se agrupan varios dados de Focus del mismo símbolo (SPEC-008a), el jugador puede girar
      hasta la suma de sus valores en dados objetivo, en la misma acción.
- [ ] El/los dado(s) de Focus usados para activar la acción se consumen igual que cualquier otro
      dado resuelto (salen del pool sin resolver ya).
- [ ] El jugador puede resolver un dado que muestre Reroll y elegir hasta `n` dados sin resolver de
      **cualquier pool** (propio o del rival); esos dados se vuelven a tirar y muestran un nuevo
      valor aleatorio, permaneciendo sin resolver.
- [ ] El jugador puede resolver un dado que muestre Especial: aparece un aviso genérico ("habilidad
      especial de la carta, pendiente de implementar") y el dado se consume, sin pedir ningún
      objetivo ni tener efecto de juego.
- [ ] Si una cara de Focus, Reroll o Especial trae coste de recursos, resolverla exige tener y
      gastar esos recursos igual que hoy con daño/escudo/recurso (SPEC-008b/010); sin recursos
      suficientes, no se puede resolver (tampoco el aviso genérico de Especial).
- [ ] Si hay varios dados propios de Focus sin resolver a la vez, el jugador (y el autómata) los
      agrupa en una sola acción sumando sus valores (igual que ya hace la tabla con daño, escudo y
      recurso, SPEC-008a/013/014), pudiendo girar hasta esa suma de dados objetivo en una sola
      resolución/pulsación.
- [ ] Igual que Focus, si hay varios dados propios de Reroll(dado) sin resolver a la vez, se
      agrupan sumando sus valores en una sola acción/pulsación.
- [ ] Al pulsar "Turno enemigo" con un dado de Focus disponible (y sin daño/escudo/activar/recurso
      legal antes en la tabla), el autómata gira, de una sola vez y hasta el valor combinado
      disponible, sus propios dados a la mejor cara disponible siguiendo la misma prioridad
      (daño > escudo > recurso); si ningún dado propio mejora girándolo, no usa Focus y se prueba
      la siguiente fila.
- [ ] Al pulsar "Turno enemigo" con uno o más dados de Reroll(dado) disponibles (y sin acción de
      prioridad más alta legal), el autómata re-tira, hasta el valor combinado disponible, el/los
      dado(s) sin resolver del jugador con mayor daño pendiente; si el jugador no tiene ningún dado
      de daño sin resolver, no es acción legal y se prueba la siguiente fila.
- [ ] Al pulsar "Turno enemigo" con un dado de Especial disponible (y sin ninguna acción de
      prioridad más alta legal, incluidas focus/reroll(dado)), el autómata lo resuelve igual que
      el jugador (mismo aviso/consumo, pagando su coste si lo tuviera), antes de probar el reroll
      de blancos existente.

## Fuera de alcance (explícito)

- La habilidad especial real de cada carta (texto/keywords): fuera hasta la siguiente capa de v4;
  Especial es un placeholder sin efecto real.
- La acción de turno "descartar una carta de la mano para rerollear dados" (RR pg 21): es una
  acción distinta, ya anotada como pendiente en SPEC-022; no se implementa aquí.
- Cualquier interacción de Focus/Reroll con campo de batalla o trama: siguen sin existir.
- Cambiar la prioridad/comportamiento de daño, escudo, activar, recurso o el reroll de blancos ya
  existente del autómata: sin cambios salvo insertar las tres filas nuevas entre recurso y ese
  reroll de blancos.

## Casos límite

- Dado de Focus con valor `n` mayor que el número de dados propios sin resolver disponibles
  (excluyendo los propios dados de Focus usados) → se giran todos los disponibles, sin error.
- No hay ningún otro dado propio sin resolver más que el/los de Focus mismos → esa acción no tiene
  ningún objetivo válido; la UI no permite iniciar/completar la resolución de Focus en ese caso
  (igual que hoy escudo exige un personaje propio objetivo).
- Reroll con valor `n` mayor que los dados sin resolver existentes entre ambos pools → se
  rerollean todos los disponibles, sin error.
- Rerollear un dado que ya estaba marcado/seleccionado en un modo de resolución en curso → ese
  dado deja de estar disponible para la resolución anterior (su símbolo/cara cambió); el nuevo
  valor se evalúa desde cero.
- Girar (Focus) un dado a una cara con coste de recurso que el bando no puede pagar en ese momento
  → el giro en sí es gratis (solo cambia la cara mostrada); el coste solo se paga si luego se
  decide resolver esa cara.
- Dados de mejora/apoyo ligados (`characterIndex: -1`, SPEC-020/021) en el pool propio → son
  objetivo válido de Focus/Reroll igual que cualquier otro dado sin resolver del propio bando, sin
  filtrado especial (ver Notas técnicas sobre selección por posición en el pool).
- Enemigo con Reroll disponible pero sin ningún dado de daño rival sin resolver que anular → no es
  acción legal para esa fila; la tabla sigue evaluando especial, reroll de blancos y pasar.
- Reroll apuntando al propio pool (p. ej. rerollear los propios blancos con esta cara en vez del
  reroll gratuito) → válido, sin restricción de origen.
- Intentar iniciar una resolución de Focus/Reroll/Especial mientras ya hay otro modo abierto
  (`resolve.pendingEffect` de daño/escudo/recurso, o `playUpgrade` esperando personaje objetivo) →
  no permitido hasta cerrar el modo en curso, igual que ya exigen SPEC-020/021 para sus acciones.

## Notas técnicas (opcional)

- Nuevos símbolos en `DieSymbol` (`focus`, `reroll`, `special`) y su reconocimiento en
  `parsePlayerFace`/`parseCostedFace`; formato exacto de estas caras en ARH DB por confirmar contra
  datos reales durante la implementación (ver SDD).
- Selección de dado objetivo para Focus/Reroll por posición en el array `pool` (`poolIndex`), nunca
  por `characterIndex` — evita la colisión del centinela `-1` anotada en BACKLOG (SPEC-020/021).
- Girar un dado (Focus) no lo saca del pool ni lo marca resuelto: solo cambia la cara que muestra.
- Rerollear un dado (Reroll) vuelve a tirarlo (nuevo valor aleatorio de sus 6 caras).
- **Bug a evitar (detectado por revisor-specs):** el mecanismo actual del reroll de blancos del
  autómata (`gameStore.ts`, case `'reroll'`) obtiene el `Die` a re-tirar indexando
  `characters[characterIndex].dice[dieIndex]`. Eso crashea con dados de apoyo
  (`characterIndex: -1`) y da resultado incorrecto con dados de mejora (devuelve el die del
  personaje anfitrión, no el de la mejora). Como esta spec permite que Focus/Reroll apunten a
  dados de mejora/apoyo sin filtrado especial, **no puede reutilizarse ese mecanismo tal cual**:
  Focus/Reroll deben obtener la definición del dado (sus 6 caras) por `code` vía caché
  (`readCache`, mismo patrón ya usado en `activate`/`activateSupport`), no por índices de
  personaje.
- La tabla de prioridades del autómata (`automaton.ts`) gana tres filas nuevas entre recurso y el
  reroll de blancos existente; necesitan un tipo de acción distinto de `'reroll'` (ya usado por el
  reroll de blancos) para no colisionar.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

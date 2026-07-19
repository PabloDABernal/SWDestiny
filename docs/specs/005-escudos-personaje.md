# SPEC-005: Escudos (resolver dado de escudo, tope 3 por personaje)

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §5 "Escudos (primera pieza de v2)"
**Depende de:** SPEC-001 (personajes/dados), SPEC-002 (pool de dados), SPEC-003 (resolver daño con KO), SPEC-004 (dos bandos)

## Qué es (2-4 líneas)

Con un dado mostrando `1Sh`, `2Sh` o `3Sh` en el pool, el jugador (o el autómata, ver Fuera de
alcance) lo selecciona y elige un personaje **de su propio bando** (no-KO) como objetivo: ese
personaje gana esa cantidad de escudos, hasta un máximo de **3**. Los escudos absorben el daño de
los dados de daño antes que la vida: al aplicar un dado de daño a un personaje con escudos, primero
se descuentan de los escudos, y solo el sobrante (si lo hay) baja la vida.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Con un dado `2Sh` en el pool del jugador, el jugador lo selecciona y pulsa un personaje **de
      su propio bando** no-KO → ese personaje gana 2 escudos (visible junto a su vida) y el dado
      desaparece del pool.
- [ ] Un dado de escudo **no puede** aplicarse a un personaje del bando **contrario** (al revés que
      el daño): pulsar un personaje enemigo con un dado de escudo seleccionado no hace nada.
- [ ] Un personaje con escudos y luego recibe un dado de daño → los escudos bajan primero; si el
      daño no supera los escudos restantes, la **vida no cambia**.
- [ ] Un personaje con escudos recibe un dado de daño **mayor** que sus escudos restantes → los
      escudos bajan a 0 y el **sobrante** de daño baja la vida, todo en la misma aplicación del
      dado (una sola acción del jugador, no dos pasos).
- [ ] Aplicar dados de escudo sucesivos a un personaje que ya tiene 3 escudos (o que llegaría a más
      de 3) → queda **como mucho en 3**; el dado se consume igual (no se puede "cancelar" para
      guardarlo).
- [ ] El daño con escudo puede seguir dejando **KO** si el sobrante tras los escudos iguala o
      supera la vida restante, igual que SPEC-003 (vida a 0, dados retirados del pool).
- [ ] Pulsar **Reset** no cambia los escudos de nadie (igual que no cura la vida).
- [ ] **Reimportar** un mazo pone los escudos de ese bando a **0** (no hay escudo "de partida"; solo
      se ganan resolviendo dados `NSh`), igual que reinicia vida/pool/activaciones.
- [ ] Un personaje del **jugador** con escudos recibe un ataque del **autómata** (botón "Turno
      enemigo", SPEC-004b) → los escudos bajan primero exactamente igual que con un ataque del
      jugador (misma lógica compartida, no un camino aparte).

## Fuera de alcance (explícito)

- **El autómata enemigo no resuelve escudos.** La tabla de prioridades del GDD §4 (SPEC-004b) no
  se toca en esta spec: un dado `NSh` en el pool enemigo no es "daño" ni "blanco", así que el
  autómata no lo elige en ninguno de sus pasos actuales y se queda inerte en su pool hasta el
  siguiente Reset. Ampliar la tabla del autómata para que también aplique escudos a sí mismo queda
  para una spec futura (anotar en BACKLOG).
- **Escudos impresos en carta o vía cartas auxiliares/upgrades.** No hay ese dato ni ese tipo de
  carta en juego hasta v4; la única fuente de escudos en v1/v2 es resolver el dado `NSh`.
- **Recursos.** Es la otra mitad de v2 (GDD §5), spec aparte.
- **Keywords o texto de carta que interactúen con escudos** (p. ej. ignorar escudos, escudos que
  se convierten en otra cosa): fuera de alcance hasta v4.
- **Elegir aplicar solo una parte de un dado de escudo** (p. ej. usar 1 de los 2 puntos de un `2Sh`
  y "guardar" el resto): no existe partición, el dado se resuelve entero de una vez, como el daño.

## Casos límite

- **Dado `1Sh`/`2Sh`/`3Sh` con el objetivo ya a 3 escudos** → se queda en 3, dado consumido (no hay
  forma de "desperdiciar" el clic; el jugador puede simplemente no seleccionar ese dado si no
  quiere gastarlo, pero si lo aplica, se consume igual).
- **Objetivo del dado de escudo ya KO** → no es objetivo válido (igual que con el daño).
- **Daño exactamente igual a los escudos restantes** → escudos a 0, vida intacta, personaje sigue
  no-KO (salvo que ya estuviera a 0 de vida por otra vía, lo cual no es posible si no está KO).
- **Personaje con 0 escudos recibe daño** → comportamiento idéntico a SPEC-003 (todo el daño va a
  la vida), sin cambios.
- **Dado de escudo aplicado a uno mismo (el propio personaje dueño del dado)** → válido, no hay
  restricción de "no autoaplicar".
- **Recargar la página a mitad de partida** → escudos se pierden igual que vida/pool/activaciones
  (estado de sesión no persistido).
- **Personaje que queda KO en la misma aplicación de un dado de daño con escudos** → siempre
  termina con escudos en 0 (consecuencia directa del orden "escudos primero, sobrante a vida": solo
  se llega a KO si los escudos ya se agotaron en esa resolución). No hace falta ningún "reset de
  escudos al quedar KO" aparte; es resultado natural de la resta, no un caso especial a programar.

## Notas técnicas (opcional)

- **Parseo de la cara**: nueva función pura `parseShield(face): number | null` en `src/game/damage.ts`
  (o módulo hermano), análoga a `parseDamage`: matchea `^(\d)Sh$` → cantidad; cualquier otra cara
  (incluida `2Sh` tal cual ya existía en v1 como "sin daño") pasa a tratarse como escudo aplicable
  en vez de inerte.
- **Estado**: nuevo array paralelo `shields: number[]` en `SideState` (como `damage`), inicializado
  a 0 en `freshSide`. NO se persiste (igual que damage/pool/activated).
- **Resolución de daño con escudo**: extender la función que hoy calcula el nuevo `damage[index]`
  (usada por `resolveDamage` en `gameStore.ts`, compartida entre `applyDamageTo` y `enemyTurn` desde
  SPEC-004b) para que primero reste de `shields[index]` (con mínimo 0) y solo el sobrante se sume a
  `damage[index]` (con el tope `character.health` ya existente). Reutilizar esta función también
  para KO: `isKO` sigue mirando solo `damage` vs `health`, sin cambios en `src/game/damage.ts`.
- **Selección/objetivo de escudo**: el flujo de `selectDie`/aplicar objetivo debe distinguir si el
  dado seleccionado es de daño (objetivo = bando contrario, como hoy) o de escudo (objetivo = propio
  bando). Sugerencia: extender `Selection`/la lógica de "objetivo válido" en el store y en
  `BattleSide`/`CharacterCard` para calcular `targetableSide` según el tipo de dado seleccionado, no
  siempre "el contrario".
- **Tope de 3**: `Math.min(3, shields[index] + amount)`.
- **UI**: mostrar escudos junto a la vida en `CharacterCard` (p. ej. `🛡 N/3` si `N>0`, u oculto si
  `N===0` para no ensuciar personajes sin escudos).
- **`DicePool.tsx`**: hoy deshabilita cada dado con `disabled={!isDamage}` (`parseDamage(face) !==
  null`); hay que ampliar la condición para que un dado `NSh` también sea seleccionable (no solo
  los de daño), o el criterio de "el jugador lo selecciona" es imposible de cumplir.
- **Texto de ayuda** (`App.tsx`, hoy fijo "Dado de daño seleccionado. Pulsa un personaje enemigo
  para aplicarlo."): debe distinguir si el dado seleccionado es de daño (pulsa un enemigo) o de
  escudo (pulsa un aliado).
- **Tests**: igual que en SPEC-004b, priorizar tests unitarios del `parseShield` y de la función de
  resolución de daño-con-escudo (casos: sin escudo, escudo absorbe todo, escudo parcial + sobrante
  a vida, tope de 3) antes que depender solo del playtest manual.

## Nota de tamaño (regla 4 CLAUDE.md)

Toca: `damage.ts` (parseShield), `gameStore.ts` (estado `shields`, extender `resolveDamage`,
extender la lógica de selección/objetivo para permitir apuntar al propio bando con dados de
escudo), `CharacterCard.tsx` (mostrar escudos), `DicePool.tsx` (dados `NSh` seleccionables),
`App.tsx`/`BattleSide` (calcular objetivo válido según tipo de dado, texto de ayuda). Riesgo
moderado, probablemente dentro de las ~300 líneas; si al implementar se dispara (sobre todo por la
lógica de "objetivo según tipo de dado", que toca varios componentes), dividir en **(005-1)**
estado + motor de resolución (shields, resolveDamage con escudo, tests) y **(005-2)** UI de
selección de objetivo propio bando + `DicePool` + render de escudos.

## Resultado del playtest

2026-07-19: playtest manual completo, jugado en despliegue de GitHub Pages
(https://pablodabernal.github.io/SWDestiny/) en vez de localhost. Todos los criterios y casos
límite pasaron: dado `NSh` aplicado a un personaje del propio bando suma escudos, no aplicable al
bando contrario, tope de 3, escudo absorbe daño antes que vida en una sola aplicación, Reset no
cura escudos, reimportar los pone a 0, turno del enemigo respeta escudos del jugador (misma
`resolveDamage`); regresión SPEC-001 a SPEC-004b sin problemas. Confirmado por el usuario.

De paso, este playtest destapó un bug de infraestructura no relacionado con el gameplay de
escudos: en producción (sin el proxy `/arh` de dev) la resolución de cartas fallaba con "carta no
encontrada" en vez de un error de red/CORS. Corregido en `src/import/resolveCards.ts` (llamar
directo a la API de ARH DB fuera de dev); confirmado que la API sí permite CORS abierto desde el
navegador. Detalle en `docs/BACKLOG.md`.

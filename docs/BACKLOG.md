# Backlog (ideas para v2+)

Ideas que surgen durante la implementación. Una línea por idea. NO se implementan hasta que se conviertan en spec.

- Turnos reales alternados: ahora es SPEC-025 (docs/specs/025-turnos-reales-alternados.md), creada el 2026-07-23. Se deja esta línea hasta que se marque completada tras el playtest.
- Descarte interactivo dentro del mantenimiento automático (RR: "descarta lo que quieras" antes de robar, RR pg 19-20): SPEC-025 quita el botón "Descartar" suelto pero el mantenimiento automático solo roba, sin ningún paso de descarte interactivo (decisión explícita del usuario, 2026-07-23, para no agrandar más esa spec). Pendiente de spec propia futura; reutilizar el patrón visual del mulligan (checkboxes + confirmar, SPEC-024) parece el candidato natural.
- Símbolos de dado que faltan por implementar: caras que quitan recursos o cartas (de la mano) al rival (RR pg 12/13, confirmar el patrón exacto contra ARH DB, similar a como se hizo con el coste de recurso en SPEC-008b). Detectado por el usuario jugando el 2026-07-23; pendiente de spec propia.
- Sin tests automatizados para la máquina de turnos de SPEC-025 (`turn`/`passStreak`/`pass`/`afterApply`/guards de exclusión mutua en `src/store/gameStore.ts`): el proyecto hoy solo tiene tests de funciones puras (`src/game/*.test.ts`, `src/import/*.test.ts`), ninguno del store de Zustand. Señalado por revisor-codigo al revisar SPEC-025 (2026-07-23): al ser el cambio de arquitectura más grande hasta ahora, la falta total de cobertura del store aumenta el riesgo de que una spec futura rompa el flujo de turnos sin que ningún test lo detecte. Valorar cuándo montar infraestructura de test para el store (mockear `readCache`/localStorage) en vez de hacerlo ad-hoc dentro de una spec de gameplay.
- Daño indirecto (◎) real, segunda pieza — "el enemigo ataca con indirecto, el jugador reparte": ahora es SPEC-028 (docs/specs/028-danio-indirecto-real-enemigo-ataca.md), creada el 2026-07-24. Se deja esta línea hasta que se marque completada tras el playtest.

- Visibilidad del recuento "Mazo: N": hoy es texto gris pequeño (`.draw-pile__count`, `src/App.tsx`/`src/styles.css`) y el usuario no lo encuentra a simple vista (le pasó en el playtest de SPEC-016 y SPEC-017). Darle más contraste/tamaño o ponerlo junto al nombre del bando. (Detectado en SPEC-017, 2026-07-22.)

- Visibilidad de los dados marcados/seleccionados en el pool: `.pool-die--selected` (`src/styles.css`) hoy solo cambia el borde/sombra del dado, y al usuario le cuesta distinguir a simple vista qué dados están marcados (fuente de Focus/Reroll, objetivo ya girado/elegido para rerollear, etc.) frente a los que no. Revisar contraste, tamaño o algún indicador más claro (icono, fondo distinto) cuando se aborde pulido general de UI. (Detectado jugando SPEC-023, 2026-07-23.)

- Un ataque/coste dirigido con `effectIndex === -1` (el centinela `characterIndex: -1` de dados de mejora/apoyo sin personaje anfitrión, `rollUpgradeDie`, SPEC-020/021) seguiría colisionando si algún día se apunta un efecto directamente a "la carta", no al personaje. No es un bug hoy (nada del código actual llega a ese caso); revisarlo explícitamente antes de implementarlo. *(La otra mitad de este riesgo —reroll manual del jugador indexando por `characterIndex`— quedó resuelta en SPEC-023, ver abajo.)* (Detectado en SPEC-021, 2026-07-22.)

- `parseTextDeck` ignora sin resolver las cartas de la sección PLOT (fix del 2026-07-22): su código de dos caras (A/B, p. ej. `13015A`) no es deducible del número de coleccionista del text file ("#15"), y como hoy no se usan para nada (SDD: "trama... no se guarda en ningún sitio todavía"), intentar resolverlas hacía fallar el import entero. Cuando llegue la spec que juegue trama, hay que decidir cómo saber qué cara (A/B) corresponde — el "text file" no lo dice, puede que haga falta mirar el JSON de `slots` o pedir la carta por ambos códigos posibles. (Detectado al arreglar el import, 2026-07-22.)

- Mejoras/apoyos sin dado propio (SPEC-020/021): algunas mejoras/apoyos reales de Destiny no tienen dado impreso (efecto puramente de texto, p. ej. "Hunker Down"). Los botones "Activar" (del personaje anfitrión de la mejora, y del apoyo) siguen mostrándose igual aunque no tengan caras de dado útiles, lo cual no tiene sentido a la vista (le pasó al usuario jugando SPEC-021). *(La parte grave de este riesgo —activar el personaje/apoyo anfitrión reventaba entero porque `card.sides` llegaba vacío/no-array desde ARH DB y no se comprobaba— se corrigió jugando SPEC-023, 2026-07-23: `activate`/`activateSupport` ahora comprueban `Array.isArray(card.sides) && card.sides.length > 0` antes de tirar su dado; sin dado, simplemente no aporta ninguno al pool.)* Cuando se implemente texto/keywords de carta (siguiente capa de v4), sigue pendiente decidir si hay que ocultar/deshabilitar "Activar" en estos casos, o si quedan fuera de alcance hasta que su texto se implemente. (Detectado en playtest de SPEC-021, 2026-07-22; ampliado en SPEC-023.)

- ~~Tabla `SET_CODES` de `parseTextDeck` incompleta (sets de "A Renewed Hope")~~ — **Resuelto en SPEC-023** (2026-07-23): tras "Transformations" (código 13, el último set oficial FFG), ARH DB tiene una continuación fan "A Renewed Hope" con 11 sets propios, todos confirmados por el usuario y añadidos a la tabla: Faltering Allegiances=14, Redemption=15, High Stakes=16, Unlikely Heroes=18, Galactic Struggle=19, Echoes of Destiny=20, Seeking Answers=21, Display of Power=22, Resurgence=23, Awaiting Fate=24, Uncharted Alliances=25 (el 17 no está asignado a ningún set listado actualmente en ARH DB). Importante para el futuro: el orden del desplegable "Sets" de la web **no** se corresponde con esta numeración interna — si ARH publica un set nuevo, su código hay que confirmarlo con una carta real, no deducirlo por posición en el menú. (Detectado en SPEC-017/021, resuelto en SPEC-023.)

- ~~CORS en producción~~ — **Resuelto (2026-07-19)**: ARH DB sí permite CORS abierto desde el navegador. En producción se llama directo a la API (`src/import/resolveCards.ts`), sin pasar por el proxy `/arh` (solo dev). Confirmado jugando en GitHub Pages durante el playtest de SPEC-005. (Detectado en SPEC-001.)
- ~~Validar la forma de la caché al cargar de localStorage~~ — **Resuelto en SPEC-012** (2026-07-21):
  `loadPersistedDeck` comprueba `Array.isArray` antes de tratar el JSON parseado como `Character[]`;
  caché corrupta (no-array) arranca con mazo vacío en vez de campos `undefined`. (Detectado en
  SPEC-001.)
- ~~Daño multi-objetivo en una acción~~ — **Resuelto en SPEC-011** (2026-07-21): al resolver dados del
  mismo símbolo, el modo queda abierto entre tandas y se puede mandar cada dado (o grupo) a un
  objetivo distinto, sin dividir el daño de un mismo dado. (Detectado en SPEC-008a.)
- ~~Recursos iniciales y por ronda~~ — **Resuelto en SPEC-009/011** (2026-07-20/21): recursos
  persistentes desde SPEC-009 (2 iniciales) y +2 por ronda en "Nueva ronda" (mantenimiento, RR pg
  19/25) desde SPEC-011. (Detectado al jugar SPEC-008b, 2026-07-20.)
- ~~Selector de dificultad en la UI~~ — **Resuelto en SPEC-015** (2026-07-21): selector Fácil/Normal/
  Difícil junto al panel de importar del enemigo (`DIFFICULTY_SETTINGS` en `src/game/automaton.ts`),
  controla multiplicador de vida enemiga y rerolls extra, persistido en localStorage. (Detectado en
  SPEC-004b.)
- ~~El autómata no resuelve escudo/recurso~~ — **Resuelto en SPEC-007** (2026-07-20): su tabla de
  prioridades resuelve dados de escudo (al aliado de menor vida) y de recurso.
- ~~Formato del coste de dado~~ — **Resuelto en SPEC-008b/010** (2026-07-20): coste de recurso
  (`<v><TIPO><n>`) y coste de daño indirecto propio (`<v><TIPO>i<n>`), ambos implementados; el
  jugador paga costes. (El `+X` es modificador, implementado en SPEC-010.)
- ~~El autómata no combina modificadores ni paga costes~~ — **Resuelto en SPEC-013/014**
  (2026-07-21): usa `parsePlayerFace` (no los parsers "pelados"), combina base+modificadores y paga
  coste de recurso/indirecto igual que el jugador, en daño/escudo/recurso, con reparto multi-objetivo
  sin overkill. (Detectado en SPEC-008b/010.)
- ~~Reroll manual del jugador indexando por `characterIndex` colisionaría con el centinela -1~~ —
  **Resuelto en SPEC-023** (2026-07-23): Focus/Reroll de dado seleccionan el dado objetivo por su
  posición en el array `pool` (`poolIndex`), nunca por `characterIndex`; de paso se corrigió el
  mismo bug ya real en el reroll de blancos del autómata (indexaba `characters[characterIndex]`,
  que rompía con dados de mejora/apoyo), que ahora también busca la definición del dado por `code`
  vía caché. (Detectado en SPEC-021.)

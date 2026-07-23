# Backlog (ideas para v2+)

Ideas que surgen durante la implementación. Una línea por idea. NO se implementan hasta que se conviertan en spec.

- Visibilidad del recuento "Mazo: N": hoy es texto gris pequeño (`.draw-pile__count`, `src/App.tsx`/`src/styles.css`) y el usuario no lo encuentra a simple vista (le pasó en el playtest de SPEC-016 y SPEC-017). Darle más contraste/tamaño o ponerlo junto al nombre del bando. (Detectado en SPEC-017, 2026-07-22.)

- Un ataque/coste dirigido con `effectIndex === -1` (el centinela `characterIndex: -1` de dados de mejora/apoyo sin personaje anfitrión, `rollUpgradeDie`, SPEC-020/021) seguiría colisionando si algún día se apunta un efecto directamente a "la carta", no al personaje. No es un bug hoy (nada del código actual llega a ese caso); revisarlo explícitamente antes de implementarlo. *(La otra mitad de este riesgo —reroll manual del jugador indexando por `characterIndex`— quedó resuelta en SPEC-023, ver abajo.)* (Detectado en SPEC-021, 2026-07-22.)

- `parseTextDeck` ignora sin resolver las cartas de la sección PLOT (fix del 2026-07-22): su código de dos caras (A/B, p. ej. `13015A`) no es deducible del número de coleccionista del text file ("#15"), y como hoy no se usan para nada (SDD: "trama... no se guarda en ningún sitio todavía"), intentar resolverlas hacía fallar el import entero. Cuando llegue la spec que juegue trama, hay que decidir cómo saber qué cara (A/B) corresponde — el "text file" no lo dice, puede que haga falta mirar el JSON de `slots` o pedir la carta por ambos códigos posibles. (Detectado al arreglar el import, 2026-07-22.)

- Mejoras/apoyos sin dado propio (SPEC-020/021): algunas mejoras/apoyos reales de Destiny no tienen dado impreso (efecto puramente de texto, p. ej. "Hunker Down"). Los botones "Activar" (del personaje anfitrión de la mejora, y del apoyo) siguen mostrándose igual aunque no tengan caras de dado útiles, lo cual no tiene sentido a la vista (le pasó al usuario jugando SPEC-021). *(La parte grave de este riesgo —activar el personaje/apoyo anfitrión reventaba entero porque `card.sides` llegaba vacío/no-array desde ARH DB y no se comprobaba— se corrigió jugando SPEC-023, 2026-07-23: `activate`/`activateSupport` ahora comprueban `Array.isArray(card.sides) && card.sides.length > 0` antes de tirar su dado; sin dado, simplemente no aporta ninguno al pool.)* Cuando se implemente texto/keywords de carta (siguiente capa de v4), sigue pendiente decidir si hay que ocultar/deshabilitar "Activar" en estos casos, o si quedan fuera de alcance hasta que su texto se implemente. (Detectado en playtest de SPEC-021, 2026-07-22; ampliado en SPEC-023.)

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

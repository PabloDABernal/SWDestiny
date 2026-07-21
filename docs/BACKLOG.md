# Backlog (ideas para v2+)

Ideas que surgen durante la implementación. Una línea por idea. NO se implementan hasta que se conviertan en spec.

- Visibilidad del recuento "Mazo: N": hoy es texto gris pequeño (`.draw-pile__count`, `src/App.tsx`/`src/styles.css`) y el usuario no lo encuentra a simple vista (le pasó en el playtest de SPEC-016 y SPEC-017). Darle más contraste/tamaño o ponerlo junto al nombre del bando. (Detectado en SPEC-017, 2026-07-22.)

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

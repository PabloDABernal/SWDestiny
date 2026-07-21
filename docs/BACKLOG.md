# Backlog (ideas para v2+)

Ideas que surgen durante la implementación. Una línea por idea. NO se implementan hasta que se conviertan en spec.

- ~~CORS en producción~~ — **Resuelto (2026-07-19)**: ARH DB sí permite CORS abierto desde el navegador. En producción se llama directo a la API (`src/import/resolveCards.ts`), sin pasar por el proxy `/arh` (solo dev). Confirmado jugando en GitHub Pages durante el playtest de SPEC-005. (Detectado en SPEC-001.)
- Validar la forma de la caché al cargar de localStorage (`swd:deck`): hoy se hace `JSON.parse ... as Character[]` sin comprobar estructura; caché corrupta renderizaría fichas con campos undefined en vez de error claro. (Detectado en SPEC-001.)
- ~~Daño multi-objetivo en una acción~~ — **Resuelto en SPEC-011** (2026-07-21): al resolver dados del
  mismo símbolo, el modo queda abierto entre tandas y se puede mandar cada dado (o grupo) a un
  objetivo distinto, sin dividir el daño de un mismo dado. (Detectado en SPEC-008a.)
- ~~Recursos iniciales y por ronda~~ — **Resuelto en SPEC-009/011** (2026-07-20/21): recursos
  persistentes desde SPEC-009 (2 iniciales) y +2 por ronda en "Nueva ronda" (mantenimiento, RR pg
  19/25) desde SPEC-011. (Detectado al jugar SPEC-008b, 2026-07-20.)
- Selector de dificultad en la UI para las trampas del autómata (multiplicador de vida enemiga, número de rerolls extra): en v1 son constantes fijas (`ENEMY_HEALTH_MULTIPLIER`, `ENEMY_EXTRA_REROLLS_PER_ROUND` en `src/game/automaton.ts`), no configurables por el jugador. (Detectado en SPEC-004b.)
- ~~El autómata no resuelve escudo/recurso~~ — **Resuelto en SPEC-007** (2026-07-20): su tabla de
  prioridades resuelve dados de escudo (al aliado de menor vida) y de recurso.
- ~~Formato del coste de dado~~ — **Resuelto en SPEC-008b/010** (2026-07-20): coste de recurso
  (`<v><TIPO><n>`) y coste de daño indirecto propio (`<v><TIPO>i<n>`), ambos implementados; el
  jugador paga costes. (El `+X` es modificador, implementado en SPEC-010.)
- El autómata **no combina modificadores ni paga costes** (`+X`, `…<n>`, `…i<n>`): las funciones del
  autómata usan los parsers "pelados" (parseDamage/parseShield/parseResource), así que esas caras se
  le quedan inertes. Ampliar la tabla del autómata para usarlas (más difícil: pagar coste de recurso
  con su contador, coste indirecto a sus aliados). (Detectado en SPEC-008b/010.)

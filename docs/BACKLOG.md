# Backlog (ideas para v2+)

Ideas que surgen durante la implementación. Una línea por idea. NO se implementan hasta que se conviertan en spec.

- ~~CORS en producción~~ — **Resuelto (2026-07-19)**: ARH DB sí permite CORS abierto desde el navegador. En producción se llama directo a la API (`src/import/resolveCards.ts`), sin pasar por el proxy `/arh` (solo dev). Confirmado jugando en GitHub Pages durante el playtest de SPEC-005. (Detectado en SPEC-001.)
- Validar la forma de la caché al cargar de localStorage (`swd:deck`): hoy se hace `JSON.parse ... as Character[]` sin comprobar estructura; caché corrupta renderizaría fichas con campos undefined en vez de error claro. (Detectado en SPEC-001.)
- Daño multi-objetivo en una acción (depurar SPEC-008a): en el reglamento, al resolver varios dados
  del MISMO símbolo puedes mandar **cada dado a un enemigo distinto** (RR pg 11). Lo que NO se puede
  es **dividir** el daño de UN solo dado entre dos (eso sí lo hacemos bien). Hoy 008a manda todos los
  marcados al mismo objetivo (más restrictivo de lo debido). Depurar para permitir por-dado→objetivo.
  (Detectado con el usuario, 2026-07-20.)
- Recursos iniciales y por ronda (fidelidad reglamento, RR pg 19/25): empezar con 2 recursos y ganar
  +2 en cada mantenimiento (hoy "Reset"). Hoy los recursos solo salen de caras `R`, lo que hace muy
  difícil pagar costes al principio y molesta al probar SPEC-008b. Convertir en spec (¿v2?). (Detectado
  al jugar SPEC-008b, 2026-07-20.)
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

# Backlog (ideas para v2+)

Ideas que surgen durante la implementación. Una línea por idea. NO se implementan hasta que se conviertan en spec.

- CORS en producción: en v1 la resolución de cartas contra ARH DB solo funciona en dev vía proxy `/arh` (vite.config.ts). Sin backend, prod necesita otra estrategia (dataset de cartas empaquetado, proxy propio o API con CORS abierto). (Detectado en SPEC-001.)
- Validar la forma de la caché al cargar de localStorage (`swd:deck`): hoy se hace `JSON.parse ... as Character[]` sin comprobar estructura; caché corrupta renderizaría fichas con campos undefined en vez de error claro. (Detectado en SPEC-001.)
- Selector de dificultad en la UI para las trampas del autómata (multiplicador de vida enemiga, número de rerolls extra): en v1 son constantes fijas (`ENEMY_HEALTH_MULTIPLIER`, `ENEMY_EXTRA_REROLLS_PER_ROUND` en `src/game/automaton.ts`), no configurables por el jugador. (Detectado en SPEC-004b.)
- El autómata enemigo no resuelve dados de escudo (`NSh`): la tabla de prioridades de SPEC-004b no los contempla, así que se quedan inertes en su pool hasta el siguiente Reset. Ampliar la tabla para que el autómata también se aplique escudos a sí mismo. (Detectado en SPEC-005.)

# Backlog (ideas para v2+)

Ideas que surgen durante la implementación. Una línea por idea. NO se implementan hasta que se conviertan en spec.

- ~~CORS en producción~~ — **Resuelto (2026-07-19)**: ARH DB sí permite CORS abierto desde el navegador. En producción se llama directo a la API (`src/import/resolveCards.ts`), sin pasar por el proxy `/arh` (solo dev). Confirmado jugando en GitHub Pages durante el playtest de SPEC-005. (Detectado en SPEC-001.)
- Validar la forma de la caché al cargar de localStorage (`swd:deck`): hoy se hace `JSON.parse ... as Character[]` sin comprobar estructura; caché corrupta renderizaría fichas con campos undefined en vez de error claro. (Detectado en SPEC-001.)
- Selector de dificultad en la UI para las trampas del autómata (multiplicador de vida enemiga, número de rerolls extra): en v1 son constantes fijas (`ENEMY_HEALTH_MULTIPLIER`, `ENEMY_EXTRA_REROLLS_PER_ROUND` en `src/game/automaton.ts`), no configurables por el jugador. (Detectado en SPEC-004b.)
- El autómata enemigo no resuelve dados de escudo (`NSh`): la tabla de prioridades de SPEC-004b no los contempla, así que se quedan inertes en su pool hasta el siguiente Reset. Ampliar la tabla para que el autómata también se aplique escudos a sí mismo. (Detectado en SPEC-005.)
- El autómata enemigo tampoco resuelve dados de recurso (`1R`): mismo motivo que los de escudo, se quedan inertes en su pool. Ampliar la tabla de prioridades para que también los resuelva. (Detectado en SPEC-006.)
- Determinar el formato real de una cara de dado de ARH DB *con coste* de recurso (distinto de `1R`, que produce uno) para poder implementar "gastar recursos". (Detectado en SPEC-006.) **Pista real
  (2026-07-20, aportada por el usuario)**: en cartas support/upgrade (`22104` Broken Horn, `25033`
  Krayt Dragon) se ve el patrón `<valor><TIPO><coste>` — p. ej. `3ID1`, `2R1`, `5R2` — un dígito
  final que es el coste para aumentar el valor de esa cara (power action). También existen caras
  **modificadoras** tipo `+1*` (`22080` Renowned) que se resuelven junto a otro dado, y símbolos
  con cantidad no vistos hasta ahora como `3Dc`. Ninguna de las tres cartas es `type_code:
  "character"`, así que hoy no llegan al pool (`buildCharacters.ts` solo importa personajes) — pero
  antes de implementar "gastar recursos" hace falta confirmar si los dados de **personaje** usan el
  mismo patrón `<valor><TIPO><coste>`, con ejemplos reales de cartas de personaje (no support/
  upgrade).

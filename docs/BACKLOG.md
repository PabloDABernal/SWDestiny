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
- El autómata enemigo no resuelve dados de escudo (`NSh`): la tabla de prioridades de SPEC-004b no los contempla, así que se quedan inertes en su pool hasta el siguiente Reset. Ampliar la tabla para que el autómata también se aplique escudos a sí mismo. (Detectado en SPEC-005.)
- El autómata enemigo tampoco resuelve dados de recurso (`1R`): mismo motivo que los de escudo, se quedan inertes en su pool. Ampliar la tabla de prioridades para que también los resuelva. (Detectado en SPEC-006.)
- Determinar el formato real de una cara de dado de ARH DB *con coste* de recurso (distinto de `1R`, que produce uno) para poder implementar "gastar recursos". (Detectado en SPEC-006.)
  **Investigación con datos reales (2026-07-20, aportados por el usuario):**
  - Confirmado con el mazo de referencia (15040 Luminara Unduli: `"2Sh"`; 20013 Clone Trooper: sin
    escudo) que el token base de escudo **sí es `Sh`** (sin sufijo) tal cual implementa
    `parseShield` en SPEC-005 — no hay bug ahí, el playtest fue válido.
  - Pero en dados de personaje CON coste (23001 Allya: `"3Shi1"`; 16096 Greef Karga: `"2RD1"`,
    `"2R1"`) aparecen dos sufijos de coste distintos, no vistos por SPEC-005/006 (que solo cubren
    la cara "pelada", sin sufijo):
    - `<valor><TIPO><dígito>` (sin "i") — hipótesis: coste en **recursos** (encaja con lo que ya
      apuntaba el SDD).
    - `<valor><TIPO>i<dígito>` — hipótesis: coste en **daño indirecto a uno mismo** (distinto
      mecanismo).
  - También en cartas support/upgrade (fuera de alcance, `buildCharacters.ts` solo importa
    `type_code: "character"`): caras **modificadoras** `+1*` (22080 Renowned, se resuelven junto a
    otro dado) y símbolos con cantidad no vistos como `3Dc` (25033 Krayt Dragon).
  - **Confirmado con el reglamento (2026-07-20, ver [reglas-resumen.md](reglas-resumen.md) → "Costes
    en una cara", RR pg 10):** hay DOS tipos de coste, y el coste hay que **pagarlo para resolver la
    cara** (no aumenta el valor base):
    - Caja amarilla = **coste de recursos**: gastar N recursos. Encaja con el sufijo `<v><TIPO><n>`.
    - Caja roja = **coste de daño indirecto a uno mismo**: hacerse N de daño indirecto. Encaja con
      el sufijo `<v><TIPO>i<n>`.
    - Pendiente solo: validar el string EXACTO que devuelve la API de ARH DB para cada tipo antes de
      implementar "gastar recursos" (necesita además consumidor real de recursos).

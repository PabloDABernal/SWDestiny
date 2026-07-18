# SPEC-003: Resolver daño de los dados del pool (melee/ranged/indirecto) con KO

**Estado:** Pendiente
**Sección del GDD:** §3 (símbolos de daño, vida), §5 (alcance v1: daño melee/ranged/indirecto)
**Depende de:** SPEC-001 (personajes con vida), SPEC-002 (pool de dados)

## Qué es (2-4 líneas)

Con dados en el pool, el jugador elige un **dado de daño** (melee/ranged/indirecto) y lo aplica a
un **personaje objetivo**, cuya vida baja en la cantidad del dado. El dado se consume (sale del
pool). Si la vida llega a 0, el personaje queda **KO**: no se puede activar, no puede recibir más
daño y sus dados que quedaran en el pool se retiran.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Con un dado mostrando `2MD` en el pool, el jugador lo aplica a un personaje de 11 de vida →
      su vida pasa a **9** y ese dado **desaparece** del pool.
- [ ] `2MD`, `2RD` y `2ID` aplicados a un mismo objetivo restan **lo mismo** (2 cada uno): los tres
      tipos de daño bajan la vida por igual en v1 (sin escudos ni reglas especiales).
- [ ] Un dado **sin daño** (`1R`, `1F`, `Sp`, `2Sh`, `-`, `Dc`) **no** ofrece acción de aplicar:
      no es seleccionable como fuente de daño y nunca baja la vida de nadie (queda en el pool,
      inerte).
- [ ] Aplicar daño que iguala o supera la vida restante → la vida se muestra **0** y el personaje
      queda marcado **KO**.
- [ ] Un personaje **KO** no puede activarse (botón deshabilitado) ni ser elegido como objetivo de
      daño.
- [ ] Al quedar KO, cualquier dado suyo que siguiera en el pool **se retira** del pool.
- [ ] El daño **persiste** al pulsar **Reset** (Reset vacía el pool y reactiva, pero NO cura); solo
      **importar un mazo** devuelve a todos a vida completa.

## Fuera de alcance (explícito)

- **Escudos** y su interacción con el daño (v2).
- **Asignación/split especial del daño indirecto** — en v1 se trata igual que el directo.
- **Curación / retirar daño** por cualquier vía que no sea reimportar el mazo.
- **Condición de fin de partida** (victoria/derrota cuando un bando queda sin personajes) — es
  posterior (GDD sitúa la condición de victoria por deck-out en v3; la de KO total se definirá con
  el autómata/enemigo).
- **Enemigo real**: no hay bandos; el daño se aplica a cualquier personaje en pantalla como
  andamiaje hasta que exista el autómata (SPEC-004).
- **Resolver otros símbolos** (recurso, focus, disrupt, descarte, especial): siguen mostrándose
  crudos, sin efecto.

## Casos límite

- **Dado de daño con coste de recurso** → en v1 no se puede pagar (SDD): se trata como **no
  aplicable** (equivalente a blanco). Validar en implementación cómo viene el coste en `sides`.
- **Aplicar daño con el objetivo ya a 0 / KO** → no permitido (KO no es objetivo válido).
- **Vida no baja de 0** → un `2MD` sobre un personaje con 1 de vida lo deja en 0 (KO), no en -1.
- **Todos los personajes KO** → todos los botones Activar deshabilitados; no hay objetivos; la
  partida no termina (fin de partida está fuera de alcance).
- **Reset con daño acumulado** → pool se vacía y todos reactivables, pero **conservan** el daño
  recibido (no vuelven a vida completa).
- **Cara `-` u otra sin daño en el pool** → nunca reduce vida.
- **Recargar la página sin reimportar** → el daño se pierde (como el pool y las activaciones: es
  estado de sesión no persistido; solo el mazo persiste). Comportamiento aceptado, no un bug;
  coherente con SPEC-002.

## Notas técnicas (opcional)

- **Flujo de interacción** (a fijar en implementación, sugerido): clic en un dado de daño del pool
  lo marca como seleccionado y entra en modo "elegir objetivo"; el siguiente clic en un personaje
  no-KO aplica el daño y sale del modo. Clic en otro dado cambia la selección; clic fuera la
  cancela. Los dados sin daño no entran en este flujo.
- Una cara es "de daño" si coincide con `<n><tipo>` donde tipo ∈ {`MD`, `RD`, `ID`} y `<n>` es la
  cantidad (p. ej. `2MD` → 2, tipo melee). `1R` es **recurso**, no daño; `1RD` sí es ranged damage.
  Función de parseo pura y testeable (`parseDamage(face) → number | null`).
- Estado de daño en el store de partida (Zustand), por **índice de instancia** (coherente con
  SPEC-002; los dos Clone comparten `code`). Sugerencia: `damage: number[]` paralelo a
  `characters`; vida mostrada = `character.health - damage[i]`; KO cuando `damage[i] >=
  character.health`. NO se persiste (igual que pool/activaciones); solo el `Character` "molde" de
  SPEC-001 persiste.
- Al aplicar: retirar ese `PooledDie` del pool (una vez). Al provocar KO: retirar del pool todos
  los `PooledDie` cuyo `characterIndex` sea el del KO.
- `reset()` (SPEC-002) NO toca `damage`. `importDeck` SÍ reinicia `damage` junto con pool/activated.

## Nota de tamaño (regla 4 CLAUDE.md)

Toca `gameStore` (estado `damage` + acción `applyDamage`, ajustes en `activate`/`importDeck`),
un módulo puro `parseDamage`, selección de dado + objetivo en la UI (DicePool + CharacterCard) y
estado visual KO. Debería caber en ~300 líneas; confirmar al empezar. Si se dispara, separar
"motor de daño + estado" de "UI de selección objetivo".

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

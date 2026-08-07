# SPEC-046: Habilidades reactivas del set 01 — ganchos en daño, escudos y KO

**Estado:** Completada
**Sección del GDD:** §5, amplía la nota "Texto de personaje por sets (v4)" (SPEC-042)
**Depende de:** SPEC-042 (registro de habilidades y el aviso Usar / No usar), SPEC-043 (red de tests
del store: daño, KO y turnos), SPEC-005 (escudos), SPEC-025 (turnos)

## Qué es (2-4 líneas)

Segunda tanda del texto del set 01: los personajes cuyo texto **no se dispara cuando tú pulsas algo**,
sino **en mitad de otra cosa** —antes de recibir daño, antes de ganar escudos, al caer un rival—.
Entran los tres que comparten mecanismo: **Count Dooku**, **Qui-Gon Jinn** y **Bala-Tik**. Se monta
el sistema de "disparadores reactivos" que necesitarán todos los demás sets.

## Personajes que entran

| Código | Personaje | Cuándo se dispara | Efecto |
|---|---|---|---|
| 01009 | Count Dooku | **Antes** de que él reciba 1+ de daño | Puedes **descartar una carta** de tu mano para darle **1 escudo** |
| 01037 | Qui-Gon Jinn | **Antes** de que él gane 1+ escudos | Puedes **quitarle 1 escudo** para infligir **1 de daño** a un personaje |
| 01019 | Bala-Tik | **Después** de que un personaje **rival** sea derrotado | Puedes **enderezarlo** (vuelve a poder activarse) |

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Count Dooku

- [ ] Con Dooku en mesa y cartas en la mano, cuando **va a recibir daño** (de un dado tuyo mal
      dirigido no: del enemigo) aparece el aviso **Usar / No usar** con su texto.
- [ ] **Usar** → **eliges tú qué carta** de tu mano se descarta (su texto no dice que sea al azar;
      señalado por el usuario jugando, 2026-08-07). Al elegirla (baja el contador de mano, sube el descarte), Dooku
      **gana 1 escudo**, y **ese escudo absorbe 1 punto del daño que disparó la habilidad**: si iban a
      entrarle 3, entran 2. *(Decisión del usuario, 2026-08-05: es lo que significa "antes de" y es lo
      único que hace útil la carta.)*
- [ ] **No usar** → el daño entra entero, como hasta ahora.
- [ ] Con la **mano vacía** no se puede usar: el aviso lo indica y solo cabe "No usar" (mismo criterio
      que SPEC-042 con Jabba sin dados amarillos).
- [ ] Si el daño que iba a recibir **ya lo absorbían escudos previos**, la habilidad **no se dispara**:
      solo salta cuando de verdad va a recibir daño en la vida.

### Qui-Gon Jinn

- [ ] Cuando Qui-Gon **va a ganar escudos** (por un dado de escudo tuyo) y **ya tiene al menos 1**,
      aparece el aviso Usar / No usar.
- [ ] **Usar** → pierde 1 escudo de los que ya tenía y se inflige **1 de daño a un personaje que tú
      eliges** (de cualquier bando, su texto no lo restringe). Después, los escudos que iba a ganar
      **se aplican igual**.
- [ ] Si **no tiene ningún escudo** que quitar, la habilidad no se ofrece.
- [ ] Si ese 1 de daño deja KO a alguien, el KO se resuelve normal (y puede terminar la partida).

### Bala-Tik

- [ ] Cuando **un personaje del bando contrario al suyo es derrotado**, aparece el aviso Usar / No
      usar para Bala-Tik.
- [ ] **Usar** → Bala-Tik queda **enderezado**: su ficha deja de estar "Activado" y **puede volver a
      activarse esta misma ronda**, volviendo a tirar sus dados. *(Decisión del usuario, 2026-08-05.)*
- [ ] Si Bala-Tik **no estaba activado**, no hay nada que enderezar: la habilidad no se ofrece.
- [ ] Si en la misma ronda caen **dos rivales**, la habilidad se ofrece **las dos veces** (una por
      cada muerte), así que Bala-Tik puede llegar a activarse tres veces esa ronda. *(Decisión del
      usuario, 2026-08-05: su texto no pone límite.)*
- [ ] Se dispara **también cuando el KO lo causa el autómata** a uno de sus propios personajes (el
      texto dice "un personaje rival", no "un personaje que tú derrotes").
- [ ] Si el personaje derrotado era el **último** del bando, la partida termina y **no** queda ningún
      aviso colgado en pantalla.

### Común a los tres

- [ ] El aviso **para la acción en curso**, incluido el turno del autómata: si el enemigo te ataca y
      salta Dooku, su turno **espera** a que elijas. *(Decisión del usuario, 2026-08-05: mismo patrón
      de aviso que SPEC-042.)*
- [ ] Cuando el personaje con la habilidad es del **autómata**, decide él, sin preguntarte nada, y su
      decisión se ve en el aviso de "última acción del enemigo".
- [ ] Mientras el aviso está abierto **no se puede hacer otra cosa**, igual que con los avisos de
      SPEC-042.
- [ ] Un personaje **sin** habilidad reactiva sigue recibiendo daño y escudos exactamente igual que
      hasta ahora: la resolución normal no cambia.

## Fuera de alcance (explícito)

- **Los otros 5 reactivos del set 01** (confirmado por el usuario, 2026-08-05): **Grievous** (mover
  mejoras, y necesita `subtypes` en el snapshot), **Jango Fett** (activar fuera de turno), **Rey**
  (acción adicional), **Admiral Ackbar** (rival sin mano) y **Han Solo** (**bloqueado**: reacciona a
  la keyword **Ambush**, que no existe hasta SPEC-047). Van a specs posteriores.
- **Añadir `subtypes` al snapshot**: se hará cuando llegue la carta que lo necesite (Grievous), no
  aquí.
- **Keywords pasivas** (Guardian y compañía): siguen en su propia spec.
- **Un sistema general de "ventanas de respuesta"** al estilo de juegos de cartas competitivos (con
  prioridad, respuestas a respuestas, etc.): aquí solo hace falta parar, preguntar y seguir. No se
  monta nada más grande de lo necesario.

## Casos límite

- **Dos habilidades reactivas que saltan a la vez** (p. ej. un dado que mata a un personaje y hace
  saltar a Bala-Tik mientras Dooku recibía daño): se resuelven **una detrás de otra**, cada una con su
  aviso, en el orden en que ocurren los eventos. Nunca dos avisos abiertos a la vez.
- **Daño repartido a varios personajes en una misma tanda** (multi-objetivo, SPEC-011): la habilidad
  se dispara por cada personaje afectado que la tenga, no una sola vez para toda la tanda.
- **Daño indirecto repartido por el jugador** (SPEC-028): si un punto va a un Dooku, salta igual.
- **Dooku recibiendo daño de su propio bando** (coste indirecto propio, SPEC-010): también es "recibir
  daño", así que salta. Es correcto según el texto.
- **Qui-Gon ganando escudos por su propio dado**: salta igual; el texto no distingue de dónde vienen.
- **La habilidad deja KO a quien la usó** (Qui-Gon eligiéndose a sí mismo): permitido, el texto no lo
  prohíbe; el KO se resuelve normal.
- **Partida terminada a mitad**: si el efecto termina la partida, ningún aviso pendiente se queda
  abierto.
- **Recarga de la página** con un aviso abierto: el estado de partida no se persiste, así que no queda
  nada colgado (igual que hoy).

## Notas técnicas

**El enfoque cambió tras la revisión de `revisor-specs` (2026-08-05).** El borrador proponía *pausar
dentro* de la resolución de daño; la revisión demostró que eso era inviable y peligroso. Lo que sigue
es el enfoque corregido y el porqué.

- **NO se pausa dentro de la resolución. Se comprueba en los bordes.** `resolveShieldedDamage`
  (`src/game/damage.ts`) se llama desde **~9 sitios** de `gameStore.ts`: la rama de daño de
  `resolvePlayerBatch`, el bucle de `applyIndirectDamage`, `applyOwnIndirectCost` y sus cuatro
  llamantes (`resolvePlayerBatch`, `applyIndirectDamage`, `applyDisrupt`, `applyDiscard`,
  `prepareEnemyIndirectAttack`), `applyFixedDamage` (el daño fijo de Vader) y `distributeIndirect`
  (reparto clic a clic, SPEC-028). Interrumpir esa función a medias en todos esos caminos era la
  receta para repetir —y multiplicar— los cuelgues de SPEC-042. En su lugar:
  - **`beforeDamaged` / `beforeShielded`**: se comprueban **en la acción, antes de aplicar**. Se
    calcula a quién le va a entrar daño (o escudos) y cuánto; si algún objetivo tiene el disparador,
    se pregunta **primero**, y solo después se aplica la tanda entera de una vez. Así el escudo de
    Dooku ya está puesto cuando el daño se calcula, que es justo lo que pide su texto, y las funciones
    de daño siguen siendo **atómicas**.
  - **`afterOpponentDefeated`**: se comprueba **después** de aplicar, mirando quién ha quedado KO.
- **Ojo con `confirmAbility` de Nightsister**: su daño propio (SPEC-042) escribe la vida directamente,
  **sin pasar por `resolveShieldedDamage`**. Si algún día un reactivo debe saltar ahí, hay que
  acordarse; hoy no aplica (Nightsister se daña a sí misma y no es ninguno de estos tres).
- **NO se puede reutilizar `pendingAbility` tal cual.** `useAbility`/`skipAbility`/`confirmAbility`
  (SPEC-042) **siempre cierran el turno** (`turn: opposite(side)`), porque allí usar la habilidad
  *era* la acción. Un reactivo que salta a mitad del turno del autómata **no debe ceder el turno**:
  tiene que devolver el control a la acción que lo disparó. Hace falta un estado **aparte**
  (p. ej. `reactiveAbility`) con su propio cierre, que al resolverse **continúe la acción pendiente**
  en vez de cambiar de turno. Es una estructura distinta, no una entrada más del mismo sitio.
- **`enemyTurn()` necesita el mismo tratamiento a mano que ya recibió su rama `activate`** en
  SPEC-042: es síncrona y resuelve cada acción de un tirón. Para que Dooku pueda pararle un ataque,
  las ramas `attack`, `shield` e `indirectAttack` tienen que consultar el disparador **antes** de
  aplicar y, si hay que preguntar al jugador, dejar la acción guardada y esperar. Y **nunca** puede
  quedarse esperando algo que solo podría decidir el propio autómata.
- **El registro de SPEC-042 hay que AMPLIARLO, no solo añadirle filas.** Ninguno de los
  `AbilityTargeting` actuales (`none`/`reroll`/`turnSupportDie`/`discardHandCardForDie`) sirve:
  Dooku necesita "descartar una carta de la mano **y ganar escudo**" (distinto de descartar para
  resolver una cara), Qui-Gon necesita **elegir un personaje** (no existe hoy ningún targeting de
  personaje) y Bala-Tik necesita **tocar `activated`**, que ningún efecto actual toca.
- **Encadenar dos pausas en una misma resolución** (el daño mata a Dooku después de usar su escudo, y
  ese KO dispara al Bala-Tik del otro bando): con el enfoque de bordes esto deja de ser un problema,
  porque las preguntas ocurren **antes** y **después** de una aplicación atómica, nunca dentro. Aun
  así hay que probarlo: es el caso que más fácil se rompe.
- **Decidir si se ofrece el aviso exige simular el golpe**: el criterio "si los escudos previos ya
  absorbían todo el daño, Dooku no se dispara" obliga a calcular `resolveShieldedDamage` con los
  escudos actuales **antes** de preguntar. Esa comprobación va en el mismo sitio que la pregunta.
- **Ampliar la red de SPEC-043** con estos caminos, no solo con el más obvio: daño normal, daño
  indirecto repartido por el jugador (SPEC-028), coste indirecto propio, y KO que termina la partida.
- **KO y mejoras (SPEC-020/021)**: si un KO ocurre después de una pausa, el descarte de las mejoras
  ligadas tiene que quedar igual de consistente que hoy.
- **El autómata decide solo**: como en SPEC-042, con criterio simple y conservador (Dooku: usar si le
  quedan cartas y el daño le haría perder vida; Bala-Tik: usar siempre; Qui-Gon: solo si el daño mata
  a alguien). Y **nunca** puede quedarse esperando una decisión: ese fue el fallo que más veces
  apareció en SPEC-042.
- **`hasImplementedText` los marcará solos** en la mesa (SPEC-044) al añadirlos al registro, sin tocar
  la UI.

## Nota de tamaño (regla 4 CLAUDE.md)

Grande y de riesgo alto, aunque solo entren 3 personajes. El grueso no son las cartas: es el
**mecanismo de preguntar antes/después de aplicar**, un **estado de habilidad reactiva propio**
(porque el de SPEC-042 siempre cede el turno), **ampliar los tipos de objetivo** del registro y
**adaptar tres ramas más de `enemyTurn`**. La revisión de la spec dejó claro que era bastante más de
lo que parecía; el enfoque de bordes lo reduce, pero no lo vuelve pequeño.

El usuario decidió mantener los 3 (2026-08-05). Si al implementar se dispara, el orden de descarte es:
primero **Qui-Gon** (el único que además necesita elegir personaje objetivo, un tipo de selección que
hoy no existe), y después **Bala-Tik**, dejando a Dooku, que ya obliga a montar el mecanismo entero.
Avisando antes; no subdividir con sufijos.

## Resultado del playtest

Completada tras playtest 2026-08-07. Los tres reactivos funcionan jugando: Dooku para el turno del
autómata cuando te atacan y su escudo absorbe ese mismo golpe, Qui-Gon cambia escudo por daño
eligiendo objetivo, y Bala-Tik se endereza al caer un rival pudiendo volver a activarse.

Es la spec que más correcciones ha necesitado, y ninguna la habría visto yo solo:

- El agente `revisor-specs` **tumbó el enfoque antes de escribir código**. El borrador pausaba dentro
  de la resolución de daño; la revisión demostró que esa función se llama desde ~10 sitios, que
  `enemyTurn` resuelve cada acción de un tirón, y que la maquinaria de avisos de SPEC-042 siempre
  cede el turno. Se rehizo comprobando en los bordes.
- El agente `revisor-codigo` dio **NO CUMPLE dos veces**, con 7 bloqueantes en total. Los más graves: faltaba
  el guard que impide actuar con un aviso abierto (se perdía la acción en silencio), el KO de Qui-Gon
  no limpiaba dados ni mejoras, Bala-Tik no reaccionaba al ataque normal del autómata, y el Qui-Gon
  del autómata era código muerto. En la primera corrección enganché solo el lado de Dooku y me dejé
  el suyo: hizo falta la segunda pasada para verlo.
- **Jugando** aparecieron tres más: una partida colgada con dos Especiales sin implementar del
  enemigo (bug anterior, de SPEC-039: el turno no volvía porque la app solo llama al autómata cuando
  cambia), Dooku descartando al azar cuando su texto deja elegir, y avisos de descarte que no decían
  qué carta caía.

De 275 a 277 tests, con regresión para cada bloqueante.

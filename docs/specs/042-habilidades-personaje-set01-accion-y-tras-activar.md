# SPEC-042: Habilidades de personaje — mecanismo + set 01 (`Action -` y `After you activate`)

**Estado:** Pendiente
**Sección del GDD:** §5, nueva nota "Texto de personaje por sets (v4)"
**Depende de:** SPEC-039 (tabla de efectos por código de personaje, `characterAbilities.ts`),
SPEC-023 (elegir dado objetivo y cara, que estas habilidades reutilizan), SPEC-025 (turnos y
acciones), SPEC-022 (robo real), SPEC-029 (descarte de la mano rival)

## Qué es (2-4 líneas)

Primera tanda del **texto de carta de verdad**, empezando por el **set 01 (Awakenings)** y por los
**personajes**, que es como el juego original fue introduciendo sus reglas. Entran los 7 personajes
del set cuyo texto se dispara de las dos formas más directas: una **acción** que eliges hacer en tu
turno (`Action -`) y un **"tras activar este personaje, puedes…"**. Se monta además el **mecanismo**
que permitirá ir sumando el resto de personajes y sets sin rehacerlo cada vez.

## Personajes que entran

| Código | Personaje | Disparo | Efecto |
|---|---|---|---|
| 01004 | General Veers | `Action` | Retira este dado para **girar un dado de apoyo tuyo a cualquier cara** |
| 01012 | Nightsister | `Action` | **Rerollea un dado**; inflige **1 daño a este personaje** |
| 01028 | Leia Organa | `Action` | Retira este dado para **rerollear hasta 2 dados tuyos** |
| 01010 | Darth Vader (01) | Tras activar | Puedes **forzar al rival a descartar** una carta de su mano (la elige él) |
| 01020 | Jabba the Hutt | Tras activar | Puedes **rerollear un dado amarillo** |
| 01022 | Tusken Raider | Tras activar | Puedes **descartar una carta de tu mano** para **resolver una de las caras del dado de esa carta** |
| 01035 | Luke Skywalker | Tras activar | **Roba una carta** |

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Habilidades `Action -`

- [ ] Con **General Veers** en mesa y su dado en el pool, aparece un botón de su habilidad. Usarlo
      **retira su dado** del pool y deja **elegir un dado de apoyo propio y girarlo a la cara que
      quieras** (misma interacción que Focus, SPEC-023).
- [ ] Usar una habilidad `Action -` **gasta la acción del turno**: al terminarla el turno pasa al
      rival, igual que activar un personaje. *(Decisión del usuario, 2026-07-30, conforme al RR.)*
- [ ] Con **Leia Organa**: usarla retira su dado y permite **rerollear hasta 2 dados propios** (se
      pueden elegir 0, 1 o 2; con 0 elegidos la habilidad no se puede confirmar, se cancela).
- [ ] Con **Nightsister**: usarla **rerollea un dado** (de cualquier pool) y **le hace 1 daño a ella
      misma**, visible en su ficha. Si ese daño la deja KO, se resuelve como cualquier otro KO.
- [ ] El botón de la habilidad **solo aparece cuando se puede usar**: es tu turno, la partida no ha
      terminado, no hay otra resolución abierta, y **para Veers y Leia** —cuyo texto dice "retira este
      dado"— su dado está en el pool sin resolver. Si no, no se muestra (o se muestra deshabilitado,
      pero nunca engaña).
- [ ] **Nightsister NO necesita estar activada**: su texto no retira su dado, así que su habilidad se
      puede usar desde que está en mesa (gastando la acción del turno), sin haberla activado antes.
      Su dado, si ya estaba en el pool, **se queda** para resolverlo luego. *(Decisión del usuario,
      2026-07-30, conforme al RR: una habilidad `Action` se usa mientras la carta esté en juego; solo
      las que dicen "retira este dado" exigen tenerlo en el pool.)*
- [ ] **Cancelar** a mitad (antes de confirmar el giro/reroll) deja todo como estaba: el dado sigue en
      el pool y **no** se ha gastado el turno.

### Habilidades `After you activate`

- [ ] Al **activar Luke Skywalker**, tras tirar su dado aparece un **aviso** con el nombre y el efecto
      ("Luke Skywalker: puedes robar una carta") y dos botones: **Usar** y **No usar**.
- [ ] Pulsar **Usar** aplica el efecto (Luke: robar 1 carta, visible en el contador de mano). Pulsar
      **No usar** no aplica nada. En ambos casos el aviso desaparece y la activación queda terminada.
- [ ] Mientras el aviso está abierto, **no se puede hacer otra cosa** (ni activar otro personaje, ni
      resolver dados): hay que elegir primero.
- [ ] Con **Darth Vader (01010)**: Usar hace que el **rival descarte una carta de su mano**, bajando su
      contador de mano. Si el rival no tiene cartas, el efecto no hace nada (y se dice).
- [ ] Con **Jabba the Hutt**: Usar deja **elegir un dado amarillo** y rerollearlo. Si no hay ninguno
      en mesa, el aviso lo indica y solo cabe **No usar**.
- [ ] Con **Tusken Raider**: Usar deja **elegir una carta de tu mano**; al elegirla, esa carta **se
      descarta** y se **resuelve una de las caras de su dado** (se elige cuál). Solo son elegibles las
      cartas de **personaje o mejora** con dado: el texto real dice `character or upgrade dice`, así
      que un **apoyo** de la mano **no** vale, aunque tenga dado. *(Mismo estándar que SPEC-039 aplicó
      al acotar Luminara a dados de personaje.)*
- [ ] Activar un personaje **sin** habilidad (p. ej. un Clone Trooper) sigue funcionando exactamente
      igual que hasta ahora, sin ningún aviso.

### El autómata

- [ ] El autómata **usa estas 7 habilidades** cuando controla a esos personajes (decisión del usuario,
      2026-07-30), con criterio simple y sin pedir nada al jugador; su acción se ve reflejada en el
      aviso de "última acción del enemigo" que ya existe, **incluidas las de `Action -`**, con el
      nombre del personaje y qué hizo.
- [ ] **Dónde encajan en su tabla de prioridades** (decisión del usuario, 2026-07-30): las de **"tras
      activar"** no compiten por hueco, se disparan solas dentro de su `activar` de siempre; las de
      **`Action -`** (Veers, Leia, Nightsister) van **al final, justo antes de "reroll de blancos /
      pasar"**, o sea como último recurso cuando no tiene nada mejor que hacer. La tabla queda: daño →
      escudo → activar (+ su habilidad tras activar) → recurso → disrupt/descarte → focus → reroll →
      especial → **habilidades `Action -`** → reroll de blancos → pasar.
- [ ] El autómata **nunca se queda atascado** por una habilidad: si no hay objetivo válido (no hay
      dado amarillo, no hay apoyo, mano vacía), simplemente no la usa y sigue con su tabla de
      prioridades.
- [ ] **Veers en manos del autómata** gira su dado de apoyo a la **mejor cara** con la misma prioridad
      que ya usa su Focus automático: **daño > escudo > recurso**. Solo lo intenta si ese giro mejora
      de verdad la cara que muestra. *(Decisión del usuario, 2026-08-03: al principio se dejó fuera
      por no inventar heurística, hasta comprobar que `bestFocusFace` ya existía y valía tal cual.)*

### Aviso de "pendiente de implementar"

- [ ] El aviso de partida "habilidad especial de la carta, pendiente de implementar" (el de
      `gameStore`, SPEC-023/039) **no cambia**: es del símbolo **Especial**, y ninguno de estos 7
      personajes lo usa. Sigue saliendo igual para los personajes con Especial que aún no estén en la
      tabla. *(Aclarado tras la revisión: la redacción inicial de esta spec lo confundía con la ficha
      de la DB, donde no hay ningún aviso de ese tipo.)*

## Fuera de alcance (explícito)

- **Los otros 15 personajes del set 01**: los reactivos (`Before…`, `After` que no es "tras activar":
  Grievous, Dooku, Qui-Gon, Bala-Tik, Jango Fett, Ackbar, Rey, Han Solo) van a **SPEC-045**, y las
  **keywords pasivas** (Guardian de Phasma y Rebel Trooper, y los modificadores de coste de Padawan y
  Finn) a **SPEC-046**. Los `[special]` del set 01 (Kylo Ren, Poe Dameron, Padmé) van con la tanda de
  Especiales que corresponda.
- **Mejoras, apoyos, eventos y campos de batalla del set 01**: van después de los personajes, en el
  orden acordado con el usuario (2026-07-30): set → personajes → cartas con dado → cartas sin dado.
- **Un intérprete genérico del texto** de las cartas: se sigue con **tabla de efectos por código**
  (como SPEC-039). Leer el inglés y deducir la regla no entra ni entrará.
- **Otros sets**: solo el 01. Luminara/Zuckuss/Vader (02/11) siguen como están desde SPEC-039.

## Casos límite

- **Personaje KO con habilidad**: un personaje derrotado no ofrece habilidad ninguna, ni `Action -`
  ni tras activar.
- **Nightsister se mata a sí misma**: si el daño propio la deja KO, el reroll **ya se ha aplicado**
  (primero el efecto, luego el daño) y el KO se resuelve normal. Si era el último personaje del bando,
  se dispara la Derrota/Victoria como siempre.
- **Veers sin apoyos propios en mesa** (o sin dados de apoyo en el pool): su habilidad no se puede
  usar; el botón no aparece.
- **Leia con un solo dado propio disponible**: puede rerollear ese único dado ("hasta 2" es un
  máximo, no una obligación).
- **Jabba sin dados amarillos**: el aviso sale igual (se activó el personaje) pero solo cabe "No usar".
- **Tusken con la mano vacía**, o con cartas pero ninguna con dado: mismo caso, solo "No usar".
- **Vader con el rival sin cartas en mano**: "Usar" no descarta nada; se informa y no se rompe.
- **Fin de partida a mitad**: si un efecto deja KO al último personaje de un bando, el resultado
  (Victoria/Derrota) se dispara y ningún aviso pendiente queda colgado en pantalla.
- **Dos copias del mismo personaje no-único**: cada copia tiene su propia habilidad y su propio dado;
  usar la de una no consume la de la otra. *(Ninguno de estos 7 es no-único, pero el mecanismo no debe
  asumir unicidad.)*
- **Recarga de la página a mitad de un aviso pendiente**: el estado de partida no se persiste (nada
  cambia respecto a hoy); al recargar no debe quedar ningún aviso colgado.

## Notas técnicas

- **Mecanismo, no casos sueltos**: se amplía `src/game/characterAbilities.ts` (SPEC-039) a un
  **registro de habilidades por código** con, al menos: cuándo se dispara (`action` |
  `afterActivate`), si se puede usar ahora mismo (para decidir si se pinta el botón/aviso), el texto
  corto que se muestra al jugador, y cómo se aplica (tanto para el jugador como para el autómata).
  El objetivo declarado es que **SPEC-045/046 y los sets siguientes solo añadan entradas**, sin tocar
  el motor otra vez.
- **Hay que romper la atomicidad de `activate()`** (lo más delicado de esta spec). Hoy `activate()`
  hace `turn: opposite(side)` en el mismo `set()` que tira los dados —"Activar es SIEMPRE una acción
  completa"—, y `enemyTurn` reutiliza esa misma función. El aviso "Usar / No usar" solo tiene sentido
  si el turno **todavía no ha pasado**, así que en los personajes con habilidad "tras activar" el
  cambio de turno debe **diferirse** hasta que el jugador elija. Hay que repasar los guardas que ya
  comprueban `state.turn !== side` y los modos abiertos (`playUpgrade`/`mulligan`/`resolve`) y darle
  al modo nuevo el mismo tratamiento de exclusión mutua. Precedente a seguir: la excepción de turno
  que SPEC-039 introdujo para Especial (el turno no cambia mientras queden Especiales por resolver).
- **Reutilizar SPEC-023, pero adaptándolo**: girar un dado a una cara elegida y rerollear ya existen
  (`pickFocusTarget`/`chooseFocusFace`/`confirmFocus` y el reroll de dado), pero están **acoplados a
  `resolve.symbol === 'focus'` y a `sumPlayerMarked`** (el presupuesto sale del valor de las caras de
  Focus marcadas). Veers ("gira 1 dado de apoyo") y Leia ("hasta 2 dados") tienen **cantidad fija** y
  no dependen de ninguna cara de Focus, así que hay que **generalizar** esa maquinaria (o exponer una
  variante con presupuesto explícito), no reusarla tal cual. Contar con ello al estimar: no es un
  "reusar y ya".
- **Sin tocar el pipeline de import ni el snapshot**: las habilidades se identifican por `code`, que
  ya está en el estado de juego.
- **Aviso de "tras activar"**: es un modo más del store, al estilo de `playUpgrade`/`mulligan`
  (SPEC-020/024), con sus mismos guardas de exclusión mutua para que no se solape con otra resolución.

## Nota de tamaño (regla 4 CLAUDE.md)

Grande, y la revisión la ha hecho crecer: además del mecanismo + 7 personajes + autómata, hay que
**diferir el cambio de turno de `activate()`** (que hoy es atómico y lo usa también el autómata) y
**generalizar la maquinaria de Focus/reroll** de SPEC-023. Esas dos son cirugía sobre código ya jugado,
no añadidos. Si al implementar se dispara, el orden de descarte es: primero **Tusken Raider** (el único
que necesita elegir carta de la mano *y* cara de su dado), y después las tres de **`Action -`** (que
son las que obligan a generalizar Focus), dejando en SPEC-042 el mecanismo + las "tras activar".
Avisando antes; no subdividir con sufijos.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>

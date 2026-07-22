# GDD — Star Wars Destiny: PVE con mazos de la comunidad

**Estado:** Vivo (v1.0, v2 en curso) — v1 completa; v2 en marcha (SPEC-005 escudos, SPEC-006
recursos-generación), validado de facto por specs jugadas (SPEC-001 a SPEC-015: incluye costes y
multi-objetivo del jugador —SPEC-008a/008b/010/011—, paridad del autómata —SPEC-013/014— y
selector de dificultad —SPEC-015—)

## 1. Visión

Una versión digital y personal de Star Wars Destiny (TCG descatalogado), jugada en solitario
(PVE) contra un enemigo controlado por IA. El jugador usa mazos ya construidos, descargados de
bases de datos comunitarias como [ARH DB](https://db.swdrenewedhope.com/) (proyecto fan-made
que mantiene el juego vivo tras el fin de soporte oficial). No es un producto comercial ni
sustituye al PVP oficial.

## 2. Modo de juego

- **Un jugador humano** vs **un enemigo IA**.
- Ambos bandos parten de un mazo/equipo descargado (personajes + deck de 30 cartas), tal cual
  los define la comunidad.
- El enemigo **no juega con las reglas normales de decisión**: sigue una **tabla de prioridades
  determinista** (autómata), no una IA que evalúa jugadas. Ver sección 4.
- El enemigo puede tener **asimetrías compensatorias** ("trampas") para no ser trivial a pesar de
  jugar con una lógica simple: más vida, ignorar costes, dados extra, etc. Configurables por
  dificultad.

## 3. Reglas base

Se parte del reglamento oficial de Star Wars Destiny (Rules Reference v1.07.01, A Renewed Hope
Continuing Committee) sin modificarlo, salvo por las limitaciones de alcance de cada versión
(sección 6). Conceptos clave heredados: personajes con vida y dados propios, pool de dados,
símbolos (melee, ranged, indirecto, escudo, recurso, disrupt, descarte, focus, reroll, especial,
blanco), recursos, mano/mazo/descarte, fases de acción y mantenimiento, condiciones de victoria.

**Resolución de dados:** desde SPEC-008a el jugador puede resolver **varios dados del mismo
símbolo** en una acción (melee, ranged e indirecto son símbolos distintos y no se mezclan, aunque
en v1 los tres resten vida por igual). Pagar el coste de recurso de las caras (SPEC-008b), y los
modificadores `+X` junto al coste de daño indirecto propio (SPEC-010), llegan después. Desde
SPEC-011 se pueden mandar dados del mismo símbolo a **objetivos distintos** (cada dado a un enemigo),
aunque no se puede dividir el daño de un solo dado.

## 4. El autómata enemigo

Evalúa, en su turno, una tabla de prioridades de arriba abajo y ejecuta la primera acción legal
(ver SPEC-004b y SPEC-007 para el detalle definitivo):

1. Si tiene dados de daño en su pool, resuelve una **tanda combinada** (base + modificadores `+X`,
   de mayor a menor valor, mientras el coste de recurso le sea pagable — SPEC-013) dirigida al
   personaje del jugador con menos vida restante (desempate determinista, mismo criterio existente
   desde SPEC-007).
2. Si tiene un dado de **escudo**, resuelve su tanda combinada (igual que el daño) sobre su aliado
   no-KO con menos vida restante (SPEC-007/013).
3. Si tiene personajes sin activar, activa el de más vida restante.
4. Si tiene un dado de **recurso**, resuelve su tanda combinada sumándola al contador de recursos
   del enemigo (SPEC-007/013).
5. Si tiene 2 o más dados mostrando blanco, los rerollea (reroll gratuito, luego el extra de la
   trampa).
6. Pasa. *(SPEC-018 añadió aquí un paso de robo; SPEC-019 lo retira: el enemigo ahora roba en
   "Nueva ronda", igual que el jugador — ver sección 5.)*

La tabla crece en fases posteriores conforme se implementan cartas.

**Tandas combinadas y costes (SPEC-013):** para cada símbolo (daño/escudo/recurso), el autómata
junta todos los dados base y modificadores `+X` de ese símbolo, ordenados de mayor a menor valor, y
los va sumando mientras el coste de recurso acumulado le sea pagable con sus propios recursos; el
primer dado que haría el coste impagable se descarta (queda para una pasada futura) y la tanda se
cierra con lo ya sumado. Si el coste de daño indirecto propio (`…i<n>`) forma parte de una tanda (de
daño, escudo o recurso — SPEC-014 amplía esto a escudo/recurso, antes limitado a daño), el receptor
se elige así: de sus personajes no-KO, prioriza los que **sobrevivirían** al coste (con escudos
absorbiendo primero) y, entre esos, el que ya tenga escudos (empate: más vida, desempate
determinista); si ninguno tiene escudos, el de más vida entre los que sobrevivirían; si el coste
mataría a cualquiera, el de más vida como última opción.

**Multi-objetivo del autómata (SPEC-014):** repartir entre varios objetivos (SPEC-011) ya aplica
también al autómata, tanto en **daño** como en **escudo** (el recurso no tiene objetivo) — pero,
igual que le pasa al jugador con SPEC-011, puede llevar **varias pulsaciones de "Turno enemigo"**,
no una sola: cada pulsación sigue resolviendo **un único objetivo** (como siempre), pero ahora, de
entre los dados combinables de la tanda, solo incluye los que quepan en ese objetivo **sin pasarse**
(sin *overkill* en daño, sin superar el tope de 3 en escudo); el resto se queda sin resolver en el
pool para una pulsación futura, momento en el que —si el objetivo de esta pulsación quedó a 0 vida
(KO) o a tope de escudo— el autómata pasa solo al siguiente objetivo más débil con hueco. Si **ningún**
objetivo con hueco puede aceptar ni el dado más pequeño disponible sin pasarse (no hay forma de
evitarlo), se aplica igual al objetivo más débil, aceptando el exceso (un dado no se puede dividir,
SPEC-011).

### Asimetría / trampas (configurable por dificultad, **desde v1**)

El sistema de trampas está activo desde el principio, no se aplaza. Qué trampas concretas tienen
sentido depende de qué mecánicas existen ya en cada fase:

- **Disponibles desde v1:** multiplicador de vida de los personajes enemigos (p. ej. x1.5, x2);
  reroll extra de blancos (más allá del gratuito de la tabla de prioridades).
- **Se añaden en cuanto exista el sistema correspondiente:** ignorar costes de recursos al jugar
  cartas (necesita v2/recursos y v4/cartas), robo extra por ronda (necesita v3/mano).
- (Ampliable; cada trampa nueva se documenta aquí antes de implementarse.)

**Selector de dificultad (SPEC-015):** el jugador elige entre tres niveles junto al panel de
importar del enemigo — **Fácil** (x1 vida, 0 rerolls extra: el autómata sin trampas), **Normal**
(x1.5 vida, 1 reroll extra: los valores fijos de v1) y **Difícil** (x2 vida, 2 rerolls extra). La
elección se recuerda entre recargas (localStorage, igual que el mazo) y solo afecta a la **próxima**
importación del mazo enemigo (la vida ya multiplicada de una partida en curso no se recalcula al
cambiar el selector, **ni siquiera con "Reset total"**, que reconstruye con la vida ya fijada en el
último import, no con el multiplicador que esté vigente en ese momento); el reroll extra, al
consultarse en cada turno, sí aplica de inmediato.

## 5. Alcance por versión (resumen — detalle y orden en BACKLOG/specs)

- **v1:** personajes + dados + daño (melee/ranged/indirecto) + blancos + autómata básico **con
  trampas activas desde el inicio** (multiplicador de vida enemiga, reroll extra configurable).
  Sin recursos, sin mano, sin cartas jugables, sin campo de batalla. El ciclo de
  ronda/mantenimiento aún no existe del todo: se aproxima con el botón **"Nueva ronda"** (re-tira
  dados y da +2 recursos a cada bando; SPEC-009/011), más un **"Reset total"** para volver al estado
  inicial, hasta que se implemente la fase de mantenimiento reglamentaria completa (fase
  posterior). El andamiaje de "daño a cualquier personaje" de SPEC-003 queda superado en SPEC-004:
  con el mazo enemigo importado hay **dos bandos** y el daño de un dado solo se aplica al **bando
  contrario**. Cuando un bando se queda sin personajes en pie (todos KO) hay **fin de partida**
  (Victoria/Derrota). Desde SPEC-004b el enemigo **ya no es pasivo**: un botón "Turno enemigo"
  ejecuta la tabla de prioridades del autómata (una acción legal por pulsación) con las trampas de
  v1 activas (vida x1.5, reroll extra), y la Derrota se dispara jugando cuando el autómata deja KO
  a todo el bando jugador. Con esto queda completo el alcance descrito para v1.
- **v2:** recursos y escudos.

### Escudos (primera pieza de v2)

Los escudos se obtienen resolviendo una cara de dado de escudo (`1Sh`/`2Sh`/`3Sh`, según el valor
mostrado), igual que hoy se resuelve un dado de daño: clic en el dado del propio pool → clic en un
personaje objetivo. A diferencia del daño (que solo puede aplicarse al bando contrario), el
objetivo de un dado de escudo debe ser un personaje **del propio bando** (uno mismo u otro aliado
no-KO), elegido por quien resuelve el dado. Cada personaje acumula escudos hasta un **máximo de
3**; aplicar un dado que superaría el máximo simplemente lo deja en 3 (el excedente se pierde, el
dado se consume igual).

Los escudos absorben daño **antes** que la vida: al aplicar un dado de daño a un personaje con
escudos, primero se descuentan de los escudos; si el daño sobra tras agotarlos, el resto pasa a la
vida en la misma aplicación. Los escudos **no se recuperan** con el botón Reset (igual que la vida
no cura); solo volver a importar el mazo los pone a 0 de nuevo (no hay fuente de escudo "impresa"
en la carta).

### Recursos (primera pieza — solo generación, GDD v2)

Resolver un dado que muestra `1R`/`2R` (según el valor mostrado) en el pool (un solo clic, sin
elegir objetivo) añade esa cantidad de **recursos** a un **contador único por bando** (no por
personaje, a diferencia de los escudos), consumiendo el dado. **Corrección (SPEC-009):** los
recursos **persisten** entre rondas (RR pg 19/25), no se vacían; cada bando empieza con **2** al
importar. El botón **"Nueva ronda"** re-tira dados y **suma +2 recursos** a cada bando
(mantenimiento, SPEC-011); no cura vida/escudos ni deshace el fin. "Reset total" devuelve todo al
estado inicial (recursos a 2). *(SPEC-006 vaciaba los recursos con Reset — error corregido en
SPEC-009; el +2 por ronda se añadió en SPEC-011.)*

**Gastar** recursos —para pagar caras de dado con coste, o para jugar cartas más adelante— queda
fuera de esta primera pieza: el formato exacto en que ARH DB codifica una cara de dado *con coste*
(distinto de `1R`, que *produce* un recurso) todavía no está confirmado y se investigará en una
spec posterior, una vez exista un consumidor real de recursos.
- **v3:** mano, mazo, robo, condición de victoria por deck-out.
- **v4:** cartas jugables por capas (mejoras/apoyos "vanilla" → focus/reroll/especial → texto de
  cartas y keywords, empezando por los más simples como Ambush).
- **v5:** el autómata juega cartas (con trampas de coste) + campo de batalla.

### Mazo de robo (primera pieza de v3, SPEC-016)

Al importar un mazo, además de las fichas de personaje (SPEC-001), se guarda el resto como **mazo
de robo** por bando: las cartas cuyo tipo no sea personaje, trama ni campo de batalla (eventos,
mejoras, desmejoras, apoyos — RR pg 17: esas tres no cuentan para el límite de 30), barajadas y
persistidas en localStorage igual que los personajes. Esta primera pieza **no** añade mano ni
acción de robar (specs siguientes); se muestra el recuento de cartas restantes junto a cada bando
para poder verificarlo jugando. Si cualquier carta del mazo no se resuelve contra la API, el
import se cancela con error, igual que ya pasa con personajes no encontrados (SPEC-001).

### Mano y robo manual (segunda pieza de v3, SPEC-018)

El jugador roba cartas de su mazo de robo a su mano pulsando un botón **"Robar"** manual, sin
límite de tamaño de mano todavía; ve el **nombre** de cada carta en su mano. De la mano del enemigo
solo se muestra el **número**, no el contenido. Si un bando debe robar y su mazo está en 0, la
partida termina de inmediato: **Derrota** si es el jugador, **Victoria** si es el enemigo (condición
de victoria por deck-out). *(El robo del enemigo como paso de "Turno enemigo" que describía esta
pieza al principio era provisional; SPEC-019 lo sustituye por la regla real de robo por ronda.)*

### Robo automático por ronda (SPEC-019)

Al pulsar "Nueva ronda", cada bando roba 1 carta de su mazo de robo a su mano, además de la
re-tirada de dados y el +2 de recursos ya existentes (SPEC-009/011). Es la regla real de robo que
SPEC-018 dejó pendiente. El botón manual "Robar" del jugador (SPEC-018) se mantiene. El autómata ya
no roba dentro de "Turno enemigo" (ese paso, añadido en SPEC-018, se retira): ahora roba en "Nueva
ronda" igual que el jugador. Si el mazo de un bando está vacío al robar en "Nueva ronda", la partida
termina en el acto (deck-out): Derrota si es el jugador, Victoria si es el enemigo.

## 6. Fuera de alcance (explícito, hasta que se decida lo contrario)

- Multijugador, alianzas, free-for-all (reglas de la Parte 9 del reglamento).
- Torneos o balanceo competitivo: esto es PVE personal, no PVP.
- Cualquier keyword o texto de carta no cubierto por la fase en curso.

## 7. Mazo de referencia para desarrollo

**Unduli, clone commander** (Luminara Unduli + 2x Clone Trooper) — usado en specs y guiones QA
mientras no se diga lo contrario. Elegido por cubrir personaje único/elite (2 dados) y personaje
no-único duplicado (dados independientes por copia).

### Formatos de import aceptados

El textarea de importar acepta dos formatos, detectados automáticamente:
- **JSON con `slots`** (código→cantidad) de ARH DB (SPEC-001).
- **"Text file"** de ARH DB (el que genera el botón "Download"): listado legible tipo
  `2x Luminara Unduli, ... (Spirit of Rebellion #36)`, convertido a `slots` internamente
  (SPEC-017). En ambos casos las caras y el tipo de cada carta se resuelven por código contra
  la API; el text file no aporta datos de juego, solo qué cartas y cuántas.

## 8. Preguntas de diseño abiertas

- (Ninguna pendiente ahora mismo; añadir aquí cuando surjan durante la implementación, siguiendo
  la regla de CLAUDE.md de parar y preguntar en vez de asumir.)

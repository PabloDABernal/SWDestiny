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

**Principio irrenunciable:** el objetivo final es fidelidad **total** al reglamento físico de
Star Wars Destiny — cada regla del juego real debe acabar implementada, exactamente igual, salvo
que el usuario decida explícitamente cambiarla (una vez la base esté completa, ya se ajustará IA o
alguna regla puntual si hace falta). Que una regla quede fuera de una spec concreta (sección 6, y
las notas de "fuera de alcance" de cada spec) es siempre una decisión de **orden y tamaño de
bocado** para no sobrecargar una sola sesión de implementación — nunca una decisión de recortar el
alcance final del proyecto. Ninguna spec, revisor ni sesión futura debe interpretar un "fuera de
alcance" como "no se va a hacer".

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
- **Reordenado 2026-07-23 (decisión del usuario):** antes de seguir con la capa de texto/keywords de
  v4, dos piezas transversales que faltaban de v2/v3 y que hacen falta para jugar una partida real
  sin recurrir tanto a los botones sueltos actuales: **reparto inicial y mulligan** (al arrancar
  partida, repartir 5 cartas a cada bando con opción de redraw, RR pg 19) y **turnos reales
  alternados** (sustituir "Nueva ronda"/"Turno enemigo" por la fase de acción con turnos de 1 acción
  cada uno, RR pg 19-22 — ver `docs/reglamento/04-estructura-y-customizacion.md`). Sin límite
  artificial de mano: el reglamento real no tiene tope máximo (solo roba-hasta-5 en mantenimiento),
  así que no se añade ninguno propio del proyecto. También quedan pendientes símbolos de dado que
  faltan por implementar (quitar recursos/cartas al rival) — ver BACKLOG.

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
solo se muestra el **número**, no el contenido. *(El robo del enemigo como paso de "Turno enemigo"
que describía esta pieza al principio era provisional; SPEC-019 lo sustituye por la regla real de
robo por ronda. La condición de deck-out que describía esta pieza también era provisional; SPEC-022
la sustituye por la regla real — ver más abajo.)*

### Robo automático por ronda (SPEC-019, corregido en SPEC-022)

Al pulsar "Nueva ronda", cada bando roba de su mazo de robo, además de la re-tirada de dados y el
+2 de recursos ya existentes (SPEC-009/011). El autómata ya no roba dentro de "Turno enemigo" (ese
paso, añadido en SPEC-018, se retira): ahora roba en "Nueva ronda" igual que el jugador. *(La
cantidad robada, "+1 por ronda", y la condición de deck-out de esta pieza eran provisionales;
SPEC-022 las sustituye por la regla real — ver más abajo.)*

### Robo real y deck-out real (SPEC-022)

La regla real de robo (RR pg 25): al pulsar "Nueva ronda", cada bando roba de su mazo hasta llegar
a su **tamaño de mano** (5 por defecto), no "+1" como en la pieza provisional de SPEC-019; si ya
tiene 5 o más, no roba nada. El jugador puede **descartar** cartas de su mano libremente, en
cualquier momento (botón por carta, sin pila de descarte visible todavía); el autómata nunca
descarta (no juega ni evalúa cartas hasta v5). El **deck-out** (RR pg 22) deja de dispararse al
intentar robar con el mazo vacío (regla real: "si no puedes robar, no pasa nada"): ahora se
comprueba solo al **final** de "Nueva ronda", y solo si un bando se queda **sin cartas en mano y
sin mazo a la vez** — Derrota si es el jugador, Victoria si es el enemigo. El botón manual "Robar"
(SPEC-018) sigue funcionando igual (puede superar el tamaño de mano, regla real) y sigue
disparando deck-out directamente al robar con el mazo vacío (inconsistencia temporal frente a
"Nueva ronda", documentada en la spec, pendiente de unificar más adelante). Doble deck-out
simultáneo de ambos bandos (regla real: lo desempata quien controle el campo de batalla, no
implementado): se resuelve Victoria por convención (se comprueba primero el enemigo), simplificación
temporal hasta que exista campo de batalla.

### Mejoras vanilla (primera pieza de v4, SPEC-020)

El jugador juega una carta de mejora (upgrade) desde su mano sobre uno de sus personajes no-KO,
pagando su coste de carta impreso (recursos); la mejora pasa a estar "en juego" ligada a ese
personaje, y sus dados se activan/tiran junto con los suyos a partir de ahí (mismo botón
"Activar"). Es vanilla: sin texto ni keywords (esa es la siguiente capa de v4). Si el personaje
queda KO, sus mejoras se descartan con él. Solo el jugador juega cartas; el autómata sigue sin
poder hacerlo hasta v5. Apoyos (supports): ver siguiente pieza.

### Apoyos vanilla (segunda pieza de v4, SPEC-021)

El jugador juega una carta de apoyo (support) desde su mano pagando su coste de carta impreso; a
diferencia de una mejora, un apoyo no va ligado a ningún personaje: entra en juego como entidad
propia del bando, con su propio botón "Activar" que tira su dado. También vanilla, sin texto ni
keywords. No hay forma de destruir/dañar un apoyo en esta spec: se queda en juego hasta "Reset
total", que lo devuelve al mazo de robo rebarajado (igual que las mejoras, SPEC-020). Solo el
jugador juega cartas; el autómata sigue sin poder hacerlo hasta v5.

### Focus, reroll y especial (tercera pieza de v4, SPEC-023)

Tres símbolos de dado nuevos, resolubles tanto por el jugador como por el autómata (RR pg 12):

- **Focus**: gira hasta *n* dados **propios** sin resolver (de cualquier personaje, mejora o apoyo
  del propio bando) a la cara que se elija libremente, salvo el/los dado(s) de focus que se están
  usando para activar la acción. Girar un dado no lo resuelve: se queda en el pool mostrando la
  nueva cara, disponible para resolverse (o volver a girarse) después. Puede traer coste de
  recursos como cualquier otra cara; se paga igual que daño/escudo/recurso.
- **Reroll** (de dado — distinto del reroll de blancos que ya usa el autómata): vuelve a tirar
  hasta *n* dados **de cualquier pool** (propio o rival). Distinta de la acción de turno "descartar
  una carta de la mano para rerollear" (RR pg 21, pendiente — ver BACKLOG); esa otra acción, cuando
  exista, solo afectará al propio pool. Puede traer coste de recursos igual que Focus.
- **Especial**: usa la habilidad especial impresa en la carta del dado (RR pg 12). Como el texto de
  cartas/keywords todavía no existe (siguiente capa de v4), esta spec resuelve la cara como
  **placeholder**: al pulsarla se muestra un aviso genérico ("habilidad especial de la carta,
  pendiente de implementar") y el dado se consume, sin ningún efecto real de juego.

El autómata amplía su tabla de prioridades: daño → escudo → activar → recurso → **focus →
reroll(dado) → especial** → reroll de blancos → pasar. Focus automático gira el dado a su mejor
cara disponible siguiendo esa misma prioridad (daño > escudo > recurso; si ninguna aplica, no lo
gasta). Reroll(dado) automático apunta a los dados ya tirados del jugador que más le convenga
anular. Especial automático también se "resuelve" (mismo placeholder) si no le queda ninguna acción
mejor.

### Reparto inicial y mulligan (primera pieza del bloque de turnos reales, SPEC-024)

Botón nuevo **"Nueva partida"**, habilitado solo cuando ambos bandos tienen mazo importado y
mano vacía (estado fresco tras importar o "Reset total"). Al pulsarlo, reparte **5 cartas** a
cada bando desde su mazo de robo (RR pg 19); si el mazo de robo tiene menos de 5, reparte las que
haya. El jugador entra entonces en modo **mulligan**: ve su mano de 5 y marca las cartas que
quiere devolver al mazo (0 a 5); al confirmar, esas cartas vuelven al mazo de robo (rebarajado
junto con el resto) y roba las mismas que devolvió, **una sola vez** (RR pg 19, "Redraw"). Hasta
confirmar el mulligan (aunque sea con 0 cartas marcadas, equivalente a pasar), el resto de
acciones (Activar, jugar cartas, Nueva ronda, Turno enemigo...) quedan bloqueadas, mismo patrón de
exclusión mutua que ya usa `playUpgrade`. El enemigo (autómata) nunca hace mulligan: se queda con
su mano inicial de 5 tal cual.

### Turnos reales alternados (segunda pieza del bloque de turnos reales, SPEC-025)

La fase de acción sustituye los botones sueltos "Nueva ronda"/"Turno enemigo" por turnos
alternados reales (RR pg 19-22): en su turno, cada bando hace **una acción** (activar, jugar una
carta, o resolver un lote completo de dados del mismo símbolo, incluido multi-objetivo/Focus/
Reroll/coste indirecto) o pasa. Sin campo de batalla implementado, **siempre empieza el jugador**
cada ronda. El enemigo actúa automáticamente en su turno (sin botón), ejecutando la siguiente
acción de su tabla de prioridades ya existente, o pasando si no tiene ninguna legal. Dos pases
consecutivos (uno de cada bando, sin ninguna acción real entre medias) disparan el mantenimiento
automático (misma lógica que ya tenía "Nueva ronda": +2 recursos, robo hasta tamaño de mano, reset
de pool/activaciones) y empieza una ronda nueva, otra vez con el jugador tomando el primer turno.
Los botones "Robar" manual y "Descartar" suelto desaparecen (no son acciones de turno reales); el
descarte interactivo dentro del mantenimiento queda para una spec futura (BACKLOG).

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

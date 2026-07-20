# Resumen de reglas (referencia interna)

> **Referencia completa** (todas las partes del reglamento, paráfrasis): [reglamento/](reglamento/).
> Este archivo es el **digest corto** centrado en lo que el proyecto implementa/necesita.

Resumen **con nuestras palabras** de las mecánicas de Star Wars: Destiny relevantes para este
proyecto, con punteros al reglamento oficial (ARH CC, *Rules Reference v1.07.01*) por número de
página. NO es una copia del reglamento: es una guía de consulta para specs. Ante cualquier duda o
contradicción con el GDD, manda el GDD y se PARA a preguntar (regla 1 de CLAUDE.md).

Fuente: Rules Reference v1.07.01 — https://swdrenewedhope.com (no incluida en el repo por
copyright; el PDF se consulta aparte).

## Caras de dado (RR pg 10-12)

Cada cara tiene un **valor** (número; blancos y especiales valen 0) y como mucho un **símbolo**:

- Daño melee (M), ranged (R), indirecto (I): reparten daño = valor.
  - Melee y ranged: todo a **un solo** personaje por dado.
  - Indirecto: lo asigna el **defensor**, puede **repartirlo** entre varios de sus personajes.
- Escudo (Sh): da escudos = valor a **un** personaje. Tope 3 (exceso se pierde).
- Recurso (R de resource): **genera** recursos = valor (contador del jugador).
- Disrupt: el rival **pierde** recursos = valor.
- Descarte (Dc): el rival descarta cartas al azar = valor.
- Focus (F): gira hasta `valor` dados propios a la cara que quieras.
- Reroll: retira y vuelve a tirar hasta `valor` dados (de cualquier pool).
- Especial: usa la habilidad especial de la carta del dado (valor 0).
- Blanco (—): sin efecto, no resoluble (valor 0).
- Modificador (+N, cara azul): solo se resuelve **junto a** otro dado del mismo símbolo sin '+';
  suma su valor. No se resuelve solo.

### Costes en una cara (RR pg 10) — relevante para el BACKLOG de "gastar recursos"

Algunas caras traen un **coste** en una cajita abajo. Hay **dos tipos** (confirma la hipótesis del
BACKLOG):

- **Coste de recursos** (cajita amarilla): hay que **gastar** ese nº de recursos para resolver la
  cara. Sin recursos suficientes → no se puede resolver (en v1 = se trata como inerte).
- **Coste de daño indirecto** (cajita roja): hay que **hacerse** ese nº de daño indirecto a uno
  mismo para resolver la cara.

Esto encaja con los dos sufijos vistos en dados reales (`<v><TIPO><n>` = coste en recursos;
`<v><TIPO>i<n>` = coste en daño indirecto propio). Antes de implementar "gastar", validar el
formato exacto que devuelve la API de ARH DB contra esto.

## Daño y personajes derrotados (RR pg 24)

- Daño se acumula en el personaje; al llegar a **>= su vida**, queda **derrotado** (KO) al
  instante.
- Exceso de daño por encima de la vida se ignora.
- Reparto "as they wish" (indirecto): el defensor asigna y luego se aplica simultáneamente.
- Sin personajes en pie → ese jugador **pierde** (ver Fin de partida).

## Escudos (RR pg 25)

- Cada escudo bloquea **1** de daño; luego se gasta.
- Bloquean **antes** de que el daño llegue a la vida. Obligatorio usarlos si se puede.
- Tope **3** por personaje.
- Daño "imblocable" ignora escudos (los deja puestos).

## Recursos (RR pg 25)

- Moneda del juego (pagar cartas, costes de dado). Empiezas con 2.
- +2 en cada fase de mantenimiento (upkeep).
- No se acumulan "por personaje": es un contador del jugador.

## Estructura de ronda (RR pg 19-20)

- **Fase de acción**: los jugadores alternan turnos; en tu turno, **una** acción o pasar. Cuando
  ambos pasan seguido, acaba la fase.
- Acciones: jugar carta, **activar** carta, **resolver dados**, **rerollear** dados, usar acción
  de carta, reclamar campo de batalla.
- **Activar** un personaje: se exhausta y tira **todos** sus dados (personaje + mejoras) al pool.
- **Resolver dados**: eliges 1+ dados del pool que muestren el **mismo** símbolo, pagas costes,
  aplicas efecto, y el dado vuelve a su carta.
- **Fase de mantenimiento** (upkeep): endereza cartas, devuelve dados del pool a sus cartas, +2
  recursos, descarta y roba hasta el tamaño de mano.

## Fin de partida (RR pg 22)

- Si un jugador **no controla personajes** → pierde de inmediato, gana el otro.
- Si al final de una ronda (tras upkeep) un jugador **no tiene cartas en mano ni mazo** → pierde
  (deck-out). Empate de deck-out → gana quien controle el campo de batalla.

## Personajes: único / elite (RR pg 6-7, 17)

- **Vida**: daño que aguanta antes de caer. "Vida" en textos = vida total, no la restante.
- **Puntos**: coste para el equipo. Si hay dos valores (p. ej. 10/14), es el coste de usar 1 dado
  / 2 dados. Un personaje con 2+ dados es **elite**.
- **Único** (rombo ◆): un jugador solo puede tener una copia en juego. No único: puedes repetir.
- Al elegir un único, decides versión **elite** (2 dados) o no-elite (1 dado).

## Cómo se relaciona con nuestro alcance

- v1-v2 implementados: daño M/R/I (tratados iguales, sin split de indirecto todavía), KO, escudos
  (tope 3, absorben antes que vida), generación de recursos, activar/pool, autómata. Coincide con
  este resumen salvo simplificaciones ya documentadas en GDD §5.
- Pendientes que este resumen aclara: **split de daño indirecto**, **gastar** recursos (dos tipos
  de coste), **focus/especial/disrupt/descarte**, **rondas reglamentarias** (hoy stand-in "Reset"),
  **deck-out** (v3), campo de batalla y cartas (v3-v5).

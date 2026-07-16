# GDD — Star Wars Destiny: PVE con mazos de la comunidad

**Estado:** Borrador inicial (v0.1) — pendiente de revisión del usuario

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

## 4. El autómata enemigo

Evalúa, en su turno, una tabla de prioridades de arriba abajo y ejecuta la primera acción legal.
Tabla inicial (v1, ver SPEC-004 para el detalle definitivo):

1. Si tiene dados de daño en su pool, resuelve el conjunto de mayor daño total, dirigido al
   personaje del jugador con menos vida restante.
2. Si tiene personajes sin activar, activa el de más vida restante.
3. Si tiene 2 o más dados mostrando blanco, los rerollea (reroll gratuito, una vez por ronda).
4. Pasa.

La tabla crece en fases posteriores conforme se implementan recursos, escudos y cartas.

### Asimetría / trampas (configurable por dificultad, **desde v1**)

El sistema de trampas está activo desde el principio, no se aplaza. Qué trampas concretas tienen
sentido depende de qué mecánicas existen ya en cada fase:

- **Disponibles desde v1:** multiplicador de vida de los personajes enemigos (p. ej. x1.5, x2);
  reroll extra de blancos (más allá del gratuito de la tabla de prioridades).
- **Se añaden en cuanto exista el sistema correspondiente:** ignorar costes de recursos al jugar
  cartas (necesita v2/recursos y v4/cartas), robo extra por ronda (necesita v3/mano).
- (Ampliable; cada trampa nueva se documenta aquí antes de implementarse.)

## 5. Alcance por versión (resumen — detalle y orden en BACKLOG/specs)

- **v1:** personajes + dados + daño (melee/ranged/indirecto) + blancos + autómata básico **con
  trampas activas desde el inicio** (multiplicador de vida enemiga, reroll extra configurable).
  Sin recursos, sin mano, sin cartas jugables, sin campo de batalla.
- **v2:** recursos y escudos.
- **v3:** mano, mazo, robo, condición de victoria por deck-out.
- **v4:** cartas jugables por capas (mejoras/apoyos "vanilla" → focus/reroll/especial → texto de
  cartas y keywords, empezando por los más simples como Ambush).
- **v5:** el autómata juega cartas (con trampas de coste) + campo de batalla.

## 6. Fuera de alcance (explícito, hasta que se decida lo contrario)

- Multijugador, alianzas, free-for-all (reglas de la Parte 9 del reglamento).
- Torneos o balanceo competitivo: esto es PVE personal, no PVP.
- Cualquier keyword o texto de carta no cubierto por la fase en curso.

## 7. Mazo de referencia para desarrollo

**Unduli, clone commander** (Luminara Unduli + 2x Clone Trooper) — usado en specs y guiones QA
mientras no se diga lo contrario. Elegido por cubrir personaje único/elite (2 dados) y personaje
no-único duplicado (dados independientes por copia).

## 8. Preguntas de diseño abiertas

- (Ninguna pendiente ahora mismo; añadir aquí cuando surjan durante la implementación, siguiendo
  la regla de CLAUDE.md de parar y preguntar en vez de asumir.)

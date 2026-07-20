# 09 · Erratas, aclaraciones de cartas y FAQ (RR pg 39-64)

Estas secciones del reglamento oficial son **carta por carta** (texto corregido de cartas
concretas, aclaraciones por set y preguntas frecuentes). Son cientos de entradas específicas de
cartas que **este proyecto no implementa todavía** (estamos en personajes/dados/daño/escudos/
recursos/autómata). Reproducirlas aquí no aporta y sería copiar contenido con copyright.

**Para el detalle carta a carta, consultar el PDF oficial** (Rules Reference v1.07.01, pg 39-64):
Errata (pg 39-42), Subtipos de personaje (pg 43), Aclaraciones por set (pg 44-59), FAQ (pg 60-64).

## Reglas GENERALES útiles que salen de esas secciones (paráfrasis)

Estas son las que afectan al **motor** del juego (no a una carta concreta) y conviene tener a mano:

- **Escudos vs daño** (FAQ): si vas a recibir daño y tienes escudos, **debes** usarlos si puedes.
  Los escudos bloquean antes de que el daño se reciba; si bloquean todo, no se "recibió" daño (afecta
  a disparos tipo "after this character takes damage").
- **Daño indirecto**: se reparte por el **defensor** entre sus personajes; ese daño se considera
  hecho por quien lanzó el indirecto. En una acción de "resolver dados" no puedes mezclar tipos de
  daño distintos (melee/ranged/indirecto son símbolos distintos).
- **Orden en la cola con before/after** (FAQ): un dado ya en la cola (p. ej. 2 de daño) que es
  interrumpido por un "before" se resuelve **antes** que un "after" que se dispare durante ese
  before. Los "after" esperan su turno.
- **Curar no revierte una derrota**: si un personaje llega a daño = vida, se derrota; curarlo después
  (si no es un efecto de **reemplazo**) no lo salva.
- **Cero es par** (FAQ). "Vida" en textos = vida total, no restante; los escudos no cambian la vida
  restante.
- **Acción que no hace nada = pasar**, salvo que algo del estado cambie (exhaustar, jugar/descartar
  una carta, rerollear a la misma cara sí cuentan como "algo pasó").
- **Especiales inherentes al dado**: se pueden usar aunque la carta no esté en juego; un dado
  conserva sus habilidades inherentes aunque cambie de carta emparejada.
- **Multicopias del mismo personaje**: hay que saber qué dado vino de cuál; al derrotar uno, se
  retiran **sus** dados concretos del pool.

## Relación con el proyecto
Cuando lleguemos a implementar cartas jugables (v4+), esta sección se ampliará con las erratas/
aclaraciones **de las cartas concretas que implementemos**, parafraseadas, no en bloque.

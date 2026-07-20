# 02 · Dados y símbolos de dado (RR Parte 2, pg 10-13)

Cada dado tiene carta emparejada y puede tener: valor, símbolo, coste, modificador, ID, rareza,
afiliación, color, tipo, subtipos, título y unicidad (estos comparten valor con su carta).

## Valor (pg 10)
Número encima del símbolo. Blancos y especiales **no tienen valor impreso** y valen **0**.

## Símbolo (pg 10)
Cada cara puede tener un símbolo; al resolver la cara, se ejecuta su efecto. Puede haber caras sin
símbolo.

## Costes en una cara (pg 10) — clave para "gastar recursos"
Algunas caras traen un coste en una cajita abajo. **Dos tipos**:
- **Coste de recursos** (caja **amarilla**): gasta ese nº de recursos para resolver la cara. Si no
  puedes pagarlo, no puedes resolverla.
- **Coste de daño indirecto** (caja **roja**): hazte ese nº de daño indirecto a ti mismo para
  resolverla.

## Modificador (pg 10-11)
Caras azules con **+valor**. Solo se resuelven **junto a** otro dado del mismo símbolo sin '+';
su valor se suma al del otro. No se resuelven en solitario.

## Símbolos de dado (pg 11-12)
Activar cartas tira dados al pool; luego se resuelven por su símbolo. La mayoría tiene un valor que
escala el efecto.

- **Daño melee (X)**: daño a un personaje = valor. Todo a **un solo** personaje por dado.
- **Daño ranged (flecha)**: igual que melee, a un solo personaje.
- **Daño indirecto (◎)**: daño a personaje(s) del oponente = valor, **repartido como el oponente
  quiera** (puede dividirse entre varios).
- **Escudo (Sh)**: da escudos = valor a **un** personaje. Máximo 3; el exceso se ignora.
- **Recurso**: ganas recursos = valor.
- **Disrupt**: el oponente **pierde** recursos = valor (no baja de 0).
- **Descarte**: el oponente descarta cartas al azar = valor.
- **Focus**: gira hasta `valor` dados **propios** a la cara que quieras (no los del rival).
- **Reroll**: vuelve a tirar hasta `valor` dados (de cualquier pool).
- **Especial**: usa la habilidad especial de la carta del dado (valor 0, no modificable). Obligatoria
  si resuelves esa cara.
- **Blanco (—)**: sin efecto, no resoluble (valor 0).

## Resolver dados a través de cartas (pg 12-13)
Al resolver un dado por efecto de carta, se usa el efecto normal del símbolo + instrucciones extra.
- Sigues pagando cualquier **coste de recurso** del dado.
- No puedes resolver un modificador solo, salvo que la carta permita resolver varios dados del mismo
  símbolo.
- Si el efecto no especifica de quién son los dados, sirve para cualquiera; al resolver un dado del
  oponente, se resuelve como si estuviera en tu pool.

## Dados que dejan el juego (pg 13)
Si la carta emparejada de un dado sale de juego, el dado vuelve a la zona set-aside (puede volver si
la carta vuelve). Con dos copias de la misma mejora en un personaje no hace falta rastrear cuál dado
es de cuál carta (salvo casos como Con Artist); en personajes distintos, sí hay que rastrear cada
dado por separado.

# 03 · Áreas de juego (RR Parte 3, pg 14-16)

Cada jugador tiene su zona **en juego** y su zona **fuera de juego**.

## En juego (in-play)

- **Personajes, tramas y cartas jugadas**: mejoras/desmejoras/apoyos jugados van aquí; personajes y
  tramas empiezan en juego. Solo las cartas en juego pueden usar sus habilidades. Si una carta sale
  y vuelve, es una **instancia nueva** (sin memoria de haber usado habilidades).
- **Pool de dados**: donde se tiran los dados. **Cada jugador tiene el suyo.** Solo resuelves dados
  de tu propio pool en la acción "resolver dados" (salvo efectos de carta). Los dados en el pool se
  pueden manipular (retirar, girar, rerollear, resolver). "El pool" en una carta = el del jugador
  que controla los dados referenciados.
- **Recursos**: junto a tus cartas; su número es información abierta.
- **Battlefield** (si lo controlas): en tu zona en juego.

## Fuera de juego (out-of-play)

Mano, mazo, descarte y zona set-aside. Sus habilidades no se usan hasta jugar/volver a juego. Al
salir de juego una carta, se le quitan **todos los tokens**. No puedes tener en tu zona fuera de
juego una carta que posea el oponente.

- **Mano**: juegas cartas pagando su coste. Tamaño de mano por defecto **5**. En upkeep robas hasta
  tu tamaño de mano (tras descartar lo que quieras). Puedes tener **más** cartas que tu tamaño (no
  robas si ya tienes ≥ tamaño). Nº de cartas = información abierta; el contenido, oculto.
- **Mazo (deck)**: 30 cartas boca abajo. No se mira ni reordena salvo por habilidades. Nº = abierto.
- **Descarte (discard)**: pila boca arriba, información abierta, orden irrelevante.
- **Cola (queue)**: cuando se juega una carta, va boca arriba a la cola hasta resolverse; luego se
  descarta (eventos) o entra en juego (no-eventos).
- **Dados sobre cartas**: cuando no están en un pool, van sobre su carta; **no** están activos ni
  muestran cara.
- **Zona set-aside**: cartas/dados apartados que pueden entrar en juego vía cartas. Cada personaje
  necesita su dado emparejado apartado; cada carta-con-dado del mazo también. Los personajes
  derrotados van aquí.
- **Supply**: reserva de tokens (daño, escudos, recursos). Se cogen al ganar/repartir/dar y se
  devuelven al gastar/perder/curar/quitar.

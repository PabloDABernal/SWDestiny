import type { Character } from '../model/types';
import { isKO } from './damage';

export type Outcome = 'victory' | 'defeat' | null;

/** Vista mínima de un bando para calcular el fin de partida. */
export interface SideView {
  characters: Character[];
  damage: number[];
}

/** Un bando con >=1 personaje cuyas instancias están todas KO. */
export function allKO(side: SideView): boolean {
  return (
    side.characters.length > 0 &&
    side.characters.every((c, i) => isKO(c, side.damage[i] ?? 0))
  );
}

/**
 * Fin de partida: Victoria si el enemigo está entero KO, Derrota si lo está el jugador.
 * (En v1 la Derrota solo se disparará cuando el enemigo ataque — autómata, SPEC-004b.)
 */
export function computeOutcome(player: SideView, enemy: SideView): Outcome {
  if (allKO(enemy)) return 'victory';
  if (allKO(player)) return 'defeat';
  return null;
}

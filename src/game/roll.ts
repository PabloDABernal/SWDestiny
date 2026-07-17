import type { Character, Die } from '../model/types';

/** Fuente de azar inyectable (0 <= rng() < 1). Por defecto Math.random, sustituible en tests. */
export type Rng = () => number;

/** Un dado tirado, situado en el pool. Referencia su personaje por índice (ver SPEC-002). */
export interface PooledDie {
  /** Índice de la instancia de personaje en el array `characters`. */
  characterIndex: number;
  /** Código de carta de origen (informativo; no identifica la instancia). */
  code: string;
  name: string;
  /** Índice del dado dentro del personaje (0 o 1). */
  dieIndex: number;
  /** Cara que salió, cruda (p. ej. "2MD", "1R", "-", "Sp"). */
  face: string;
}

/** Elige una cara uniforme entre las 6 de un dado. Pura dada `rng`. */
export function rollDie(die: Die, rng: Rng = Math.random): string {
  const i = Math.floor(rng() * die.sides.length);
  // Clamp defensivo por si rng() devuelve exactamente 1.
  const safe = Math.min(i, die.sides.length - 1);
  return die.sides[safe];
}

/** Tira todos los dados de un personaje y devuelve los PooledDie resultantes. */
export function rollCharacter(
  character: Character,
  characterIndex: number,
  rng: Rng = Math.random,
): PooledDie[] {
  return character.dice.map((die, dieIndex) => ({
    characterIndex,
    code: character.code,
    name: character.name,
    dieIndex,
    face: rollDie(die, rng),
  }));
}

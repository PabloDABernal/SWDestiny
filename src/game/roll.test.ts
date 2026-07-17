import { describe, it, expect } from 'vitest';
import { rollDie, rollCharacter, type Rng } from './roll';
import type { Character, Die } from '../model/types';

const die: Die = { sides: ['2MD', '2Sh', '1R', 'Sp', 'Sp', '-'] };

const unduli: Character = {
  code: '15040',
  name: 'Luminara Unduli',
  health: 11,
  isUnique: true,
  isElite: true,
  dice: [die, die],
};

/** Rng determinista que devuelve valores de una secuencia. */
function seq(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('rollDie', () => {
  it('selecciona la cara según rng (0 → primera, casi-1 → última)', () => {
    expect(rollDie(die, () => 0)).toBe('2MD');
    expect(rollDie(die, () => 0.999)).toBe('-');
  });

  it('mapea cada tramo de rng a su cara (6 caras)', () => {
    const faces = [0, 1, 2, 3, 4, 5].map((k) => rollDie(die, () => (k + 0.5) / 6));
    expect(faces).toEqual(['2MD', '2Sh', '1R', 'Sp', 'Sp', '-']);
  });

  it('nunca se sale del array aunque rng devuelva 1', () => {
    expect(rollDie(die, () => 1)).toBe('-');
  });
});

describe('rollCharacter', () => {
  it('tira todos los dados del personaje y referencia su índice', () => {
    const pooled = rollCharacter(unduli, 0, seq([0, 0.999]));
    expect(pooled).toHaveLength(2);
    expect(pooled[0]).toMatchObject({ characterIndex: 0, dieIndex: 0, name: 'Luminara Unduli', face: '2MD' });
    expect(pooled[1]).toMatchObject({ characterIndex: 0, dieIndex: 1, face: '-' });
  });
});

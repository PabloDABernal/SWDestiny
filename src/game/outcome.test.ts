import { describe, it, expect } from 'vitest';
import { allKO, computeOutcome, type SideView } from './outcome';
import type { Character } from '../model/types';

function ch(name: string, health: number): Character {
  return { code: name, name, health, isUnique: false, isElite: false, dice: [] };
}

const player: SideView = { characters: [ch('Unduli', 11), ch('Clone', 8)], damage: [0, 0] };
const enemy: SideView = { characters: [ch('Villano', 10)], damage: [0] };

describe('allKO', () => {
  it('false si algún personaje sigue en pie', () => {
    expect(allKO({ characters: player.characters, damage: [11, 0] })).toBe(false);
  });

  it('true si todos KO', () => {
    expect(allKO({ characters: player.characters, damage: [11, 8] })).toBe(true);
  });

  it('false si el bando no tiene personajes (mazo ausente)', () => {
    expect(allKO({ characters: [], damage: [] })).toBe(false);
  });
});

describe('computeOutcome', () => {
  it('null mientras ambos bandos tengan personajes en pie', () => {
    expect(computeOutcome(player, enemy)).toBeNull();
  });

  it('victory cuando el enemigo está entero KO', () => {
    expect(computeOutcome(player, { ...enemy, damage: [10] })).toBe('victory');
  });

  it('defeat cuando el jugador está entero KO (no jugable a mano en v1)', () => {
    expect(computeOutcome({ ...player, damage: [11, 8] }, enemy)).toBe('defeat');
  });

  it('victory tiene prioridad si ambos cayeran a la vez', () => {
    expect(
      computeOutcome({ ...player, damage: [11, 8] }, { ...enemy, damage: [10] }),
    ).toBe('victory');
  });

  it('no declara victoria si el enemigo no tiene mazo importado', () => {
    expect(computeOutcome(player, { characters: [], damage: [] })).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { parseDamage, currentHealth, isKO } from './damage';
import type { Character } from '../model/types';

const target: Character = {
  code: '15040',
  name: 'Luminara Unduli',
  health: 11,
  isUnique: true,
  isElite: true,
  dice: [],
};

describe('parseDamage', () => {
  it('reconoce melee/ranged/indirecto con su cantidad', () => {
    expect(parseDamage('2MD')).toBe(2);
    expect(parseDamage('1RD')).toBe(1);
    expect(parseDamage('2ID')).toBe(2);
  });

  it('los tres tipos dan la misma cantidad', () => {
    expect(parseDamage('2MD')).toBe(parseDamage('2RD'));
    expect(parseDamage('2RD')).toBe(parseDamage('2ID'));
  });

  it('no es daño: recurso, focus, escudo, especial, descarte, blanco', () => {
    for (const face of ['1R', '2R', '1F', '2Sh', 'Sp', 'Dc', '-']) {
      expect(parseDamage(face)).toBeNull();
    }
  });
});

describe('currentHealth / isKO', () => {
  it('resta el daño y no baja de 0', () => {
    expect(currentHealth(target, 2)).toBe(9);
    expect(currentHealth(target, 11)).toBe(0);
    expect(currentHealth(target, 20)).toBe(0);
  });

  it('KO cuando el daño iguala o supera la vida', () => {
    expect(isKO(target, 10)).toBe(false);
    expect(isKO(target, 11)).toBe(true);
    expect(isKO(target, 12)).toBe(true);
  });
});

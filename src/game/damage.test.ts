import { describe, it, expect } from 'vitest';
import {
  parseDamage,
  currentHealth,
  isKO,
  parseShield,
  addShields,
  resolveShieldedDamage,
  MAX_SHIELDS,
} from './damage';
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

describe('parseShield', () => {
  it('reconoce 1Sh/2Sh/3Sh con su cantidad', () => {
    expect(parseShield('1Sh')).toBe(1);
    expect(parseShield('2Sh')).toBe(2);
    expect(parseShield('3Sh')).toBe(3);
  });

  it('no es escudo: daño, recurso, focus, especial, descarte, blanco', () => {
    for (const face of ['2MD', '1RD', '2ID', '1R', '1F', 'Sp', 'Dc', '-']) {
      expect(parseShield(face)).toBeNull();
    }
  });
});

describe('addShields', () => {
  it('suma escudos', () => {
    expect(addShields(0, 2)).toBe(2);
    expect(addShields(1, 1)).toBe(2);
  });

  it(`topa a MAX_SHIELDS (${MAX_SHIELDS})`, () => {
    expect(addShields(2, 3)).toBe(MAX_SHIELDS);
    expect(addShields(MAX_SHIELDS, 1)).toBe(MAX_SHIELDS);
  });
});

describe('resolveShieldedDamage', () => {
  it('sin escudo: todo el daño pasa a vida', () => {
    expect(resolveShieldedDamage(0, 5)).toEqual({ shieldsRemaining: 0, healthDamage: 5 });
  });

  it('escudo absorbe todo el daño si alcanza', () => {
    expect(resolveShieldedDamage(3, 2)).toEqual({ shieldsRemaining: 1, healthDamage: 0 });
    expect(resolveShieldedDamage(3, 3)).toEqual({ shieldsRemaining: 0, healthDamage: 0 });
  });

  it('escudo parcial: absorbe lo que puede, el sobrante pasa a vida', () => {
    expect(resolveShieldedDamage(2, 5)).toEqual({ shieldsRemaining: 0, healthDamage: 3 });
  });
});

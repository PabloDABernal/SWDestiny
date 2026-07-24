import { describe, it, expect } from 'vitest';
import {
  parseDamage,
  parseDamageDie,
  parseCostedFace,
  parsePlayerFace,
  dieSymbol,
  isGenericModifier,
  currentHealth,
  isKO,
  parseShield,
  addShields,
  resolveShieldedDamage,
  MAX_SHIELDS,
  parseResource,
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

describe('parseDamageDie (símbolo + cantidad, SPEC-008a)', () => {
  it('distingue melee/ranged/indirecto', () => {
    expect(parseDamageDie('2MD')).toEqual({ kind: 'melee', amount: 2 });
    expect(parseDamageDie('1RD')).toEqual({ kind: 'ranged', amount: 1 });
    expect(parseDamageDie('3ID')).toEqual({ kind: 'indirect', amount: 3 });
  });

  it('null para no-daño (recurso, escudo, blanco, especial, coste, modificador)', () => {
    for (const face of ['1R', '2Sh', '-', 'Sp', 'Dc', '2RD1', '2RDi1', '+2MD']) {
      expect(parseDamageDie(face)).toBeNull();
    }
  });
});

describe('dieSymbol (SPEC-008a/008b/010)', () => {
  it('mapea cada cara resoluble a su símbolo (con coste de recurso/indirecto y modificadores)', () => {
    expect(dieSymbol('2MD')).toBe('melee');
    expect(dieSymbol('1RD')).toBe('ranged');
    expect(dieSymbol('2ID')).toBe('indirect');
    expect(dieSymbol('2Sh')).toBe('shield');
    expect(dieSymbol('1R')).toBe('resource');
    expect(dieSymbol('2RD1')).toBe('ranged'); // coste recurso (008b)
    expect(dieSymbol('2R1')).toBe('resource');
    expect(dieSymbol('3Shi1')).toBe('shield'); // coste indirecto (010)
    expect(dieSymbol('+2MD')).toBe('melee'); // modificador (010)
    expect(dieSymbol('+1R')).toBe('resource');
    expect(dieSymbol('2F')).toBe('focus'); // SPEC-023
    expect(dieSymbol('1Re')).toBe('reroll'); // SPEC-023
    expect(dieSymbol('Sp')).toBe('special'); // SPEC-023
    expect(dieSymbol('1Dr')).toBe('disrupt'); // SPEC-029
    expect(dieSymbol('1Dc')).toBe('discard'); // SPEC-029
  });

  it('null para no resolubles (blanco)', () => {
    expect(dieSymbol('-')).toBeNull();
  });

  it('Dr/Dc sin valor no son un formato válido (siempre llevan valor, SPEC-029)', () => {
    expect(dieSymbol('Dr')).toBeNull();
    expect(dieSymbol('Dc')).toBeNull();
  });
});

describe('parsePlayerFace (SPEC-010)', () => {
  it('modificador +X', () => {
    expect(parsePlayerFace('+2MD')).toEqual({
      symbol: 'melee',
      amount: 2,
      resourceCost: 0,
      indirectCost: 0,
      isModifier: true,
      isGenericModifier: false,
    });
    expect(parsePlayerFace('+1R')).toMatchObject({ symbol: 'resource', amount: 1, isModifier: true });
  });

  it('coste indirecto propio (sufijo i)', () => {
    expect(parsePlayerFace('3Shi1')).toEqual({
      symbol: 'shield',
      amount: 3,
      resourceCost: 0,
      indirectCost: 1,
      isModifier: false,
      isGenericModifier: false,
    });
  });

  it('coste de recurso (sin i) y sin coste', () => {
    expect(parsePlayerFace('2RD1')).toMatchObject({ symbol: 'ranged', amount: 2, resourceCost: 1, indirectCost: 0 });
    expect(parsePlayerFace('2MD')).toMatchObject({ resourceCost: 0, indirectCost: 0, isModifier: false });
  });

  it('focus y reroll de dado, con y sin coste (SPEC-023)', () => {
    expect(parsePlayerFace('2F')).toMatchObject({ symbol: 'focus', amount: 2, resourceCost: 0 });
    expect(parsePlayerFace('1Re1')).toMatchObject({ symbol: 'reroll', amount: 1, resourceCost: 1 });
  });

  it('especial: valor fijo 0, con y sin coste (SPEC-023)', () => {
    expect(parsePlayerFace('Sp')).toEqual({
      symbol: 'special',
      amount: 0,
      resourceCost: 0,
      indirectCost: 0,
      isModifier: false,
      isGenericModifier: false,
    });
    expect(parsePlayerFace('Sp2')).toMatchObject({ symbol: 'special', amount: 0, resourceCost: 2 });
  });

  it('null para no resolubles (blanco, Dr/Dc sin valor)', () => {
    for (const face of ['-', 'Dr', 'Dc']) {
      expect(parsePlayerFace(face)).toBeNull();
    }
  });

  it('disrupt y descarte (SPEC-029): sin objetivo de personaje, mismo formato que el resto', () => {
    expect(parsePlayerFace('1Dr')).toEqual({
      symbol: 'disrupt',
      amount: 1,
      resourceCost: 0,
      indirectCost: 0,
      isModifier: false,
      isGenericModifier: false,
    });
    expect(parsePlayerFace('1Dc')).toEqual({
      symbol: 'discard',
      amount: 1,
      resourceCost: 0,
      indirectCost: 0,
      isModifier: false,
      isGenericModifier: false,
    });
    expect(parsePlayerFace('2Dr1')).toMatchObject({ symbol: 'disrupt', amount: 2, resourceCost: 1 });
    expect(parsePlayerFace('+1Dc')).toMatchObject({ symbol: 'discard', amount: 1, isModifier: true });
  });

  it('modificador genérico +X* (SPEC-027): sin símbolo fijo, vale para cualquier tanda', () => {
    expect(parsePlayerFace('+2*')).toEqual({
      symbol: null,
      amount: 2,
      resourceCost: 0,
      indirectCost: 0,
      isModifier: true,
      isGenericModifier: true,
    });
  });
});

describe('isGenericModifier (SPEC-027)', () => {
  it('reconoce +<n>* y nada más', () => {
    expect(isGenericModifier('+2*')).toBe(true);
    expect(isGenericModifier('+1*')).toBe(true);
  });

  it('false para modificadores de símbolo fijo y caras normales', () => {
    for (const face of ['+2MD', '2MD', '2*', 'Sp', '-']) {
      expect(isGenericModifier(face)).toBe(false);
    }
  });
});

describe('parseCostedFace (SPEC-008b)', () => {
  it('cara sin coste → resourceCost 0', () => {
    expect(parseCostedFace('2MD')).toEqual({ symbol: 'melee', amount: 2, resourceCost: 0 });
    expect(parseCostedFace('1R')).toEqual({ symbol: 'resource', amount: 1, resourceCost: 0 });
    expect(parseCostedFace('2Sh')).toEqual({ symbol: 'shield', amount: 2, resourceCost: 0 });
  });

  it('cara con coste de recurso', () => {
    expect(parseCostedFace('2RD1')).toEqual({ symbol: 'ranged', amount: 2, resourceCost: 1 });
    expect(parseCostedFace('2R1')).toEqual({ symbol: 'resource', amount: 2, resourceCost: 1 });
  });

  it('rechaza coste indirecto (`i`), modificador (`+`) y no-resolubles', () => {
    for (const face of ['3Shi1', '2RDi1', '+2MD', '-', 'Sp', '1F', 'Dc']) {
      expect(parseCostedFace(face)).toBeNull();
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

describe('parseResource', () => {
  it('reconoce 1R/2R con su cantidad', () => {
    expect(parseResource('1R')).toBe(1);
    expect(parseResource('2R')).toBe(2);
  });

  it('no es recurso: daño (incluido 1RD), escudo, focus, especial, descarte, blanco', () => {
    for (const face of ['2MD', '1RD', '2ID', '1Sh', '1F', 'Sp', 'Dc', '-']) {
      expect(parseResource(face)).toBeNull();
    }
  });
});

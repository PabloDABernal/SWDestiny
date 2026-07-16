import { describe, it, expect } from 'vitest';
import { buildCharacters } from './buildCharacters';
import type { ArhCard } from '../model/types';
import { ImportError } from './errors';

const unduli: ArhCard = {
  code: '15040',
  name: 'Luminara Unduli',
  type_code: 'character',
  health: 11,
  is_unique: true,
  sides: ['2MD', '2Sh', '1R', 'Sp', 'Sp', '-'],
};

const clone: ArhCard = {
  code: '20013',
  name: 'Clone Trooper',
  type_code: 'character',
  health: 8,
  is_unique: false,
  sides: ['1RD', '2RD', '2ID', '1R', '-', '-'],
};

const upgrade: ArhCard = {
  code: '99999',
  name: 'Un apoyo cualquiera',
  type_code: 'upgrade',
  health: 0,
  is_unique: false,
  sides: [],
};

const cards = new Map<string, ArhCard>([
  [unduli.code, unduli],
  [clone.code, clone],
  [upgrade.code, upgrade],
]);

describe('buildCharacters', () => {
  it('único con qty 2 ⇒ 1 ficha elite con 2 dados', () => {
    const chars = buildCharacters([{ code: '15040', qty: 2 }], cards);
    expect(chars).toHaveLength(1);
    expect(chars[0].isElite).toBe(true);
    expect(chars[0].dice).toHaveLength(2);
    expect(chars[0].dice[0].sides).toEqual(unduli.sides);
    expect(chars[0].health).toBe(11);
  });

  it('único con qty 1 ⇒ 1 ficha no-elite con 1 dado', () => {
    const chars = buildCharacters([{ code: '15040', qty: 1 }], cards);
    expect(chars).toHaveLength(1);
    expect(chars[0].isElite).toBe(false);
    expect(chars[0].dice).toHaveLength(1);
  });

  it('no único con qty 2 ⇒ 2 fichas independientes de 1 dado', () => {
    const chars = buildCharacters([{ code: '20013', qty: 2 }], cards);
    expect(chars).toHaveLength(2);
    expect(chars.every((c) => c.dice.length === 1)).toBe(true);
    // fichas independientes: distintos objetos de dado
    expect(chars[0].dice[0]).not.toBe(chars[1].dice[0]);
  });

  it('mazo Unduli completo ⇒ 3 fichas (Unduli elite + 2 Clones)', () => {
    const chars = buildCharacters(
      [
        { code: '15040', qty: 2 },
        { code: '20013', qty: 2 },
      ],
      cards,
    );
    expect(chars).toHaveLength(3);
    expect(chars[0].dice).toHaveLength(2);
    expect(chars[1].dice).toHaveLength(1);
    expect(chars[2].dice).toHaveLength(1);
  });

  it('ignora cartas no-personaje', () => {
    const chars = buildCharacters(
      [
        { code: '15040', qty: 2 },
        { code: '99999', qty: 3 },
      ],
      cards,
    );
    expect(chars).toHaveLength(1);
  });

  it('lanza no-characters si el mazo no tiene personajes', () => {
    try {
      buildCharacters([{ code: '99999', qty: 3 }], cards);
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as ImportError).reason).toBe('no-characters');
    }
  });
});

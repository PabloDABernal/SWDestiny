import { describe, it, expect } from 'vitest';
import { buildDrawPile, shuffle } from './buildDrawPile';
import type { ArhCard } from '../model/types';

const unduli: ArhCard = {
  code: '15040',
  name: 'Luminara Unduli',
  type_code: 'character',
  health: 11,
  is_unique: true,
  sides: ['2MD', '2Sh', '1R', 'Sp', 'Sp', '-'],
};

const upgrade: ArhCard = {
  code: '99999',
  name: 'Un apoyo cualquiera',
  type_code: 'upgrade',
  health: 0,
  is_unique: false,
  sides: [],
};

const event: ArhCard = {
  code: '88888',
  name: 'Un evento cualquiera',
  type_code: 'event',
  health: 0,
  is_unique: false,
  sides: [],
};

const plot: ArhCard = {
  code: '77777',
  name: 'Una trama cualquiera',
  type_code: 'plot',
  health: 0,
  is_unique: false,
  sides: [],
};

const battlefield: ArhCard = {
  code: '66666',
  name: 'Un campo de batalla cualquiera',
  type_code: 'battlefield',
  health: 0,
  is_unique: false,
  sides: [],
};

const cards = new Map<string, ArhCard>([
  [unduli.code, unduli],
  [upgrade.code, upgrade],
  [event.code, event],
  [plot.code, plot],
  [battlefield.code, battlefield],
]);

describe('buildDrawPile', () => {
  it('ignora personajes, tramas y campos de batalla', () => {
    const pile = buildDrawPile(
      [
        { code: '15040', qty: 2 },
        { code: '77777', qty: 1 },
        { code: '66666', qty: 1 },
      ],
      cards,
    );
    expect(pile).toEqual([]);
  });

  it('incluye eventos y apoyos, repetidos según qty', () => {
    const pile = buildDrawPile(
      [
        { code: '99999', qty: 2 },
        { code: '88888', qty: 3 },
      ],
      cards,
    );
    expect(pile).toHaveLength(5);
    expect(pile.filter((c) => c === '99999')).toHaveLength(2);
    expect(pile.filter((c) => c === '88888')).toHaveLength(3);
  });

  it('mazo mixto: solo cuenta lo que no sea personaje/trama/campo de batalla', () => {
    const pile = buildDrawPile(
      [
        { code: '15040', qty: 2 },
        { code: '77777', qty: 1 },
        { code: '66666', qty: 1 },
        { code: '99999', qty: 2 },
        { code: '88888', qty: 1 },
      ],
      cards,
    );
    expect(pile).toHaveLength(3);
  });

  it('devuelve vacío si no hay cartas de mazo', () => {
    const pile = buildDrawPile([{ code: '15040', qty: 1 }], cards);
    expect(pile).toEqual([]);
  });
});

describe('shuffle', () => {
  it('conserva los mismos elementos (mismo multiset)', () => {
    const original = ['a', 'b', 'c', 'd', 'e'];
    const shuffled = shuffle(original);
    expect(shuffled).toHaveLength(original.length);
    expect([...shuffled].sort()).toEqual([...original].sort());
  });

  it('no muta el array original', () => {
    const original = ['a', 'b', 'c'];
    shuffle(original);
    expect(original).toEqual(['a', 'b', 'c']);
  });
});

import { describe, it, expect } from 'vitest';
import { parseDeck } from './parseDeck';
import { ImportError } from './errors';

describe('parseDeck', () => {
  it('devuelve slots código→cantidad de un export válido', () => {
    const slots = parseDeck('{"slots":{"15040":2,"20013":2}}');
    expect(slots).toEqual([
      { code: '15040', qty: 2 },
      { code: '20013', qty: 2 },
    ]);
  });

  it('falla con invalid-json si el texto no es JSON', () => {
    expect(() => parseDeck('no soy json')).toThrowError(ImportError);
    try {
      parseDeck('no soy json');
    } catch (e) {
      expect((e as ImportError).reason).toBe('invalid-json');
    }
  });

  it('falla con invalid-json si falta el campo slots', () => {
    try {
      parseDeck('{"name":"x"}');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as ImportError).reason).toBe('invalid-json');
    }
  });

  it('falla si una cantidad no es entero positivo', () => {
    try {
      parseDeck('{"slots":{"15040":0}}');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as ImportError).reason).toBe('invalid-json');
    }
  });

  it('falla si slots está vacío', () => {
    try {
      parseDeck('{"slots":{}}');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as ImportError).reason).toBe('invalid-json');
    }
  });
});

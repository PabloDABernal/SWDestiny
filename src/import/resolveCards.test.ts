import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveCards, readCache } from './resolveCards';
import { getCardFromSnapshot } from '../data/cards';

// SPEC-030: el snapshot local resuelve offline. Códigos reales del mazo de referencia (Unduli):
// 02036 = Luminara Unduli (character), 01106 = Hit and Run (event, sin dado).

describe('snapshot local de cartas', () => {
  afterEach(() => vi.restoreAllMocks());

  it('getCardFromSnapshot devuelve la carta por código y null para _meta/desconocido', () => {
    const luminara = getCardFromSnapshot('02036');
    expect(luminara?.name).toBeTruthy();
    expect(luminara?.type_code).toBe('character');
    expect(getCardFromSnapshot('_meta')).toBeNull();
    expect(getCardFromSnapshot('99999')).toBeNull();
  });

  it('normaliza no-personajes: health 0 y sides [] cuando la API los da null', () => {
    const event = getCardFromSnapshot('01106'); // Hit and Run, evento sin dado
    expect(event?.type_code).toBe('event');
    expect(event?.health).toBe(0);
    expect(Array.isArray(event?.sides)).toBe(true);
  });

  it('resolveCards resuelve códigos del snapshot SIN llamar a la API (offline)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const cards = await resolveCards([
      { code: '02036', qty: 1 },
      { code: '05038', qty: 2 },
      { code: '01106', qty: 2 },
    ]);
    expect(cards.get('02036')?.type_code).toBe('character');
    expect(cards.size).toBe(3);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('readCache lee del snapshot sin tocar localStorage', () => {
    // El snapshot se consulta antes que localStorage (gana a una caché vieja); verificar el
    // caso de discrepancia con caché alterada es un paso de playtest (DevTools), ver SPEC-030.
    expect(readCache('02036')?.type_code).toBe('character');
  });
});

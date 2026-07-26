import { describe, it, expect } from 'vitest';
import { getAllCards, getCardFromSnapshot } from './cards';

// SPEC-032: el snapshot se enriquece con facción/set/coste/puntos/texto para el navegador DB.

describe('snapshot enriquecido (SPEC-032)', () => {
  it('getAllCards devuelve todas las cartas sin _meta', () => {
    const all = getAllCards();
    expect(all.length).toBeGreaterThan(2900);
    expect(all.every((c) => typeof c.code === 'string' && c.code !== '_meta')).toBe(true);
  });

  it('un personaje trae facción, set, puntos y texto', () => {
    const luminara = getCardFromSnapshot('02036')!; // Luminara Unduli
    expect(luminara.faction_name).toBeTruthy();
    expect(luminara.set_name).toBeTruthy();
    expect(luminara.points).toBeTruthy();
    expect(luminara.text).toBeTruthy();
  });

  it('los filtros de tipo/facción salen de valores reales del snapshot', () => {
    const all = getAllCards();
    const types = new Set(all.map((c) => c.type_code));
    expect(types.has('character')).toBe(true);
    expect(types.has('event')).toBe(true);
    const factions = new Set(all.map((c) => c.faction_code).filter(Boolean));
    expect(factions.size).toBeGreaterThan(1);
  });
});

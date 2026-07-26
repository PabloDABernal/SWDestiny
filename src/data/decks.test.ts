import { describe, it, expect } from 'vitest';
import { PRESET_DECKS, getPresetDeck } from './decks';
import { getCardFromSnapshot } from './cards';

describe('mazos precargados (SPEC-031)', () => {
  it('getPresetDeck encuentra por id y devuelve null si no existe', () => {
    expect(getPresetDeck('unduli')?.name).toContain('Unduli');
    expect(getPresetDeck('no-existe')).toBeNull();
  });

  it('hay 3 mazos, todos con id/nombre y slots no vacíos', () => {
    expect(PRESET_DECKS).toHaveLength(3);
    for (const d of PRESET_DECKS) {
      expect(d.id).toBeTruthy();
      expect(d.name).toBeTruthy();
      expect(d.slots.length).toBeGreaterThan(0);
    }
  });

  it('todos los códigos de todos los mazos están en el snapshot (import offline)', () => {
    for (const d of PRESET_DECKS) {
      for (const { code, qty } of d.slots) {
        expect(qty).toBeGreaterThan(0);
        expect(getCardFromSnapshot(code), `${d.id}:${code} no está en el snapshot`).not.toBeNull();
      }
    }
  });

  it('cada mazo tiene al menos un personaje', () => {
    for (const d of PRESET_DECKS) {
      const chars = d.slots.filter((s) => getCardFromSnapshot(s.code)?.type_code === 'character');
      expect(chars.length, `${d.id} sin personajes`).toBeGreaterThan(0);
    }
  });

  it('el mazo Zuckuss trae caras Dr y Dc (para probar SPEC-029)', () => {
    const zuckuss = getPresetDeck('zuckuss-bounty')!;
    const faces = zuckuss.slots.flatMap((s) => getCardFromSnapshot(s.code)?.sides ?? []);
    expect(faces.some((f) => f.includes('Dr'))).toBe(true);
    expect(faces.some((f) => f.includes('Dc'))).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { COMMUNITY_DECKS } from './communityDecks';
import { getPresetDeck } from './decks';
import { getCardFromSnapshot } from './cards';

describe('mazos de la comunidad (SPEC-035)', () => {
  it('hay un lote grande de mazos, todos con id/nombre/slots', () => {
    expect(COMMUNITY_DECKS.length).toBeGreaterThan(1000);
    for (const d of COMMUNITY_DECKS.slice(0, 50)) {
      expect(d.id).toBeTruthy();
      expect(d.name).toBeTruthy();
      expect(d.slots.length).toBeGreaterThan(0);
    }
  });

  it('los ids de comunidad son numéricos (no colisionan con los de palabra de los precargados)', () => {
    for (const d of COMMUNITY_DECKS) {
      expect(/^\d+$/.test(d.id), `id no numérico: ${d.id}`).toBe(true);
    }
  });

  it('todos los códigos de todos los mazos están en el snapshot (cargan offline)', () => {
    for (const d of COMMUNITY_DECKS) {
      for (const s of d.slots) {
        expect(getCardFromSnapshot(s.code), `${d.id}:${s.code} fuera del snapshot`).not.toBeNull();
      }
    }
  });

  it('cada mazo tiene al menos un personaje', () => {
    for (const d of COMMUNITY_DECKS) {
      const chars = d.slots.filter((s) => getCardFromSnapshot(s.code)?.type_code === 'character');
      expect(chars.length, `${d.id} sin personajes`).toBeGreaterThan(0);
    }
  });

  it('getPresetDeck encuentra también los mazos de comunidad por id', () => {
    const sample = COMMUNITY_DECKS[0];
    expect(getPresetDeck(sample.id)?.name).toBe(sample.name);
  });
});

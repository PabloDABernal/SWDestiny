import type { DeckSlot } from '../import/parseDeck';

// Biblioteca de mazos guardados por el jugador (SPEC-032), persistida en localStorage. Los mazos
// precargados (PRESET_DECKS, SPEC-031) NO viven aquí: se listan aparte como fijos no borrables.

export interface SavedDeck {
  id: string;
  name: string;
  slots: DeckSlot[];
}

const LIBRARY_KEY = 'swd:decklib';

function isSlots(value: unknown): value is DeckSlot[] {
  return (
    Array.isArray(value) &&
    value.every(
      (s) =>
        s && typeof s === 'object' && typeof (s as DeckSlot).code === 'string' && typeof (s as DeckSlot).qty === 'number',
    )
  );
}

/** Carga la biblioteca desde localStorage; descarta entradas malformadas (patrón SPEC-012). */
export function loadLibrary(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d): d is SavedDeck =>
        d && typeof d.id === 'string' && typeof d.name === 'string' && isSlots(d.slots),
    );
  } catch {
    return [];
  }
}

export function persistLibrary(library: SavedDeck[]): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch {
    // best-effort
  }
}

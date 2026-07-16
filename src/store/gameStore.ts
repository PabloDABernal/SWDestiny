import { create } from 'zustand';
import type { Character } from '../model/types';
import { parseDeck } from '../import/parseDeck';
import { resolveCards } from '../import/resolveCards';
import { buildCharacters } from '../import/buildCharacters';
import { ImportError } from '../import/errors';

const DECK_KEY = 'swd:deck';

function loadPersistedDeck(): Character[] {
  try {
    const raw = localStorage.getItem(DECK_KEY);
    return raw ? (JSON.parse(raw) as Character[]) : [];
  } catch {
    return [];
  }
}

function persistDeck(characters: Character[]): void {
  try {
    localStorage.setItem(DECK_KEY, JSON.stringify(characters));
  } catch {
    // best-effort
  }
}

type Status = 'idle' | 'importing';

interface GameState {
  characters: Character[];
  status: Status;
  error: string | null;
  importDeck: (raw: string) => Promise<void>;
}

export const useGameStore = create<GameState>((set) => ({
  // Recarga: la pantalla se reconstruye desde la caché sin volver a pegar ni llamar a la red.
  characters: loadPersistedDeck(),
  status: 'idle',
  error: null,

  importDeck: async (raw: string) => {
    set({ status: 'importing', error: null });
    try {
      const slots = parseDeck(raw);
      const cards = await resolveCards(slots);
      const characters = buildCharacters(slots, cards);
      // Reemplaza el mazo anterior (no se acumulan personajes).
      persistDeck(characters);
      set({ characters, status: 'idle', error: null });
    } catch (e) {
      const message =
        e instanceof ImportError
          ? e.message
          : 'Error inesperado al importar el mazo.';
      // No se toca `characters`: no se deja la pantalla a medio importar.
      set({ status: 'idle', error: message });
    }
  },
}));

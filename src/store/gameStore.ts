import { create } from 'zustand';
import type { Character } from '../model/types';
import { parseDeck } from '../import/parseDeck';
import { resolveCards } from '../import/resolveCards';
import { buildCharacters } from '../import/buildCharacters';
import { ImportError } from '../import/errors';
import { rollCharacter, type PooledDie } from '../game/roll';

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
  /** Estado de partida efímero (SPEC-002), NO persistido. */
  pool: PooledDie[];
  /** Activación por índice de instancia en `characters`. */
  activated: boolean[];
  importDeck: (raw: string) => Promise<void>;
  activate: (index: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Recarga: la pantalla se reconstruye desde la caché sin volver a pegar ni llamar a la red.
  // El pool y las activaciones NO se persisten: recargar deja el pool vacío y todos activables.
  characters: loadPersistedDeck(),
  status: 'idle',
  error: null,
  pool: [],
  activated: [],

  importDeck: async (raw: string) => {
    set({ status: 'importing', error: null });
    try {
      const slots = parseDeck(raw);
      const cards = await resolveCards(slots);
      const characters = buildCharacters(slots, cards);
      // Reemplaza el mazo anterior (no se acumulan personajes) y reinicia el estado de partida.
      persistDeck(characters);
      set({ characters, status: 'idle', error: null, pool: [], activated: [] });
    } catch (e) {
      const message =
        e instanceof ImportError
          ? e.message
          : 'Error inesperado al importar el mazo.';
      // No se toca `characters`: no se deja la pantalla a medio importar.
      set({ status: 'idle', error: message });
    }
  },

  activate: (index: number) =>
    set((state) => {
      const character = state.characters[index];
      // No hay personaje en ese índice o ya está activado: sin efecto.
      if (!character || state.activated[index]) return state;
      const activated = state.activated.slice();
      activated[index] = true;
      return {
        activated,
        pool: [...state.pool, ...rollCharacter(character, index)],
      };
    }),

  // Stand-in del ciclo de ronda: vacía el pool y deja a todos activables.
  reset: () => set({ pool: [], activated: [] }),
}));

/** True si la instancia en `index` está activada. Helper de conveniencia para la UI. */
export function isActivated(activated: boolean[], index: number): boolean {
  return activated[index] === true;
}

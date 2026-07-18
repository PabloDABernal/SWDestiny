import { create } from 'zustand';
import type { Character } from '../model/types';
import { parseDeck } from '../import/parseDeck';
import { resolveCards } from '../import/resolveCards';
import { buildCharacters } from '../import/buildCharacters';
import { ImportError } from '../import/errors';
import { rollCharacter, type PooledDie } from '../game/roll';
import { parseDamage, isKO } from '../game/damage';

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
  /** Daño acumulado por índice de instancia (SPEC-003), NO persistido. */
  damage: number[];
  /** Índice en `pool` del dado de daño seleccionado como fuente, o null. */
  selectedDie: number | null;
  importDeck: (raw: string) => Promise<void>;
  activate: (index: number) => void;
  reset: () => void;
  /** Selecciona/deselecciona un dado del pool como fuente de daño (solo si es de daño). */
  selectDie: (poolIndex: number) => void;
  /** Aplica el dado seleccionado a la instancia objetivo. */
  applyDamageTo: (targetIndex: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Recarga: la pantalla se reconstruye desde la caché sin volver a pegar ni llamar a la red.
  // El pool y las activaciones NO se persisten: recargar deja el pool vacío y todos activables.
  characters: loadPersistedDeck(),
  status: 'idle',
  error: null,
  pool: [],
  activated: [],
  damage: [],
  selectedDie: null,

  importDeck: async (raw: string) => {
    set({ status: 'importing', error: null });
    try {
      const slots = parseDeck(raw);
      const cards = await resolveCards(slots);
      const characters = buildCharacters(slots, cards);
      // Reemplaza el mazo anterior (no se acumulan personajes) y reinicia el estado de partida.
      persistDeck(characters);
      // Reinicia TODO el estado de partida, incluido el daño (vida completa al reimportar).
      set({
        characters,
        status: 'idle',
        error: null,
        pool: [],
        activated: [],
        damage: [],
        selectedDie: null,
      });
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
      // Sin personaje, ya activado, o KO: sin efecto.
      if (!character || state.activated[index]) return state;
      if (isKO(character, state.damage[index] ?? 0)) return state;
      const activated = state.activated.slice();
      activated[index] = true;
      return {
        activated,
        pool: [...state.pool, ...rollCharacter(character, index)],
      };
    }),

  // Stand-in del ciclo de ronda: vacía el pool y reactiva. NO cura (el daño persiste).
  reset: () => set({ pool: [], activated: [], selectedDie: null }),

  selectDie: (poolIndex: number) =>
    set((state) => {
      const die = state.pool[poolIndex];
      // Solo los dados de daño son seleccionables como fuente.
      if (!die || parseDamage(die.face) === null) return state;
      return { selectedDie: state.selectedDie === poolIndex ? null : poolIndex };
    }),

  applyDamageTo: (targetIndex: number) =>
    set((state) => {
      if (state.selectedDie === null) return state;
      const die = state.pool[state.selectedDie];
      const target = state.characters[targetIndex];
      if (!die || !target) return { selectedDie: null };
      const amount = parseDamage(die.face);
      if (amount === null) return { selectedDie: null };
      // Un KO no es objetivo válido.
      if (isKO(target, state.damage[targetIndex] ?? 0)) return state;

      const damage = state.characters.map((_, i) => state.damage[i] ?? 0);
      damage[targetIndex] = Math.min(target.health, damage[targetIndex] + amount);

      // El dado aplicado sale del pool.
      let pool = state.pool.filter((_, i) => i !== state.selectedDie);
      // Si el objetivo queda KO, retira del pool todos sus dados restantes.
      if (isKO(target, damage[targetIndex])) {
        pool = pool.filter((d) => d.characterIndex !== targetIndex);
      }
      return { damage, pool, selectedDie: null };
    }),
}));

/** True si la instancia en `index` está activada. Helper de conveniencia para la UI. */
export function isActivated(activated: boolean[], index: number): boolean {
  return activated[index] === true;
}

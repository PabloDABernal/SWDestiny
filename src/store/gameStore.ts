import { create } from 'zustand';
import type { Character } from '../model/types';
import { parseDeck } from '../import/parseDeck';
import { resolveCards } from '../import/resolveCards';
import { buildCharacters } from '../import/buildCharacters';
import { ImportError } from '../import/errors';
import { rollCharacter, type PooledDie } from '../game/roll';
import { parseDamage, isKO } from '../game/damage';
import { computeOutcome as computeOutcomePure, type Outcome } from '../game/outcome';

export type Side = 'player' | 'enemy';
export const SIDES: Side[] = ['player', 'enemy'];
export const opposite = (s: Side): Side => (s === 'player' ? 'enemy' : 'player');

const DECK_KEY = (side: Side) => `swd:deck:${side}`;

function loadPersistedDeck(side: Side): Character[] {
  try {
    const raw = localStorage.getItem(DECK_KEY(side));
    return raw ? (JSON.parse(raw) as Character[]) : [];
  } catch {
    return [];
  }
}

function persistDeck(side: Side, characters: Character[]): void {
  try {
    localStorage.setItem(DECK_KEY(side), JSON.stringify(characters));
  } catch {
    // best-effort
  }
}

/** Estado de partida de un bando (NO persistido salvo `characters`, que es el mazo importado). */
interface SideState {
  characters: Character[];
  activated: boolean[];
  damage: number[];
  pool: PooledDie[];
  importStatus: 'idle' | 'importing';
  importError: string | null;
}

function freshSide(characters: Character[]): SideState {
  return {
    characters,
    activated: [],
    damage: [],
    pool: [],
    importStatus: 'idle',
    importError: null,
  };
}

/** Recalcula el fin de partida a partir del estado de ambos bandos. */
function computeOutcome(sides: Record<Side, SideState>): Outcome {
  return computeOutcomePure(sides.player, sides.enemy);
}

interface Selection {
  side: Side;
  poolIndex: number;
}

interface GameState {
  sides: Record<Side, SideState>;
  selection: Selection | null;
  outcome: Outcome;
  importDeck: (side: Side, raw: string) => Promise<void>;
  activate: (side: Side, index: number) => void;
  reset: () => void;
  selectDie: (side: Side, poolIndex: number) => void;
  applyDamageTo: (targetSide: Side, index: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Recarga: cada mazo persiste por bando; el estado de partida no se persiste.
  sides: {
    player: freshSide(loadPersistedDeck('player')),
    enemy: freshSide(loadPersistedDeck('enemy')),
  },
  selection: null,
  outcome: null,

  importDeck: async (side: Side, raw: string) => {
    set((state) => ({
      sides: { ...state.sides, [side]: { ...state.sides[side], importStatus: 'importing', importError: null } },
    }));
    try {
      const slots = parseDeck(raw);
      const cards = await resolveCards(slots);
      const characters = buildCharacters(slots, cards);
      persistDeck(side, characters);
      // Reinicia el estado de partida de ESTE bando (vida completa) y recalcula el fin.
      set((state) => {
        const sides = { ...state.sides, [side]: freshSide(characters) };
        return { sides, selection: null, outcome: computeOutcome(sides) };
      });
    } catch (e) {
      const message =
        e instanceof ImportError ? e.message : 'Error inesperado al importar el mazo.';
      set((state) => ({
        sides: {
          ...state.sides,
          [side]: { ...state.sides[side], importStatus: 'idle', importError: message },
        },
      }));
    }
  },

  activate: (side: Side, index: number) =>
    set((state) => {
      const s = state.sides[side];
      const character = s.characters[index];
      if (!character || s.activated[index]) return state;
      if (isKO(character, s.damage[index] ?? 0)) return state;
      const activated = s.activated.slice();
      activated[index] = true;
      const pool = [...s.pool, ...rollCharacter(character, index)];
      return { sides: { ...state.sides, [side]: { ...s, activated, pool } } };
    }),

  // Stand-in del ciclo de ronda: vacía pools y reactiva en ambos bandos. NO cura ni deshace el fin.
  reset: () =>
    set((state) => ({
      sides: {
        player: { ...state.sides.player, pool: [], activated: [] },
        enemy: { ...state.sides.enemy, pool: [], activated: [] },
      },
      selection: null,
    })),

  selectDie: (side: Side, poolIndex: number) =>
    set((state) => {
      if (state.outcome !== null) return state;
      const die = state.sides[side].pool[poolIndex];
      if (!die || parseDamage(die.face) === null) return state;
      const same = state.selection?.side === side && state.selection?.poolIndex === poolIndex;
      return { selection: same ? null : { side, poolIndex } };
    }),

  applyDamageTo: (targetSide: Side, index: number) =>
    set((state) => {
      if (state.outcome !== null || state.selection === null) return state;
      // El objetivo debe ser del bando CONTRARIO al dueño del dado.
      if (targetSide === state.selection.side) return state;

      const source = state.sides[state.selection.side];
      const die = source.pool[state.selection.poolIndex];
      const target = state.sides[targetSide];
      const character = target.characters[index];
      if (!die || !character) return { selection: null };
      const amount = parseDamage(die.face);
      if (amount === null) return { selection: null };
      if (isKO(character, target.damage[index] ?? 0)) return state;

      const damage = target.characters.map((_, i) => target.damage[i] ?? 0);
      damage[index] = Math.min(character.health, damage[index] + amount);

      // El dado aplicado sale del pool de su dueño.
      const sourcePool = source.pool.filter((_, i) => i !== state.selection!.poolIndex);
      // Si el objetivo queda KO, retira sus dados restantes del pool del bando objetivo.
      let targetPool = target.pool;
      if (isKO(character, damage[index])) {
        targetPool = target.pool.filter((d) => d.characterIndex !== index);
      }

      const sides: Record<Side, SideState> = {
        ...state.sides,
        [state.selection.side]: { ...source, pool: sourcePool },
      };
      // El bando objetivo pudo actualizarse ya (si era el mismo objeto que source, no aplica aquí
      // porque target !== source al ser bandos contrarios).
      sides[targetSide] = { ...sides[targetSide], damage, pool: targetPool };

      return { sides, selection: null, outcome: computeOutcome(sides) };
    }),
}));

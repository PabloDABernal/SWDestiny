import { create } from 'zustand';
import type { Character } from '../model/types';
import { parseDeck } from '../import/parseDeck';
import { resolveCards } from '../import/resolveCards';
import { buildCharacters } from '../import/buildCharacters';
import { ImportError } from '../import/errors';
import { rollCharacter, rollDie, type PooledDie } from '../game/roll';
import { parseDamage, isKO } from '../game/damage';
import { computeOutcome as computeOutcomePure, type Outcome, type SideView } from '../game/outcome';
import {
  applyEnemyHealthMultiplier,
  nextAutomatonAction,
  type AutomatonSide,
  type RerollsUsed,
} from '../game/automaton';

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
  /** Rerolls de blancos gastados esta "ronda" (solo relevantes para el bando enemigo/autómata). */
  rerollsUsed: RerollsUsed;
  importStatus: 'idle' | 'importing';
  importError: string | null;
}

function freshSide(characters: Character[]): SideState {
  return {
    characters,
    activated: [],
    damage: [],
    pool: [],
    rerollsUsed: { free: false, extra: 0 },
    importStatus: 'idle',
    importError: null,
  };
}

/** Recalcula el fin de partida a partir del estado de ambos bandos. */
function computeOutcome(sides: Record<Side, SideState>): Outcome {
  return computeOutcomePure(sides.player, sides.enemy);
}

interface DamageResolution {
  sides: Record<Side, SideState>;
  outcome: Outcome;
  amount: number;
}

/**
 * Aplica un dado de daño de `sourceSide` (por posición en su pool) a un personaje de
 * `targetSide`. Devuelve `null` si el dado o el objetivo no son válidos (usado tanto por
 * `applyDamageTo`, jugador vía selección, como por `enemyTurn`, autómata).
 */
function resolveDamage(
  sides: Record<Side, SideState>,
  sourceSide: Side,
  dieIndex: number,
  targetSide: Side,
  targetIndex: number,
): DamageResolution | null {
  const source = sides[sourceSide];
  const die = source.pool[dieIndex];
  const target = sides[targetSide];
  const character = target.characters[targetIndex];
  if (!die || !character) return null;
  const amount = parseDamage(die.face);
  if (amount === null) return null;
  if (isKO(character, target.damage[targetIndex] ?? 0)) return null;

  const damage = target.characters.map((_, i) => target.damage[i] ?? 0);
  damage[targetIndex] = Math.min(character.health, damage[targetIndex] + amount);

  // El dado aplicado sale del pool de su dueño.
  const sourcePool = source.pool.filter((_, i) => i !== dieIndex);
  // Si el objetivo queda KO, retira sus dados restantes del pool del bando objetivo.
  let targetPool = target.pool;
  if (isKO(character, damage[targetIndex])) {
    targetPool = target.pool.filter((d) => d.characterIndex !== targetIndex);
  }

  const nextSides: Record<Side, SideState> = {
    ...sides,
    [sourceSide]: { ...source, pool: sourcePool },
  };
  nextSides[targetSide] = { ...nextSides[targetSide], damage, pool: targetPool };

  return { sides: nextSides, outcome: computeOutcome(nextSides), amount };
}

interface Selection {
  side: Side;
  poolIndex: number;
}

interface GameState {
  sides: Record<Side, SideState>;
  selection: Selection | null;
  outcome: Outcome;
  /** Feedback de la última acción del autómata (incluida "pasa"), para mostrar en la UI. */
  lastEnemyAction: string | null;
  importDeck: (side: Side, raw: string) => Promise<void>;
  activate: (side: Side, index: number) => void;
  reset: () => void;
  selectDie: (side: Side, poolIndex: number) => void;
  applyDamageTo: (targetSide: Side, index: number) => void;
  enemyTurn: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Recarga: cada mazo persiste por bando; el estado de partida no se persiste.
  sides: {
    player: freshSide(loadPersistedDeck('player')),
    enemy: freshSide(loadPersistedDeck('enemy')),
  },
  selection: null,
  outcome: null,
  lastEnemyAction: null,

  importDeck: async (side: Side, raw: string) => {
    set((state) => ({
      sides: { ...state.sides, [side]: { ...state.sides[side], importStatus: 'importing', importError: null } },
    }));
    try {
      const slots = parseDeck(raw);
      const cards = await resolveCards(slots);
      const built = buildCharacters(slots, cards);
      // Trampa (GDD §4): la vida del bando enemigo se multiplica al importar.
      const characters = side === 'enemy' ? applyEnemyHealthMultiplier(built) : built;
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

  // Stand-in del ciclo de ronda: vacía pools, reactiva y restablece rerolls en ambos bandos.
  // NO cura ni deshace el fin.
  reset: () =>
    set((state) => ({
      sides: {
        player: { ...state.sides.player, pool: [], activated: [], rerollsUsed: { free: false, extra: 0 } },
        enemy: { ...state.sides.enemy, pool: [], activated: [], rerollsUsed: { free: false, extra: 0 } },
      },
      selection: null,
      lastEnemyAction: null,
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

      const result = resolveDamage(
        state.sides,
        state.selection.side,
        state.selection.poolIndex,
        targetSide,
        index,
      );
      if (result === null) return { selection: null };
      return { sides: result.sides, selection: null, outcome: result.outcome };
    }),

  // Turno del autómata (GDD §4): evalúa la tabla de prioridades (motor puro en game/automaton)
  // y ejecuta como máximo UNA acción por llamada, reutilizando activate/resolveDamage.
  enemyTurn: () => {
    const state = get();
    if (state.outcome !== null) return;
    const enemy = state.sides.enemy;
    const player = state.sides.player;
    if (enemy.characters.length === 0) return;

    const automatonEnemy: AutomatonSide = {
      characters: enemy.characters,
      damage: enemy.damage,
      activated: enemy.activated,
      pool: enemy.pool,
    };
    const automatonPlayer: SideView = { characters: player.characters, damage: player.damage };
    const action = nextAutomatonAction(automatonEnemy, automatonPlayer, enemy.rerollsUsed);

    switch (action.type) {
      case 'attack': {
        const die = enemy.pool[action.dieIndex];
        const target = player.characters[action.targetIndex];
        set((s) => {
          const result = resolveDamage(s.sides, 'enemy', action.dieIndex, 'player', action.targetIndex);
          if (result === null) return s;
          return {
            sides: result.sides,
            outcome: result.outcome,
            lastEnemyAction: `El enemigo ataca a ${target.name} con ${die.face} (${result.amount} de daño).`,
          };
        });
        return;
      }
      case 'activate': {
        const character = enemy.characters[action.index];
        get().activate('enemy', action.index);
        set({ lastEnemyAction: `El enemigo activa a ${character.name}.` });
        return;
      }
      case 'reroll': {
        set((s) => {
          const e = s.sides.enemy;
          const pool = e.pool.map((d, i) => {
            if (!action.dieIndices.includes(i)) return d;
            const character = e.characters[d.characterIndex];
            const dieDef = character.dice[d.dieIndex];
            return { ...d, face: rollDie(dieDef) };
          });
          const rerollsUsed: RerollsUsed =
            action.kind === 'free'
              ? { ...e.rerollsUsed, free: true }
              : { ...e.rerollsUsed, extra: e.rerollsUsed.extra + 1 };
          const kindLabel = action.kind === 'free' ? 'gratuito' : 'extra';
          return {
            sides: { ...s.sides, enemy: { ...e, pool, rerollsUsed } },
            lastEnemyAction: `El enemigo rerollea ${action.dieIndices.length} dado(s) en blanco (${kindLabel}).`,
          };
        });
        return;
      }
      case 'pass':
        set({ lastEnemyAction: 'El enemigo pasa.' });
        return;
    }
  },
}));

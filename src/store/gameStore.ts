import { create } from 'zustand';
import type { Character } from '../model/types';
import { parseDeck } from '../import/parseDeck';
import { resolveCards } from '../import/resolveCards';
import { buildCharacters } from '../import/buildCharacters';
import { ImportError } from '../import/errors';
import { rollCharacter, rollDie, type PooledDie } from '../game/roll';
import {
  parseDamage,
  dieSymbol,
  parseCostedFace,
  parseShield,
  addShields,
  resolveShieldedDamage,
  parseResource,
  isKO,
  type DieSymbol,
} from '../game/damage';
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
  /** Escudos acumulados por instancia (SPEC-005), tope MAX_SHIELDS. Ganados solo vía dado NSh. */
  shields: number[];
  /** Recursos del bando (SPEC-006), contador único, no por personaje. Sin tope. */
  resources: number;
  pool: PooledDie[];
  /** Rerolls de blancos gastados esta "ronda" (solo relevantes para el bando enemigo/autómata). */
  rerollsUsed: RerollsUsed;
  importStatus: 'idle' | 'importing';
  importError: string | null;
}

/** Recursos iniciales por bando al importar / Reset total (SPEC-009); 0 si el bando está vacío. */
const STARTING_RESOURCES = 2;

function freshSide(characters: Character[]): SideState {
  return {
    characters,
    activated: [],
    damage: [],
    shields: [],
    resources: characters.length > 0 ? STARTING_RESOURCES : 0,
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
 * `targetSide`. Los escudos del objetivo absorben primero (SPEC-005); solo el sobrante baja la
 * vida. Devuelve `null` si el dado o el objetivo no son válidos (usado tanto por `applyDieTo`,
 * jugador vía selección, como por `enemyTurn`, autómata).
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

  const { shieldsRemaining, healthDamage } = resolveShieldedDamage(
    target.shields[targetIndex] ?? 0,
    amount,
  );
  const shields = target.characters.map((_, i) => target.shields[i] ?? 0);
  shields[targetIndex] = shieldsRemaining;

  const damage = target.characters.map((_, i) => target.damage[i] ?? 0);
  damage[targetIndex] = Math.min(character.health, damage[targetIndex] + healthDamage);

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
  nextSides[targetSide] = { ...nextSides[targetSide], damage, shields, pool: targetPool };

  return { sides: nextSides, outcome: computeOutcome(nextSides), amount };
}

interface ShieldResolution {
  sides: Record<Side, SideState>;
  amount: number;
}

/**
 * Aplica un dado de escudo de `side` (por posición en su pool) a un personaje del MISMO bando
 * (SPEC-005). Devuelve `null` si el dado o el objetivo no son válidos.
 */
function resolveShield(
  sides: Record<Side, SideState>,
  side: Side,
  dieIndex: number,
  targetIndex: number,
): ShieldResolution | null {
  const s = sides[side];
  const die = s.pool[dieIndex];
  const character = s.characters[targetIndex];
  if (!die || !character) return null;
  const amount = parseShield(die.face);
  if (amount === null) return null;
  if (isKO(character, s.damage[targetIndex] ?? 0)) return null;

  const shields = s.characters.map((_, i) => s.shields[i] ?? 0);
  shields[targetIndex] = addShields(shields[targetIndex], amount);
  const pool = s.pool.filter((_, i) => i !== dieIndex);

  const nextSides: Record<Side, SideState> = { ...sides, [side]: { ...s, shields, pool } };
  return { sides: nextSides, amount };
}

/**
 * Aplica varios dados de daño de `sourceSide` a UN personaje de `targetSide` (SPEC-008a): suma sus
 * valores, los escudos absorben del total y el resto baja la vida; consume todos los dados. Devuelve
 * null si no hay objetivo válido o ningún dado de daño en `dieIndexes`.
 */
/** Suma cantidad y coste de recurso de los dados marcados (mismo símbolo, SPEC-008b). */
function sumMarked(pool: PooledDie[], dieIndexes: number[]): { amount: number; cost: number } {
  let amount = 0;
  let cost = 0;
  for (const i of dieIndexes) {
    const die = pool[i];
    const parsed = die ? parseCostedFace(die.face) : null;
    if (parsed) {
      amount += parsed.amount;
      cost += parsed.resourceCost;
    }
  }
  return { amount, cost };
}

/** `'insufficient'` si el coste total supera los recursos del bando que paga. */
function resolveDamageBatch(
  sides: Record<Side, SideState>,
  sourceSide: Side,
  dieIndexes: number[],
  targetSide: Side,
  targetIndex: number,
): DamageResolution | 'insufficient' | null {
  const source = sides[sourceSide];
  const target = sides[targetSide];
  const character = target.characters[targetIndex];
  if (!character) return null;
  if (isKO(character, target.damage[targetIndex] ?? 0)) return null;

  const marked = new Set(dieIndexes);
  const { amount: total, cost } = sumMarked(source.pool, dieIndexes);
  if (total === 0) return null;
  if (source.resources < cost) return 'insufficient';

  const { shieldsRemaining, healthDamage } = resolveShieldedDamage(
    target.shields[targetIndex] ?? 0,
    total,
  );
  const shields = target.characters.map((_, i) => target.shields[i] ?? 0);
  shields[targetIndex] = shieldsRemaining;
  const damage = target.characters.map((_, i) => target.damage[i] ?? 0);
  damage[targetIndex] = Math.min(character.health, damage[targetIndex] + healthDamage);

  const sourcePool = source.pool.filter((_, i) => !marked.has(i));
  let targetPool = target.pool;
  if (isKO(character, damage[targetIndex])) {
    targetPool = target.pool.filter((d) => d.characterIndex !== targetIndex);
  }

  // El bando que resuelve paga el coste de recurso (SPEC-008b).
  const nextSides: Record<Side, SideState> = {
    ...sides,
    [sourceSide]: { ...source, pool: sourcePool, resources: source.resources - cost },
  };
  // Si source === target no aplica aquí (daño va al bando contrario), así que targetSide es otro.
  nextSides[targetSide] = { ...nextSides[targetSide], damage, shields, pool: targetPool };
  return { sides: nextSides, outcome: computeOutcome(nextSides), amount: total };
}

/**
 * Aplica varios dados de escudo de `side` a UN aliado (SPEC-008a): suma sus valores (tope
 * MAX_SHIELDS) y consume todos los dados. Devuelve null si no hay objetivo válido o ningún dado de
 * escudo en `dieIndexes`.
 */
function resolveShieldBatch(
  sides: Record<Side, SideState>,
  side: Side,
  dieIndexes: number[],
  targetIndex: number,
): Record<Side, SideState> | 'insufficient' | null {
  const s = sides[side];
  const character = s.characters[targetIndex];
  if (!character) return null;
  if (isKO(character, s.damage[targetIndex] ?? 0)) return null;

  const marked = new Set(dieIndexes);
  const { amount: total, cost } = sumMarked(s.pool, dieIndexes);
  if (total === 0) return null;
  if (s.resources < cost) return 'insufficient';

  const shields = s.characters.map((_, i) => s.shields[i] ?? 0);
  shields[targetIndex] = addShields(shields[targetIndex], total);
  const pool = s.pool.filter((_, i) => !marked.has(i));
  return { ...sides, [side]: { ...s, shields, pool, resources: s.resources - cost } };
}

interface ResourceResolution {
  sides: Record<Side, SideState>;
  amount: number;
}

/**
 * Resuelve un dado de recurso de `side` (por posición en su pool): suma su valor al contador del
 * bando y consume el dado. Puro, SIN el guard de `selection` (lo usan el jugador vía acción y el
 * autómata vía enemyTurn). Devuelve `null` si el dado no es de recurso.
 */
function resolveResourcePure(
  sides: Record<Side, SideState>,
  side: Side,
  dieIndex: number,
): ResourceResolution | null {
  const s = sides[side];
  const die = s.pool[dieIndex];
  if (!die) return null;
  const amount = parseResource(die.face);
  if (amount === null) return null;
  const pool = s.pool.filter((_, i) => i !== dieIndex);
  return { sides: { ...sides, [side]: { ...s, resources: s.resources + amount, pool } }, amount };
}

/**
 * "Modo resolver" del jugador (SPEC-008a): tras elegir un dado, solo se resuelven dados del MISMO
 * bando y símbolo. Para daño/escudo, `marked` es el dado "actual" (0 o 1); para recurso, el conjunto
 * de dados marcados que se resolverán juntos.
 */
interface ResolveMode {
  side: Side;
  symbol: DieSymbol;
  marked: number[];
}

interface GameState {
  sides: Record<Side, SideState>;
  resolve: ResolveMode | null;
  /** Aviso transitorio de resolución (p. ej. "recursos insuficientes", SPEC-008b). */
  resolveError: string | null;
  outcome: Outcome;
  /** Feedback de la última acción del autómata (incluida "pasa"), para mostrar en la UI. */
  lastEnemyAction: string | null;
  importDeck: (side: Side, raw: string) => Promise<void>;
  activate: (side: Side, index: number) => void;
  /** Solo re-tira dados: vacía pools/activaciones/rerolls de ambos bandos; conserva recursos, vida,
   * escudos y KO. No-op si la partida ya terminó (SPEC-009). */
  newRound: () => void;
  /** Devuelve todo al estado inicial de los mazos importados (vida completa, sin escudos/KO,
   * recursos a 2), sin reimportar ni borrar personajes (SPEC-009). */
  resetAll: () => void;
  /** Marca/desmarca un dado del pool propio, entrando/cambiando el modo resolver por símbolo. */
  selectDie: (side: Side, poolIndex: number) => void;
  /** Aplica el dado actual (daño/escudo) a un objetivo. */
  applyDieTo: (targetSide: Side, index: number) => void;
  /** Resuelve juntos todos los dados de recurso marcados (suma al contador). */
  resolveResources: () => void;
  /** Cancela el modo resolver sin resolver nada. */
  cancelResolve: () => void;
  enemyTurn: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Recarga: cada mazo persiste por bando; el estado de partida no se persiste.
  sides: {
    player: freshSide(loadPersistedDeck('player')),
    enemy: freshSide(loadPersistedDeck('enemy')),
  },
  resolve: null,
  resolveError: null,
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
        return { sides, resolve: null, resolveError: null, outcome: computeOutcome(sides) };
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

  // "Nueva ronda" (SPEC-009): solo re-tira dados. Vacía pools/activaciones/rerolls de ambos bandos;
  // CONSERVA recursos, vida, escudos y KO. No-op si la partida ya terminó (solo "Reset total"
  // reinicia entonces).
  newRound: () =>
    set((state) => {
      if (state.outcome !== null) return state;
      const clearDice = (s: SideState): SideState => ({
        ...s,
        pool: [],
        activated: [],
        rerollsUsed: { free: false, extra: 0 },
      });
      return {
        sides: { player: clearDice(state.sides.player), enemy: clearDice(state.sides.enemy) },
        resolve: null,
        resolveError: null,
        lastEnemyAction: null,
      };
    }),

  // "Reset total" (SPEC-009): reconstruye ambos bandos a su estado inicial (vida completa, sin
  // escudos/KO, recursos a 2), conservando los personajes importados. Recalcula el fin.
  resetAll: () =>
    set((state) => {
      const sides: Record<Side, SideState> = {
        player: freshSide(state.sides.player.characters),
        enemy: freshSide(state.sides.enemy.characters),
      };
      return {
        sides,
        resolve: null,
        resolveError: null,
        lastEnemyAction: null,
        outcome: computeOutcome(sides),
      };
    }),

  selectDie: (side: Side, poolIndex: number) =>
    set((state) => {
      if (state.outcome !== null) return state;
      const die = state.sides[side].pool[poolIndex];
      if (!die) return state;
      const symbol = dieSymbol(die.face);
      // Caras no seleccionables (blanco, especial, coste indirecto o modificador → 008b-2/008c).
      if (symbol === null) return state;

      const cur = state.resolve;
      // Distinto bando/símbolo, o sin modo: empieza modo nuevo con este dado (reemplaza).
      if (!cur || cur.side !== side || cur.symbol !== symbol) {
        return { resolve: { side, symbol, marked: [poolIndex] }, resolveError: null };
      }
      // Mismo bando y símbolo: toggle en el conjunto marcado (uno o varios).
      const marked = cur.marked.includes(poolIndex)
        ? cur.marked.filter((i) => i !== poolIndex)
        : [...cur.marked, poolIndex];
      return { resolve: { ...cur, marked }, resolveError: null };
    }),

  // Aplica TODOS los dados marcados (daño o escudo) a un mismo objetivo (SPEC-008a): no se
  // reparten. Daño → bando contrario; escudo → propio bando. Paga el coste de recurso (008b).
  applyDieTo: (targetSide: Side, index: number) =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.marked.length === 0) return state;
      if (cur.symbol === 'resource') return state; // el recurso no tiene objetivo

      if (cur.symbol === 'shield') {
        if (targetSide !== cur.side) return state;
        const result = resolveShieldBatch(state.sides, cur.side, cur.marked, index);
        if (result === null) return state;
        if (result === 'insufficient') return { resolveError: 'Recursos insuficientes para pagar el coste.' };
        return { sides: result, resolve: null, resolveError: null };
      }

      // Daño (melee/ranged/indirecto): objetivo del bando CONTRARIO.
      if (targetSide === cur.side) return state;
      const result = resolveDamageBatch(state.sides, cur.side, cur.marked, targetSide, index);
      if (result === null) return state;
      if (result === 'insufficient') return { resolveError: 'Recursos insuficientes para pagar el coste.' };
      return { sides: result.sides, resolve: null, outcome: result.outcome, resolveError: null };
    }),

  // Resuelve juntos todos los dados de recurso marcados (SPEC-008a/008b): cobra primero el coste de
  // recurso de la tanda, luego suma lo producido; consume todos en una pasada. Si no se puede pagar
  // el coste, no resuelve (aviso).
  resolveResources: () =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.symbol !== 'resource') return state;
      if (cur.marked.length === 0) return state;
      const s = state.sides[cur.side];
      const { amount: total, cost } = sumMarked(s.pool, cur.marked);
      if (s.resources < cost) return { resolveError: 'Recursos insuficientes para pagar el coste.' };
      const markedSet = new Set(cur.marked);
      const pool = s.pool.filter((_, i) => !markedSet.has(i));
      return {
        sides: { ...state.sides, [cur.side]: { ...s, resources: s.resources - cost + total, pool } },
        resolve: null,
        resolveError: null,
      };
    }),

  cancelResolve: () => set({ resolve: null, resolveError: null }),

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
      case 'shield': {
        const die = enemy.pool[action.dieIndex];
        const target = enemy.characters[action.targetIndex];
        set((s) => {
          const result = resolveShield(s.sides, 'enemy', action.dieIndex, action.targetIndex);
          if (result === null) return s;
          return {
            sides: result.sides,
            lastEnemyAction: `El enemigo aplica ${die.face} a ${target.name} (${result.amount} de escudo).`,
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
      case 'resource': {
        const die = enemy.pool[action.dieIndex];
        set((s) => {
          const result = resolveResourcePure(s.sides, 'enemy', action.dieIndex);
          if (result === null) return s;
          return {
            sides: result.sides,
            lastEnemyAction: `El enemigo resuelve ${die.face} (+${result.amount} recurso).`,
          };
        });
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

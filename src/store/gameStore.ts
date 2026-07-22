import { create } from 'zustand';
import type { Character } from '../model/types';
import { parseDeck } from '../import/parseDeck';
import { parseTextDeck } from '../import/parseTextDeck';
import { resolveCards } from '../import/resolveCards';
import { buildCharacters } from '../import/buildCharacters';
import { buildDrawPile, shuffle } from '../import/buildDrawPile';
import { ImportError } from '../import/errors';
import { rollCharacter, rollDie, rollUpgradeDie, type PooledDie } from '../game/roll';
import { readCache } from '../import/resolveCards';
import {
  dieSymbol,
  parsePlayerFace,
  addShields,
  resolveShieldedDamage,
  isKO,
  type DieSymbol,
} from '../game/damage';
import { computeOutcome as computeOutcomePure, type Outcome } from '../game/outcome';
import {
  applyEnemyHealthMultiplier,
  nextAutomatonAction,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_SETTINGS,
  type AutomatonOpponent,
  type AutomatonSide,
  type Difficulty,
  type RerollsUsed,
} from '../game/automaton';

export type Side = 'player' | 'enemy';
export const SIDES: Side[] = ['player', 'enemy'];
export const opposite = (s: Side): Side => (s === 'player' ? 'enemy' : 'player');

const DECK_KEY = (side: Side) => `swd:deck:${side}`;

function loadPersistedDeck(side: Side): Character[] {
  try {
    const raw = localStorage.getItem(DECK_KEY(side));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Character[]) : [];
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

const DRAW_PILE_KEY = (side: Side) => `swd:drawpile:${side}`;

function loadPersistedDrawPile(side: Side): string[] {
  try {
    const raw = localStorage.getItem(DRAW_PILE_KEY(side));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((c) => typeof c === 'string') ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function persistDrawPile(side: Side, drawPile: string[]): void {
  try {
    localStorage.setItem(DRAW_PILE_KEY(side), JSON.stringify(drawPile));
  } catch {
    // best-effort
  }
}

const HAND_KEY = (side: Side) => `swd:hand:${side}`;

function loadPersistedHand(side: Side): string[] {
  try {
    const raw = localStorage.getItem(HAND_KEY(side));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((c) => typeof c === 'string') ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function persistHand(side: Side, hand: string[]): void {
  try {
    localStorage.setItem(HAND_KEY(side), JSON.stringify(hand));
  } catch {
    // best-effort
  }
}

const UPGRADES_KEY = (side: Side) => `swd:upgrades:${side}`;

/** Forma esperada: un array de arrays de códigos de carta, uno por índice de `characters`. */
function isUpgradesShape(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.every((arr) => Array.isArray(arr) && arr.every((c) => typeof c === 'string'))
  );
}

/** Mejoras en juego por bando (SPEC-020): array paralelo a `characters`, cada entrada es la lista
 * de códigos de mejora ligados a ese personaje. Se reajusta al tamaño de `characters` por si la
 * caché queda desincronizada (p. ej. tras un reimport con menos personajes). */
function loadPersistedUpgrades(side: Side, characterCount: number): string[][] {
  try {
    const raw = localStorage.getItem(UPGRADES_KEY(side));
    if (!raw) return emptyUpgrades(characterCount);
    const parsed = JSON.parse(raw);
    if (!isUpgradesShape(parsed)) return emptyUpgrades(characterCount);
    return Array.from({ length: characterCount }, (_, i) => parsed[i] ?? []);
  } catch {
    return emptyUpgrades(characterCount);
  }
}

function persistUpgrades(side: Side, upgrades: string[][]): void {
  try {
    localStorage.setItem(UPGRADES_KEY(side), JSON.stringify(upgrades));
  } catch {
    // best-effort
  }
}

function emptyUpgrades(characterCount: number): string[][] {
  return Array.from({ length: characterCount }, () => []);
}

const SUPPORTS_KEY = (side: Side) => `swd:supports:${side}`;

/** Apoyos en juego por bando (SPEC-021): lista de códigos, NO ligada a ningún personaje (a
 * diferencia de las mejoras). Solo persiste qué apoyos hay en juego; el estado de activación
 * (`SideState.supportsActivated`) es estado de ronda y no se persiste, igual que `activated` de
 * personajes (ver SDD: "pools, activaciones, daño, fin de partida no se persiste"). */
function loadPersistedSupports(side: Side): string[] {
  try {
    const raw = localStorage.getItem(SUPPORTS_KEY(side));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((c) => typeof c === 'string') ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function persistSupports(side: Side, supports: string[]): void {
  try {
    localStorage.setItem(SUPPORTS_KEY(side), JSON.stringify(supports));
  } catch {
    // best-effort
  }
}

const DIFFICULTY_KEY = 'swd:difficulty';
const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

function loadPersistedDifficulty(): Difficulty {
  try {
    const raw = localStorage.getItem(DIFFICULTY_KEY);
    return raw && (VALID_DIFFICULTIES as string[]).includes(raw) ? (raw as Difficulty) : DEFAULT_DIFFICULTY;
  } catch {
    return DEFAULT_DIFFICULTY;
  }
}

function persistDifficulty(difficulty: Difficulty): void {
  try {
    localStorage.setItem(DIFFICULTY_KEY, difficulty);
  } catch {
    // best-effort
  }
}

/** Estado de partida de un bando (NO persistido salvo `characters`/`drawPile`, que son el mazo
 * importado). */
interface SideState {
  characters: Character[];
  /** Mazo de robo barajado (SPEC-016): códigos de carta. */
  drawPile: string[];
  /** Mano de cartas robadas (SPEC-018): códigos de carta, orden de robo. */
  hand: string[];
  /** Mejoras en juego (SPEC-020): array paralelo a `characters`, códigos de carta ligados a cada
   * índice. Sin límite de cuántas puede tener un mismo personaje. */
  upgrades: string[][];
  /** Apoyos en juego (SPEC-021): lista de códigos, no ligada a ningún personaje. Persistida. */
  supports: string[];
  /** Activación de cada apoyo esta ronda (paralelo a `supports` por posición). Estado de ronda,
   * NO persistido, igual que `activated` de personajes. */
  supportsActivated: boolean[];
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

function freshSide(
  characters: Character[],
  drawPile: string[],
  hand: string[] = [],
  upgrades: string[][] = emptyUpgrades(characters.length),
  supports: string[] = [],
): SideState {
  return {
    characters,
    drawPile,
    hand,
    upgrades,
    supports,
    supportsActivated: supports.map(() => false),
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

// --- Motor de resolución de tandas (SPEC-008a/008b/010, reutilizado por el autómata en SPEC-013) ---

interface MarkedSums {
  /** Suma de valores de dados base (no modificadores). */
  baseAmount: number;
  /** Suma de valores de modificadores `+X`. */
  modifierAmount: number;
  /** Coste total de recurso. */
  resourceCost: number;
  /** Coste total de daño indirecto propio. */
  indirectCost: number;
  /** true si hay al menos un dado base marcado (un modificador solo no se resuelve). */
  hasBase: boolean;
}

/** Suma valores y costes de los dados marcados (mismo símbolo) usando parsePlayerFace (SPEC-010). */
function sumPlayerMarked(pool: PooledDie[], dieIndexes: number[]): MarkedSums {
  const s: MarkedSums = {
    baseAmount: 0,
    modifierAmount: 0,
    resourceCost: 0,
    indirectCost: 0,
    hasBase: false,
  };
  for (const i of dieIndexes) {
    const die = pool[i];
    const p = die ? parsePlayerFace(die.face) : null;
    if (!p) continue;
    if (p.isModifier) s.modifierAmount += p.amount;
    else {
      s.baseAmount += p.amount;
      s.hasBase = true;
    }
    s.resourceCost += p.resourceCost;
    s.indirectCost += p.indirectCost;
  }
  return s;
}

type BatchError = 'no-base' | 'insufficient';

/**
 * Resuelve una tanda del jugador (SPEC-010): efecto (base + modificadores) al `effectIndex`, paga el
 * coste de recurso y aplica el coste de daño indirecto propio al `costReceiverIndex` (si lo hay).
 * Daño → bando contrario; escudo/recurso → propio bando. `'no-base'` si solo hay modificadores;
 * `'insufficient'` si no llega para el coste de recurso; `null` si el objetivo/receptor no valen.
 */
function resolvePlayerBatch(
  sides: Record<Side, SideState>,
  mode: { side: Side; symbol: DieSymbol; marked: number[] },
  effectIndex: number | null,
  costReceiverIndex: number | null,
): { sides: Record<Side, SideState>; outcome: Outcome } | BatchError | null {
  const own = sides[mode.side];
  const sums = sumPlayerMarked(own.pool, mode.marked);
  if (!sums.hasBase) return 'no-base';
  if (own.resources < sums.resourceCost) return 'insufficient';
  const effectTotal = sums.baseAmount + sums.modifierAmount;
  const markedSet = new Set(mode.marked);

  // Estado del bando propio: consume marcados, paga recurso; damage/shields por si recibe el coste.
  let ownPool = own.pool.filter((_, i) => !markedSet.has(i));
  let ownUpgrades = own.upgrades;
  const ownResources = own.resources - sums.resourceCost;
  const ownDamage = own.characters.map((_, i) => own.damage[i] ?? 0);
  const ownShields = own.characters.map((_, i) => own.shields[i] ?? 0);
  const next: Record<Side, SideState> = { ...sides };

  // Efecto.
  if (mode.symbol === 'shield') {
    if (effectIndex === null) return null;
    const ch = own.characters[effectIndex];
    if (!ch || isKO(ch, ownDamage[effectIndex])) return null;
    ownShields[effectIndex] = addShields(ownShields[effectIndex], effectTotal);
  } else if (mode.symbol === 'resource') {
    // sin objetivo: el efecto suma recursos (además de pagar coste).
  } else {
    // Daño → bando contrario.
    if (effectIndex === null) return null;
    const opp = opposite(mode.side);
    const target = sides[opp];
    const ch = target.characters[effectIndex];
    if (!ch || isKO(ch, target.damage[effectIndex] ?? 0)) return null;
    const { shieldsRemaining, healthDamage } = resolveShieldedDamage(
      target.shields[effectIndex] ?? 0,
      effectTotal,
    );
    const tShields = target.characters.map((_, i) => target.shields[i] ?? 0);
    tShields[effectIndex] = shieldsRemaining;
    const tDamage = target.characters.map((_, i) => target.damage[i] ?? 0);
    tDamage[effectIndex] = Math.min(ch.health, tDamage[effectIndex] + healthDamage);
    let tPool = target.pool;
    let tUpgrades = target.upgrades;
    if (isKO(ch, tDamage[effectIndex])) {
      tPool = target.pool.filter((d) => d.characterIndex !== effectIndex);
      // Las mejoras ligadas a un personaje KO se descartan con él (SPEC-020).
      tUpgrades = target.upgrades.map((codes, i) => (i === effectIndex ? [] : codes));
      persistUpgrades(opp, tUpgrades);
    }
    next[opp] = { ...target, shields: tShields, damage: tDamage, pool: tPool, upgrades: tUpgrades };
  }

  // Coste de daño indirecto propio (escudos del receptor lo absorben, SPEC-005).
  if (sums.indirectCost > 0) {
    if (costReceiverIndex === null) return null;
    const rc = own.characters[costReceiverIndex];
    if (!rc || isKO(rc, ownDamage[costReceiverIndex])) return null;
    const { shieldsRemaining, healthDamage } = resolveShieldedDamage(
      ownShields[costReceiverIndex],
      sums.indirectCost,
    );
    ownShields[costReceiverIndex] = shieldsRemaining;
    ownDamage[costReceiverIndex] = Math.min(rc.health, ownDamage[costReceiverIndex] + healthDamage);
    if (isKO(rc, ownDamage[costReceiverIndex])) {
      ownPool = ownPool.filter((d) => d.characterIndex !== costReceiverIndex);
      ownUpgrades = ownUpgrades.map((codes, i) => (i === costReceiverIndex ? [] : codes));
      persistUpgrades(mode.side, ownUpgrades);
    }
  }

  const ownResourcesFinal = mode.symbol === 'resource' ? ownResources + effectTotal : ownResources;
  next[mode.side] = {
    ...own,
    pool: ownPool,
    upgrades: ownUpgrades,
    resources: ownResourcesFinal,
    damage: ownDamage,
    shields: ownShields,
  };
  return { sides: next, outcome: computeOutcome(next) };
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
  /** SPEC-010: si != null, el efecto ya tiene objetivo y se espera el receptor del coste indirecto.
   * `effectIndex` es el objetivo del efecto (null para recurso, que no tiene objetivo). Mientras
   * está activo, selectDie/activate quedan bloqueados (resolución atómica). */
  pendingEffect?: { effectIndex: number | null } | null;
}

/**
 * Tras aplicar una tanda con éxito (SPEC-011, multi-objetivo): mantener el modo abierto para seguir
 * mandando dados del MISMO símbolo a otros objetivos, salvo que la partida haya terminado o que ya no
 * quede ningún dado **base** (no modificador) de ese símbolo en el pool del bando que resuelve — un
 * modificador solo no se resuelve, así que si solo quedan modificadores el modo se cierra. `marked`
 * se limpia (evita índices obsoletos tras consumir dados).
 */
function nextResolveAfterApply(
  nextSides: Record<Side, SideState>,
  mode: ResolveMode,
  outcome: Outcome,
): ResolveMode | null {
  if (outcome !== null) return null;
  const hasBaseOfSymbol = nextSides[mode.side].pool.some((d) => {
    const p = parsePlayerFace(d.face);
    return p !== null && p.symbol === mode.symbol && !p.isModifier;
  });
  return hasBaseOfSymbol
    ? { side: mode.side, symbol: mode.symbol, marked: [], pendingEffect: null }
    : null;
}

interface GameState {
  sides: Record<Side, SideState>;
  resolve: ResolveMode | null;
  /** Aviso transitorio de resolución (p. ej. "recursos insuficientes", SPEC-008b). */
  resolveError: string | null;
  /** Mejora seleccionada en la mano a la espera de un personaje objetivo (SPEC-020). */
  playUpgrade: { side: Side; code: string } | null;
  outcome: Outcome;
  /** Feedback de la última acción del autómata (incluida "pasa"), para mostrar en la UI. */
  lastEnemyAction: string | null;
  /** Nivel de dificultad del autómata enemigo (SPEC-015), persistido entre recargas. */
  difficulty: Difficulty;
  /** Solo afecta a la PRÓXIMA importación del enemigo (vida); el reroll extra aplica de inmediato. */
  setDifficulty: (difficulty: Difficulty) => void;
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
  /** Selecciona una mejora de la mano para jugar, a la espera de elegir personaje objetivo
   * (SPEC-020). No-op si `code` no es una carta de tipo mejora. */
  selectUpgradeCard: (side: Side, code: string) => void;
  /** Juega la mejora seleccionada (`playUpgrade`) sobre el personaje `characterIndex` del mismo
   * bando, pagando su coste de carta. Si no hay recursos suficientes, dispara `resolveError` y
   * mantiene el modo abierto (SPEC-020). */
  playUpgradeOn: (characterIndex: number) => void;
  /** Cancela la selección de mejora a jugar sin jugar nada. */
  cancelPlayUpgrade: () => void;
  /** Juega una carta de apoyo de la mano de `side`, pagando su coste de carta. A diferencia de una
   * mejora, no requiere elegir objetivo: entra en juego de inmediato (SPEC-021). No-op si `code`
   * no es una carta de tipo apoyo o no está en la mano. Si no hay recursos suficientes, dispara
   * `resolveError` sin jugar la carta. */
  playSupport: (side: Side, code: string) => void;
  /** Activa el apoyo en juego `index` de `side`: tira su dado y lo añade al pool del bando
   * (SPEC-021). No-op si ya está activado esta ronda. */
  activateSupport: (side: Side, index: number) => void;
  /** Roba 1 carta del mazo de robo a la mano de `side` (SPEC-018). Si el mazo está vacío, termina
   * la partida en el acto (deck-out): Derrota si es el jugador, Victoria si es el enemigo. */
  drawCard: (side: Side) => void;
  enemyTurn: () => void;
}

function initialSide(side: Side): SideState {
  const characters = loadPersistedDeck(side);
  return freshSide(
    characters,
    loadPersistedDrawPile(side),
    loadPersistedHand(side),
    loadPersistedUpgrades(side, characters.length),
    loadPersistedSupports(side),
  );
}

export const useGameStore = create<GameState>((set, get) => ({
  // Recarga: cada mazo persiste por bando; el estado de partida no se persiste.
  sides: {
    player: initialSide('player'),
    enemy: initialSide('enemy'),
  },
  resolve: null,
  resolveError: null,
  playUpgrade: null,
  outcome: null,
  lastEnemyAction: null,
  difficulty: loadPersistedDifficulty(),

  setDifficulty: (difficulty: Difficulty) => {
    persistDifficulty(difficulty);
    set({ difficulty });
  },

  importDeck: async (side: Side, raw: string) => {
    set((state) => ({
      sides: { ...state.sides, [side]: { ...state.sides[side], importStatus: 'importing', importError: null } },
    }));
    try {
      // Autodetección de formato (SPEC-017): JSON con `slots` si empieza por "{"; si no, el
      // "text file" legible de ARH DB. Ambos producen el mismo DeckSlot[].
      const slots = raw.trim().startsWith('{') ? parseDeck(raw) : parseTextDeck(raw);
      const cards = await resolveCards(slots);
      const built = buildCharacters(slots, cards);
      // Trampa (GDD §4): la vida del bando enemigo se multiplica al importar, según la dificultad
      // vigente en ESE momento (SPEC-015; no retroactivo si se cambia después).
      const characters =
        side === 'enemy'
          ? applyEnemyHealthMultiplier(built, DIFFICULTY_SETTINGS[get().difficulty].healthMultiplier)
          : built;
      persistDeck(side, characters);
      // Mazo de robo (SPEC-016): se reconstruye y rebaraja en cada (re)importación.
      const drawPile = shuffle(buildDrawPile(slots, cards));
      persistDrawPile(side, drawPile);
      // Mano vacía en cada (re)importación (SPEC-018: fuera de alcance robar mano inicial aquí).
      persistHand(side, []);
      // Mejoras en juego vacías en cada (re)importación (SPEC-020).
      persistUpgrades(side, emptyUpgrades(characters.length));
      // Apoyos en juego vacíos en cada (re)importación (SPEC-021).
      persistSupports(side, []);
      // Reinicia el estado de partida de ESTE bando (vida completa) y recalcula el fin.
      set((state) => {
        const sides = { ...state.sides, [side]: freshSide(characters, drawPile) };
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
      // Bloqueado mientras se espera el receptor del coste indirecto (SPEC-010, resolución atómica).
      if (state.resolve?.pendingEffect) return state;
      // Bloqueado mientras se elige objetivo para jugar una mejora (SPEC-020).
      if (state.playUpgrade !== null) return state;
      const s = state.sides[side];
      const character = s.characters[index];
      if (!character || s.activated[index]) return state;
      if (isKO(character, s.damage[index] ?? 0)) return state;
      const activated = s.activated.slice();
      activated[index] = true;
      // Las mejoras ligadas a este personaje (SPEC-020) tiran su dado junto con los suyos.
      const upgradeDice = (s.upgrades[index] ?? []).flatMap((code) => {
        const card = readCache(code);
        if (!card) return [];
        return [rollUpgradeDie({ sides: [...card.sides] }, card.code, card.name, index)];
      });
      const pool = [...s.pool, ...rollCharacter(character, index), ...upgradeDice];
      return { sides: { ...state.sides, [side]: { ...s, activated, pool } } };
    }),

  // "Nueva ronda" (SPEC-009/011): mantenimiento. Re-tira dados (vacía pools/activaciones/rerolls),
  // suma +2 recursos a cada bando (persisten, SPEC-009) y roba 1 carta por bando (SPEC-019).
  // CONSERVA vida, escudos y KO. No-op si la partida ya terminó (solo "Reset total" reinicia
  // entonces). Deck-out (SPEC-018/019): antes de mutar nada se comprueba si algún mazo está vacío
  // (enemigo primero, mismo orden que computeOutcome) y, si es así, la partida termina en el acto
  // sin aplicar ningún otro efecto del mantenimiento.
  newRound: () =>
    set((state) => {
      if (state.outcome !== null) return state;
      if (state.sides.enemy.drawPile.length === 0) return { outcome: 'victory' };
      if (state.sides.player.drawPile.length === 0) return { outcome: 'defeat' };

      const maintain = (side: Side, s: SideState): SideState => {
        const [code, ...drawPile] = s.drawPile;
        const hand = [...s.hand, code];
        persistDrawPile(side, drawPile);
        persistHand(side, hand);
        return {
          ...s,
          pool: [],
          activated: [],
          // Resetea la activación de los apoyos en juego (SPEC-021), igual que la de personajes;
          // los apoyos en sí (`supports`) no se tocan, siguen en juego.
          supportsActivated: s.supports.map(() => false),
          rerollsUsed: { free: false, extra: 0 },
          resources: s.resources + 2,
          drawPile,
          hand,
        };
      };
      return {
        sides: { player: maintain('player', state.sides.player), enemy: maintain('enemy', state.sides.enemy) },
        resolve: null,
        resolveError: null,
        lastEnemyAction: null,
      };
    }),

  // "Reset total" (SPEC-009): reconstruye ambos bandos a su estado inicial (vida completa, sin
  // escudos/KO, recursos a 2), conservando los personajes importados. El mazo de robo vuelve a su
  // composición completa original (drawPile + hand + mejoras + apoyos en juego, rebarajado,
  // SPEC-020/021) y la mano, mejoras y apoyos en juego quedan vacíos.
  resetAll: () =>
    set((state) => {
      const rebuild = (side: Side, s: SideState): SideState => {
        const drawPile = shuffle([...s.drawPile, ...s.hand, ...s.upgrades.flat(), ...s.supports]);
        persistDrawPile(side, drawPile);
        persistHand(side, []);
        persistUpgrades(side, emptyUpgrades(s.characters.length));
        persistSupports(side, []);
        return freshSide(s.characters, drawPile);
      };
      const sides: Record<Side, SideState> = {
        player: rebuild('player', state.sides.player),
        enemy: rebuild('enemy', state.sides.enemy),
      };
      return {
        sides,
        resolve: null,
        resolveError: null,
        playUpgrade: null,
        lastEnemyAction: null,
        outcome: computeOutcome(sides),
      };
    }),

  selectDie: (side: Side, poolIndex: number) =>
    set((state) => {
      if (state.outcome !== null) return state;
      // Bloqueado mientras se espera el receptor del coste indirecto (SPEC-010).
      if (state.resolve?.pendingEffect) return state;
      // Bloqueado mientras se elige objetivo para jugar una mejora (SPEC-020).
      if (state.playUpgrade !== null) return state;
      const die = state.sides[side].pool[poolIndex];
      if (!die) return state;
      const symbol = dieSymbol(die.face);
      // Caras no seleccionables (blanco, especial, focus, disrupt, descarte).
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

  // Aplica los dados marcados (daño/escudo) a un objetivo, sumando base + modificadores y pagando
  // costes (SPEC-008b/010). Si hay coste indirecto, primero el objetivo del efecto y luego, en un
  // segundo clic (sobre un aliado propio), el receptor del coste (paso atómico).
  applyDieTo: (targetSide: Side, index: number) =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.marked.length === 0) return state;

      // Paso 3: ya hay objetivo del efecto; este clic es el receptor del coste indirecto (bando propio).
      if (cur.pendingEffect) {
        if (targetSide !== cur.side) return state;
        const res = resolvePlayerBatch(state.sides, cur, cur.pendingEffect.effectIndex, index);
        if (res === null || res === 'no-base' || res === 'insufficient') return state; // no debería
        return {
          sides: res.sides,
          outcome: res.outcome,
          resolve: nextResolveAfterApply(res.sides, cur, res.outcome),
          resolveError: null,
        };
      }

      if (cur.symbol === 'resource') return state; // el recurso se resuelve con su botón

      // Paso 2: elegir objetivo del efecto (daño → contrario; escudo → propio).
      const wantSide = cur.symbol === 'shield' ? cur.side : opposite(cur.side);
      if (targetSide !== wantSide) return state;
      const sums = sumPlayerMarked(state.sides[cur.side].pool, cur.marked);
      if (!sums.hasBase) return { resolveError: 'Necesitas un dado base del mismo símbolo (un modificador solo no se resuelve).' };
      if (state.sides[cur.side].resources < sums.resourceCost) {
        return { resolveError: 'Recursos insuficientes para pagar el coste.' };
      }
      if (sums.indirectCost > 0) {
        // Falta el receptor del coste indirecto: pasa a paso 3 (atómico).
        return { resolve: { ...cur, pendingEffect: { effectIndex: index } }, resolveError: null };
      }
      // Sin coste indirecto: resolver ya.
      const res = resolvePlayerBatch(state.sides, cur, index, null);
      if (res === null || res === 'no-base' || res === 'insufficient') return state;
      return {
        sides: res.sides,
        outcome: res.outcome,
        resolve: nextResolveAfterApply(res.sides, cur, res.outcome),
        resolveError: null,
      };
    }),

  // Resuelve la tanda de recurso marcada (SPEC-008b/010): base + modificadores suman al contador,
  // pagando el coste de recurso. Si hay coste indirecto, pasa al paso de receptor (atómico).
  resolveResources: () =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.symbol !== 'resource') return state;
      if (cur.marked.length === 0 || cur.pendingEffect) return state;
      const sums = sumPlayerMarked(state.sides[cur.side].pool, cur.marked);
      if (!sums.hasBase) return { resolveError: 'Necesitas un dado base del mismo símbolo (un modificador solo no se resuelve).' };
      if (state.sides[cur.side].resources < sums.resourceCost) {
        return { resolveError: 'Recursos insuficientes para pagar el coste.' };
      }
      if (sums.indirectCost > 0) {
        return { resolve: { ...cur, pendingEffect: { effectIndex: null } }, resolveError: null };
      }
      const res = resolvePlayerBatch(state.sides, cur, null, null);
      if (res === null || res === 'no-base' || res === 'insufficient') return state;
      return {
        sides: res.sides,
        outcome: res.outcome,
        resolve: nextResolveAfterApply(res.sides, cur, res.outcome),
        resolveError: null,
      };
    }),

  cancelResolve: () => set({ resolve: null, resolveError: null }),

  selectUpgradeCard: (side: Side, code: string) =>
    set((state) => {
      if (state.outcome !== null) return state;
      // Bloqueado mientras se espera el receptor del coste indirecto (SPEC-010).
      if (state.resolve?.pendingEffect) return state;
      if (!state.sides[side].hand.includes(code)) return state;
      const card = readCache(code);
      if (!card || card.type_code !== 'upgrade') return state;
      return { playUpgrade: { side, code }, resolve: null, resolveError: null };
    }),

  playUpgradeOn: (characterIndex: number) =>
    set((state) => {
      const mode = state.playUpgrade;
      if (state.outcome !== null || mode === null) return state;
      const s = state.sides[mode.side];
      const target = s.characters[characterIndex];
      if (!target || isKO(target, s.damage[characterIndex] ?? 0)) return state;
      const card = readCache(mode.code);
      if (!card) return state;
      const cost = card.cost ?? 0;
      if (s.resources < cost) {
        return { resolveError: 'Recursos insuficientes para jugar esta carta.' };
      }
      const handIndex = s.hand.indexOf(mode.code);
      if (handIndex === -1) return { playUpgrade: null };
      const hand = s.hand.slice();
      hand.splice(handIndex, 1);
      const upgrades = s.upgrades.map((codes, i) => (i === characterIndex ? [...codes, mode.code] : codes));
      persistHand(mode.side, hand);
      persistUpgrades(mode.side, upgrades);
      return {
        sides: { ...state.sides, [mode.side]: { ...s, hand, upgrades, resources: s.resources - cost } },
        playUpgrade: null,
        resolveError: null,
      };
    }),

  cancelPlayUpgrade: () => set({ playUpgrade: null, resolveError: null }),

  playSupport: (side: Side, code: string) =>
    set((state) => {
      if (state.outcome !== null) return state;
      // Mismos guards de exclusión mutua que jugar una mejora (SPEC-020/021).
      if (state.resolve?.pendingEffect) return state;
      if (state.playUpgrade !== null) return state;
      const s = state.sides[side];
      if (!s.hand.includes(code)) return state;
      const card = readCache(code);
      if (!card || card.type_code !== 'support') return state;
      const cost = card.cost ?? 0;
      if (s.resources < cost) {
        return { resolveError: 'Recursos insuficientes para jugar esta carta.' };
      }
      const handIndex = s.hand.indexOf(code);
      const hand = s.hand.slice();
      hand.splice(handIndex, 1);
      const supports = [...s.supports, code];
      const supportsActivated = [...s.supportsActivated, false];
      persistHand(side, hand);
      persistSupports(side, supports);
      return {
        sides: { ...state.sides, [side]: { ...s, hand, supports, supportsActivated, resources: s.resources - cost } },
        resolveError: null,
      };
    }),

  activateSupport: (side: Side, index: number) =>
    set((state) => {
      // Mismos guards de exclusión mutua que activar un personaje (SPEC-020/021).
      if (state.resolve?.pendingEffect) return state;
      if (state.playUpgrade !== null) return state;
      const s = state.sides[side];
      const code = s.supports[index];
      if (!code || s.supportsActivated[index]) return state;
      const card = readCache(code);
      if (!card) return state;
      const supportsActivated = s.supportsActivated.slice();
      supportsActivated[index] = true;
      const die = rollUpgradeDie({ sides: [...card.sides] }, card.code, card.name, -1);
      const pool = [...s.pool, die];
      return { sides: { ...state.sides, [side]: { ...s, supportsActivated, pool } } };
    }),

  drawCard: (side: Side) =>
    set((state) => {
      if (state.outcome !== null) return state;
      const s = state.sides[side];
      if (s.drawPile.length === 0) {
        // Deck-out (SPEC-018): evento puntual disparado por el propio intento de robar, no
        // derivable de computeOutcome (0 cartas sin haber robado es un estado válido).
        return { outcome: side === 'player' ? 'defeat' : 'victory' };
      }
      const [code, ...drawPile] = s.drawPile;
      const hand = [...s.hand, code];
      persistDrawPile(side, drawPile);
      persistHand(side, hand);
      return { sides: { ...state.sides, [side]: { ...s, drawPile, hand } } };
    }),

  // Turno del autómata (GDD §4): evalúa la tabla de prioridades (motor puro en game/automaton)
  // y ejecuta como máximo UNA acción por llamada, reutilizando resolvePlayerBatch/activate
  // (SPEC-013: el autómata combina modificadores y paga costes igual que el jugador).
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
      shields: enemy.shields,
      resources: enemy.resources,
    };
    const automatonPlayer: AutomatonOpponent = {
      characters: player.characters,
      damage: player.damage,
      shields: player.shields,
    };
    const extraRerolls = DIFFICULTY_SETTINGS[state.difficulty].extraRerolls;
    const action = nextAutomatonAction(automatonEnemy, automatonPlayer, enemy.rerollsUsed, extraRerolls);

    const batchTotal = (dieIndices: number[]): number =>
      dieIndices.reduce((sum, i) => {
        const p = enemy.pool[i] ? parsePlayerFace(enemy.pool[i].face) : null;
        return p ? sum + p.amount : sum;
      }, 0);
    const batchLabel = (dieIndices: number[]): string =>
      dieIndices.map((i) => enemy.pool[i]?.face).join('+');

    switch (action.type) {
      case 'attack': {
        const target = player.characters[action.targetIndex];
        const total = batchTotal(action.dieIndices);
        const label = batchLabel(action.dieIndices);
        set((s) => {
          const res = resolvePlayerBatch(
            s.sides,
            { side: 'enemy', symbol: 'melee', marked: action.dieIndices },
            action.targetIndex,
            action.costReceiverIndex,
          );
          if (res === null || res === 'no-base' || res === 'insufficient') return s;
          return {
            sides: res.sides,
            outcome: res.outcome,
            lastEnemyAction: `El enemigo ataca a ${target.name} con ${label} (${total} de daño).`,
          };
        });
        return;
      }
      case 'shield': {
        const target = enemy.characters[action.targetIndex];
        const total = batchTotal(action.dieIndices);
        const label = batchLabel(action.dieIndices);
        set((s) => {
          const res = resolvePlayerBatch(
            s.sides,
            { side: 'enemy', symbol: 'shield', marked: action.dieIndices },
            action.targetIndex,
            action.costReceiverIndex,
          );
          if (res === null || res === 'no-base' || res === 'insufficient') return s;
          return {
            sides: res.sides,
            lastEnemyAction: `El enemigo aplica ${label} a ${target.name} (${total} de escudo).`,
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
        const total = batchTotal(action.dieIndices);
        const label = batchLabel(action.dieIndices);
        set((s) => {
          const res = resolvePlayerBatch(
            s.sides,
            { side: 'enemy', symbol: 'resource', marked: action.dieIndices },
            null,
            action.costReceiverIndex,
          );
          if (res === null || res === 'no-base' || res === 'insufficient') return s;
          return {
            sides: res.sides,
            lastEnemyAction: `El enemigo resuelve ${label} (+${total} recurso).`,
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

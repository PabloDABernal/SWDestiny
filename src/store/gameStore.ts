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

const DISCARD_PILE_KEY = (side: Side) => `swd:discardpile:${side}`;

/** Pila de descarte por bando: cartas descartadas de la mano (`discardCard`). No se juegan desde
 * aquí (SPEC-022 sigue sin pila consultable en juego); solo existe para que "Reset total" pueda
 * devolverlas al mazo junto con `drawPile`/`hand`/mejoras/apoyos (bug detectado jugando SPEC-022:
 * antes se perdían para siempre, también tras un Reset total). */
function loadPersistedDiscardPile(side: Side): string[] {
  try {
    const raw = localStorage.getItem(DISCARD_PILE_KEY(side));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((c) => typeof c === 'string') ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function persistDiscardPile(side: Side, discardPile: string[]): void {
  try {
    localStorage.setItem(DISCARD_PILE_KEY(side), JSON.stringify(discardPile));
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
  /** Pila de descarte (SPEC-022): códigos descartados de la mano, sin UI consultable todavía; solo
   * alimenta el mazo rebarajado en "Reset total". */
  discardPile: string[];
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

/** Tamaño de mano por defecto (RR pg 25, SPEC-022): "Nueva ronda" roba hasta llegar aquí. */
const HAND_SIZE = 5;

function freshSide(
  characters: Character[],
  drawPile: string[],
  hand: string[] = [],
  upgrades: string[][] = emptyUpgrades(characters.length),
  supports: string[] = [],
  discardPile: string[] = [],
): SideState {
  return {
    characters,
    drawPile,
    hand,
    upgrades,
    supports,
    discardPile,
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
  } else if (mode.symbol === 'special') {
    // Especial (SPEC-023): placeholder sin efecto real; solo se consume y paga su coste, si tiene.
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

// --- Focus, reroll de dado y especial (SPEC-023): el objetivo es un DADO (posición en un `pool`),
// no un personaje/bando, así que no encajan en `resolvePlayerBatch`. Comparten con él el pago del
// coste de daño indirecto propio (mismo receptor determinista propio, SPEC-005/010). ---

/** Aplica el coste de daño indirecto propio a `costReceiverIndex` del bando `side`, si lo hay.
 * Compartido por `applyFocus`/`applyRerollDice` (SPEC-023) y análogo al de `resolvePlayerBatch`. */
function applyOwnIndirectCost(
  own: SideState,
  side: Side,
  costReceiverIndex: number | null,
  indirectCost: number,
  damage: number[],
  shields: number[],
  upgrades: string[][],
  pool: PooledDie[],
): { damage: number[]; shields: number[]; upgrades: string[][]; pool: PooledDie[] } | null {
  if (indirectCost <= 0) return { damage, shields, upgrades, pool };
  if (costReceiverIndex === null) return null;
  const rc = own.characters[costReceiverIndex];
  if (!rc || isKO(rc, damage[costReceiverIndex] ?? 0)) return null;
  const { shieldsRemaining, healthDamage } = resolveShieldedDamage(shields[costReceiverIndex] ?? 0, indirectCost);
  const nextShields = shields.slice();
  const nextDamage = damage.slice();
  nextShields[costReceiverIndex] = shieldsRemaining;
  nextDamage[costReceiverIndex] = Math.min(rc.health, (damage[costReceiverIndex] ?? 0) + healthDamage);
  let nextPool = pool;
  let nextUpgrades = upgrades;
  if (isKO(rc, nextDamage[costReceiverIndex])) {
    nextPool = pool.filter((d) => d.characterIndex !== costReceiverIndex);
    nextUpgrades = upgrades.map((codes, i) => (i === costReceiverIndex ? [] : codes));
    persistUpgrades(side, nextUpgrades);
  }
  return { damage: nextDamage, shields: nextShields, upgrades: nextUpgrades, pool: nextPool };
}

/** Definición de las 6 caras de un dado ya en el pool, vía la caché de su carta (SPEC-023). Mismo
 * patrón que `activate`/`activateSupport`; null si la carta no está en caché. */
function poolDieSides(die: PooledDie): string[] | null {
  return readCache(die.code)?.sides ?? null;
}

/**
 * Gira, dentro de la resolución de Focus del bando `side` (SPEC-023): consume los dados marcados
 * (fuente), paga su coste, y cambia la cara de cada dado de `picks` sin sacarlo del pool ni
 * resolverlo. `'no-base'`/`'insufficient'` como `resolvePlayerBatch`; `null` si el receptor del
 * coste indirecto no vale.
 */
function applyFocus(
  sides: Record<Side, SideState>,
  side: Side,
  marked: number[],
  picks: { poolIndex: number; face: string }[],
  costReceiverIndex: number | null,
): { sides: Record<Side, SideState>; outcome: Outcome } | BatchError | null {
  const own = sides[side];
  const sums = sumPlayerMarked(own.pool, marked);
  if (!sums.hasBase) return 'no-base';
  if (own.resources < sums.resourceCost) return 'insufficient';
  const markedSet = new Set(marked);
  const pickMap = new Map(picks.map((p) => [p.poolIndex, p.face]));

  const damage = own.characters.map((_, i) => own.damage[i] ?? 0);
  const shields = own.characters.map((_, i) => own.shields[i] ?? 0);
  const pool = own.pool
    .map((d, i) => (pickMap.has(i) ? { ...d, face: pickMap.get(i)! } : d))
    .filter((_, i) => !markedSet.has(i));

  const withCost = applyOwnIndirectCost(own, side, costReceiverIndex, sums.indirectCost, damage, shields, own.upgrades, pool);
  if (withCost === null) return null;

  const next: Record<Side, SideState> = {
    ...sides,
    [side]: {
      ...own,
      pool: withCost.pool,
      upgrades: withCost.upgrades,
      resources: own.resources - sums.resourceCost,
      damage: withCost.damage,
      shields: withCost.shields,
    },
  };
  return { sides: next, outcome: computeOutcome(next) };
}

/**
 * Re-tira, dentro de la resolución de Reroll de dado del bando `side` (SPEC-023): consume los
 * dados marcados (fuente), paga su coste, y re-tira cada dado de `targets` (de cualquier pool,
 * propio o rival) con su propia definición de dado.
 */
function applyRerollDice(
  sides: Record<Side, SideState>,
  side: Side,
  marked: number[],
  targets: { side: Side; poolIndex: number }[],
  costReceiverIndex: number | null,
): { sides: Record<Side, SideState>; outcome: Outcome } | BatchError | null {
  const own = sides[side];
  const sums = sumPlayerMarked(own.pool, marked);
  if (!sums.hasBase) return 'no-base';
  if (own.resources < sums.resourceCost) return 'insufficient';
  const markedSet = new Set(marked);

  const reroll = (d: PooledDie): PooledDie => {
    const dieSides = poolDieSides(d);
    return dieSides ? { ...d, face: rollDie({ sides: [...dieSides] }) } : d;
  };

  const ownTargets = new Set(targets.filter((t) => t.side === side).map((t) => t.poolIndex));
  const damage = own.characters.map((_, i) => own.damage[i] ?? 0);
  const shields = own.characters.map((_, i) => own.shields[i] ?? 0);
  const pool = own.pool
    .map((d, i) => (ownTargets.has(i) ? reroll(d) : d))
    .filter((_, i) => !markedSet.has(i));

  const withCost = applyOwnIndirectCost(own, side, costReceiverIndex, sums.indirectCost, damage, shields, own.upgrades, pool);
  if (withCost === null) return null;

  const next: Record<Side, SideState> = {
    ...sides,
    [side]: {
      ...own,
      pool: withCost.pool,
      upgrades: withCost.upgrades,
      resources: own.resources - sums.resourceCost,
      damage: withCost.damage,
      shields: withCost.shields,
    },
  };

  const opp = opposite(side);
  const oppTargets = new Set(targets.filter((t) => t.side === opp).map((t) => t.poolIndex));
  if (oppTargets.size > 0) {
    const oppSide = sides[opp];
    next[opp] = { ...oppSide, pool: oppSide.pool.map((d, i) => (oppTargets.has(i) ? reroll(d) : d)) };
  }

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
  /** SPEC-023 (symbol === 'focus'): dados propios ya girados en esta resolución (poolIndex del
   * dado objetivo + cara elegida), acumulados hasta `confirmFocus`. */
  focusPicks?: { poolIndex: number; face: string }[];
  /** SPEC-023 (symbol === 'focus'): dado propio a la espera de que el jugador elija su nueva cara
   * (poolIndex). Mientras está activo, selectDie/activate quedan bloqueados. */
  focusFaceChoice?: number | null;
  /** SPEC-023 (symbol === 'reroll'): dados (de cualquier pool, propio o rival) ya elegidos como
   * objetivo de esta resolución de Reroll de dado, acumulados hasta `confirmReroll`. */
  rerollTargets?: { side: Side; poolIndex: number }[];
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

/** Tras aplicar una tanda con éxito (SPEC-025): calcula el próximo `resolve` (arriba) y, si el modo
 * se cierra del todo (no queda ningún dado base de ese símbolo, o la partida terminó), cierra el
 * turno de `mode.side` — es la "una acción" completa de este turno, incluso si hizo falta más de un
 * clic para repartirla entre varios objetivos (SPEC-011/014). Si el modo sigue abierto (queda más
 * de ese mismo lote por repartir), el turno NO cambia: sigue siendo la misma acción en curso. */
function afterApply(
  mode: ResolveMode,
  res: { sides: Record<Side, SideState>; outcome: Outcome },
): { resolve: ResolveMode | null; turn?: Side; passStreak?: number } {
  const resolve = nextResolveAfterApply(res.sides, mode, res.outcome);
  return resolve === null ? { resolve, turn: opposite(mode.side), passStreak: 0 } : { resolve };
}

interface GameState {
  sides: Record<Side, SideState>;
  resolve: ResolveMode | null;
  /** Aviso transitorio de resolución (p. ej. "recursos insuficientes", SPEC-008b). */
  resolveError: string | null;
  /** Mejora seleccionada en la mano a la espera de un personaje objetivo (SPEC-020). */
  playUpgrade: { side: Side; code: string } | null;
  /** Mulligan del jugador pendiente de confirmar tras "Nueva partida" (SPEC-024): `marked` son
   * índices de `sides.player.hand` marcados para devolver al mazo. No se persiste (estado de
   * partida, igual que `resolve`/`playUpgrade`). */
  mulligan: { marked: number[] } | null;
  /** Turnos reales alternados (SPEC-025): de quién es el turno ahora. No se persiste (estado de
   * partida, igual que `resolve`/`playUpgrade`/`mulligan`). Siempre `'player'` al empezar cada
   * ronda (sin campo de batalla implementado). */
  turn: Side;
  /** Pases consecutivos sin ninguna acción real entre medias (SPEC-025). Al llegar a 2 dispara el
   * mantenimiento automático y se reinicia a 0. Cualquier acción real lo reinicia a 0. */
  passStreak: number;
  outcome: Outcome;
  /** Feedback de la última acción del autómata (incluida "pasa"), para mostrar en la UI. */
  lastEnemyAction: string | null;
  /** Nivel de dificultad del autómata enemigo (SPEC-015), persistido entre recargas. */
  difficulty: Difficulty;
  /** Solo afecta a la PRÓXIMA importación del enemigo (vida); el reroll extra aplica de inmediato. */
  setDifficulty: (difficulty: Difficulty) => void;
  importDeck: (side: Side, raw: string) => Promise<void>;
  /** Reparte 5 cartas a cada bando (o las que haya) desde su mazo de robo y abre el mulligan del
   * jugador (SPEC-024). No-op si la partida ya terminó o si algún bando no está en estado fresco
   * (mazo importado y mano vacía en ambos). */
  startGame: () => void;
  /** Marca/desmarca `handIndex` de la mano del jugador como carta a devolver en el mulligan en
   * curso (SPEC-024). No-op si no hay mulligan pendiente. */
  toggleMulliganCard: (handIndex: number) => void;
  /** Confirma el mulligan en curso (SPEC-024): devuelve las cartas marcadas al mazo de robo del
   * jugador (rebarajado) y roba la misma cantidad de vuelta. Cierra el modo aunque no se marque
   * ninguna carta. No-op si no hay mulligan pendiente. */
  confirmMulligan: () => void;
  activate: (side: Side, index: number) => void;
  /** Cede el turno de `side` sin hacer nada (SPEC-025). No-op si no es su turno o hay un modo
   * abierto (`resolve`/`playUpgrade`/`mulligan`). Dos pases consecutivos disparan el mantenimiento
   * automático (misma lógica que antes tenía "Nueva ronda") y reinician el turno al jugador. */
  pass: (side: Side) => void;
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
  /** SPEC-023: elige `poolIndex` (dado propio sin resolver, distinto de los marcados) como próximo
   * objetivo de la resolución de Focus en curso; abre la elección de cara. No-op si no queda
   * presupuesto (suma de valores de los dados marcados) o el índice no es válido. */
  pickFocusTarget: (poolIndex: number) => void;
  /** SPEC-023: fija `face` (debe ser una de las 6 caras reales del dado) como la nueva cara del
   * dado elegido en `pickFocusTarget`, y cierra la elección de cara. */
  chooseFocusFace: (face: string) => void;
  /** SPEC-023: aplica la resolución de Focus en curso (paga el coste, gira cada dado elegido a su
   * cara, consume los dados de Focus marcados). No-op si no se ha elegido ningún dado objetivo. */
  confirmFocus: () => void;
  /** SPEC-023: marca/desmarca `poolIndex` de `targetSide` (cualquier pool, propio o rival) como
   * objetivo de la resolución de Reroll de dado en curso. No-op si no queda presupuesto. */
  pickRerollTarget: (targetSide: Side, poolIndex: number) => void;
  /** SPEC-023: aplica la resolución de Reroll de dado en curso (paga el coste, re-tira cada dado
   * elegido, consume los dados de Reroll marcados). No-op si no se ha elegido ningún objetivo. */
  confirmReroll: () => void;
  /** SPEC-023: resuelve los dados de Especial marcados (paga su coste si tiene, los consume) y deja
   * un aviso genérico en `resolveError` — placeholder sin efecto real de juego. */
  resolveSpecial: () => void;
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
  enemyTurn: () => void;
}

// Mantenimiento (SPEC-009/011/019/022, ahora disparado por SPEC-025 tras dos pases consecutivos en
// vez de por un botón "Nueva ronda" manual): re-tira dados (vacía pools/activaciones/rerolls), suma
// +2 recursos a cada bando (persisten) y roba hasta HAND_SIZE (si el mazo no llega, roba lo que
// haya). CONSERVA vida, escudos y KO. Deck-out (RR pg 22): se comprueba DESPUÉS de robar, solo si un
// bando queda sin mano Y sin mazo a la vez — primero el enemigo (Victoria), luego el jugador
// (Derrota), mismo orden que `computeOutcome`.
function runMaintenance(sides: Record<Side, SideState>): Pick<GameState, 'sides' | 'resolve' | 'resolveError' | 'lastEnemyAction' | 'outcome'> {
  const maintain = (side: Side, s: SideState): SideState => {
    const toDraw = Math.max(0, HAND_SIZE - s.hand.length);
    const drawn = s.drawPile.slice(0, toDraw);
    const drawPile = s.drawPile.slice(toDraw);
    const hand = [...s.hand, ...drawn];
    persistDrawPile(side, drawPile);
    persistHand(side, hand);
    return {
      ...s,
      pool: [],
      activated: [],
      // Resetea la activación de los apoyos en juego (SPEC-021), igual que la de personajes; los
      // apoyos en sí (`supports`) no se tocan, siguen en juego.
      supportsActivated: s.supports.map(() => false),
      rerollsUsed: { free: false, extra: 0 },
      resources: s.resources + 2,
      drawPile,
      hand,
    };
  };
  const nextSides: Record<Side, SideState> = {
    player: maintain('player', sides.player),
    enemy: maintain('enemy', sides.enemy),
  };
  const deckedOut = (s: SideState) => s.drawPile.length === 0 && s.hand.length === 0;
  const outcome: Outcome = deckedOut(nextSides.enemy) ? 'victory' : deckedOut(nextSides.player) ? 'defeat' : null;
  return {
    sides: nextSides,
    resolve: null,
    resolveError: null,
    lastEnemyAction: null,
    outcome,
  };
}

function initialSide(side: Side): SideState {
  const characters = loadPersistedDeck(side);
  return freshSide(
    characters,
    loadPersistedDrawPile(side),
    loadPersistedHand(side),
    loadPersistedUpgrades(side, characters.length),
    loadPersistedSupports(side),
    loadPersistedDiscardPile(side),
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
  mulligan: null,
  turn: 'player',
  passStreak: 0,
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
      // Pila de descarte vacía en cada (re)importación (SPEC-022).
      persistDiscardPile(side, []);
      // Reinicia el estado de partida de ESTE bando (vida completa) y recalcula el fin. Limpia
      // también playUpgrade/mulligan (SPEC-024) y turn/passStreak (SPEC-025): reimportar a mitad de
      // partida no debe dejar esos modos/turno abiertos apuntando a un estado que ya no corresponde.
      set((state) => {
        const sides = { ...state.sides, [side]: freshSide(characters, drawPile) };
        return {
          sides,
          resolve: null,
          resolveError: null,
          playUpgrade: null,
          mulligan: null,
          turn: 'player',
          passStreak: 0,
          outcome: computeOutcome(sides),
        };
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

  // "Nueva partida" (SPEC-024): reparte 5 cartas (o las que haya) a cada bando desde su mazo de
  // robo y abre el mulligan del jugador. Solo tiene sentido en estado fresco (mazo importado y
  // mano vacía en AMBOS bandos); la UI ya deshabilita el botón fuera de ese estado, pero el store
  // repite la comprobación por si acaso.
  startGame: () =>
    set((state) => {
      if (state.outcome !== null) return state;
      const fresh = (s: SideState) => s.characters.length > 0 && s.hand.length === 0;
      if (!fresh(state.sides.player) || !fresh(state.sides.enemy)) return state;

      const deal = (side: Side, s: SideState): SideState => {
        const hand = s.drawPile.slice(0, HAND_SIZE);
        const drawPile = s.drawPile.slice(HAND_SIZE);
        persistDrawPile(side, drawPile);
        persistHand(side, hand);
        return { ...s, drawPile, hand };
      };
      const sides: Record<Side, SideState> = {
        player: deal('player', state.sides.player),
        enemy: deal('enemy', state.sides.enemy),
      };
      return { sides, mulligan: { marked: [] }, resolveError: null };
    }),

  toggleMulliganCard: (handIndex: number) =>
    set((state) => {
      if (state.mulligan === null) return state;
      if (!state.sides.player.hand[handIndex]) return state;
      const marked = state.mulligan.marked.includes(handIndex)
        ? state.mulligan.marked.filter((i) => i !== handIndex)
        : [...state.mulligan.marked, handIndex];
      return { mulligan: { marked } };
    }),

  confirmMulligan: () =>
    set((state) => {
      const mode = state.mulligan;
      if (mode === null) return state;
      const s = state.sides.player;
      const returned = mode.marked.map((i) => s.hand[i]).filter((c): c is string => c !== undefined);
      const keptHand = s.hand.filter((_, i) => !mode.marked.includes(i));
      const drawPile = shuffle([...s.drawPile, ...returned]);
      const drawn = drawPile.slice(0, returned.length);
      const hand = [...keptHand, ...drawn];
      const finalDrawPile = drawPile.slice(returned.length);
      persistDrawPile('player', finalDrawPile);
      persistHand('player', hand);
      return {
        sides: { ...state.sides, player: { ...s, hand, drawPile: finalDrawPile } },
        mulligan: null,
      };
    }),

  activate: (side: Side, index: number) =>
    set((state) => {
      // Bloqueado si la partida ya terminó (SPEC-025: ninguna acción de turno tiene efecto).
      if (state.outcome !== null) return state;
      // Bloqueado mientras se espera el receptor del coste indirecto (SPEC-010, resolución atómica)
      // o se elige la cara de un dado en una resolución de Focus en curso (SPEC-023, ídem).
      if (state.resolve?.pendingEffect || state.resolve?.focusFaceChoice != null) return state;
      // Bloqueado mientras se elige objetivo para jugar una mejora (SPEC-020) o hay un mulligan
      // pendiente de confirmar (SPEC-024).
      if (state.playUpgrade !== null || state.mulligan !== null) return state;
      // Bloqueado fuera de tu turno, o si ya tienes un dado marcado sin resolver (SPEC-025): hay
      // que terminar o cancelar esa resolución antes de hacer otra cosa.
      if (state.turn !== side) return state;
      if (state.resolve !== null && state.resolve.side === side) return state;
      const s = state.sides[side];
      const character = s.characters[index];
      if (!character || s.activated[index]) return state;
      if (isKO(character, s.damage[index] ?? 0)) return state;
      const activated = s.activated.slice();
      activated[index] = true;
      // Las mejoras ligadas a este personaje (SPEC-020) tiran su dado junto con los suyos. Algunas
      // mejoras reales no tienen dado propio (texto puro): `card.sides` llega vacío/no-array desde
      // ARH DB, y la mejora simplemente no aporta ningún dado (bug detectado jugando SPEC-023: sin
      // este guard, activar el personaje anfitrión reventaba entero y no activaba nada).
      const upgradeDice = (s.upgrades[index] ?? []).flatMap((code) => {
        const card = readCache(code);
        if (!card || !Array.isArray(card.sides) || card.sides.length === 0) return [];
        return [rollUpgradeDie({ sides: [...card.sides] }, card.code, card.name, index)];
      });
      const pool = [...s.pool, ...rollCharacter(character, index), ...upgradeDice];
      // Activar es SIEMPRE una acción completa (SPEC-025): cierra el turno de `side`.
      return {
        sides: { ...state.sides, [side]: { ...s, activated, pool } },
        turn: opposite(side),
        passStreak: 0,
      };
    }),

  // "Pasar" (SPEC-025): cede el turno de `side` sin hacer nada. Dos pases consecutivos (uno de cada
  // bando, sin ninguna acción real entre medias) disparan el mantenimiento automático
  // (`runMaintenance`, misma lógica que antes tenía el botón manual "Nueva ronda") y reinician el
  // turno al jugador.
  pass: (side: Side) =>
    set((state) => {
      if (state.outcome !== null) return state;
      if (state.turn !== side) return state;
      // Mismo guard de exclusión mutua que el resto de acciones (SPEC-025): no tiene sentido pasar
      // con una acción a medio construir, hay que cancelarla primero.
      if (state.resolve !== null || state.playUpgrade !== null || state.mulligan !== null) return state;
      const passStreak = state.passStreak + 1;
      if (passStreak >= 2) {
        return { ...runMaintenance(state.sides), turn: 'player', passStreak: 0 };
      }
      return { turn: opposite(side), passStreak };
    }),

  // "Reset total" (SPEC-009): reconstruye ambos bandos a su estado inicial (vida completa, sin
  // escudos/KO, recursos a 2), conservando los personajes importados. El mazo de robo vuelve a su
  // composición completa original (drawPile + hand + mejoras + apoyos en juego, rebarajado,
  // SPEC-020/021) y la mano, mejoras y apoyos en juego quedan vacíos.
  resetAll: () =>
    set((state) => {
      const rebuild = (side: Side, s: SideState): SideState => {
        const drawPile = shuffle([
          ...s.drawPile,
          ...s.hand,
          ...s.upgrades.flat(),
          ...s.supports,
          ...s.discardPile,
        ]);
        persistDrawPile(side, drawPile);
        persistHand(side, []);
        persistUpgrades(side, emptyUpgrades(s.characters.length));
        persistSupports(side, []);
        persistDiscardPile(side, []);
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
        mulligan: null,
        turn: 'player',
        passStreak: 0,
        lastEnemyAction: null,
        outcome: computeOutcome(sides),
      };
    }),

  selectDie: (side: Side, poolIndex: number) =>
    set((state) => {
      if (state.outcome !== null) return state;
      // Bloqueado mientras se espera el receptor del coste indirecto (SPEC-010) o se elige la cara
      // de un dado en una resolución de Focus en curso (SPEC-023).
      if (state.resolve?.pendingEffect || state.resolve?.focusFaceChoice != null) return state;
      // Bloqueado mientras se elige objetivo para jugar una mejora (SPEC-020) o hay un mulligan
      // pendiente de confirmar (SPEC-024).
      if (state.playUpgrade !== null || state.mulligan !== null) return state;
      // Bloqueado fuera de tu turno (SPEC-025).
      if (state.turn !== side) return state;
      const die = state.sides[side].pool[poolIndex];
      if (!die) return state;
      const symbol = dieSymbol(die.face);
      // Caras no seleccionables (blanco, especial, focus, disrupt, descarte).
      if (symbol === null) return state;

      const cur = state.resolve;
      // Ya hay un modo abierto de otro bando/símbolo (SPEC-025): no se reemplaza, hay que cancelarlo
      // primero con "Cancelar" (marcar un dado bloquea el resto de acciones hasta resolver/cancelar).
      if (cur !== null && (cur.side !== side || cur.symbol !== symbol)) return state;
      // Sin modo: lo abre con este dado.
      if (cur === null) {
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
        const res =
          cur.symbol === 'focus'
            ? applyFocus(state.sides, cur.side, cur.marked, cur.focusPicks ?? [], index)
            : cur.symbol === 'reroll'
              ? applyRerollDice(state.sides, cur.side, cur.marked, cur.rerollTargets ?? [], index)
              : resolvePlayerBatch(state.sides, cur, cur.pendingEffect.effectIndex, index);
        if (res === null || res === 'no-base' || res === 'insufficient') return state; // no debería
        return {
          sides: res.sides,
          outcome: res.outcome,
          resolveError: null,
          ...afterApply(cur, res),
        };
      }

      // Recurso/especial se resuelven con su propio botón; focus/reroll con sus propias acciones
      // de elegir dado objetivo (SPEC-023) — ninguno de los cuatro usa el clic sobre un personaje.
      if (
        cur.symbol === 'resource' ||
        cur.symbol === 'special' ||
        cur.symbol === 'focus' ||
        cur.symbol === 'reroll'
      ) {
        return state;
      }

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
        resolveError: null,
        ...afterApply(cur, res),
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
        resolveError: null,
        ...afterApply(cur, res),
      };
    }),

  cancelResolve: () => set({ resolve: null, resolveError: null }),

  // Focus (SPEC-023): elegir dado objetivo (paso repetible hasta el presupuesto = suma de valores
  // de los dados de Focus marcados) → elegir su nueva cara → confirmar (paga coste, gira todos los
  // elegidos, consume los dados de Focus).
  pickFocusTarget: (poolIndex: number) =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.symbol !== 'focus') return state;
      // Bloqueado fuera de tu turno (SPEC-025): compara contra quién abrió la resolución, no contra
      // un `side` propio de esta acción (no lo tiene, el objetivo es un dado, no un bando).
      if (state.turn !== cur.side) return state;
      if (cur.pendingEffect || cur.focusFaceChoice != null) return state;
      if (cur.marked.length === 0 || cur.marked.includes(poolIndex)) return state;
      const picks = cur.focusPicks ?? [];
      if (picks.some((p) => p.poolIndex === poolIndex)) return state;
      const sums = sumPlayerMarked(state.sides[cur.side].pool, cur.marked);
      if (picks.length >= sums.baseAmount + sums.modifierAmount) return state;
      if (!state.sides[cur.side].pool[poolIndex]) return state;
      return { resolve: { ...cur, focusFaceChoice: poolIndex }, resolveError: null };
    }),

  chooseFocusFace: (face: string) =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.symbol !== 'focus') return state;
      // Bloqueado fuera de tu turno (SPEC-025).
      if (state.turn !== cur.side) return state;
      const poolIndex = cur.focusFaceChoice;
      if (poolIndex == null) return state;
      const die = state.sides[cur.side].pool[poolIndex];
      const sides = die ? poolDieSides(die) : null;
      if (!sides || !sides.includes(face)) return state;
      const focusPicks = [...(cur.focusPicks ?? []), { poolIndex, face }];
      return { resolve: { ...cur, focusPicks, focusFaceChoice: null }, resolveError: null };
    }),

  confirmFocus: () =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.symbol !== 'focus') return state;
      if (cur.pendingEffect || cur.focusFaceChoice != null) return state;
      const sums = sumPlayerMarked(state.sides[cur.side].pool, cur.marked);
      // Recorta a la suma de valores ACTUAL de los marcados (defensivo: si se desmarcó algún dado
      // de Focus fuente después de elegir objetivos, el presupuesto pudo haber bajado).
      const picks = (cur.focusPicks ?? []).slice(0, sums.baseAmount + sums.modifierAmount);
      if (picks.length === 0) return state;
      if (state.sides[cur.side].resources < sums.resourceCost) {
        return { resolveError: 'Recursos insuficientes para pagar el coste.' };
      }
      if (sums.indirectCost > 0) {
        return {
          resolve: { ...cur, focusPicks: picks, pendingEffect: { effectIndex: null } },
          resolveError: null,
        };
      }
      const res = applyFocus(state.sides, cur.side, cur.marked, picks, null);
      if (res === null || res === 'no-base' || res === 'insufficient') return state;
      return {
        sides: res.sides,
        outcome: res.outcome,
        resolveError: null,
        ...afterApply(cur, res),
      };
    }),

  // Reroll de dado (SPEC-023): elegir dados objetivo de cualquier pool (hasta el presupuesto =
  // suma de valores de los dados de Reroll marcados) → confirmar (paga coste, re-tira todos los
  // elegidos, consume los dados de Reroll).
  pickRerollTarget: (targetSide: Side, poolIndex: number) =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.symbol !== 'reroll') return state;
      // Bloqueado fuera de tu turno (SPEC-025): compara contra quién abrió la resolución
      // (`cur.side`), NO contra `targetSide` — a propósito puede ser el pool rival (SPEC-023).
      if (state.turn !== cur.side) return state;
      if (cur.pendingEffect) return state;
      if (targetSide === cur.side && cur.marked.includes(poolIndex)) return state;
      if (!state.sides[targetSide].pool[poolIndex]) return state;
      const targets = cur.rerollTargets ?? [];
      const already = targets.findIndex((t) => t.side === targetSide && t.poolIndex === poolIndex);
      if (already !== -1) {
        return { resolve: { ...cur, rerollTargets: targets.filter((_, i) => i !== already) }, resolveError: null };
      }
      const sums = sumPlayerMarked(state.sides[cur.side].pool, cur.marked);
      if (targets.length >= sums.baseAmount + sums.modifierAmount) return state;
      return { resolve: { ...cur, rerollTargets: [...targets, { side: targetSide, poolIndex }] }, resolveError: null };
    }),

  confirmReroll: () =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.symbol !== 'reroll') return state;
      if (cur.pendingEffect) return state;
      const sums = sumPlayerMarked(state.sides[cur.side].pool, cur.marked);
      // Recorta a la suma de valores ACTUAL de los marcados (mismo defensivo que confirmFocus).
      const targets = (cur.rerollTargets ?? []).slice(0, sums.baseAmount + sums.modifierAmount);
      if (targets.length === 0) return state;
      if (state.sides[cur.side].resources < sums.resourceCost) {
        return { resolveError: 'Recursos insuficientes para pagar el coste.' };
      }
      if (sums.indirectCost > 0) {
        return {
          resolve: { ...cur, rerollTargets: targets, pendingEffect: { effectIndex: null } },
          resolveError: null,
        };
      }
      const res = applyRerollDice(state.sides, cur.side, cur.marked, targets, null);
      if (res === null || res === 'no-base' || res === 'insufficient') return state;
      return {
        sides: res.sides,
        outcome: res.outcome,
        resolveError: null,
        ...afterApply(cur, res),
      };
    }),

  // Especial (SPEC-023): placeholder sin efecto real; paga coste si tiene, consume el/los dado(s)
  // marcados y deja un aviso genérico (reutiliza `resolveError`, no es un error real).
  resolveSpecial: () =>
    set((state) => {
      const cur = state.resolve;
      if (state.outcome !== null || cur === null || cur.symbol !== 'special') return state;
      if (cur.marked.length === 0 || cur.pendingEffect) return state;
      const sums = sumPlayerMarked(state.sides[cur.side].pool, cur.marked);
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
        resolveError: 'Habilidad especial de la carta (pendiente de implementar).',
        ...afterApply(cur, res),
      };
    }),

  selectUpgradeCard: (side: Side, code: string) =>
    set((state) => {
      if (state.outcome !== null) return state;
      // Bloqueado mientras se espera el receptor del coste indirecto (SPEC-010) o se elige la cara
      // de un dado en una resolución de Focus en curso (SPEC-023).
      if (state.resolve?.pendingEffect || state.resolve?.focusFaceChoice != null) return state;
      // Bloqueado mientras hay un mulligan pendiente de confirmar (SPEC-024).
      if (state.mulligan !== null) return state;
      // Bloqueado fuera de tu turno, o si ya tienes un dado marcado sin resolver (SPEC-025).
      if (state.turn !== side) return state;
      if (state.resolve !== null && state.resolve.side === side) return state;
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
        // Sale del modo "elige objetivo" al fallar (igual que Cancelar): si no, el jugador queda
        // bloqueado (Activar deshabilitado) hasta cancelar a mano o conseguir recursos (bug
        // detectado jugando SPEC-020/021). La carta sigue en la mano para reintentarlo luego.
        return { playUpgrade: null, resolveError: 'Recursos insuficientes para jugar esta carta.' };
      }
      const handIndex = s.hand.indexOf(mode.code);
      if (handIndex === -1) return { playUpgrade: null };
      const hand = s.hand.slice();
      hand.splice(handIndex, 1);
      const upgrades = s.upgrades.map((codes, i) => (i === characterIndex ? [...codes, mode.code] : codes));
      persistHand(mode.side, hand);
      persistUpgrades(mode.side, upgrades);
      // Jugar la mejora con éxito es SIEMPRE una acción completa (SPEC-025): cierra el turno.
      return {
        sides: { ...state.sides, [mode.side]: { ...s, hand, upgrades, resources: s.resources - cost } },
        playUpgrade: null,
        resolveError: null,
        turn: opposite(mode.side),
        passStreak: 0,
      };
    }),

  cancelPlayUpgrade: () => set({ playUpgrade: null, resolveError: null }),

  playSupport: (side: Side, code: string) =>
    set((state) => {
      if (state.outcome !== null) return state;
      // Mismos guards de exclusión mutua que jugar una mejora (SPEC-020/021/023/024).
      if (state.resolve?.pendingEffect || state.resolve?.focusFaceChoice != null) return state;
      if (state.playUpgrade !== null || state.mulligan !== null) return state;
      // Bloqueado fuera de tu turno, o si ya tienes un dado marcado sin resolver (SPEC-025).
      if (state.turn !== side) return state;
      if (state.resolve !== null && state.resolve.side === side) return state;
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
      // Jugar el apoyo con éxito es SIEMPRE una acción completa (SPEC-025): cierra el turno.
      return {
        sides: { ...state.sides, [side]: { ...s, hand, supports, supportsActivated, resources: s.resources - cost } },
        resolveError: null,
        turn: opposite(side),
        passStreak: 0,
      };
    }),

  activateSupport: (side: Side, index: number) =>
    set((state) => {
      // Bloqueado si la partida ya terminó (SPEC-025: ninguna acción de turno tiene efecto).
      if (state.outcome !== null) return state;
      // Mismos guards de exclusión mutua que activar un personaje (SPEC-020/021/023/024).
      if (state.resolve?.pendingEffect || state.resolve?.focusFaceChoice != null) return state;
      if (state.playUpgrade !== null || state.mulligan !== null) return state;
      // Bloqueado fuera de tu turno, o si ya tienes un dado marcado sin resolver (SPEC-025).
      if (state.turn !== side) return state;
      if (state.resolve !== null && state.resolve.side === side) return state;
      const s = state.sides[side];
      const code = s.supports[index];
      if (!code || s.supportsActivated[index]) return state;
      const card = readCache(code);
      if (!card) return state;
      const supportsActivated = s.supportsActivated.slice();
      supportsActivated[index] = true;
      // Algunos apoyos reales no tienen dado propio (BACKLOG); marca el apoyo activado igual, pero
      // sin tirar ni añadir ningún dado al pool (mismo guard que las mejoras, ver `activate`).
      const hasDie = Array.isArray(card.sides) && card.sides.length > 0;
      const pool = hasDie ? [...s.pool, rollUpgradeDie({ sides: [...card.sides] }, card.code, card.name, -1)] : s.pool;
      // Activar un apoyo es SIEMPRE una acción completa (SPEC-025): cierra el turno.
      return {
        sides: { ...state.sides, [side]: { ...s, supportsActivated, pool } },
        turn: opposite(side),
        passStreak: 0,
      };
    }),

  // Turno del autómata (GDD §4): evalúa la tabla de prioridades (motor puro en game/automaton)
  // y ejecuta como máximo UNA acción por invocación, reutilizando resolvePlayerBatch/activate
  // (SPEC-013: el autómata combina modificadores y paga costes igual que el jugador). Desde
  // SPEC-025, cada invocación es un turno real del enemigo (ya no hay botón "Turno enemigo": se
  // dispara automáticamente, ver App.tsx, cuando `turn === 'enemy'`); cada acción (o pase) cierra
  // el turno igual que las del jugador.
  enemyTurn: () => {
    const state = get();
    if (state.outcome !== null) return;
    if (state.turn !== 'enemy') return;
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
      pool: player.pool,
    };
    const extraRerolls = DIFFICULTY_SETTINGS[state.difficulty].extraRerolls;
    const action = nextAutomatonAction(
      automatonEnemy,
      automatonPlayer,
      enemy.rerollsUsed,
      extraRerolls,
      poolDieSides,
    );

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
        // Toda acción del autómata cierra su turno (SPEC-025): aplicado en el wrapper, no rama por
        // rama, para no olvidar ninguna (p. ej. reroll de blancos, ver más abajo).
        set({ turn: 'player', passStreak: 0 });
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
            outcome: res.outcome,
            lastEnemyAction: `El enemigo aplica ${label} a ${target.name} (${total} de escudo).`,
          };
        });
        set({ turn: 'player', passStreak: 0 });
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
            outcome: res.outcome,
            lastEnemyAction: `El enemigo resuelve ${label} (+${total} recurso).`,
          };
        });
        set({ turn: 'player', passStreak: 0 });
        return;
      }
      case 'focus': {
        const label = batchLabel(action.dieIndices);
        set((s) => {
          const res = applyFocus(s.sides, 'enemy', action.dieIndices, action.targets, action.costReceiverIndex);
          if (res === null || res === 'no-base' || res === 'insufficient') return s;
          return {
            sides: res.sides,
            outcome: res.outcome,
            lastEnemyAction: `El enemigo usa focus (${label}) y gira ${action.targets.length} dado(s) propio(s).`,
          };
        });
        set({ turn: 'player', passStreak: 0 });
        return;
      }
      case 'rerollDice': {
        const label = batchLabel(action.dieIndices);
        set((s) => {
          const res = applyRerollDice(s.sides, 'enemy', action.dieIndices, action.targets, action.costReceiverIndex);
          if (res === null || res === 'no-base' || res === 'insufficient') return s;
          return {
            sides: res.sides,
            outcome: res.outcome,
            lastEnemyAction: `El enemigo usa reroll de dado (${label}) sobre ${action.targets.length} dado(s) del jugador.`,
          };
        });
        set({ turn: 'player', passStreak: 0 });
        return;
      }
      case 'special': {
        const label = batchLabel(action.dieIndices);
        set((s) => {
          const res = resolvePlayerBatch(
            s.sides,
            { side: 'enemy', symbol: 'special', marked: action.dieIndices },
            null,
            action.costReceiverIndex,
          );
          if (res === null || res === 'no-base' || res === 'insufficient') return s;
          return {
            sides: res.sides,
            outcome: res.outcome,
            lastEnemyAction: `El enemigo resuelve ${label} (habilidad especial, pendiente de implementar).`,
          };
        });
        set({ turn: 'player', passStreak: 0 });
        return;
      }
      case 'reroll': {
        set((s) => {
          const e = s.sides.enemy;
          // Busca la definición del dado por `code` vía caché (SPEC-023), no por characterIndex:
          // los dados de mejora/apoyo (characterIndex -1 o compartido con su anfitrión) rompían
          // aquí antes (bug detectado por revisor-specs al revisar SPEC-023).
          const pool = e.pool.map((d, i) => {
            if (!action.dieIndices.includes(i)) return d;
            const sides = poolDieSides(d);
            return sides ? { ...d, face: rollDie({ sides: [...sides] }) } : d;
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
        // El reroll de blancos SÍ cuenta como acción real (cierra el turno): es fácil de pasar por
        // alto porque no aparece nombrado junto a daño/escudo/activar/recurso/focus/reroll(dado)/
        // especial, pero es una fila más de la tabla de prioridades (GDD §4, prioridad 5).
        set({ turn: 'player', passStreak: 0 });
        return;
      }
      case 'pass':
        // Reutiliza el mismo contador de pases que usa el jugador (SPEC-025); el mensaje se fija
        // DESPUÉS para que no lo pise un posible mantenimiento automático (que pone
        // lastEnemyAction: null).
        get().pass('enemy');
        set({ lastEnemyAction: 'El enemigo pasa.' });
        return;
    }
  },
}));

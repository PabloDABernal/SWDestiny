import type { Character } from '../model/types';
import type { PooledDie } from './roll';
import type { SideView } from './outcome';
import {
  parsePlayerFace,
  resolveShieldedDamage,
  currentHealth,
  isKO,
  MAX_SHIELDS,
  type DieSymbol,
} from './damage';
import { LUMINARA_CODE, VADER_CODE, abilityWithTrigger } from './characterAbilities';
import { getCardFromSnapshot } from '../data/cards';

/** Vista del bando del jugador que necesita el autómata para el margen "sin overkill" (SPEC-014):
 * sus escudos absorben antes que la vida, así que el margen real es escudos + vida restante. */
export interface AutomatonOpponent extends SideView {
  shields: number[];
  /** Pool del rival (SPEC-023): permite al autómata elegir qué dado del jugador anular con Reroll
   * de dado. Solo se lee para candidatos de daño sin resolver; no se muta desde aquí. */
  pool: PooledDie[];
}

/** Nivel de dificultad elegido por el jugador (SPEC-015), controla las trampas del autómata. */
export type Difficulty = 'easy' | 'normal' | 'hard';

export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

/** Trampas del autómata enemigo (GDD §4) por nivel de dificultad. */
export const DIFFICULTY_SETTINGS: Record<Difficulty, { healthMultiplier: number; extraRerolls: number }> = {
  easy: { healthMultiplier: 1, extraRerolls: 0 },
  normal: { healthMultiplier: 1.5, extraRerolls: 1 },
  hard: { healthMultiplier: 2, extraRerolls: 2 },
};

/** Aplica la trampa de vida multiplicada. Redondeo siempre hacia arriba (favorece al enemigo). */
export function applyEnemyHealthMultiplier(characters: Character[], multiplier: number): Character[] {
  return characters.map((c) => ({
    ...c,
    health: Math.ceil(c.health * multiplier),
  }));
}

/** Vista del bando enemigo que necesita el autómata para decidir su acción. */
export interface AutomatonSide extends SideView {
  activated: boolean[];
  pool: PooledDie[];
  /** Escudos acumulados por instancia (SPEC-005), necesarios para el receptor de coste indirecto. */
  shields: number[];
  /** Recursos del bando (SPEC-006), para comprobar qué tandas puede pagar (SPEC-013). */
  resources: number;
}

/** Cuántos rerolls ha gastado el enemigo esta "ronda" (ver reset() en el store). */
export interface RerollsUsed {
  free: boolean;
  extra: number;
}

/** Un dado propio girado por Focus a la cara elegida (SPEC-023). */
export interface FocusTarget {
  poolIndex: number;
  face: string;
}

/** Un dado (de cualquier pool) elegido como objetivo de Reroll de dado (SPEC-023). */
export interface RerollDieTarget {
  side: 'enemy' | 'player';
  poolIndex: number;
}

export type AutomatonAction =
  | {
      type: 'attack';
      dieIndices: number[];
      targetIndex: number;
      /** Receptor del coste de daño indirecto propio (SPEC-013), o null si la tanda no tiene coste. */
      costReceiverIndex: number | null;
    }
  | {
      /** Ataque de daño indirecto (◎) del autómata (SPEC-028): a diferencia de 'attack', no elige
       * objetivo — el jugador reparte el valor resultante clic a clic entre sus propios personajes. */
      type: 'indirectAttack';
      dieIndices: number[];
      costReceiverIndex: number | null;
    }
  | { type: 'shield'; dieIndices: number[]; targetIndex: number; costReceiverIndex: number | null }
  | { type: 'activate'; index: number }
  | { type: 'resource'; dieIndices: number[]; costReceiverIndex: number | null }
  | {
      /** Disrupt (SPEC-029): sin objetivo de personaje, afecta al bando contrario entero. */
      type: 'disrupt';
      dieIndices: number[];
      costReceiverIndex: number | null;
    }
  | {
      /** Descarte (SPEC-029): sin objetivo de personaje, afecta al bando contrario entero. */
      type: 'discard';
      dieIndices: number[];
      costReceiverIndex: number | null;
    }
  | { type: 'focus'; dieIndices: number[]; targets: FocusTarget[]; costReceiverIndex: number | null }
  | { type: 'rerollDice'; dieIndices: number[]; targets: RerollDieTarget[]; costReceiverIndex: number | null }
  | {
      /** Especial (SPEC-023/039): un único dado por acción, nunca varios combinados (cada Especial
       * es un efecto propio de carta, no un símbolo sumable) ni de dueños distintos. */
      type: 'special';
      dieIndices: number[];
      costReceiverIndex: number | null;
      /** Código de la carta dueña del dado (SPEC-039): decide qué efecto real aplica; si no está en
       * `KNOWN_SPECIAL_CODES`, se resuelve como el placeholder ya existente. */
      ownerCode: string;
      /** Luminara: índice en el pool del dado propio elegido para el +2/+3 (solo entre daño
       * melee/ranged y recurso, ver `bestLuminaraTargetForAutomaton`), o null si no hay ninguno
       * elegible (se resuelve sin efecto, igual que el jugador sin objetivo). */
      luminaraTargetPoolIndex?: number | null;
      /** Vader: objetivo del 3 de daño (rival vivo de menor vida, o propio si no hay rival vivo),
       * o null si no hay ningún personaje vivo al que atacar (no debería ocurrir en partida). */
      vaderTarget?: { side: 'enemy' | 'player'; index: number } | null;
    }
  | {
      /** Habilidad `Action -` de un personaje (SPEC-042). Va al final de la tabla de prioridades,
       * justo antes del reroll de blancos: es un recurso para cuando no hay nada mejor. */
      type: 'characterAbility';
      index: number;
    }
  | { type: 'reroll'; dieIndices: number[]; kind: 'free' | 'extra' }
  | { type: 'pass' };

/** Índice del primer personaje del autómata con una habilidad `Action -` que pueda usar ahora mismo
 *  (SPEC-042), o null. Criterio conservador:
 *  - nunca si el daño que se hace a sí mismo lo dejaría KO (Nightsister con 1 de vida),
 *  - "retira este dado" exige tenerlo en el pool,
 *  - las de reroll piden algún dado en blanco que arreglar; la de girar un dado de apoyo (Veers)
 *    pide tener un dado de apoyo en el pool, y lo gira a su mejor cara con la MISMA prioridad que su
 *    Focus automático (daño > escudo > recurso), decisión del usuario del 2026-08-03. */
export function usableActionAbilityIndex(enemy: AutomatonSide): number | null {
  for (let i = 0; i < enemy.characters.length; i++) {
    const c = enemy.characters[i];
    const damage = enemy.damage[i] ?? 0;
    if (damage >= c.health) continue; // KO
    const ability = abilityWithTrigger(c.code, 'action');
    if (!ability) continue;
    if (ability.targeting.kind !== 'reroll' && ability.targeting.kind !== 'turnSupportDie') continue;
    if (ability.selfDamage && damage + ability.selfDamage >= c.health) continue; // se suicidaría
    if (ability.removesOwnDie && !enemy.pool.some((d) => d.characterIndex === i)) continue;
    if (ability.targeting.kind === 'reroll' && blankDieIndices(enemy.pool).length === 0) continue;
    if (ability.targeting.kind === 'turnSupportDie' && !hasImprovableSupportDie(enemy)) continue;
    return i;
  }
  return null;
}

/** ¿Tiene el autómata algún dado de apoyo en el pool que MEJORE al girarlo? (SPEC-042, Veers).
 *  "Mejora" con el mismo criterio que su Focus: que su mejor cara valga más que la que muestra. */
function hasImprovableSupportDie(enemy: AutomatonSide): boolean {
  return enemy.pool.some((d) => {
    if (getCardFromSnapshot(d.code)?.type_code !== 'support') return false;
    const sides = poolDieSidesFor(d);
    if (!sides) return false;
    const best = bestFocusFace(sides);
    if (best === null) return false;
    const actual = parsePlayerFace(d.face);
    const mejor = parsePlayerFace(best);
    return (mejor?.amount ?? 0) > (actual?.amount ?? 0);
  });
}

/** Las 6 caras reales de un dado del pool, buscadas por código en el snapshot. */
function poolDieSidesFor(d: PooledDie): string[] | null {
  const sides = getCardFromSnapshot(d.code)?.sides;
  return Array.isArray(sides) && sides.length > 0 ? sides : null;
}

function isBlank(face: string): boolean {
  return face === '-';
}

/** Índice del personaje no-KO, sin activar, con mayor vida restante; -1 si no hay ninguno. */
function highestHealthActivatableIndex(side: AutomatonSide): number {
  let best = -1;
  for (let i = 0; i < side.characters.length; i++) {
    const c = side.characters[i];
    const dmg = side.damage[i] ?? 0;
    if (side.activated[i] || isKO(c, dmg)) continue;
    if (best === -1 || currentHealth(c, dmg) > currentHealth(side.characters[best], side.damage[best] ?? 0)) {
      best = i;
    }
  }
  return best;
}

function blankDieIndices(pool: PooledDie[]): number[] {
  return pool.reduce<number[]>((acc, die, i) => {
    if (isBlank(die.face)) acc.push(i);
    return acc;
  }, []);
}

/** Resultado de combinar los dados de un símbolo del autómata (SPEC-013). */
interface AutomatonBatch {
  dieIndices: number[];
  resourceCost: number;
  indirectCost: number;
}

/**
 * Junta los dados del pool cuyo símbolo cumple `matchesSymbol` (base + modificadores `+X`, más los
 * modificadores genéricos `+X*` si `allowGeneric` es true — SPEC-027), ordenados de mayor a menor
 * valor, incluyendo cada uno mientras el coste de recurso acumulado siga siendo pagable con
 * `resources`; el primero que no quepa se salta (sigue probando el resto) y queda fuera de la tanda
 * (SPEC-013). Si `allowIndirect` es false, los candidatos con coste de daño indirecto propio
 * (`…i<n>`) no se consideran en absoluto (fuera de alcance para escudo/recurso).
 * Devuelve `null` si no queda ningún dado **base** en la tanda resultante (un modificador solo no
 * se resuelve, igual que en la regla del jugador desde SPEC-010).
 */
function combineAutomatonBatch(
  pool: PooledDie[],
  matchesSymbol: (symbol: DieSymbol | null) => boolean,
  resources: number,
  allowIndirect: boolean,
  allowGeneric = true,
): AutomatonBatch | null {
  const candidates = pool
    .map((die, i) => ({ i, face: parsePlayerFace(die.face) }))
    .filter(
      (c): c is { i: number; face: NonNullable<ReturnType<typeof parsePlayerFace>> } =>
        c.face !== null &&
        (c.face.isGenericModifier ? allowGeneric : matchesSymbol(c.face.symbol)) &&
        (allowIndirect || c.face.indirectCost === 0),
    )
    .sort((a, b) => b.face.amount - a.face.amount);

  const dieIndices: number[] = [];
  let resourceCost = 0;
  let indirectCost = 0;
  let hasBase = false;

  for (const c of candidates) {
    if (resourceCost + c.face.resourceCost > resources) continue;
    dieIndices.push(c.i);
    resourceCost += c.face.resourceCost;
    indirectCost += c.face.indirectCost;
    if (!c.face.isModifier) hasBase = true;
  }

  if (!hasBase) return null;
  return { dieIndices, resourceCost, indirectCost };
}

/**
 * Receptor del coste de daño indirecto propio: de los personajes no-KO, prioriza los que
 * sobrevivirían al coste (escudos absorbiendo primero); entre esos, el que ya tenga escudos
 * (empate: más vida); si ninguno tiene escudos, el de más vida entre los que sobrevivirían; si el
 * coste mataría a cualquiera, el de más vida como última opción. Desempates deterministas (menor
 * índice), igual que el resto del autómata. -1 si no hay ningún no-KO.
 *
 * Usado originalmente solo por el autómata (SPEC-013, GDD §4); reutilizado también para el propio
 * jugador (corrección de SPEC-010, 2026-07-24): "indirecto" significa que el propio jugador no
 * elige el receptor, se determina solo, igual que ya hacía el autómata consigo mismo.
 */
export function indirectCostReceiverIndex(side: AutomatonSide, cost: number): number {
  let bestSurvivorWithShield = -1;
  let bestSurvivor = -1;
  let bestAny = -1;

  const higherHealth = (a: number, b: number) =>
    currentHealth(side.characters[a], side.damage[a] ?? 0) >
    currentHealth(side.characters[b], side.damage[b] ?? 0);

  for (let i = 0; i < side.characters.length; i++) {
    const c = side.characters[i];
    const dmg = side.damage[i] ?? 0;
    if (isKO(c, dmg)) continue;

    if (bestAny === -1 || higherHealth(i, bestAny)) bestAny = i;

    const shields = side.shields[i] ?? 0;
    const { healthDamage } = resolveShieldedDamage(shields, cost);
    const survives = dmg + healthDamage < c.health;
    if (!survives) continue;

    if (bestSurvivor === -1 || higherHealth(i, bestSurvivor)) bestSurvivor = i;
    if (shields > 0 && (bestSurvivorWithShield === -1 || higherHealth(i, bestSurvivorWithShield))) {
      bestSurvivorWithShield = i;
    }
  }

  if (bestSurvivorWithShield !== -1) return bestSurvivorWithShield;
  if (bestSurvivor !== -1) return bestSurvivor;
  return bestAny;
}

/**
 * Reparto automático de un valor de **daño entrante** (SPEC-026, símbolo ◎ daño indirecto: por
 * regla real lo reparte el defensor, no quien ataca) entre los personajes no-KO de `side`, evitando
 * KOs innecesarios cuando sea posible — mismo espíritu "sin overkill" que `pickTargetAndBatch`/
 * `capBatchToMargin` (SPEC-014), pero repartiendo un valor YA fijo entre varios objetivos en vez de
 * elegir qué dados propios resolver.
 *
 * Algoritmo: por cada no-KO, calcula cuánto podría absorber sin quedar KO (escudos + vida restante
 * menos 1); reparte el valor total empezando por el que más puede absorber (para concentrar el daño
 * en el "más tanque" y no repartir KOs de más), hasta agotar el valor o los candidatos. Si el valor
 * total supera lo que TODOS juntos pueden absorber sin KO, el resto (inevitable) se concentra en el
 * candidato con menos capacidad (ya iba a acabar peor parado), en vez de repartir la muerte entre
 * varios. Desempates deterministas (menor índice), igual que el resto del autómata.
 */
export function distributeIncomingDamage(
  side: AutomatonSide,
  totalValue: number,
): { targetIndex: number; amount: number }[] {
  const survivableCap = (i: number): number => {
    const c = side.characters[i];
    const dmg = side.damage[i] ?? 0;
    return (side.shields[i] ?? 0) + (c.health - dmg - 1);
  };
  const higherCap = (a: number, b: number) => survivableCap(a) > survivableCap(b);

  const candidates = side.characters
    .map((_, i) => i)
    .filter((i) => !isKO(side.characters[i], side.damage[i] ?? 0))
    .sort((a, b) => (higherCap(a, b) ? -1 : higherCap(b, a) ? 1 : a - b));

  const assignments: { targetIndex: number; amount: number }[] = [];
  let remaining = totalValue;
  for (const i of candidates) {
    if (remaining <= 0) break;
    const amount = Math.min(remaining, Math.max(0, survivableCap(i)));
    if (amount > 0) {
      assignments.push({ targetIndex: i, amount });
      remaining -= amount;
    }
  }
  if (remaining > 0 && candidates.length > 0) {
    // Inevitable: al menos uno queda KO. Se concentra en el de menor capacidad (último candidato),
    // en vez de repartir el exceso entre varios.
    const last = candidates[candidates.length - 1];
    const existing = assignments.find((a) => a.targetIndex === last);
    if (existing) existing.amount += remaining;
    else assignments.push({ targetIndex: last, amount: remaining });
  }
  return assignments;
}

const isDamageSymbol = (s: DieSymbol | null) => s === 'melee' || s === 'ranged' || s === 'indirect';
// SPEC-028: fila 1 de la tabla de prioridades separa indirecto (el jugador reparte) de melee/ranged
// (el propio autómata elige objetivo, sin cambios). `isDamageSymbol` de arriba sigue agrupando los
// tres para los demás usos que no cambian con esta spec (mejor cara de Focus, candidatos de Reroll
// de dado sobre el jugador).
const isMeleeRangedSymbol = (s: DieSymbol | null) => s === 'melee' || s === 'ranged';
const isIndirectSymbol = (s: DieSymbol | null) => s === 'indirect';
const isShieldSymbol = (s: DieSymbol | null) => s === 'shield';
const isResourceSymbol = (s: DieSymbol | null) => s === 'resource';
const isDisruptSymbol = (s: DieSymbol | null) => s === 'disrupt';
const isDiscardSymbol = (s: DieSymbol | null) => s === 'discard';
const isFocusSymbol = (s: DieSymbol | null) => s === 'focus';
const isRerollDieSymbol = (s: DieSymbol | null) => s === 'reroll';

/** Mejor cara disponible de un dado candidato para Focus (SPEC-023): sigue la misma prioridad que
 * el resto de la tabla (daño > escudo > recurso). null si ninguna de sus 6 caras mejora nada. */
export function bestFocusFace(sides: string[]): string | null {
  let bestDamage: { face: string; amount: number } | null = null;
  let bestShield: { face: string; amount: number } | null = null;
  let bestResource: { face: string; amount: number } | null = null;
  for (const face of sides) {
    const p = parsePlayerFace(face);
    if (!p || p.isModifier) continue;
    if (isDamageSymbol(p.symbol) && (!bestDamage || p.amount > bestDamage.amount)) {
      bestDamage = { face, amount: p.amount };
    } else if (isShieldSymbol(p.symbol) && (!bestShield || p.amount > bestShield.amount)) {
      bestShield = { face, amount: p.amount };
    } else if (isResourceSymbol(p.symbol) && (!bestResource || p.amount > bestResource.amount)) {
      bestResource = { face, amount: p.amount };
    }
  }
  return (bestDamage ?? bestShield ?? bestResource)?.face ?? null;
}

/** Índices de personajes no-KO que cumplen `filter`, ordenados de menor a mayor vida restante
 * (desempate determinista: mismo índice de partida gana por ser el primero, `sort` es estable). */
function ascendingHealthCandidates(
  characters: Character[],
  damage: number[],
  filter: (i: number) => boolean,
): number[] {
  return characters
    .map((_, i) => i)
    .filter((i) => !isKO(characters[i], damage[i] ?? 0) && filter(i))
    .sort((a, b) => currentHealth(characters[a], damage[a] ?? 0) - currentHealth(characters[b], damage[b] ?? 0));
}

/** Mejor dado propio para el +2/+3 de Luminara (SPEC-039), limitado a **recurso**: a diferencia del
 * jugador (que puede elegir cualquier dado con valor numérico, incluido daño/escudo/focus/reroll/
 * disrupt/descarte), el autómata solo considera recurso — el único caso que se puede aplicar de
 * inmediato sin decidir además un personaje/dado objetivo propio nuevo (daño/escudo necesitarían su
 * propia elección de objetivo; focus/reroll/disrupt/descarte, un paso interactivo adicional).
 * Decisión de implementación para mantener la heurística del autómata simple y de una sola pasada;
 * documentado explícitamente para no leerse como una limitación del efecto en sí (el jugador sí
 * puede aplicarlo a cualquier símbolo). -1 si no hay ningún dado de recurso elegible. */
export function bestLuminaraTargetForAutomaton(pool: PooledDie[], excludeIndex: number): number {
  let best = -1;
  let bestAmount = -1;
  pool.forEach((d, i) => {
    if (i === excludeIndex) return;
    const p = parsePlayerFace(d.face);
    if (!p || p.isModifier || p.symbol !== 'resource') return;
    // Corrección (2026-07-27): texto real de Luminara es "one of your character dice" — un dado de
    // mejora/apoyo no cuenta como objetivo (revertido tras detectarlo jugando, ver SPEC-039).
    if (getCardFromSnapshot(d.code)?.type_code !== 'character') return;
    if (p.amount > bestAmount) {
      bestAmount = p.amount;
      best = i;
    }
  });
  return best;
}

/** Objetivo del 3 de daño de Vader (SPEC-039): rival vivo de menor vida; si no hay ningún rival vivo,
 * el propio de menor vida (mismo criterio que el resto de daño automático); null si no hay ninguno
 * vivo en ningún bando (no debería ocurrir con la partida en curso). */
function bestVaderTarget(
  enemy: AutomatonSide,
  player: AutomatonOpponent,
): { side: 'enemy' | 'player'; index: number } | null {
  const rivalCandidates = ascendingHealthCandidates(player.characters, player.damage, () => true);
  if (rivalCandidates.length > 0) return { side: 'player', index: rivalCandidates[0] };
  const ownCandidates = ascendingHealthCandidates(enemy.characters, enemy.damage, () => true);
  if (ownCandidates.length > 0) return { side: 'enemy', index: ownCandidates[0] };
  return null;
}

/** Recorta `dieIndices` (ya ordenados de mayor a menor valor) al prefijo que no supere `margin`,
 * saltando (sin descartar) los que no quepan y siguiendo con el resto (SPEC-014). */
function capBatchToMargin(
  pool: PooledDie[],
  dieIndices: number[],
  margin: number,
): { indices: number[]; hasBase: boolean } {
  const indices: number[] = [];
  let total = 0;
  let hasBase = false;
  for (const i of dieIndices) {
    const face = parsePlayerFace(pool[i].face)!;
    if (total + face.amount > margin) continue;
    indices.push(i);
    total += face.amount;
    if (!face.isModifier) hasBase = true;
  }
  return { indices, hasBase };
}

function batchIndirectCost(pool: PooledDie[], dieIndices: number[]): number {
  return dieIndices.reduce((sum, i) => sum + (parsePlayerFace(pool[i].face)?.indirectCost ?? 0), 0);
}

/** Suma de valores ("cuántos dados puedo girar/rerollear") de una tanda ya combinada (SPEC-023). */
function batchAmountTotal(pool: PooledDie[], dieIndices: number[]): number {
  return dieIndices.reduce((sum, i) => sum + (parsePlayerFace(pool[i].face)?.amount ?? 0), 0);
}

/** Dados propios sin resolver (excluidos los de la propia tanda de Focus) que Focus puede mejorar,
 * ordenados por mayor mejora primero y desempate por posición en el pool (SPEC-023). */
function focusCandidates(
  pool: PooledDie[],
  excludeIndices: Set<number>,
  dieSidesOf: (die: PooledDie) => string[] | null,
): FocusTarget[] {
  const out: (FocusTarget & { amount: number })[] = [];
  pool.forEach((d, i) => {
    if (excludeIndices.has(i)) return;
    const sides = dieSidesOf(d);
    if (!sides) return;
    const face = bestFocusFace(sides);
    // Sin mejora real si ya muestra su mejor cara (revisor-codigo, SPEC-023): girar al mismo valor
    // no es una acción legal, ni gasta el presupuesto en un giro sin efecto.
    if (!face || face === d.face) return;
    out.push({ poolIndex: i, face, amount: parsePlayerFace(face)?.amount ?? 0 });
  });
  out.sort((a, b) => b.amount - a.amount || a.poolIndex - b.poolIndex);
  return out.map(({ poolIndex, face }) => ({ poolIndex, face }));
}

/** Dados de daño del jugador sin resolver, de mayor a menor cantidad (desempate por posición en el
 * pool), candidatos a que el autómata los anule con Reroll de dado (SPEC-023). */
function playerDamageDieCandidates(pool: PooledDie[]): number[] {
  return pool
    .map((d, i) => ({ i, face: parsePlayerFace(d.face) }))
    .filter(
      (c): c is { i: number; face: NonNullable<ReturnType<typeof parsePlayerFace>> } =>
        c.face !== null && isDamageSymbol(c.face.symbol),
    )
    .sort((a, b) => b.face.amount - a.face.amount || a.i - b.i)
    .map((c) => c.i);
}

/**
 * Elige el objetivo y el subconjunto de `dieIndices` para esta pulsación (SPEC-014): recorre
 * `candidates` (orden de mayor prioridad primero) y se queda con el primero que acepte al menos un
 * dado base sin superar su margen (`marginFor`); si ninguno acepta nada, usa el primer candidato con
 * la tanda completa (overkill inevitable, un dado no se divide).
 */
function pickTargetAndBatch(
  pool: PooledDie[],
  dieIndices: number[],
  candidates: number[],
  marginFor: (candidateIndex: number) => number,
): { targetIndex: number; dieIndices: number[] } | null {
  if (candidates.length === 0) return null;
  for (const targetIndex of candidates) {
    const capped = capBatchToMargin(pool, dieIndices, marginFor(targetIndex));
    if (capped.hasBase) return { targetIndex, dieIndices: capped.indices };
  }
  return { targetIndex: candidates[0], dieIndices };
}

/**
 * Evalúa la tabla de prioridades del GDD §4 de arriba abajo y devuelve la primera acción legal.
 * Función pura: no tira dados ni muta estado; quien la llama ejecuta la acción devuelta
 * reutilizando `resolvePlayerBatch`/`activate` del store (SPEC-002/003/010/013) o rerolleando los
 * índices dados.
 */
export function nextAutomatonAction(
  enemy: AutomatonSide,
  player: AutomatonOpponent,
  rerollsUsed: RerollsUsed,
  extraRerolls: number,
  /** Las 6 caras del dado (para elegir la mejor cara al girar con Focus, SPEC-023), o null si no se
   * encuentra su definición. Inyectado para mantener esta función pura y testeable sin depender de
   * la caché de cartas (`readCache`) del store. */
  dieSidesOf: (die: PooledDie) => string[] | null = () => null,
): AutomatonAction {
  const hasNonKoAlly = enemy.characters.some((c, i) => !isKO(c, enemy.damage[i] ?? 0));

  // 1. Daño combinado (base + modificadores, pagando coste de recurso). Indirecto (◎) se comprueba
  // PRIMERO (SPEC-028, decisión del usuario): si hay una tanda combinable de indirecto, no elige
  // objetivo el propio autómata — el jugador reparte el valor resultante (store). Si no hay tanda de
  // indirecto, sigue con melee/ranged como hasta ahora (reparto sin overkill entre los jugadores de
  // menos vida si hace falta más de una pulsación, SPEC-013/014).
  const indirectBatch = combineAutomatonBatch(enemy.pool, isIndirectSymbol, enemy.resources, hasNonKoAlly);
  if (indirectBatch !== null) {
    const costReceiverIndex =
      indirectBatch.indirectCost > 0 ? indirectCostReceiverIndex(enemy, indirectBatch.indirectCost) : null;
    return { type: 'indirectAttack', dieIndices: indirectBatch.dieIndices, costReceiverIndex };
  }

  const damageBatch = combineAutomatonBatch(enemy.pool, isMeleeRangedSymbol, enemy.resources, hasNonKoAlly);
  if (damageBatch !== null) {
    const candidates = ascendingHealthCandidates(player.characters, player.damage, () => true);
    const picked = pickTargetAndBatch(enemy.pool, damageBatch.dieIndices, candidates, (i) => {
      const dmg = player.damage[i] ?? 0;
      return (player.shields[i] ?? 0) + currentHealth(player.characters[i], dmg);
    });
    if (picked !== null) {
      const indirectCost = batchIndirectCost(enemy.pool, picked.dieIndices);
      const costReceiverIndex = indirectCost > 0 ? indirectCostReceiverIndex(enemy, indirectCost) : null;
      return {
        type: 'attack',
        dieIndices: picked.dieIndices,
        targetIndex: picked.targetIndex,
        costReceiverIndex,
      };
    }
  }

  // 2. Escudo combinado, repartido sin pasar de MAX_SHIELDS entre los aliados con hueco que más lo
  // necesiten (menos vida) si hace falta más de una pulsación (SPEC-007/013/014).
  const shieldBatch = combineAutomatonBatch(enemy.pool, isShieldSymbol, enemy.resources, hasNonKoAlly);
  if (shieldBatch !== null) {
    const candidates = ascendingHealthCandidates(
      enemy.characters,
      enemy.damage,
      (i) => (enemy.shields[i] ?? 0) < MAX_SHIELDS,
    );
    const picked = pickTargetAndBatch(
      enemy.pool,
      shieldBatch.dieIndices,
      candidates,
      (i) => MAX_SHIELDS - (enemy.shields[i] ?? 0),
    );
    if (picked !== null) {
      const indirectCost = batchIndirectCost(enemy.pool, picked.dieIndices);
      const costReceiverIndex = indirectCost > 0 ? indirectCostReceiverIndex(enemy, indirectCost) : null;
      return {
        type: 'shield',
        dieIndices: picked.dieIndices,
        targetIndex: picked.targetIndex,
        costReceiverIndex,
      };
    }
  }

  // 3. Activar el personaje no-KO sin activar de mayor vida restante.
  const activateIndex = highestHealthActivatableIndex(enemy);
  if (activateIndex !== -1) {
    return { type: 'activate', index: activateIndex };
  }

  // 4. Recurso combinado, sumado al contador del enemigo (SPEC-007/013/014).
  const resourceBatch = combineAutomatonBatch(enemy.pool, isResourceSymbol, enemy.resources, hasNonKoAlly);
  if (resourceBatch !== null) {
    const costReceiverIndex =
      resourceBatch.indirectCost > 0 ? indirectCostReceiverIndex(enemy, resourceBatch.indirectCost) : null;
    return { type: 'resource', dieIndices: resourceBatch.dieIndices, costReceiverIndex };
  }

  // 5. Disrupt/descarte combinados (SPEC-029): sin objetivo de personaje, afectan al bando contrario
  // entero. Disrupt se comprueba primero si hay tanda combinable de ambos a la vez (decisión del
  // usuario, mismo espíritu que indirecto/melee-ranged en la fila 1).
  const disruptBatch = combineAutomatonBatch(enemy.pool, isDisruptSymbol, enemy.resources, hasNonKoAlly);
  if (disruptBatch !== null) {
    const costReceiverIndex =
      disruptBatch.indirectCost > 0 ? indirectCostReceiverIndex(enemy, disruptBatch.indirectCost) : null;
    return { type: 'disrupt', dieIndices: disruptBatch.dieIndices, costReceiverIndex };
  }
  const discardBatch = combineAutomatonBatch(enemy.pool, isDiscardSymbol, enemy.resources, hasNonKoAlly);
  if (discardBatch !== null) {
    const costReceiverIndex =
      discardBatch.indirectCost > 0 ? indirectCostReceiverIndex(enemy, discardBatch.indirectCost) : null;
    return { type: 'discard', dieIndices: discardBatch.dieIndices, costReceiverIndex };
  }

  // 6. Focus combinado (SPEC-023): gira, hasta el valor combinado disponible, sus propios dados sin
  // resolver a su mejor cara (misma prioridad daño > escudo > recurso). Si ningún dado propio mejora
  // girándolo, no es una acción legal (se prueba la siguiente fila).
  const focusBatch = combineAutomatonBatch(enemy.pool, isFocusSymbol, enemy.resources, hasNonKoAlly);
  if (focusBatch !== null) {
    const budget = batchAmountTotal(enemy.pool, focusBatch.dieIndices);
    const targets = focusCandidates(enemy.pool, new Set(focusBatch.dieIndices), dieSidesOf).slice(0, budget);
    if (targets.length > 0) {
      const costReceiverIndex =
        focusBatch.indirectCost > 0 ? indirectCostReceiverIndex(enemy, focusBatch.indirectCost) : null;
      return { type: 'focus', dieIndices: focusBatch.dieIndices, targets, costReceiverIndex };
    }
  }

  // 7. Reroll de dado combinado (SPEC-023): re-tira, hasta el valor combinado disponible, los dados
  // de daño sin resolver del jugador que más le convenga anular (mayor cantidad primero). Si el
  // jugador no tiene ningún dado de daño pendiente, no es acción legal (se prueba la siguiente fila).
  const rerollDieBatch = combineAutomatonBatch(enemy.pool, isRerollDieSymbol, enemy.resources, hasNonKoAlly);
  if (rerollDieBatch !== null) {
    const budget = batchAmountTotal(enemy.pool, rerollDieBatch.dieIndices);
    const targets: RerollDieTarget[] = playerDamageDieCandidates(player.pool)
      .slice(0, budget)
      .map((poolIndex) => ({ side: 'player', poolIndex }));
    if (targets.length > 0) {
      const costReceiverIndex =
        rerollDieBatch.indirectCost > 0 ? indirectCostReceiverIndex(enemy, rerollDieBatch.indirectCost) : null;
      return { type: 'rerollDice', dieIndices: rerollDieBatch.dieIndices, targets, costReceiverIndex };
    }
  }

  // 8. Especial (SPEC-023/039): nunca se combinan varios dados ni dueños distintos en una acción
  // (cada Especial es un efecto propio de carta, no un símbolo sumable, a diferencia del resto de
  // filas) — se toma UN dado de Especial (el primero que se pueda pagar, sin orden fijo entre
  // dueños distintos, decisión del usuario) y se resuelve con su efecto real si el código es
  // conocido (Luminara/Zuckuss/Vader) o con el placeholder de siempre si no.
  const specialIndex = enemy.pool.findIndex((d) => {
    const p = parsePlayerFace(d.face);
    return p !== null && p.symbol === 'special' && p.resourceCost <= enemy.resources;
  });
  if (specialIndex !== -1) {
    const ownerCode = enemy.pool[specialIndex].code;
    if (ownerCode === LUMINARA_CODE) {
      const targetIdx = bestLuminaraTargetForAutomaton(enemy.pool, specialIndex);
      return {
        type: 'special',
        dieIndices: [specialIndex],
        costReceiverIndex: null,
        ownerCode,
        luminaraTargetPoolIndex: targetIdx === -1 ? null : targetIdx,
      };
    }
    if (ownerCode === VADER_CODE) {
      return {
        type: 'special',
        dieIndices: [specialIndex],
        costReceiverIndex: null,
        ownerCode,
        vaderTarget: bestVaderTarget(enemy, player),
      };
    }
    return { type: 'special', dieIndices: [specialIndex], costReceiverIndex: null, ownerCode };
  }

  // Habilidades `Action -` (SPEC-042): último recurso, justo antes del reroll de blancos (decisión
  // del usuario, 2026-07-30). `usableActionAbilityIndex` ya comprueba que haya algo que ganar.
  const abilityIndex = usableActionAbilityIndex(enemy);
  if (abilityIndex !== null) return { type: 'characterAbility', index: abilityIndex };

  const blanks = blankDieIndices(enemy.pool);
  if (blanks.length >= 2) {
    if (!rerollsUsed.free) {
      return { type: 'reroll', dieIndices: blanks, kind: 'free' };
    }
    if (rerollsUsed.extra < extraRerolls) {
      return { type: 'reroll', dieIndices: blanks, kind: 'extra' };
    }
  }

  return { type: 'pass' };
}

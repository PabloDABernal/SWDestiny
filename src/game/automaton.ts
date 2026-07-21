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

/** Vista del bando del jugador que necesita el autómata para el margen "sin overkill" (SPEC-014):
 * sus escudos absorben antes que la vida, así que el margen real es escudos + vida restante. */
export interface AutomatonOpponent extends SideView {
  shields: number[];
}

/** Trampas del autómata enemigo (GDD §4), fijas hasta que exista selector de dificultad. */
export const ENEMY_HEALTH_MULTIPLIER = 1.5;
export const ENEMY_EXTRA_REROLLS_PER_ROUND = 1;

/** Aplica la trampa de vida multiplicada. Redondeo siempre hacia arriba (favorece al enemigo). */
export function applyEnemyHealthMultiplier(characters: Character[]): Character[] {
  return characters.map((c) => ({
    ...c,
    health: Math.ceil(c.health * ENEMY_HEALTH_MULTIPLIER),
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

export type AutomatonAction =
  | {
      type: 'attack';
      dieIndices: number[];
      targetIndex: number;
      /** Receptor del coste de daño indirecto propio (SPEC-013), o null si la tanda no tiene coste. */
      costReceiverIndex: number | null;
    }
  | { type: 'shield'; dieIndices: number[]; targetIndex: number; costReceiverIndex: number | null }
  | { type: 'activate'; index: number }
  | { type: 'resource'; dieIndices: number[]; costReceiverIndex: number | null }
  | { type: 'reroll'; dieIndices: number[]; kind: 'free' | 'extra' }
  | { type: 'pass' };

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
 * Junta los dados del pool cuyo símbolo cumple `matchesSymbol` (base + modificadores `+X`),
 * ordenados de mayor a menor valor, incluyendo cada uno mientras el coste de recurso acumulado siga
 * siendo pagable con `resources`; el primero que no quepa se salta (sigue probando el resto) y
 * queda fuera de la tanda (SPEC-013). Si `allowIndirect` es false, los candidatos con coste de daño
 * indirecto propio (`…i<n>`) no se consideran en absoluto (fuera de alcance para escudo/recurso).
 * Devuelve `null` si no queda ningún dado **base** en la tanda resultante (un modificador solo no
 * se resuelve, igual que en la regla del jugador desde SPEC-010).
 */
function combineAutomatonBatch(
  pool: PooledDie[],
  matchesSymbol: (symbol: DieSymbol) => boolean,
  resources: number,
  allowIndirect: boolean,
): AutomatonBatch | null {
  const candidates = pool
    .map((die, i) => ({ i, face: parsePlayerFace(die.face) }))
    .filter(
      (c): c is { i: number; face: NonNullable<ReturnType<typeof parsePlayerFace>> } =>
        c.face !== null && matchesSymbol(c.face.symbol) && (allowIndirect || c.face.indirectCost === 0),
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
 * Receptor del coste de daño indirecto propio (SPEC-013, GDD §4): de los personajes no-KO,
 * prioriza los que sobrevivirían al coste (escudos absorbiendo primero); entre esos, el que ya
 * tenga escudos (empate: más vida); si ninguno tiene escudos, el de más vida entre los que
 * sobrevivirían; si el coste mataría a cualquiera, el de más vida como última opción. Desempates
 * deterministas (menor índice), igual que el resto del autómata. -1 si no hay ningún no-KO.
 */
function indirectCostReceiverIndex(side: AutomatonSide, cost: number): number {
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

const isDamageSymbol = (s: DieSymbol) => s === 'melee' || s === 'ranged' || s === 'indirect';
const isShieldSymbol = (s: DieSymbol) => s === 'shield';
const isResourceSymbol = (s: DieSymbol) => s === 'resource';

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
): AutomatonAction {
  const hasNonKoAlly = enemy.characters.some((c, i) => !isKO(c, enemy.damage[i] ?? 0));

  // 1. Daño combinado (base + modificadores, pagando coste de recurso), repartido sin overkill entre
  // los jugadores de menos vida si hace falta más de una pulsación (SPEC-013/014).
  const damageBatch = combineAutomatonBatch(enemy.pool, isDamageSymbol, enemy.resources, hasNonKoAlly);
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

  const blanks = blankDieIndices(enemy.pool);
  if (blanks.length >= 2) {
    if (!rerollsUsed.free) {
      return { type: 'reroll', dieIndices: blanks, kind: 'free' };
    }
    if (rerollsUsed.extra < ENEMY_EXTRA_REROLLS_PER_ROUND) {
      return { type: 'reroll', dieIndices: blanks, kind: 'extra' };
    }
  }

  return { type: 'pass' };
}

import type { Character } from '../model/types';
import type { PooledDie } from './roll';
import type { SideView } from './outcome';
import { parsePlayerFace, resolveShieldedDamage, currentHealth, isKO, type DieSymbol } from './damage';

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
  | { type: 'shield'; dieIndices: number[]; targetIndex: number }
  | { type: 'activate'; index: number }
  | { type: 'resource'; dieIndices: number[] }
  | { type: 'reroll'; dieIndices: number[]; kind: 'free' | 'extra' }
  | { type: 'pass' };

function isBlank(face: string): boolean {
  return face === '-';
}

/** Índice (en `characters`) del personaje no-KO con menor vida restante; -1 si no hay ninguno. */
function lowestHealthTargetIndex(side: SideView): number {
  let best = -1;
  for (let i = 0; i < side.characters.length; i++) {
    const c = side.characters[i];
    const dmg = side.damage[i] ?? 0;
    if (isKO(c, dmg)) continue;
    if (best === -1 || currentHealth(c, dmg) < currentHealth(side.characters[best], side.damage[best] ?? 0)) {
      best = i;
    }
  }
  return best;
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

/**
 * Evalúa la tabla de prioridades del GDD §4 de arriba abajo y devuelve la primera acción legal.
 * Función pura: no tira dados ni muta estado; quien la llama ejecuta la acción devuelta
 * reutilizando `resolvePlayerBatch`/`activate` del store (SPEC-002/003/010/013) o rerolleando los
 * índices dados.
 */
export function nextAutomatonAction(
  enemy: AutomatonSide,
  player: SideView,
  rerollsUsed: RerollsUsed,
): AutomatonAction {
  // 1. Daño combinado (base + modificadores, pagando coste de recurso) al jugador de menos vida.
  const hasNonKoAlly = enemy.characters.some((c, i) => !isKO(c, enemy.damage[i] ?? 0));
  const damageBatch = combineAutomatonBatch(enemy.pool, isDamageSymbol, enemy.resources, hasNonKoAlly);
  if (damageBatch !== null) {
    const targetIndex = lowestHealthTargetIndex(player);
    if (targetIndex !== -1) {
      const costReceiverIndex =
        damageBatch.indirectCost > 0 ? indirectCostReceiverIndex(enemy, damageBatch.indirectCost) : null;
      return { type: 'attack', dieIndices: damageBatch.dieIndices, targetIndex, costReceiverIndex };
    }
  }

  // 2. Escudo combinado sobre el aliado no-KO de menor vida restante (SPEC-007/013).
  const shieldBatch = combineAutomatonBatch(enemy.pool, isShieldSymbol, enemy.resources, false);
  if (shieldBatch !== null) {
    const targetIndex = lowestHealthTargetIndex(enemy);
    if (targetIndex !== -1) {
      return { type: 'shield', dieIndices: shieldBatch.dieIndices, targetIndex };
    }
  }

  // 3. Activar el personaje no-KO sin activar de mayor vida restante.
  const activateIndex = highestHealthActivatableIndex(enemy);
  if (activateIndex !== -1) {
    return { type: 'activate', index: activateIndex };
  }

  // 4. Recurso combinado, sumado al contador del enemigo (SPEC-007/013).
  const resourceBatch = combineAutomatonBatch(enemy.pool, isResourceSymbol, enemy.resources, false);
  if (resourceBatch !== null) {
    return { type: 'resource', dieIndices: resourceBatch.dieIndices };
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

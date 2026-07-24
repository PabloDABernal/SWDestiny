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
  | { type: 'shield'; dieIndices: number[]; targetIndex: number; costReceiverIndex: number | null }
  | { type: 'activate'; index: number }
  | { type: 'resource'; dieIndices: number[]; costReceiverIndex: number | null }
  | { type: 'focus'; dieIndices: number[]; targets: FocusTarget[]; costReceiverIndex: number | null }
  | { type: 'rerollDice'; dieIndices: number[]; targets: RerollDieTarget[]; costReceiverIndex: number | null }
  | { type: 'special'; dieIndices: number[]; costReceiverIndex: number | null }
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

const isDamageSymbol = (s: DieSymbol) => s === 'melee' || s === 'ranged' || s === 'indirect';
const isShieldSymbol = (s: DieSymbol) => s === 'shield';
const isResourceSymbol = (s: DieSymbol) => s === 'resource';
const isFocusSymbol = (s: DieSymbol) => s === 'focus';
const isRerollDieSymbol = (s: DieSymbol) => s === 'reroll';
const isSpecialSymbol = (s: DieSymbol) => s === 'special';

/** Mejor cara disponible de un dado candidato para Focus (SPEC-023): sigue la misma prioridad que
 * el resto de la tabla (daño > escudo > recurso). null si ninguna de sus 6 caras mejora nada. */
function bestFocusFace(sides: string[]): string | null {
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

  // 5. Focus combinado (SPEC-023): gira, hasta el valor combinado disponible, sus propios dados sin
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

  // 6. Reroll de dado combinado (SPEC-023): re-tira, hasta el valor combinado disponible, los dados
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

  // 7. Especial combinado (SPEC-023): placeholder sin efecto real, se "resuelve" igual que el
  // jugador (mismo aviso/consumo) si no queda ninguna acción de prioridad más alta disponible.
  const specialBatch = combineAutomatonBatch(enemy.pool, isSpecialSymbol, enemy.resources, hasNonKoAlly);
  if (specialBatch !== null) {
    const costReceiverIndex =
      specialBatch.indirectCost > 0 ? indirectCostReceiverIndex(enemy, specialBatch.indirectCost) : null;
    return { type: 'special', dieIndices: specialBatch.dieIndices, costReceiverIndex };
  }

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

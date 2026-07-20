import type { Character } from '../model/types';
import type { PooledDie } from './roll';
import type { SideView } from './outcome';
import { parseDamage, parseShield, parseResource, currentHealth, isKO } from './damage';

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
}

/** Cuántos rerolls ha gastado el enemigo esta "ronda" (ver reset() en el store). */
export interface RerollsUsed {
  free: boolean;
  extra: number;
}

export type AutomatonAction =
  | { type: 'attack'; dieIndex: number; targetIndex: number }
  | { type: 'shield'; dieIndex: number; targetIndex: number }
  | { type: 'activate'; index: number }
  | { type: 'resource'; dieIndex: number }
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

/** Índice (en `pool`) del dado de daño de mayor valor; -1 si no hay ninguno. */
function highestDamageDieIndex(pool: PooledDie[]): number {
  let best = -1;
  let bestAmount = -1;
  for (let i = 0; i < pool.length; i++) {
    const amount = parseDamage(pool[i].face);
    if (amount === null) continue;
    if (amount > bestAmount) {
      best = i;
      bestAmount = amount;
    }
  }
  return best;
}

/** Índice (en `pool`) del dado con mayor valor según `parse`; -1 si no hay ninguno. */
function highestDieIndexBy(pool: PooledDie[], parse: (face: string) => number | null): number {
  let best = -1;
  let bestAmount = -1;
  for (let i = 0; i < pool.length; i++) {
    const amount = parse(pool[i].face);
    if (amount === null) continue;
    if (amount > bestAmount) {
      best = i;
      bestAmount = amount;
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

/**
 * Evalúa la tabla de prioridades del GDD §4 de arriba abajo y devuelve la primera acción legal.
 * Función pura: no tira dados ni muta estado; quien la llama ejecuta la acción devuelta
 * reutilizando `activate`/`applyDieTo` del store (SPEC-002/003) o rerolleando los índices dados.
 */
export function nextAutomatonAction(
  enemy: AutomatonSide,
  player: SideView,
  rerollsUsed: RerollsUsed,
): AutomatonAction {
  // 1. Atacar con el dado de daño de mayor valor al jugador con menos vida restante.
  const dieIndex = highestDamageDieIndex(enemy.pool);
  if (dieIndex !== -1) {
    const targetIndex = lowestHealthTargetIndex(player);
    if (targetIndex !== -1) {
      return { type: 'attack', dieIndex, targetIndex };
    }
  }

  // 2. Resolver un dado de escudo sobre el aliado no-KO de menor vida restante (SPEC-007).
  const shieldDieIndex = highestDieIndexBy(enemy.pool, parseShield);
  if (shieldDieIndex !== -1) {
    const targetIndex = lowestHealthTargetIndex(enemy);
    if (targetIndex !== -1) {
      return { type: 'shield', dieIndex: shieldDieIndex, targetIndex };
    }
  }

  // 3. Activar el personaje no-KO sin activar de mayor vida restante.
  const activateIndex = highestHealthActivatableIndex(enemy);
  if (activateIndex !== -1) {
    return { type: 'activate', index: activateIndex };
  }

  // 4. Resolver un dado de recurso, sumándolo al contador del enemigo (SPEC-007).
  const resourceDieIndex = highestDieIndexBy(enemy.pool, parseResource);
  if (resourceDieIndex !== -1) {
    return { type: 'resource', dieIndex: resourceDieIndex };
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

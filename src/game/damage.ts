import type { Character } from '../model/types';

/**
 * Cantidad de daño de una cara, o null si no es cara de daño.
 * Daño = `<n>` seguido de MD (melee), RD (ranged) o ID (indirecto). En v1 los tres son iguales.
 * Ojo: `1R` es recurso (no daño); `1RD` sí es ranged damage.
 * Caras con coste de recurso no se pueden pagar en v1 (SDD) → aquí no matchean → null.
 */
export function parseDamage(face: string): number | null {
  const m = /^(\d+)(MD|RD|ID)$/.exec(face);
  return m ? Number(m[1]) : null;
}

/** Vida restante de la instancia en `index`, dada la tabla de daño acumulado. */
export function currentHealth(character: Character, damage: number): number {
  return Math.max(0, character.health - damage);
}

/** True si la instancia está fuera de combate (daño >= vida). */
export function isKO(character: Character, damage: number): boolean {
  return damage >= character.health;
}

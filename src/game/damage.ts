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

/** Tipo de daño de una cara. Melee, ranged e indirecto son símbolos distintos (SPEC-008a). */
export type DamageKind = 'melee' | 'ranged' | 'indirect';

/** Símbolo resoluble de una cara sin coste ni modificador (SPEC-008a; focus/reroll/especial desde
 * SPEC-023). */
export type DieSymbol = DamageKind | 'shield' | 'resource' | 'focus' | 'reroll' | 'special';

/** Distingue el símbolo de daño y su cantidad, o null si no es cara de daño (sin coste). */
export function parseDamageDie(face: string): { kind: DamageKind; amount: number } | null {
  const m = /^(\d+)(MD|RD|ID)$/.exec(face);
  if (!m) return null;
  const kind: DamageKind = m[2] === 'MD' ? 'melee' : m[2] === 'RD' ? 'ranged' : 'indirect';
  return { kind, amount: Number(m[1]) };
}

/**
 * Cara resoluble por el jugador con su coste de recurso (SPEC-008b). Formato:
 * `<valor><SÍMBOLO>[coste]`, donde el dígito final (opcional) es el coste en **recursos**.
 * RECHAZA el sufijo `i` (coste de daño indirecto propio → SPEC-008b-2) y el prefijo `+`
 * (modificador → SPEC-008c). Cara sin coste → resourceCost 0 (compatible con 008a).
 *
 * Función SEPARADA: NO la usan `parseDamage`/`parseShield`/`parseResource` ni el autómata; solo el
 * flujo de resolución del jugador (`selectDie`/`dieSymbol` y las funciones batch).
 */
export function parseCostedFace(
  face: string,
): { symbol: DieSymbol; amount: number; resourceCost: number } | null {
  const m = /^(\d+)(MD|RD|ID|Sh|R)(\d+)?$/.exec(face);
  if (!m) return null;
  const token = m[2];
  const symbol: DieSymbol =
    token === 'MD'
      ? 'melee'
      : token === 'RD'
        ? 'ranged'
        : token === 'ID'
          ? 'indirect'
          : token === 'Sh'
            ? 'shield'
            : 'resource';
  return { symbol, amount: Number(m[1]), resourceCost: m[3] ? Number(m[3]) : 0 };
}

/**
 * Cara resoluble por el jugador, completa (SPEC-010): modificador `+`, coste de recurso `<n>` y
 * coste de daño indirecto propio `i<n>`. Formato `[+]<valor><SÍMBOLO>[i]<coste>`.
 * Función SEPARADA de los parsers del autómata (parseDamage/parseShield/parseResource).
 *
 * Focus (`F`) y reroll de dado (`Re`), ambos confirmados contra un mazo real el 2026-07-23, siguen
 * el mismo formato con valor (SPEC-023, RR pg 12). Especial (`Sp`) tiene valor fijo 0 (no
 * modificable) y se reconoce aparte: formato `Sp[coste]`, sin modificador ni coste indirecto.
 *
 * Modificador genérico `+<n>*` (SPEC-027, ejemplo real: Lure of Power `+2*`): a diferencia del
 * modificador de símbolo fijo de arriba (`+2RD`), no está atado a ningún símbolo — `symbol` es
 * `null` y `isGenericModifier` marca el caso. Vale para cualquier símbolo base salvo especial (los
 * llamadores deciden eso, aquí solo se reconoce el formato).
 */
export function parsePlayerFace(face: string): {
  symbol: DieSymbol | null;
  amount: number;
  resourceCost: number;
  indirectCost: number;
  isModifier: boolean;
  isGenericModifier: boolean;
} | null {
  const special = /^Sp(\d+)?$/.exec(face);
  if (special) {
    return {
      symbol: 'special',
      amount: 0,
      resourceCost: special[1] ? Number(special[1]) : 0,
      indirectCost: 0,
      isModifier: false,
      isGenericModifier: false,
    };
  }
  const generic = /^\+(\d+)\*$/.exec(face);
  if (generic) {
    return {
      symbol: null,
      amount: Number(generic[1]),
      resourceCost: 0,
      indirectCost: 0,
      isModifier: true,
      isGenericModifier: true,
    };
  }
  const m = /^(\+)?(\d+)(MD|RD|ID|Sh|Re|R|F)(i)?(\d+)?$/.exec(face);
  if (!m) return null;
  const token = m[3];
  const symbol: DieSymbol =
    token === 'MD'
      ? 'melee'
      : token === 'RD'
        ? 'ranged'
        : token === 'ID'
          ? 'indirect'
          : token === 'Sh'
            ? 'shield'
            : token === 'R'
              ? 'resource'
              : token === 'F'
                ? 'focus'
                : 'reroll';
  const cost = m[5] ? Number(m[5]) : 0;
  const indirect = m[4] === 'i';
  return {
    symbol,
    amount: Number(m[2]),
    resourceCost: indirect ? 0 : cost,
    indirectCost: indirect ? cost : 0,
    isModifier: m[1] === '+',
    isGenericModifier: false,
  };
}

/** True si `face` es un modificador genérico `+<n>*` (SPEC-027). Atajo sobre `parsePlayerFace` para
 * los llamadores que solo necesitan saber esto sin desempaquetar el resultado completo. */
export function isGenericModifier(face: string): boolean {
  return parsePlayerFace(face)?.isGenericModifier ?? false;
}

/**
 * Símbolo resoluble de una cara para el "modo resolver" del jugador (008a/008b/010, ampliado con
 * focus/reroll/especial en SPEC-023), o null si no es seleccionable (blanco, disrupt, descarte).
 */
export function dieSymbol(face: string): DieSymbol | null {
  return parsePlayerFace(face)?.symbol ?? null;
}

/** Vida restante de la instancia en `index`, dada la tabla de daño acumulado. */
export function currentHealth(character: Character, damage: number): number {
  return Math.max(0, character.health - damage);
}

/** True si la instancia está fuera de combate (daño >= vida). */
export function isKO(character: Character, damage: number): boolean {
  return damage >= character.health;
}

/** Máximo de escudos que puede acumular un personaje (SPEC-005). */
export const MAX_SHIELDS = 3;

/**
 * Cantidad de escudo de una cara, o null si no es cara de escudo. Cara = `<n>Sh` (1Sh/2Sh/3Sh).
 */
export function parseShield(face: string): number | null {
  const m = /^(\d+)Sh$/.exec(face);
  return m ? Number(m[1]) : null;
}

/** Nuevo total de escudos tras aplicar un dado de escudo, topado a MAX_SHIELDS. */
export function addShields(current: number, amount: number): number {
  return Math.min(MAX_SHIELDS, current + amount);
}

/**
 * Reparte un daño entrante entre escudos (primero) y vida (el sobrante), en una sola resolución.
 */
export function resolveShieldedDamage(
  shields: number,
  amount: number,
): { shieldsRemaining: number; healthDamage: number } {
  const absorbed = Math.min(shields, amount);
  return { shieldsRemaining: shields - absorbed, healthDamage: amount - absorbed };
}

/**
 * Cantidad de recurso de una cara, o null si no es cara de recurso. Cara = `<n>R` (p. ej. `1R`).
 * Ojo: `1RD` es daño ranged (parseDamage), no recurso; el ancla `$` evita esa colisión.
 */
export function parseResource(face: string): number | null {
  const m = /^(\d+)R$/.exec(face);
  return m ? Number(m[1]) : null;
}

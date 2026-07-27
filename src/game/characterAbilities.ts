/** Códigos de personaje con Especial real implementado (SPEC-039). Cualquier otro código sigue
 * mostrando el aviso placeholder ya existente desde SPEC-023. No es un motor de keywords genérico:
 * cada efecto es código propio, no un intérprete de texto. */
export const LUMINARA_CODE = '02036';
export const ZUCKUSS_CODE = '11041';
export const VADER_CODE = '02010';

export const KNOWN_SPECIAL_CODES: ReadonlySet<string> = new Set([LUMINARA_CODE, ZUCKUSS_CODE, VADER_CODE]);

/**
 * Luminara Unduli (SPEC-039): "Resuelve uno de tus dados de personaje, subiendo su valor en 2, o en
 * 3 si es un dado de personaje no-único". +2 si el dueño del dado objetivo es único, +3 si no lo es.
 * Usa `is_unique` de la carta dueña del dado objetivo, no del propio personaje que tira Especial.
 */
export function luminaraBoostAmount(targetOwnerIsUnique: boolean): number {
  return targetOwnerIsUnique ? 2 : 3;
}

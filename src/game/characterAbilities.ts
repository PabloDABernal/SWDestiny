/** Habilidades de texto de personaje. NO es un intérprete de texto: cada efecto es código propio,
 * en una tabla por código de carta. Las specs siguientes (044/045 y los demás sets) solo añaden
 * entradas aquí, sin volver a tocar el motor.
 *
 * Empezó en SPEC-039 como tres Especiales sueltos y se convirtió en registro en SPEC-042. */

// --- Especiales con efecto real (SPEC-039) ------------------------------------------------------

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

// --- Registro de habilidades de texto (SPEC-042) ------------------------------------------------

/** Cuándo se dispara la habilidad.
 *  - `action`: la elige el jugador en su turno y **gasta la acción** (RR).
 *  - `afterActivate`: se dispara justo después de activar al personaje, antes de ceder el turno. */
export type AbilityTrigger = 'action' | 'afterActivate';

/** Qué hace falta elegir para aplicarla. `none` se aplica sola. */
export type AbilityTargeting =
  | { kind: 'none' }
  /** Elegir hasta `max` dados para volver a tirarlos. `scope` acota cuáles valen. */
  | { kind: 'reroll'; max: number; scope: 'own' | 'any' | 'yellow' }
  /** Elegir un dado propio de APOYO y girarlo a la cara que se quiera. */
  | { kind: 'turnSupportDie' }
  /** Elegir una carta de la mano (personaje o mejora con dado) y una de sus caras. */
  | { kind: 'discardHandCardForDie' };

export interface CharacterAbility {
  /** Código de la carta de personaje. */
  code: string;
  trigger: AbilityTrigger;
  /** Texto corto en español, el que se le enseña al jugador. */
  prompt: string;
  /** `false` en las obligatorias (su texto no dice "you may"): se aplican sin preguntar. */
  optional: boolean;
  /** El texto dice "retira este dado": exige tener su dado en el pool, y lo consume al usarla. */
  removesOwnDie?: boolean;
  /** Daño que se hace a sí mismo al usarla (Nightsister). */
  selfDamage?: number;
  /** Cartas de la mano elegibles, para `discardHandCardForDie` (Tusken: personaje o mejora). */
  handCardTypes?: string[];
  targeting: AbilityTargeting;
}

const ABILITIES: CharacterAbility[] = [
  // --- Set 01, "tras activar" ---
  {
    code: '01035', // Luke Skywalker — "draw a card", SIN "you may": es obligatorio, no se pregunta
    trigger: 'afterActivate',
    prompt: 'Luke Skywalker roba una carta.',
    optional: false,
    targeting: { kind: 'none' },
  },
  {
    code: '01010', // Darth Vader (Awakenings) — no confundir con VADER_CODE (02010, SPEC-039)
    trigger: 'afterActivate',
    prompt: 'Darth Vader: puedes forzar al rival a descartar una carta de su mano.',
    optional: true,
    targeting: { kind: 'none' },
  },
  {
    code: '01020', // Jabba the Hutt
    trigger: 'afterActivate',
    prompt: 'Jabba the Hutt: puedes volver a tirar un dado amarillo.',
    optional: true,
    targeting: { kind: 'reroll', max: 1, scope: 'yellow' },
  },
  {
    code: '01022', // Tusken Raider
    trigger: 'afterActivate',
    prompt: 'Tusken Raider: puedes descartar una carta de tu mano para resolver una de sus caras.',
    optional: true,
    handCardTypes: ['character', 'upgrade'], // texto real: "character or upgrade dice"
    targeting: { kind: 'discardHandCardForDie' },
  },
  // --- Set 01, acción de turno ---
  {
    code: '01004', // General Veers
    trigger: 'action',
    prompt: 'Retira su dado para girar un dado de apoyo tuyo a la cara que quieras.',
    optional: true,
    removesOwnDie: true,
    targeting: { kind: 'turnSupportDie' },
  },
  {
    code: '01012', // Nightsister — su texto NO retira su dado, así que no exige haberla activado
    trigger: 'action',
    prompt: 'Vuelve a tirar un dado. La Nightsister se lleva 1 de daño.',
    optional: true,
    selfDamage: 1,
    targeting: { kind: 'reroll', max: 1, scope: 'any' },
  },
  {
    code: '01028', // Leia Organa
    trigger: 'action',
    prompt: 'Retira su dado para volver a tirar hasta 2 dados tuyos.',
    optional: true,
    removesOwnDie: true,
    targeting: { kind: 'reroll', max: 2, scope: 'own' },
  },
];

const BY_CODE = new Map(ABILITIES.map((a) => [a.code, a]));

/** Habilidad de ese personaje, o undefined si su texto aún no está implementado. */
export function abilityFor(code: string): CharacterAbility | undefined {
  return BY_CODE.get(code);
}

/** Habilidad de ese personaje si se dispara con `trigger`. */
export function abilityWithTrigger(code: string, trigger: AbilityTrigger): CharacterAbility | undefined {
  const ability = BY_CODE.get(code);
  return ability && ability.trigger === trigger ? ability : undefined;
}

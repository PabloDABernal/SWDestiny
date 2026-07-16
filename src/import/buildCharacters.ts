import type { ArhCard, Character, Die } from '../model/types';
import type { DeckSlot } from './parseDeck';
import { ImportError } from './errors';

function makeDie(card: ArhCard): Die {
  return { sides: [...card.sides] };
}

function characterFrom(card: ArhCard, isElite: boolean): Character {
  const dice = isElite ? [makeDie(card), makeDie(card)] : [makeDie(card)];
  return {
    code: card.code,
    name: card.name,
    health: card.health,
    isUnique: card.is_unique,
    isElite,
    dice,
  };
}

/**
 * Construye las fichas de personaje a partir de los slots y las cartas ya resueltas.
 *
 * Regla de dados (SPEC-001), según la convención de export de ARH DB:
 *  - Personaje ÚNICO con cantidad Q: 1 ficha. Q>=2 ⇒ elite (2 dados); si no, 1 dado.
 *  - Personaje NO único con cantidad Q: Q fichas independientes, cada una 1 dado.
 *
 * Ignora toda carta cuyo type_code no sea "character" (el resto del mazo no entra en v1).
 * Lanza ImportError('no-characters') si no queda ninguna ficha.
 */
export function buildCharacters(slots: DeckSlot[], cards: Map<string, ArhCard>): Character[] {
  const characters: Character[] = [];

  for (const { code, qty } of slots) {
    const card = cards.get(code);
    if (!card || card.type_code !== 'character') continue;

    if (card.is_unique) {
      characters.push(characterFrom(card, qty >= 2));
    } else {
      for (let i = 0; i < qty; i++) {
        characters.push(characterFrom(card, false));
      }
    }
  }

  if (characters.length === 0) {
    throw new ImportError('no-characters', 'El mazo no tiene personajes.');
  }

  return characters;
}

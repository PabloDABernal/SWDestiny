import { ImportError } from './errors';

export interface DeckSlot {
  code: string;
  qty: number;
}

/**
 * Parsea el JSON de export de un mazo de ARH DB y devuelve sus slots (código→cantidad).
 * No distingue personajes de cartas aquí; eso se decide al resolver cada carta.
 * Lanza ImportError('invalid-json') si el texto no es JSON o no tiene `slots` válido.
 */
export function parseDeck(raw: string): DeckSlot[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ImportError('invalid-json', 'El texto pegado no es un JSON válido.');
  }

  if (data === null || typeof data !== 'object') {
    throw new ImportError('invalid-json', 'El JSON no es un objeto de mazo.');
  }

  const slots = (data as Record<string, unknown>).slots;
  if (slots === null || typeof slots !== 'object') {
    throw new ImportError(
      'invalid-json',
      'El JSON no parece un export de ARH DB: falta el campo "slots".',
    );
  }

  const result: DeckSlot[] = [];
  for (const [code, value] of Object.entries(slots as Record<string, unknown>)) {
    const qty = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ImportError(
        'invalid-json',
        `Cantidad inválida para la carta "${code}" en "slots".`,
      );
    }
    result.push({ code, qty });
  }

  if (result.length === 0) {
    throw new ImportError('invalid-json', 'El campo "slots" está vacío.');
  }

  return result;
}

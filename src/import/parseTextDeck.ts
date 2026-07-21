import { ImportError } from './errors';
import type { DeckSlot } from './parseDeck';

// Tabla nombre-de-set (tal cual aparece en el "text file" de ARH DB) → 2 dígitos de set.
// Validada contra db.swdrenewedhope.com/api/public/card/<código> el 2026-07-21 (SPEC-017).
// Un set fuera de esta tabla es un error; ampliar aquí cuando ARH publique sets nuevos.
const SET_CODES: Record<string, string> = {
  Awakenings: '01',
  'Spirit of Rebellion': '02',
  'Empire at War': '03',
  'Two-Player Game': '04',
  Legacies: '05',
  Rivals: '06',
  'Way of the Force': '07',
  'Across the Galaxy': '08',
  Convergence: '09',
  'Allies of Necessity': '10',
  'Spark of Hope': '11',
  'Covert Missions': '12',
};

// Línea de carta: nombre (puede llevar comas y paréntesis) + último paréntesis "(<Set> #<n>)".
// Prefijo "Nx " opcional (sin él → cantidad 1, caso del battlefield). Anclada al final para
// tomar el ÚLTIMO paréntesis. Grupo 1 = cantidad, 2 = set, 3 = número.
const CARD_LINE = /^(?:(\d+)x\s+)?.+\(([^)#]+?)\s*#(\d+)\)$/;

/**
 * Parsea el "text file" de ARH DB (el listado legible del botón "Download") y devuelve los mismos
 * `DeckSlot[]` que `parseDeck`, para reutilizar todo el pipeline (resolveCards/buildCharacters/
 * buildDrawPile). Las líneas de estructura (título, cabeceras de sección, guiones, blancos) se
 * ignoran; una línea de carta con set desconocido o malformada cancela el import (SPEC-017).
 */
export function parseTextDeck(raw: string): DeckSlot[] {
  const byCode = new Map<string, number>();

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/\s+/g, ' ');
    if (line === '') continue;

    const m = CARD_LINE.exec(line);
    // Sin "(Set #n)" al final → línea de estructura (cabecera, guiones, "Sets: …"): se ignora.
    if (!m) continue;

    const [, qtyRaw, setName, numRaw] = m;
    const setCode = SET_CODES[setName];
    if (setCode === undefined) {
      throw new ImportError(
        'invalid-text',
        `No reconozco el set "${setName}" en la línea: "${line}".`,
      );
    }

    const qty = qtyRaw === undefined ? 1 : Number(qtyRaw);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new ImportError('invalid-text', `Cantidad inválida en la línea: "${line}".`);
    }

    // Número de coleccionista con relleno a 3 dígitos: #5 → 005, #167 → 167.
    const code = setCode + numRaw.padStart(3, '0');
    byCode.set(code, (byCode.get(code) ?? 0) + qty);
  }

  if (byCode.size === 0) {
    throw new ImportError('invalid-text', 'No se reconoció ninguna carta en el texto.');
  }

  return Array.from(byCode, ([code, qty]) => ({ code, qty }));
}

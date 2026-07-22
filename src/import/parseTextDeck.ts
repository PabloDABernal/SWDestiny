import { ImportError } from './errors';
import type { DeckSlot } from './parseDeck';

// Tabla nombre-de-set (tal cual aparece en el "text file" de ARH DB) → 2 dígitos de set.
// Validada contra db.swdrenewedhope.com/api/public/card/<código> el 2026-07-21 (SPEC-017);
// "Transformations" añadido el 2026-07-22 (código real confirmado por el usuario:
// db.swdrenewedhope.com/card/13007A → prefijo 13).
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
  Transformations: '13',
};

// Línea de carta: nombre (puede llevar comas y paréntesis) + último paréntesis "(<Set> #<n>)".
// Prefijo "Nx " opcional (sin él → cantidad 1, caso del battlefield). Anclada al final para
// tomar el ÚLTIMO paréntesis. Grupo 1 = cantidad, 2 = set, 3 = número.
const CARD_LINE = /^(?:(\d+)x\s+)?.+\(([^)#]+?)\s*#(\d+)\)$/;

/**
 * Parsea el "text file" de ARH DB (el listado legible del botón "Download") y devuelve los mismos
 * `DeckSlot[]` que `parseDeck`, para reutilizar todo el pipeline (resolveCards/buildCharacters/
 * buildDrawPile). Las líneas de estructura (título, cabeceras de sección, guiones, blancos) se
 * ignoran; una línea de carta con set desconocido o malformada cancela el import (SPEC-017). Las
 * cartas de la sección PLOT se ignoran sin resolverlas: no se usan en el juego (SPEC-001/016) y su
 * código real de dos caras (A/B) no es deducible del número de coleccionista del text file (p. ej.
 * "Rescue Han Solo (Transformations #15)" es en realidad el código `13015A`, no `13015`) —
 * intentar resolverlas hace fallar el import entero por un dato que nunca se usa.
 */
export function parseTextDeck(raw: string): DeckSlot[] {
  const byCode = new Map<string, number>();
  // Detecta la sección actual por la línea de guiones bajo el título (p. ej. "PLOT\n----\n"),
  // igual de frágil/estable que el resto del formato de este "text file" (SPEC-017).
  let currentSection = '';
  let previousLine = '';

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/\s+/g, ' ');
    if (line === '') {
      previousLine = '';
      continue;
    }
    if (/^-+$/.test(line)) {
      currentSection = previousLine.toUpperCase();
      previousLine = line;
      continue;
    }
    previousLine = line;

    const m = CARD_LINE.exec(line);
    // Sin "(Set #n)" al final → línea de estructura (cabecera, guiones, "Sets: …"): se ignora.
    if (!m) continue;

    if (currentSection === 'PLOT') continue;

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

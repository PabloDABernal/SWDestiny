import type { ArhCard } from '../model/types';
import type { DeckSlot } from './parseDeck';

/** Tipos de carta que NO cuentan para el mazo de robo de 30 (RR pg 17). */
const NON_DRAW_PILE_TYPES = new Set(['character', 'plot', 'battlefield']);

/**
 * Construye el mazo de robo de un bando (SPEC-016): todas las cartas del export cuyo `type_code`
 * no sea personaje, trama ni campo de batalla, repetidas según su `qty` en `slots`. No baraja
 * (lo hace quien la llama, `shuffle`); usa las cartas ya resueltas por `resolveCards`, sin llamadas
 * nuevas a la API.
 */
export function buildDrawPile(slots: DeckSlot[], cards: Map<string, ArhCard>): string[] {
  const pile: string[] = [];
  for (const { code, qty } of slots) {
    const card = cards.get(code);
    if (!card || NON_DRAW_PILE_TYPES.has(card.type_code)) continue;
    for (let i = 0; i < qty; i++) {
      pile.push(code);
    }
  }
  return pile;
}

/** Fisher-Yates estándar. No muta el array recibido. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

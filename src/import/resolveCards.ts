import type { ArhCard } from '../model/types';
import type { DeckSlot } from './parseDeck';
import { ImportError } from './errors';
import { getCardFromSnapshot } from '../data/cards';

const CARD_KEY = (code: string) => `swd:card:${code}`;
// En dev la request va por el proxy /arh (ver vite.config.ts) para evitar CORS; en producción
// (sin backend, sin proxy: GitHub Pages sirve estáticos) se llama directo a la API pública.
// Si ARH DB no manda CORS abierto, esto seguirá fallando en prod (ver docs/BACKLOG.md).
const ARH_API_BASE = import.meta.env.DEV ? '/arh' : 'https://db.swdrenewedhope.com';
const CARD_URL = (code: string) => `${ARH_API_BASE}/api/public/card/${code}`;

/**
 * Lectura síncrona de los datos de una carta (SPEC-018: nombres en la mano). Desde SPEC-030 consulta
 * primero el snapshot local (offline, gana a la caché) y solo si el código no está en él cae a la
 * caché de localStorage de cartas resueltas por API.
 */
export function readCache(code: string): ArhCard | null {
  const snap = getCardFromSnapshot(code);
  if (snap) return snap;
  try {
    const raw = localStorage.getItem(CARD_KEY(code));
    return raw ? (JSON.parse(raw) as ArhCard) : null;
  } catch {
    return null;
  }
}

function writeCache(card: ArhCard): void {
  try {
    localStorage.setItem(CARD_KEY(card.code), JSON.stringify(card));
  } catch {
    // Caché best-effort: si localStorage falla, seguimos sin persistir.
  }
}

async function fetchCard(code: string): Promise<ArhCard> {
  let res: Response;
  try {
    res = await fetch(CARD_URL(code));
  } catch {
    throw new ImportError(
      'network',
      `No se pudo conectar con ARH DB para resolver la carta ${code} (red o CORS).`,
      code,
    );
  }

  if (res.status === 404) {
    throw new ImportError('card-not-found', `No se encontró la carta con código ${code}.`, code);
  }
  if (!res.ok) {
    throw new ImportError('network', `ARH DB respondió con error ${res.status} al pedir ${code}.`, code);
  }

  let card: ArhCard;
  try {
    card = (await res.json()) as ArhCard;
  } catch {
    throw new ImportError('network', `Respuesta ilegible de ARH DB para ${code}.`);
  }
  if (!card || typeof card.code !== 'string') {
    throw new ImportError('card-not-found', `No se encontró la carta con código ${code}.`, code);
  }
  return card;
}

/**
 * Resuelve todas las cartas de los slots por código. Orden (SPEC-030): snapshot local → caché de
 * localStorage → API pública. Para códigos del snapshot no se toca la red (import offline); solo un
 * código que no esté en el snapshot ni en caché llega a la API (p. ej. un set más nuevo que el
 * snapshot). Persiste en caché únicamente lo resuelto por API.
 */
export async function resolveCards(slots: DeckSlot[]): Promise<Map<string, ArhCard>> {
  const cards = new Map<string, ArhCard>();
  for (const { code } of slots) {
    if (cards.has(code)) continue;
    const snap = getCardFromSnapshot(code);
    if (snap) {
      cards.set(code, snap);
      continue;
    }
    const cached = readCache(code);
    if (cached) {
      cards.set(code, cached);
      continue;
    }
    const card = await fetchCard(code);
    writeCache(card);
    cards.set(code, card);
  }
  return cards;
}

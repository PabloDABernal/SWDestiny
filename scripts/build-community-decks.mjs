// Baja mazos de la comunidad de ARH DB y escribe src/data/communityDecks.json (SPEC-035, dev, NO en
// build/CI). Recorre /api/public/decklist/<id>, combina characters+slots en DeckSlot[], filtra
// (>=1 personaje, >=20 cartas no-personaje, nombre no vacío, TODOS los códigos en el snapshot),
// dedupe por cartas idénticas, y acota a MAX_DECKS. Imprime cobertura de personajes.
//
// Uso: node scripts/build-community-decks.mjs

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const API = (id) => `https://db.swdrenewedhope.com/api/public/decklist/${id}`;
const root = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = resolve(root, '..', 'src', 'data', 'cards.json');
const OUT = resolve(root, '..', 'src', 'data', 'communityDecks.json');

const MAX_ID = 5000;
const STOP_AFTER_EMPTY = 300; // para tras esta racha de ids vacíos consecutivos
const MAX_DECKS = 10000; // techo de volumen del bundle (alto: se traen todos los válidos)
const MIN_DECK_CARDS = 20; // heurística: descarta incompletos/tests

const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
const inSnapshot = (code) => code !== '_meta' && Object.prototype.hasOwnProperty.call(snapshot, code);
const isCharacter = (code) => snapshot[code] && snapshot[code].type_code === 'character';

/** Combina characters+slots del decklist de ARH en un DeckSlot[] {code, qty}. */
function toSlots(deck) {
  const out = [];
  for (const src of [deck.characters, deck.slots]) {
    if (!src) continue;
    for (const [code, v] of Object.entries(src)) {
      const qty = v && typeof v.quantity === 'number' ? v.quantity : 0;
      if (qty > 0) out.push({ code, qty });
    }
  }
  return out;
}

/** Clave de dedupe: cartas ordenadas código:cantidad. */
function slotsKey(slots) {
  return slots
    .map((s) => `${s.code}:${s.qty}`)
    .sort()
    .join(',');
}

async function fetchDeck(id) {
  try {
    const res = await fetch(API(id));
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null; // borrado/vacío
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function main() {
  const decks = [];
  const seen = new Set();
  const charCoverage = new Set();
  let emptyRun = 0;
  let scanned = 0;

  for (let id = 1; id <= MAX_ID && decks.length < MAX_DECKS; id++) {
    const deck = await fetchDeck(id);
    scanned++;
    if (!deck) {
      if (++emptyRun >= STOP_AFTER_EMPTY) {
        console.log(`Parada: ${STOP_AFTER_EMPTY} vacíos consecutivos en id ${id}.`);
        break;
      }
      continue;
    }
    emptyRun = 0;

    const name = (deck.name || '').trim();
    if (name === '') continue;
    const slots = toSlots(deck);
    if (slots.length === 0) continue;
    if (!slots.every((s) => inSnapshot(s.code))) continue; // algún código fuera del snapshot → offline no garantizado

    const chars = slots.filter((s) => isCharacter(s.code));
    if (chars.length === 0) continue;
    const nonCharCards = slots.filter((s) => !isCharacter(s.code)).reduce((n, s) => n + s.qty, 0);
    if (nonCharCards < MIN_DECK_CARDS) continue;

    const key = slotsKey(slots);
    if (seen.has(key)) continue;
    seen.add(key);

    decks.push({ id: String(deck.id ?? id), name, slots });
    for (const c of chars) charCoverage.add(c.code);
    if (decks.length % 50 === 0) console.log(`  ${decks.length} mazos válidos (escaneados ${scanned})…`);
  }

  if (decks.length === 0) {
    console.error('ABORTADO: no se bajó ningún mazo válido (¿red caída?). No se toca el JSON.');
    process.exit(1);
  }

  writeFileSync(OUT, JSON.stringify(decks) + '\n');

  // Informe de cobertura de personajes.
  const allChars = Object.keys(snapshot).filter((c) => isCharacter(c));
  const uncovered = allChars.filter((c) => !charCoverage.has(c));
  console.log(`\nOK: ${decks.length} mazos escritos en ${OUT} (escaneados ${scanned} ids).`);
  console.log(`Cobertura de personajes: ${charCoverage.size}/${allChars.length} con >=1 mazo.`);
  console.log(`Sin mazo (${uncovered.length}): ${uncovered.map((c) => snapshot[c].name).join(', ')}`);
}

main();

// Regenera el snapshot local de cartas (SPEC-030): baja el bulk de ARH DB y escribe
// src/data/cards.json recortado a los 7 campos que usa el juego (ArhCard), como mapa
// { "<code>": {..} } ordenado por código para diffs limpios.
//
// Uso: npm run cards:snapshot
//
// Aborta SIN escribir si la descarga falla o trae 0 cartas (no deja un snapshot vacío/parcial).
// Una carta suelta a la que le falte algún campo se descarta y se cuenta en un aviso, sin abortar.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BULK_URL = 'https://db.swdrenewedhope.com/api/public/cards/';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'cards.json');

// Identidad de una carta (sin esto no sirve). El resto de campos de ArhCard son propios de solo
// algunos tipos (health→personajes, sides→cartas con dado) y la API los devuelve null cuando no
// aplican; se normalizan a un default en vez de descartar la carta.
const REQUIRED = ['code', 'name', 'type_code'];

function trim(card) {
  for (const f of REQUIRED) {
    if (card[f] === undefined || card[f] === null || card[f] === '') return null; // dato parcial → se descarta
  }
  const out = {
    code: card.code,
    name: card.name,
    type_code: card.type_code,
    health: typeof card.health === 'number' ? card.health : 0, // null en no-personajes → 0
    is_unique: !!card.is_unique,
    sides: Array.isArray(card.sides) ? card.sides : [], // null en cartas sin dado → []
  };
  if (typeof card.cost === 'number') out.cost = card.cost;
  // Campos de presentación para el navegador de la sección DB (SPEC-032); opcionales, no los usa
  // la lógica de juego. Se incluyen solo si vienen con valor útil.
  if (card.faction_code) out.faction_code = card.faction_code;
  if (card.faction_name) out.faction_name = card.faction_name;
  if (card.set_code) out.set_code = card.set_code;
  if (card.set_name) out.set_name = card.set_name;
  if (card.affiliation_code) out.affiliation_code = card.affiliation_code;
  if (card.points) out.points = card.points; // string "13/17" (elite/normal)
  if (card.text) out.text = card.text;
  return out;
}

async function main() {
  console.log(`Bajando cartas de ${BULK_URL} …`);
  let list;
  try {
    const res = await fetch(BULK_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    list = await res.json();
  } catch (e) {
    console.error(`ABORTADO: no se pudo bajar el bulk de ARH (${e.message}). No se toca el snapshot.`);
    process.exit(1);
  }

  if (!Array.isArray(list) || list.length === 0) {
    console.error('ABORTADO: el endpoint devolvió 0 cartas. No se toca el snapshot.');
    process.exit(1);
  }

  let dropped = 0;
  const byCode = {};
  for (const raw of list) {
    const card = trim(raw);
    if (card === null) {
      dropped++;
      continue;
    }
    byCode[card.code] = card;
  }

  const codes = Object.keys(byCode).sort();
  if (codes.length === 0) {
    console.error('ABORTADO: ninguna carta tenía los campos requeridos. No se toca el snapshot.');
    process.exit(1);
  }

  const ordered = { _meta: { generated: new Date().toISOString().slice(0, 10), count: codes.length } };
  for (const code of codes) ordered[code] = byCode[code];

  writeFileSync(OUT, JSON.stringify(ordered, null, 0) + '\n');
  console.log(`OK: ${codes.length} cartas escritas en ${OUT}` + (dropped ? ` (${dropped} descartadas por datos parciales)` : ''));
}

main();

import type { DeckSlot } from '../import/parseDeck';

// Mazos precargados (SPEC-031): decklists fijos empaquetados con el juego, elegibles desde el
// desplegable "Mazos de ejemplo" de cada bando. Todos los códigos están en el snapshot local
// (src/data/cards.json), así que se importan offline (SPEC-030).
//
// Curados el 2026-07-26 con el bulk de ARH (facción/afiliación): cartas de la facción del líder o
// grises, afiliación villano/neutral, máx. 2 copias. No se valida legalidad estricta (fuera de
// alcance, igual que el import manual).

export interface PresetDeck {
  id: string;
  name: string;
  slots: DeckSlot[];
}

/** Convierte un mapa código→cantidad en DeckSlot[] (mismo formato que produce parseDeck). */
function slots(map: Record<string, number>): DeckSlot[] {
  return Object.entries(map).map(([code, qty]) => ({ code, qty }));
}

export const PRESET_DECKS: PresetDeck[] = [
  {
    id: 'unduli',
    name: 'Unduli, clone commander (héroe)',
    slots: slots({
      // Personajes: Luminara Unduli (único/elite) + 2× Clone Trooper. Battlefield 01167.
      '02036': 2, '05038': 2, '01167': 1,
      // Mejoras
      '02055': 2, '02125': 2, '02126': 2, '02135': 2, '05056': 2,
      // Apoyo
      '02030': 2,
      // Eventos
      '01106': 2, '01109': 1, '01110': 2, '01142': 2, '01143': 1,
      '02130': 2, '02139': 2, '03148': 2, '05140': 1, '06005': 2, '06011': 1,
    }),
  },
  {
    id: 'zuckuss-bounty',
    name: 'Cazarrecompensas — Zuckuss (villano, disrupt/descarte)',
    slots: slots({
      // Personajes: Zuckuss (único/elite, dado con 1Dr y 1Dc) + 4-LOM. Battlefield 01165.
      '11041': 2, '11038': 1, '01165': 1,
      // 30 cartas amarillas/grises villano
      '01017': 2, '01018': 2, '01023': 2, '01024': 2, '01025': 2, '01026': 2,
      '01061': 2, '01062': 2, '01063': 2, '01064': 2, '01065': 2, '01066': 2,
      '01067': 2, '01091': 2, '01092': 2,
    }),
  },
  {
    id: 'vader-force',
    name: 'Golpe directo — Darth Vader (villano)',
    slots: slots({
      // Personajes: Darth Vader (único/elite) + 2× Nightsister. Battlefield 01165.
      '02010': 2, '01012': 2, '01165': 1,
      // 30 cartas azules/grises villano
      '01013': 2, '01014': 2, '01015': 2, '01016': 2, '01017': 2, '01018': 2,
      '01057': 2, '01058': 2, '01059': 2, '01060': 2, '01061': 2, '01062': 2,
      '01063': 2, '01079': 2, '01080': 2,
    }),
  },
];

/** Busca un mazo precargado por id (o null si no existe). */
export function getPresetDeck(id: string): PresetDeck | null {
  return PRESET_DECKS.find((d) => d.id === id) ?? null;
}

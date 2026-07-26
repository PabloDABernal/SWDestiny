import type { PresetDeck } from './decks';
import communityData from './communityDecks.json';

// Mazos de la comunidad (SPEC-035): lote grande descargado de ARH DB con
// `scripts/build-community-decks.mjs` y versionado en el repo. Mismo tipo que los precargados
// (PresetDeck); su `id` es siempre numérico (string), nunca colisiona con los ids de palabra de
// PRESET_DECKS. Todos sus códigos están en el snapshot → cargan offline (SPEC-030).

export const COMMUNITY_DECKS = communityData as PresetDeck[];

import type { ArhCard } from '../model/types';
import snapshot from './cards.json';

// Snapshot local de cartas de ARH DB (SPEC-030): mapa { "<code>": ArhCard } versionado en el repo
// y regenerado con `npm run cards:snapshot`. Bundleado por Vite (import estático) → disponible de
// forma SÍNCRONA y offline, sin depender de la API en vivo. Ver docs/specs/030-snapshot-cartas-offline.md.
//
// El JSON incluye una clave `_meta` (fecha y nº de cartas) que no es una carta; se ignora al leer.

interface SnapshotMeta {
  generated: string;
  count: number;
}

const raw = snapshot as Record<string, ArhCard | SnapshotMeta>;

export const snapshotMeta = raw._meta as SnapshotMeta | undefined;

/** Datos de juego de una carta del snapshot local, o null si su código no está en él. */
export function getCardFromSnapshot(code: string): ArhCard | null {
  if (code === '_meta') return null;
  const card = raw[code];
  return card && 'code' in card ? (card as ArhCard) : null;
}

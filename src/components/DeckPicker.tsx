import { useMemo, useState } from 'react';
import { useGameStore, type Side } from '../store/gameStore';
import { PRESET_DECKS } from '../data/decks';
import { COMMUNITY_DECKS } from '../data/communityDecks';
import { getCardFromSnapshot } from '../data/cards';
import type { DeckSlot } from '../import/parseDeck';

const PAGE = 50; // cuántos mazos se pintan de golpe (SPEC-035: cientos de comunidad)

/** Normaliza para buscar: minúsculas y sin acentos. */
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Índice de búsqueda de un mazo para "Elegir mazo" (SPEC-038): nombre + nombres de sus personajes
 * (no de cualquier carta; eso solo está en el buscador de la sección DB, SPEC-036). */
function searchIndex(name: string, slots: DeckSlot[]): string {
  const chars = slots
    .map((s) => getCardFromSnapshot(s.code))
    .filter((c) => c?.type_code === 'character')
    .map((c) => c!.name)
    .join(' ');
  return norm(`${name} ${chars}`);
}

/** ¿Se puede elegir/cambiar mazo? Solo en fase de preparación (SPEC-033): sin partida terminada, sin
 * manos repartidas y sin ninguna acción a medias. Cambiar de mazo a mitad de partida no es posible. */
function useCanPickDeck(): boolean {
  return useGameStore(
    (s) =>
      s.outcome === null &&
      s.sides.player.hand.length === 0 &&
      s.sides.enemy.hand.length === 0 &&
      s.resolve === null &&
      s.mulligan === null &&
      s.indirectDistribution === null,
  );
}

// Índice de búsqueda de los mazos bundleados (precargados + comunidad): estáticos, se calcula una
// sola vez (mismo patrón que `bundledEntries` en DbSection.tsx, SPEC-036/038).
let bundledCache:
  | { id: string; name: string; kind: 'preset' | 'community'; search: string }[]
  | null = null;
function bundledEntries() {
  if (bundledCache === null) {
    bundledCache = [
      ...PRESET_DECKS.map((d) => ({ id: d.id, name: d.name, kind: 'preset' as const, search: searchIndex(d.name, d.slots) })),
      ...COMMUNITY_DECKS.map((d) => ({ id: d.id, name: d.name, kind: 'community' as const, search: searchIndex(d.name, d.slots) })),
    ];
  }
  return bundledCache;
}

/** Botón "Elegir mazo" por bando (SPEC-033): abre un modal con buscador + lista (precargados +
 * biblioteca). Elegir carga el mazo en ese bando y cierra. Solo activo en fase de preparación. */
export function DeckPicker({ side, label }: { side: Side; label: string }) {
  const library = useGameStore((s) => s.library);
  const importPreset = useGameStore((s) => s.importPreset);
  const loadDeckFromLibrary = useGameStore((s) => s.loadDeckFromLibrary);
  const canPick = useCanPickDeck();
  const hasDeck = useGameStore((s) => s.sides[side].characters.length > 0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  // Orden: precargados → guardados → comunidad. `kind` decide cómo se carga y la etiqueta.
  const entries = useMemo(
    () => [
      ...bundledEntries().filter((e) => e.kind === 'preset'),
      ...library.map((d) => ({ id: d.id, name: d.name, kind: 'library' as const, search: searchIndex(d.name, d.slots) })),
      ...bundledEntries().filter((e) => e.kind === 'community'),
    ],
    [library],
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return q === '' ? entries : entries.filter((e) => e.search.includes(q));
  }, [entries, query]);

  const shown = filtered.slice(0, limit);

  const choose = (id: string, kind: 'preset' | 'library' | 'community') => {
    // Precargados y comunidad son mazos bundleados → importPreset (getPresetDeck busca en ambos).
    if (kind === 'library') loadDeckFromLibrary(id, side);
    else importPreset(side, id);
    setOpen(false);
    setQuery('');
    setLimit(PAGE);
  };

  return (
    <div className="deck-picker">
      <button
        className="deck-picker__open"
        disabled={!canPick}
        title={!canPick ? 'No se puede cambiar de mazo a mitad de partida' : undefined}
        onClick={() => setOpen(true)}
      >
        {hasDeck ? 'Cambiar mazo' : 'Elegir mazo'}
      </button>

      {open && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <h3>Elegir mazo · {label}</h3>
              <button className="modal__close" onClick={() => setOpen(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <input
              type="search"
              className="deck-picker__search"
              placeholder="Buscar mazo…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              aria-label={`Buscar mazo para ${label}`}
              autoFocus
            />
            <p className="deck-picker__count">{filtered.length} mazos</p>
            <ul className="deck-picker__list">
              {filtered.length === 0 && <li className="deck-picker__empty">Sin resultados.</li>}
              {shown.map((e) => (
                <li key={`${e.kind}:${e.id}`}>
                  <button className="deck-picker__item" onClick={() => choose(e.id, e.kind)}>
                    <span className="deck-picker__name">{e.name}</span>
                    {e.kind === 'preset' && <em className="deck-picker__tag">precargado</em>}
                    {e.kind === 'community' && <em className="deck-picker__tag">comunidad</em>}
                  </button>
                </li>
              ))}
              {filtered.length > shown.length && (
                <li>
                  <button className="deck-picker__more" onClick={() => setLimit((n) => n + PAGE)}>
                    Mostrar más ({filtered.length - shown.length} restantes)
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

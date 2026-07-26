import { useMemo, useState } from 'react';
import { useGameStore, type Side } from '../store/gameStore';
import { PRESET_DECKS } from '../data/decks';

/** Normaliza para buscar: minúsculas y sin acentos. */
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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

  const entries = useMemo(
    () => [
      ...PRESET_DECKS.map((d) => ({ id: d.id, name: d.name, preset: true })),
      ...library.map((d) => ({ id: d.id, name: d.name, preset: false })),
    ],
    [library],
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return q === '' ? entries : entries.filter((e) => norm(e.name).includes(q));
  }, [entries, query]);

  const choose = (id: string, preset: boolean) => {
    if (preset) importPreset(side, id);
    else loadDeckFromLibrary(id, side);
    setOpen(false);
    setQuery('');
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
              onChange={(e) => setQuery(e.target.value)}
              aria-label={`Buscar mazo para ${label}`}
              autoFocus
            />
            <ul className="deck-picker__list">
              {filtered.length === 0 && <li className="deck-picker__empty">Sin resultados.</li>}
              {filtered.map((e) => (
                <li key={e.id}>
                  <button className="deck-picker__item" onClick={() => choose(e.id, e.preset)}>
                    <span className="deck-picker__name">{e.name}</span>
                    {e.preset && <em className="deck-picker__tag">precargado</em>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useGameStore, type Side } from '../store/gameStore';
import { PRESET_DECKS } from '../data/decks';

/** Normaliza para buscar: minúsculas y sin acentos. */
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Selector-buscador de mazo por bando (SPEC-033): precargados primero, luego los guardados en la
 * biblioteca (orden de guardado). Al elegir uno, lo importa en ese bando. Reemplaza al textarea de
 * pegar, que se mueve a la sección DB. */
export function DeckPicker({ side, label }: { side: Side; label: string }) {
  const library = useGameStore((s) => s.library);
  const importPreset = useGameStore((s) => s.importPreset);
  const loadDeckFromLibrary = useGameStore((s) => s.loadDeckFromLibrary);
  const importing = useGameStore((s) => s.sides[side].importStatus === 'importing');
  const [query, setQuery] = useState('');

  // Precargados (fijos) primero, luego los guardados en orden de guardado.
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
  };

  return (
    <section className="deck-picker">
      <h3>Mazo · {label}</h3>
      <input
        type="search"
        className="deck-picker__search"
        placeholder="Buscar mazo…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={`Buscar mazo para ${label}`}
      />
      <ul className="deck-picker__list">
        {filtered.length === 0 && <li className="deck-picker__empty">Sin resultados.</li>}
        {filtered.map((e) => (
          <li key={e.id}>
            <button
              className="deck-picker__item"
              disabled={importing}
              onClick={() => choose(e.id, e.preset)}
            >
              <span className="deck-picker__name">{e.name}</span>
              {e.preset && <em className="deck-picker__tag">precargado</em>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

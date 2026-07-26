import { useMemo, useState } from 'react';
import { useGameStore, type Side } from '../store/gameStore';
import { getAllCards } from '../data/cards';
import { PRESET_DECKS } from '../data/decks';
import type { ArhCard } from '../model/types';

const TYPE_LABEL: Record<string, string> = {
  character: 'Personaje',
  upgrade: 'Mejora',
  downgrade: 'Desmejora',
  support: 'Apoyo',
  event: 'Evento',
  plot: 'Trama',
  battlefield: 'Campo de batalla',
};

/** Normaliza para buscar: minúsculas y sin acentos. */
function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function CardBrowser() {
  const all = getAllCards();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [faction, setFaction] = useState('');
  const [selected, setSelected] = useState<ArhCard | null>(null);
  // Con ~3000 cartas, limitar el render inicial (SPEC-032: "empezar simple").
  const [limit, setLimit] = useState(100);

  // Valores de filtro presentes en el snapshot (no lista cerrada inventada).
  const types = useMemo(() => [...new Set(all.map((c) => c.type_code))].sort(), [all]);
  const factions = useMemo(
    () => [...new Set(all.map((c) => c.faction_code).filter(Boolean) as string[])].sort(),
    [all],
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return all.filter(
      (c) =>
        (q === '' || norm(c.name).includes(q)) &&
        (type === '' || c.type_code === type) &&
        (faction === '' || c.faction_code === faction),
    );
  }, [all, query, type, faction]);

  const shown = filtered.slice(0, limit);

  return (
    <div className="db-browser">
      <div className="db-browser__filters">
        <input
          type="search"
          placeholder="Buscar por nombre…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(100);
          }}
          aria-label="Buscar carta"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t] ?? t}
            </option>
          ))}
        </select>
        <select value={faction} onChange={(e) => setFaction(e.target.value)} aria-label="Filtrar por facción">
          <option value="">Todas las facciones</option>
          {factions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <span className="db-browser__count">{filtered.length} cartas</span>
      </div>

      <div className="db-browser__body">
        <ul className="db-browser__list">
          {filtered.length === 0 && <li className="db-browser__empty">Sin resultados.</li>}
          {shown.map((c) => (
            <li key={c.code}>
              <button
                className={selected?.code === c.code ? 'db-card-row db-card-row--active' : 'db-card-row'}
                onClick={() => setSelected(c)}
              >
                <span className="db-card-row__name">{c.name}</span>
                <span className="db-card-row__meta">
                  {TYPE_LABEL[c.type_code] ?? c.type_code}
                  {c.faction_name ? ` · ${c.faction_name}` : ''}
                </span>
              </button>
            </li>
          ))}
          {filtered.length > shown.length && (
            <li>
              <button className="db-browser__more" onClick={() => setLimit((n) => n + 100)}>
                Mostrar más ({filtered.length - shown.length} restantes)
              </button>
            </li>
          )}
        </ul>

        {selected && (
          <aside className="db-card-detail">
            <h3>{selected.name}</h3>
            <p className="db-card-detail__line">
              {TYPE_LABEL[selected.type_code] ?? selected.type_code}
              {selected.is_unique ? ' · Único' : ''}
            </p>
            {selected.faction_name && <p className="db-card-detail__line">Facción: {selected.faction_name}</p>}
            {selected.set_name && <p className="db-card-detail__line">Set: {selected.set_name}</p>}
            {typeof selected.cost === 'number' && (
              <p className="db-card-detail__line">Coste: {selected.cost}</p>
            )}
            {selected.type_code === 'character' && selected.points && (
              <p className="db-card-detail__line">Puntos: {selected.points}</p>
            )}
            {selected.type_code === 'character' && (
              <p className="db-card-detail__line">Vida: {selected.health}</p>
            )}
            {selected.sides.length > 0 && (
              <p className="db-card-detail__line">Dado: {selected.sides.join('  ')}</p>
            )}
            {selected.text && <p className="db-card-detail__text">{selected.text}</p>}
          </aside>
        )}
      </div>
    </div>
  );
}

/** Panel para pegar/importar un mazo nuevo a la biblioteca (SPEC-033). Autodetecta JSON o text file
 * (SPEC-017); resuelve offline vía snapshot; no carga en ningún bando. */
function DeckImportPanel() {
  const importToLibrary = useGameStore((s) => s.importToLibrary);
  const status = useGameStore((s) => s.libraryImportStatus);
  const error = useGameStore((s) => s.libraryImportError);
  const importing = status === 'importing';
  const [raw, setRaw] = useState('');
  const [name, setName] = useState('');

  const doImport = async () => {
    await importToLibrary(raw, name);
    // Limpia solo si no quedó error (el store deja el error si falló).
    if (useGameStore.getState().libraryImportError === null) {
      setRaw('');
      setName('');
    }
  };

  return (
    <div className="db-import">
      <h3>Importar mazo a la biblioteca</h3>
      <input
        type="text"
        className="db-import__name"
        placeholder="Nombre del mazo…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Nombre del mazo importado"
      />
      <textarea
        className="db-import__textarea"
        placeholder='JSON { "slots": {…} } o el "text file" de ARH DB'
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={5}
        spellCheck={false}
      />
      <button disabled={importing || raw.trim() === '' || name.trim() === ''} onClick={doImport}>
        {importing ? 'Importando…' : 'Importar a la biblioteca'}
      </button>
      {error && (
        <p className="import-panel__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function DeckLibrary() {
  const library = useGameStore((s) => s.library);
  const loadDeckFromLibrary = useGameStore((s) => s.loadDeckFromLibrary);
  const importPreset = useGameStore((s) => s.importPreset);
  const deleteFromLibrary = useGameStore((s) => s.deleteFromLibrary);
  const saveDeckToLibrary = useGameStore((s) => s.saveDeckToLibrary);
  const playerHasDeck = useGameStore((s) => s.sides.player.characters.length > 0);
  const enemyHasDeck = useGameStore((s) => s.sides.enemy.characters.length > 0);
  const [name, setName] = useState('');

  const save = (side: Side) => {
    saveDeckToLibrary(side, name);
    setName('');
  };

  return (
    <div className="db-library">
      <h3>Biblioteca de mazos</h3>

      <div className="db-library__save">
        <input
          type="text"
          placeholder="Nombre del mazo…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre del mazo a guardar"
        />
        <button disabled={!playerHasDeck || name.trim() === ''} onClick={() => save('player')}>
          Guardar mazo del Jugador
        </button>
        <button disabled={!enemyHasDeck || name.trim() === ''} onClick={() => save('enemy')}>
          Guardar mazo del Enemigo
        </button>
      </div>

      <ul className="db-library__list">
        {/* Precargados: fijos, no borrables (SPEC-031/032). */}
        {PRESET_DECKS.map((d) => (
          <li key={d.id} className="db-deck-row db-deck-row--preset">
            <span className="db-deck-row__name">{d.name} <em>(precargado)</em></span>
            <span className="db-deck-row__actions">
              <button onClick={() => importPreset('player', d.id)}>→ Jugador</button>
              <button onClick={() => importPreset('enemy', d.id)}>→ Enemigo</button>
            </span>
          </li>
        ))}
        {/* Guardados por el jugador, en orden de guardado. */}
        {library.map((d) => (
          <li key={d.id} className="db-deck-row">
            <span className="db-deck-row__name">
              {d.name} <em>({d.slots.reduce((n, s) => n + s.qty, 0)} cartas)</em>
            </span>
            <span className="db-deck-row__actions">
              <button onClick={() => loadDeckFromLibrary(d.id, 'player')}>→ Jugador</button>
              <button onClick={() => loadDeckFromLibrary(d.id, 'enemy')}>→ Enemigo</button>
              <button className="db-deck-row__delete" onClick={() => deleteFromLibrary(d.id)}>
                Borrar
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DbSection() {
  return (
    <div className="db-section">
      <DeckImportPanel />
      <DeckLibrary />
      <CardBrowser />
    </div>
  );
}

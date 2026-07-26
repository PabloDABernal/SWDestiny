import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getAllCards, getCardFromSnapshot } from '../data/cards';
import { cardImageUrl } from '../data/cardImages';
import { PRESET_DECKS } from '../data/decks';
import { COMMUNITY_DECKS } from '../data/communityDecks';
import type { ArhCard } from '../model/types';
import type { DeckSlot } from '../import/parseDeck';

const PAGE = 50;

/** Imagen de carta on-demand (SPEC-034): la muestra con <img> (el host no manda CORS); mientras
 * carga hay un placeholder; si falla (404/offline/no cacheada), se oculta y la ficha cae a texto.
 * El estado se resetea al cambiar de `code` (React remonta por `key`). El Service Worker cachea las
 * vistas para offline. */
function CardImage({ code }: { code: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  useEffect(() => {
    const t = setTimeout(() => setState((s) => (s === 'loading' ? 'error' : s)), 15000);
    return () => clearTimeout(t);
  }, []);
  if (state === 'error') return null;
  return (
    <div className={`card-image card-image--${state}`}>
      {state === 'loading' && <span className="card-image__ph">Cargando imagen…</span>}
      <img
        src={cardImageUrl(code)}
        alt={`Carta ${code}`}
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
        style={state === 'loaded' ? undefined : { display: 'none' }}
      />
    </div>
  );
}

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

/** Puntos de un personaje según `points` "normal/elite" (o "n"): usa elite si `isElite`. */
function characterPoints(pointsStr: string | undefined, isElite: boolean): number {
  if (!pointsStr) return 0;
  const parts = pointsStr.split('/');
  const raw = isElite && parts.length > 1 ? parts[1] : parts[0];
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function CardBrowser() {
  const all = getAllCards();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [faction, setFaction] = useState('');
  const [set, setSet] = useState('');
  const [selected, setSelected] = useState<ArhCard | null>(null);
  const [limit, setLimit] = useState(100);

  // Valores de filtro presentes en el snapshot (siempre la lista completa, no acotada por otros).
  const types = useMemo(() => [...new Set(all.map((c) => c.type_code))].sort(), [all]);
  const factions = useMemo(
    () => [...new Set(all.map((c) => c.faction_code).filter(Boolean) as string[])].sort(),
    [all],
  );
  const sets = useMemo(
    () =>
      [...new Map(all.filter((c) => c.set_code).map((c) => [c.set_code!, c.set_name ?? c.set_code!])).entries()].sort(
        (a, b) => a[1].localeCompare(b[1]),
      ),
    [all],
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return all.filter(
      (c) =>
        (q === '' || norm(c.name).includes(q)) &&
        (type === '' || c.type_code === type) &&
        (faction === '' || c.faction_code === faction) &&
        (set === '' || c.set_code === set),
    );
  }, [all, query, type, faction, set]);

  const shown = filtered.slice(0, limit);

  return (
    <div className="db-browser">
      <h3>Cartas</h3>
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
        <select value={set} onChange={(e) => setSet(e.target.value)} aria-label="Filtrar por set">
          <option value="">Todos los sets</option>
          {sets.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
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
            <CardImage key={selected.code} code={selected.code} />
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
 * (SPEC-017); resuelve offline vía snapshot; no carga en ningún bando. Llama `onImported` al éxito. */
function DeckImportPanel({ onImported }: { onImported?: () => void }) {
  const importToLibrary = useGameStore((s) => s.importToLibrary);
  const status = useGameStore((s) => s.libraryImportStatus);
  const error = useGameStore((s) => s.libraryImportError);
  const importing = status === 'importing';
  const [raw, setRaw] = useState('');
  const [name, setName] = useState('');

  const doImport = async () => {
    await importToLibrary(raw, name);
    if (useGameStore.getState().libraryImportError === null) {
      setRaw('');
      setName('');
      onImported?.();
    }
  };

  return (
    <div className="db-import">
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

/** Botón "Importar mazo" que abre el panel de importar en un pop-up (SPEC-036). */
function DeckImportButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="db-import-launch">
      <button onClick={() => setOpen(true)}>Importar mazo</button>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <h3>Importar mazo a la biblioteca</h3>
              <button className="modal__close" onClick={() => setOpen(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <DeckImportPanel onImported={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

type DeckOrigin = 'preset' | 'community' | 'saved';
interface DeckEntry {
  id: string;
  name: string;
  origin: DeckOrigin;
  slots: DeckSlot[];
  search: string;
}

function buildEntry(d: { id: string; name: string; slots: DeckSlot[] }, origin: DeckOrigin): DeckEntry {
  const cardNames = d.slots.map((s) => getCardFromSnapshot(s.code)?.name ?? s.code).join(' ');
  return { id: d.id, name: d.name, origin, slots: d.slots, search: norm(`${d.name} ${cardNames}`) };
}

// Índice de búsqueda de los mazos bundleados (precargados + comunidad): estáticos, se calcula UNA
// vez de forma perezosa (en el primer uso del explorador), no en el arranque de la app (SPEC-036).
let bundledCache: DeckEntry[] | null = null;
function bundledEntries(): DeckEntry[] {
  if (bundledCache === null) {
    bundledCache = [
      ...PRESET_DECKS.map((d) => buildEntry(d, 'preset')),
      ...COMMUNITY_DECKS.map((d) => buildEntry(d, 'community')),
    ];
  }
  return bundledCache;
}

const ORIGIN_TAG: Record<DeckOrigin, string> = {
  preset: 'precargado',
  community: 'comunidad',
  saved: 'guardado',
};

/** Explorador de mazos (SPEC-036): todos los mazos (precargados + comunidad + guardados), buscador
 * único (nombre/personaje/carta) y vista de las cartas del mazo. Solo lectura (cargar a un bando se
 * hace en "Jugar → Elegir mazo"); los guardados se pueden borrar. */
interface DeckActions {
  onCreate: () => void;
  onEdit: (d: DeckEntry) => void;
  onDuplicate: (d: DeckEntry) => void;
}

function DeckExplorer({ onCreate, onEdit, onDuplicate }: DeckActions) {
  const library = useGameStore((s) => s.library);
  const deleteFromLibrary = useGameStore((s) => s.deleteFromLibrary);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const savedEntries = useMemo(() => library.map((d) => buildEntry(d, 'saved')), [library]);
  const entries = useMemo(() => [...bundledEntries(), ...savedEntries], [savedEntries]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return q === '' ? entries : entries.filter((e) => e.search.includes(q));
  }, [entries, query]);

  const shown = filtered.slice(0, limit);
  const selected = selectedId === null ? null : entries.find((e) => e.id === selectedId) ?? null;

  // Cartas del mazo seleccionado, personajes primero.
  const cards = useMemo(() => {
    if (!selected) return [];
    return selected.slots
      .map((s) => {
        const card = getCardFromSnapshot(s.code);
        return { name: card?.name ?? s.code, qty: s.qty, isCharacter: card?.type_code === 'character' };
      })
      .sort((a, b) => (a.isCharacter === b.isCharacter ? 0 : a.isCharacter ? -1 : 1));
  }, [selected]);

  return (
    <div className="db-explorer">
      <div className="db-explorer__head">
        <h3>Mazos</h3>
        <span className="db-explorer__actions">
          <button onClick={onCreate}>Crear mazo</button>
          <DeckImportButton />
        </span>
      </div>
      <input
        type="search"
        className="db-explorer__search"
        placeholder="Buscar por nombre, personaje o carta…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(PAGE);
        }}
        aria-label="Buscar mazo"
      />
      <p className="db-explorer__count">{filtered.length} mazos</p>

      <div className="db-explorer__body">
        <ul className="db-explorer__list">
          {filtered.length === 0 && <li className="db-explorer__empty">Sin resultados.</li>}
          {shown.map((e) => (
            <li key={`${e.origin}:${e.id}`} className="db-deck-row">
              <button
                className={selectedId === e.id ? 'db-deck-row__pick db-deck-row__pick--active' : 'db-deck-row__pick'}
                onClick={() => setSelectedId(e.id)}
              >
                <span className="db-deck-row__name">{e.name}</span>
                <em className="db-deck-row__tag">{ORIGIN_TAG[e.origin]}</em>
              </button>
              {e.origin === 'saved' ? (
                <>
                  <button className="db-deck-row__edit" onClick={() => onEdit(e)}>
                    Editar
                  </button>
                  <button className="db-deck-row__delete" onClick={() => deleteFromLibrary(e.id)}>
                    Borrar
                  </button>
                </>
              ) : (
                <button className="db-deck-row__edit" onClick={() => onDuplicate(e)}>
                  Duplicar
                </button>
              )}
            </li>
          ))}
          {filtered.length > shown.length && (
            <li>
              <button className="db-explorer__more" onClick={() => setLimit((n) => n + PAGE)}>
                Mostrar más ({filtered.length - shown.length} restantes)
              </button>
            </li>
          )}
        </ul>

        {selected && (
          <aside className="db-deck-detail">
            <h3>{selected.name}</h3>
            <p className="db-deck-detail__meta">
              {ORIGIN_TAG[selected.origin]} · {selected.slots.reduce((n, s) => n + s.qty, 0)} cartas
            </p>
            <ul className="db-deck-detail__cards">
              {cards.map((c, i) => (
                <li key={i} className={c.isCharacter ? 'db-deck-detail__card db-deck-detail__card--char' : 'db-deck-detail__card'}>
                  {c.qty}× {c.name}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

interface BuilderInit {
  editingId: string | null;
  name: string;
  slots: Record<string, number>;
}

/** Constructor de mazos (SPEC-037): navegador de cartas con +/− y panel del mazo con contadores.
 * Libre (no valida reglas). Guardar requiere nombre + ≥1 personaje. */
function DeckBuilder({ init, onClose }: { init: BuilderInit; onClose: () => void }) {
  const upsertLibraryDeck = useGameStore((s) => s.upsertLibraryDeck);
  const all = getAllCards();
  const [name, setName] = useState(init.name);
  const [slots, setSlots] = useState<Record<string, number>>(init.slots);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [faction, setFaction] = useState('');
  const [set, setSet] = useState('');
  const [limit, setLimit] = useState(80);

  const types = useMemo(() => [...new Set(all.map((c) => c.type_code))].sort(), [all]);
  const factions = useMemo(
    () => [...new Set(all.map((c) => c.faction_code).filter(Boolean) as string[])].sort(),
    [all],
  );
  const sets = useMemo(
    () =>
      [...new Map(all.filter((c) => c.set_code).map((c) => [c.set_code!, c.set_name ?? c.set_code!])).entries()].sort(
        (a, b) => a[1].localeCompare(b[1]),
      ),
    [all],
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return all.filter(
      (c) =>
        (q === '' || norm(c.name).includes(q)) &&
        (type === '' || c.type_code === type) &&
        (faction === '' || c.faction_code === faction) &&
        (set === '' || c.set_code === set),
    );
  }, [all, query, type, faction, set]);
  const shown = filtered.slice(0, limit);

  const add = (code: string, delta: number) =>
    setSlots((s) => {
      const q = (s[code] ?? 0) + delta;
      const next = { ...s };
      if (q <= 0) delete next[code];
      else next[code] = q;
      return next;
    });

  // Agrupa el mazo en construcción y calcula contadores.
  const entries = Object.entries(slots).map(([code, qty]) => {
    const card = getCardFromSnapshot(code);
    return { code, qty, card, kind: card?.type_code };
  });
  const chars = entries.filter((e) => e.kind === 'character');
  const battlefields = entries.filter((e) => e.kind === 'battlefield');
  const deckCards = entries.filter((e) => e.kind !== 'character' && e.kind !== 'battlefield');
  const points = chars.reduce(
    (n, e) => n + characterPoints(e.card?.points, !!e.card?.is_unique && e.qty >= 2) ,
    0,
  );
  const deckCardCount = deckCards.reduce((n, e) => n + e.qty, 0);

  const canSave = name.trim() !== '' && chars.length > 0;
  const save = () => {
    if (!canSave) return;
    const deckSlots: DeckSlot[] = Object.entries(slots).map(([code, qty]) => ({ code, qty }));
    upsertLibraryDeck({ id: init.editingId ?? undefined, name, slots: deckSlots });
    onClose();
  };

  const row = (e: { code: string; qty: number; card: ArhCard | null }) => (
    <li key={e.code} className={e.qty > 2 ? 'db-build__deckrow db-build__deckrow--over' : 'db-build__deckrow'}>
      <span>
        {e.qty}× {e.card?.name ?? e.code}
      </span>
      <span className="db-build__qty">
        <button onClick={() => add(e.code, -1)} aria-label="Quitar una">−</button>
        <button onClick={() => add(e.code, 1)} aria-label="Añadir una">+</button>
      </span>
    </li>
  );

  return (
    <div className="db-build">
      <div className="db-build__head">
        <button onClick={onClose}>← Volver</button>
        <input
          type="text"
          className="db-build__name"
          placeholder="Nombre del mazo…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Nombre del mazo"
        />
        <button disabled={!canSave} onClick={save} title={!canSave ? 'Pon nombre y al menos un personaje' : undefined}>
          Guardar
        </button>
      </div>

      <div className="db-build__body">
        <div className="db-build__browser">
          <div className="db-browser__filters">
            <input
              type="search"
              placeholder="Buscar carta…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(80);
              }}
              aria-label="Buscar carta"
            />
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo">
              <option value="">Tipo</option>
              {types.map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>
              ))}
            </select>
            <select value={faction} onChange={(e) => setFaction(e.target.value)} aria-label="Facción">
              <option value="">Facción</option>
              {factions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select value={set} onChange={(e) => setSet(e.target.value)} aria-label="Set">
              <option value="">Set</option>
              {sets.map(([code, n]) => (
                <option key={code} value={code}>{n}</option>
              ))}
            </select>
          </div>
          <ul className="db-build__cardlist">
            {shown.map((c) => (
              <li key={c.code} className="db-build__cardrow">
                <button className="db-build__addbtn" onClick={() => add(c.code, 1)} aria-label={`Añadir ${c.name}`}>+</button>
                <span className="db-build__cardname">{c.name}</span>
                <span className="db-card-row__meta">
                  {TYPE_LABEL[c.type_code] ?? c.type_code}
                  {slots[c.code] ? ` · ×${slots[c.code]}` : ''}
                </span>
              </li>
            ))}
            {filtered.length > shown.length && (
              <li>
                <button className="db-browser__more" onClick={() => setLimit((n) => n + 80)}>
                  Mostrar más ({filtered.length - shown.length})
                </button>
              </li>
            )}
          </ul>
        </div>

        <aside className="db-build__deck">
          <p className="db-build__counters">
            Personajes: {points} pts · Cartas: {deckCardCount}
          </p>
          {chars.length > 0 && <h4>Personajes</h4>}
          <ul className="db-build__deckcards">{chars.map(row)}</ul>
          {battlefields.length > 0 && <h4>Campo de batalla</h4>}
          <ul className="db-build__deckcards">{battlefields.map(row)}</ul>
          <h4>Mazo ({deckCardCount})</h4>
          <ul className="db-build__deckcards">{deckCards.map(row)}</ul>
          {Object.keys(slots).length === 0 && <p className="db-explorer__empty">Añade cartas con el botón +.</p>}
        </aside>
      </div>
    </div>
  );
}

export function DbSection() {
  const [builder, setBuilder] = useState<BuilderInit | null>(null);

  const fromSlots = (s: DeckSlot[]): Record<string, number> =>
    Object.fromEntries(s.map((x) => [x.code, x.qty]));

  if (builder) {
    return (
      <div className="db-section">
        <DeckBuilder init={builder} onClose={() => setBuilder(null)} />
      </div>
    );
  }

  return (
    <div className="db-section">
      <DeckExplorer
        onCreate={() => setBuilder({ editingId: null, name: '', slots: {} })}
        onEdit={(d) => setBuilder({ editingId: d.id, name: d.name, slots: fromSlots(d.slots) })}
        onDuplicate={(d) => setBuilder({ editingId: null, name: `Copia de ${d.name}`, slots: fromSlots(d.slots) })}
      />
      <CardBrowser />
    </div>
  );
}

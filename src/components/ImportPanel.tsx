import { useState } from 'react';
import { useGameStore, type Side } from '../store/gameStore';

/** Panel de importar mazo. Una vez el bando ya tiene mazo importado, se colapsa a un botón
 * pequeño ("Reimportar mazo") en vez de dejar el textarea siempre visible: ocupaba mucho alto y
 * obligaba a hacer scroll para ver el resto del bando (detectado jugando SPEC-025). */
export function ImportPanel({ side, label }: { side: Side; label: string }) {
  const [raw, setRaw] = useState('');
  const [manualExpanded, setManualExpanded] = useState(false);
  const importDeck = useGameStore((s) => s.importDeck);
  const status = useGameStore((s) => s.sides[side].importStatus);
  const error = useGameStore((s) => s.sides[side].importError);
  const hasDeck = useGameStore((s) => s.sides[side].characters.length > 0);
  const importing = status === 'importing';
  const showForm = !hasDeck || manualExpanded || !!error;

  if (!showForm) {
    return (
      <section className="import-panel import-panel--collapsed">
        <button onClick={() => setManualExpanded(true)}>Reimportar mazo</button>
      </section>
    );
  }

  return (
    <section className="import-panel">
      <h3>Importar mazo · {label}</h3>
      <textarea
        className="import-panel__textarea"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder='{ "slots": { "15040": 2, "20013": 2 } }'
        rows={5}
        spellCheck={false}
      />
      <div className="import-panel__actions">
        <button onClick={() => importDeck(side, raw)} disabled={importing || raw.trim() === ''}>
          {importing ? 'Importando…' : 'Importar'}
        </button>
        {hasDeck && (
          <button onClick={() => setManualExpanded(false)}>Cancelar</button>
        )}
      </div>
      {error && (
        <p className="import-panel__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

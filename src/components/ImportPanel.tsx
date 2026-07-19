import { useState } from 'react';
import { useGameStore, type Side } from '../store/gameStore';

export function ImportPanel({ side, label }: { side: Side; label: string }) {
  const [raw, setRaw] = useState('');
  const importDeck = useGameStore((s) => s.importDeck);
  const status = useGameStore((s) => s.sides[side].importStatus);
  const error = useGameStore((s) => s.sides[side].importError);
  const importing = status === 'importing';

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
      </div>
      {error && (
        <p className="import-panel__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

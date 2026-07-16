import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function ImportPanel() {
  const [raw, setRaw] = useState('');
  const importDeck = useGameStore((s) => s.importDeck);
  const status = useGameStore((s) => s.status);
  const error = useGameStore((s) => s.error);
  const importing = status === 'importing';

  return (
    <section className="import-panel">
      <h2>Importar mazo</h2>
      <p className="import-panel__hint">
        Pega aquí el JSON exportado de un mazo desde ARH DB y pulsa Importar.
      </p>
      <textarea
        className="import-panel__textarea"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder='{ "slots": { "15040": 2, "20013": 2 } }'
        rows={8}
        spellCheck={false}
      />
      <div className="import-panel__actions">
        <button onClick={() => importDeck(raw)} disabled={importing || raw.trim() === ''}>
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

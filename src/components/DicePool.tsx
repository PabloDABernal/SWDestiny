import { useGameStore } from '../store/gameStore';
import { parseDamage } from '../game/damage';

export function DicePool() {
  const pool = useGameStore((s) => s.pool);
  const reset = useGameStore((s) => s.reset);
  const selectedDie = useGameStore((s) => s.selectedDie);
  const selectDie = useGameStore((s) => s.selectDie);

  return (
    <section className="pool">
      <div className="pool__head">
        <h2>Pool de dados ({pool.length})</h2>
        <button onClick={reset} disabled={pool.length === 0}>
          Reset
        </button>
      </div>
      {selectedDie !== null && (
        <p className="pool__hint">Dado de daño seleccionado. Pulsa un personaje para aplicarlo.</p>
      )}
      {pool.length === 0 ? (
        <p className="pool__empty">Activa un personaje para tirar sus dados aquí.</p>
      ) : (
        <div className="pool__dice">
          {pool.map((d, i) => {
            const isDamage = parseDamage(d.face) !== null;
            const selected = selectedDie === i;
            return (
              <button
                key={i}
                className={`pool-die${isDamage ? ' pool-die--damage' : ''}${selected ? ' pool-die--selected' : ''}`}
                title={`${d.name} · dado ${d.dieIndex + 1}`}
                onClick={() => selectDie(i)}
                disabled={!isDamage}
              >
                <span className="pool-die__face">{d.face}</span>
                <span className="pool-die__owner">{d.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

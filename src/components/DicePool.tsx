import { useGameStore } from '../store/gameStore';

export function DicePool() {
  const pool = useGameStore((s) => s.pool);
  const reset = useGameStore((s) => s.reset);

  return (
    <section className="pool">
      <div className="pool__head">
        <h2>Pool de dados ({pool.length})</h2>
        <button onClick={reset} disabled={pool.length === 0}>
          Reset
        </button>
      </div>
      {pool.length === 0 ? (
        <p className="pool__empty">Activa un personaje para tirar sus dados aquí.</p>
      ) : (
        <div className="pool__dice">
          {pool.map((d, i) => (
            <div className="pool-die" key={i} title={`${d.name} · dado ${d.dieIndex + 1}`}>
              <span className="pool-die__face">{d.face}</span>
              <span className="pool-die__owner">{d.name}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

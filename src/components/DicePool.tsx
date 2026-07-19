import { useGameStore, type Side } from '../store/gameStore';
import { parseDamage, parseShield } from '../game/damage';

export function DicePool({ side }: { side: Side }) {
  const pool = useGameStore((s) => s.sides[side].pool);
  const selection = useGameStore((s) => s.selection);
  const selectDie = useGameStore((s) => s.selectDie);

  return (
    <div className="pool">
      <div className="pool__head">
        <span className="pool__title">Pool ({pool.length})</span>
      </div>
      {pool.length === 0 ? (
        <p className="pool__empty">Sin dados.</p>
      ) : (
        <div className="pool__dice">
          {pool.map((d, i) => {
            const isDamage = parseDamage(d.face) !== null;
            const isShield = parseShield(d.face) !== null;
            const selected = selection?.side === side && selection?.poolIndex === i;
            return (
              <button
                key={i}
                className={`pool-die${isDamage ? ' pool-die--damage' : ''}${isShield ? ' pool-die--shield' : ''}${selected ? ' pool-die--selected' : ''}`}
                title={`${d.name} · dado ${d.dieIndex + 1}`}
                onClick={() => selectDie(side, i)}
                disabled={!isDamage && !isShield}
              >
                <span className="pool-die__face">{d.face}</span>
                <span className="pool-die__owner">{d.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

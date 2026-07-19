import { useGameStore, type Side } from '../store/gameStore';
import { parseDamage, parseShield, parseResource } from '../game/damage';

export function DicePool({ side }: { side: Side }) {
  const pool = useGameStore((s) => s.sides[side].pool);
  const resources = useGameStore((s) => s.sides[side].resources);
  const selection = useGameStore((s) => s.selection);
  const selectDie = useGameStore((s) => s.selectDie);
  const resolveResource = useGameStore((s) => s.resolveResource);

  return (
    <div className="pool">
      <div className="pool__head">
        <span className="pool__title">Pool ({pool.length})</span>
        {resources > 0 && <span className="pool__resources">💰 {resources}</span>}
      </div>
      {pool.length === 0 ? (
        <p className="pool__empty">Sin dados.</p>
      ) : (
        <div className="pool__dice">
          {pool.map((d, i) => {
            const isDamage = parseDamage(d.face) !== null;
            const isShield = parseShield(d.face) !== null;
            const isResource = parseResource(d.face) !== null;
            const selected = selection?.side === side && selection?.poolIndex === i;
            // Un dado de recurso se resuelve de un clic (sin objetivo) y se bloquea mientras
            // haya cualquier selección de daño/escudo pendiente (SPEC-006).
            const disabled = isResource
              ? selection !== null
              : !isDamage && !isShield;
            return (
              <button
                key={i}
                className={`pool-die${isDamage ? ' pool-die--damage' : ''}${isShield ? ' pool-die--shield' : ''}${isResource ? ' pool-die--resource' : ''}${selected ? ' pool-die--selected' : ''}`}
                title={`${d.name} · dado ${d.dieIndex + 1}`}
                onClick={() => (isResource ? resolveResource(side, i) : selectDie(side, i))}
                disabled={disabled}
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

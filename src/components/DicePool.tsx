import { useGameStore, type Side } from '../store/gameStore';
import { dieSymbol } from '../game/damage';

export function DicePool({ side }: { side: Side }) {
  const pool = useGameStore((s) => s.sides[side].pool);
  const resources = useGameStore((s) => s.sides[side].resources);
  const resolve = useGameStore((s) => s.resolve);
  const selectDie = useGameStore((s) => s.selectDie);
  const resolveResources = useGameStore((s) => s.resolveResources);
  const cancelResolve = useGameStore((s) => s.cancelResolve);
  const reset = useGameStore((s) => s.reset);
  const resolveError = useGameStore((s) => s.resolveError);

  // El jugador solo resuelve su propio pool (SPEC-008a). El pool enemigo se muestra estático.
  const interactive = side === 'player';
  const mode = resolve && resolve.side === side ? resolve : null;

  return (
    <div className="pool">
      <div className="pool__head">
        <span className="pool__title">Pool ({pool.length})</span>
        {resources > 0 && <span className="pool__resources">💰 {resources}</span>}
        {interactive && (
          <button className="pool__reset" onClick={reset}>
            Reset
          </button>
        )}
      </div>

      {interactive && mode && (
        <div className="pool__mode">
          <span className="pool__mode-label">
            Resolviendo: {symbolLabel(mode.symbol)} ({mode.marked.length} marcado/s)
          </span>
          {mode.symbol === 'resource' && (
            <button onClick={resolveResources} disabled={mode.marked.length === 0}>
              Resolver recursos
            </button>
          )}
          <button onClick={cancelResolve}>Cancelar</button>
        </div>
      )}

      {interactive && resolveError && (
        <p className="import-panel__error pool__error">{resolveError}</p>
      )}

      {pool.length === 0 ? (
        <p className="pool__empty">Sin dados.</p>
      ) : (
        <div className="pool__dice">
          {pool.map((d, i) => {
            const symbol = dieSymbol(d.face);
            const selectable = interactive && symbol !== null;
            const marked = mode !== null && mode.marked.includes(i);
            // En un modo activo, los dados de otro símbolo se atenúan (siguen clicables: clicarlos
            // reemplaza el modo, SPEC-008a); las caras no resolubles quedan deshabilitadas.
            const dimmed = mode !== null && symbol !== null && symbol !== mode.symbol;
            const cls =
              'pool-die' +
              (symbol ? ` pool-die--${symbolClass(symbol)}` : '') +
              (marked ? ' pool-die--selected' : '') +
              (dimmed ? ' pool-die--dimmed' : '');
            return (
              <button
                key={i}
                className={cls}
                title={`${d.name} · dado ${d.dieIndex + 1}`}
                onClick={selectable ? () => selectDie(side, i) : undefined}
                disabled={!selectable}
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

function symbolLabel(s: string): string {
  switch (s) {
    case 'melee':
      return 'daño melee';
    case 'ranged':
      return 'daño ranged';
    case 'indirect':
      return 'daño indirecto';
    case 'shield':
      return 'escudo';
    case 'resource':
      return 'recurso';
    default:
      return s;
  }
}

function symbolClass(s: string): string {
  if (s === 'shield') return 'shield';
  if (s === 'resource') return 'resource';
  return 'damage';
}

import { useGameStore, type Side } from '../store/gameStore';
import { dieSymbol, parsePlayerFace, isGenericModifier } from '../game/damage';
import { readCache } from '../import/resolveCards';

/** Suma de valores (base + modificador) de los dados marcados de `pool` (SPEC-023: presupuesto de
 * cuántos dados objetivo puede girar Focus / rerollear Reroll de dado). */
function budgetTotal(pool: { face: string }[], marked: number[]): number {
  return marked.reduce((sum, i) => {
    const p = pool[i] ? parsePlayerFace(pool[i].face) : null;
    return p ? sum + p.amount : sum;
  }, 0);
}

export function DicePool({ side }: { side: Side }) {
  const pool = useGameStore((s) => s.sides[side].pool);
  const resources = useGameStore((s) => s.sides[side].resources);
  const resolve = useGameStore((s) => s.resolve);
  const playerPool = useGameStore((s) => s.sides.player.pool);
  const selectDie = useGameStore((s) => s.selectDie);
  const resolveResources = useGameStore((s) => s.resolveResources);
  const resolveSpecial = useGameStore((s) => s.resolveSpecial);
  const resolveIndirect = useGameStore((s) => s.resolveIndirect);
  const pickFocusTarget = useGameStore((s) => s.pickFocusTarget);
  const chooseFocusFace = useGameStore((s) => s.chooseFocusFace);
  const confirmFocus = useGameStore((s) => s.confirmFocus);
  const pickRerollTarget = useGameStore((s) => s.pickRerollTarget);
  const confirmReroll = useGameStore((s) => s.confirmReroll);
  const cancelResolve = useGameStore((s) => s.cancelResolve);
  const turn = useGameStore((s) => s.turn);
  const resolveError = useGameStore((s) => s.resolveError);

  // El jugador solo ARRANCA la resolución de su propio pool (SPEC-008a).
  const interactive = side === 'player';
  const mode = resolve && resolve.side === side ? resolve : null;

  // SPEC-023: mientras se resuelve un Reroll de dado del jugador, CUALQUIER pool (incluido el
  // rival, aquí "enemy") acepta clics para elegir dados objetivo — única vía por la que el pool
  // enemigo deja de ser puramente estático.
  const rerollMode = resolve && resolve.side === 'player' && resolve.symbol === 'reroll' ? resolve : null;
  const rerollBudget = rerollMode
    ? budgetTotal(playerPool, rerollMode.marked) - (rerollMode.rerollTargets?.length ?? 0)
    : 0;

  const focusBudget =
    mode && mode.symbol === 'focus'
      ? budgetTotal(pool, mode.marked) - (mode.focusPicks?.length ?? 0)
      : 0;
  const focusFaceChoiceDie =
    mode && mode.symbol === 'focus' && mode.focusFaceChoice != null ? pool[mode.focusFaceChoice] : null;
  const focusFaceChoiceSides = focusFaceChoiceDie ? readCache(focusFaceChoiceDie.code)?.sides ?? [] : [];

  return (
    <div className="pool">
      <div className="pool__head">
        <span className="pool__title">Pool ({pool.length})</span>
        {resources > 0 && <span className="pool__resources">💰 {resources}</span>}
      </div>

      {interactive && mode && (
        <div className="pool__mode">
          {mode.symbol === 'focus' && mode.focusFaceChoice != null ? (
            <span className="pool__mode-label">Elige la nueva cara para el dado girado.</span>
          ) : (
            <span className="pool__mode-label">
              Resolviendo: {symbolLabel(mode.symbol)} ({mode.marked.length} marcado/s)
              {mode.symbol === 'focus' && ` · presupuesto restante para girar: ${focusBudget}`}
              {mode.symbol === 'reroll' && ` · presupuesto restante para rerollear: ${rerollBudget}`}
            </span>
          )}
          {mode.symbol === 'resource' && (
            <button onClick={resolveResources} disabled={mode.marked.length === 0}>
              Resolver recursos
            </button>
          )}
          {mode.symbol === 'special' && (
            <button onClick={resolveSpecial} disabled={mode.marked.length === 0}>
              Resolver especial
            </button>
          )}
          {mode.symbol === 'indirect' && (
            <button onClick={resolveIndirect} disabled={mode.marked.length === 0}>
              Resolver indirecto
            </button>
          )}
          {mode.symbol === 'focus' && mode.focusFaceChoice == null && (
            <button onClick={confirmFocus} disabled={(mode.focusPicks?.length ?? 0) === 0}>
              Confirmar focus
            </button>
          )}
          {mode.symbol === 'reroll' && (
            <button onClick={confirmReroll} disabled={(mode.rerollTargets?.length ?? 0) === 0}>
              Confirmar reroll
            </button>
          )}
          <button onClick={cancelResolve}>Cancelar</button>
        </div>
      )}

      {!interactive && rerollMode && (
        <div className="pool__mode">
          <span className="pool__mode-label">
            Reroll de dado del jugador: elige dados de este pool para rerollear (presupuesto
            restante: {rerollBudget}).
          </span>
        </div>
      )}

      {interactive && resolveError && (
        <p className="import-panel__error pool__error">{resolveError}</p>
      )}

      {focusFaceChoiceDie && (
        <div className="pool__mode pool__focus-faces">
          <span className="pool__mode-label">Nueva cara para el dado de {focusFaceChoiceDie.name}:</span>
          <div className="pool__focus-face-options">
            {focusFaceChoiceSides.map((face, i) => (
              <button key={i} onClick={() => chooseFocusFace(face)}>
                {face}
              </button>
            ))}
          </div>
        </div>
      )}

      {pool.length === 0 ? (
        <p className="pool__empty">Sin dados.</p>
      ) : (
        <div className="pool__dice">
          {pool.map((d, i) => {
            const symbol = dieSymbol(d.face);
            const isGeneric = isGenericModifier(d.face);
            const isMarked = mode !== null && mode.marked.includes(i);
            const isFocusPick =
              mode !== null && mode.symbol === 'focus' && (mode.focusPicks ?? []).some((p) => p.poolIndex === i);
            const isRerollTarget =
              rerollMode !== null && (rerollMode.rerollTargets ?? []).some((t) => t.side === side && t.poolIndex === i);

            // Elegir dado objetivo de Focus (SPEC-023): dado propio sin resolver, distinto de los
            // ya marcados (fuente) o ya girados, mientras quede presupuesto y no haya una elección
            // de cara pendiente. Un dado que él mismo muestra Focus se marca como fuente adicional
            // (más presupuesto, `canSelect`) en vez de elegirse como objetivo, para no ambiguar el
            // clic entre "sumar presupuesto" y "girar este dado". Un modificador genérico +X* sin
            // marcar (SPEC-027) tiene el mismo trato: puede sumarse como fuente a la tanda de Focus
            // en curso, así que tampoco cuenta como objetivo a elegir (si no, el clic sería ambiguo
            // y nunca se podría marcar como modificador mientras Focus está abierto).
            const canPickFocusTarget =
              interactive &&
              mode !== null &&
              mode.symbol === 'focus' &&
              mode.focusFaceChoice == null &&
              symbol !== 'focus' &&
              !isGeneric &&
              !isMarked &&
              !isFocusPick &&
              focusBudget > 0;

            // Elegir dado objetivo de Reroll de dado (SPEC-023): CUALQUIER dado sin resolver, de
            // cualquier pool, salvo los propios dados de Reroll marcados (fuente). Mismo criterio
            // que Focus para un dado que él mismo muestra Reroll (se suma como fuente, no objetivo);
            // un modificador genérico +X* sin marcar (SPEC-027) también queda excluido por el mismo
            // motivo. Un dado ya elegido se puede volver a clicar para quitarlo (toggle).
            const canPickRerollTarget =
              rerollMode !== null &&
              !(side === 'player' && rerollMode.marked.includes(i)) &&
              (isRerollTarget || (symbol !== 'reroll' && !isGeneric && rerollBudget > 0));

            // Arrancar un modo nuevo, o seguir marcando/desmarcando dados del MISMO símbolo ya en
            // curso (incluye sumar más presupuesto de Focus/Reroll, SPEC-008a/023): mismo `selectDie`
            // genérico de siempre. Arrancar un modo nuevo exige además que sea tu turno (SPEC-025);
            // si el modo ya está abierto, por invariante turn === 'player' desde que se abrió, así
            // que el chequeo no cambia el comportamiento de seguir marcando/desmarcando.
            // Modificador genérico +X* (SPEC-027): no tiene símbolo propio (no puede abrir modo por
            // sí solo), pero cuenta como "del símbolo del modo abierto" para cualquier símbolo salvo
            // especial (valor fijo, no modificable).
            const canSelect =
              interactive &&
              turn === 'player' &&
              (mode === null
                ? symbol !== null
                : mode.focusFaceChoice == null && (mode.symbol === symbol || (isGeneric && mode.symbol !== 'special')));

            const onClick = canPickFocusTarget
              ? () => pickFocusTarget(i)
              : canPickRerollTarget
                ? () => pickRerollTarget(side, i)
                : canSelect
                  ? () => selectDie(side, i)
                  : undefined;

            const marked = isMarked || isRerollTarget || isFocusPick;
            const dimmed = mode !== null && symbol !== null && symbol !== mode.symbol && !canPickRerollTarget;
            const cls =
              'pool-die' +
              (symbol ? ` pool-die--${symbolClass(symbol)}` : isGeneric ? ' pool-die--generic' : '') +
              (marked ? ' pool-die--selected' : '') +
              (dimmed ? ' pool-die--dimmed' : '') +
              (canPickFocusTarget || canPickRerollTarget ? ' pool-die--pickable' : '');
            return (
              <button
                key={i}
                className={cls}
                title={`${d.name} · dado ${d.dieIndex + 1}`}
                onClick={onClick}
                disabled={!onClick}
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
    case 'focus':
      return 'focus';
    case 'reroll':
      return 'reroll de dado';
    case 'special':
      return 'especial';
    default:
      return s;
  }
}

function symbolClass(s: string): string {
  if (s === 'shield') return 'shield';
  if (s === 'resource') return 'resource';
  if (s === 'focus' || s === 'reroll' || s === 'special') return 'utility';
  return 'damage';
}

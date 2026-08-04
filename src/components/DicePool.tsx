import { useGameStore, type Side } from '../store/gameStore';
import { dieSymbol, parsePlayerFace, isGenericModifier } from '../game/damage';
import { readCache } from '../import/resolveCards';
import { LUMINARA_CODE, VADER_CODE } from '../game/characterAbilities';

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
  const resolveDisrupt = useGameStore((s) => s.resolveDisrupt);
  const resolveDiscard = useGameStore((s) => s.resolveDiscard);
  const pickFocusTarget = useGameStore((s) => s.pickFocusTarget);
  const chooseFocusFace = useGameStore((s) => s.chooseFocusFace);
  const confirmFocus = useGameStore((s) => s.confirmFocus);
  const pickRerollTarget = useGameStore((s) => s.pickRerollTarget);
  const abilityTargeting = useGameStore((s) => s.abilityTargeting);
  const pickAbilityDie = useGameStore((s) => s.pickAbilityDie);
  const confirmReroll = useGameStore((s) => s.confirmReroll);
  const pickLuminaraTarget = useGameStore((s) => s.pickLuminaraTarget);
  const cancelResolve = useGameStore((s) => s.cancelResolve);
  const turn = useGameStore((s) => s.turn);
  const resolveError = useGameStore((s) => s.resolveError);

  // El jugador solo ARRANCA la resolución de su propio pool (SPEC-008a).
  const interactive = side === 'player';
  const mode = resolve && resolve.side === side ? resolve : null;

  // Especial por dueño (SPEC-039): mientras `mode.symbol === 'special'` sigue siendo un único dado
  // marcado (`marked.length === 1`), el dueño decide el flujo — Luminara espera un dado objetivo
  // propio (aquí, en el pool), Vader un personaje (en App.tsx/CharacterCard), cualquier otro código
  // usa el botón "Resolver especial" de siempre.
  const specialOwnerCode =
    mode && mode.symbol === 'special' && mode.marked.length === 1 ? pool[mode.marked[0]]?.code : undefined;
  const isLuminaraSpecial = specialOwnerCode === LUMINARA_CODE;
  const isVaderSpecial = specialOwnerCode === VADER_CODE;
  // Mismo criterio que `canPickLuminaraTarget` de abajo (y que `resolveSpecial` en el store): un
  // modificador genérico +X* suelto (symbol null) no cuenta como objetivo clicable, ni tampoco un
  // dado de mejora/apoyo (corrección 2026-07-27: texto real de Luminara es "one of your character
  // dice", ver SPEC-039).
  const luminaraTargetExists =
    isLuminaraSpecial &&
    pool.some((d, i) => {
      if (i === mode!.marked[0]) return false;
      const p = parsePlayerFace(d.face);
      if (p === null || p.symbol === null || p.symbol === 'special') return false;
      return readCache(d.code)?.type_code === 'character';
    });

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
          {mode.symbol === 'special' && isLuminaraSpecial && luminaraTargetExists && (
            <span className="pool__mode-label">Elige un dado propio (con valor) para subir +2/+3.</span>
          )}
          {mode.symbol === 'special' && isVaderSpecial && (
            <span className="pool__mode-label">Elige un personaje, propio o rival, para 3 de daño.</span>
          )}
          {mode.symbol === 'special' && !isVaderSpecial && !(isLuminaraSpecial && luminaraTargetExists) && (
            <button onClick={resolveSpecial} disabled={mode.marked.length === 0}>
              Resolver especial
            </button>
          )}
          {mode.symbol === 'indirect' && (
            <button onClick={resolveIndirect} disabled={mode.marked.length === 0}>
              Resolver indirecto
            </button>
          )}
          {mode.symbol === 'disrupt' && (
            <button onClick={resolveDisrupt} disabled={mode.marked.length === 0}>
              Resolver disrupt
            </button>
          )}
          {mode.symbol === 'discard' && (
            <button onClick={resolveDiscard} disabled={mode.marked.length === 0}>
              Resolver descarte
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

            // Elegir dado objetivo de Focus (SPEC-023): dado propio sin resolver, distinto del ya
            // marcado (fuente) o ya girados, mientras quede presupuesto y no haya una elección de
            // cara pendiente. Corrección (2026-07-27): un dado que él mismo muestra cara Focus
            // SIEMPRE cuenta como objetivo a re-girar, igual que cualquier otro — ya no se trata
            // como "fuente adicional" (Focus se resuelve de un dado base a la vez, ver `selectDie`
            // en el store); sin este cambio, un segundo dado con cara Focus no tenía forma de
            // elegirse como objetivo (bug real detectado jugando). Un modificador genérico +X* sin
            // marcar (SPEC-027) sigue sin contar como objetivo (puede sumarse como modificador del
            // único dado base, igual que indirecto).
            const canPickFocusTarget =
              interactive &&
              mode !== null &&
              mode.symbol === 'focus' &&
              mode.focusFaceChoice == null &&
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

            // Elegir dado objetivo del +2/+3 de Luminara (SPEC-039): cualquier dado de PERSONAJE
            // propio sin resolver, distinto del Especial marcado, con valor numérico (no otro
            // Especial ni una cara en blanco/sin valor — un modificador +X* solo tampoco cuenta,
            // igual criterio que Focus/Reroll de arriba). Corrección (2026-07-27): un dado de
            // mejora/apoyo NO cuenta, texto real de Luminara ("one of your character dice").
            const canPickLuminaraTarget =
              interactive &&
              isLuminaraSpecial &&
              mode !== null &&
              i !== mode.marked[0] &&
              symbol !== null &&
              readCache(d.code)?.type_code === 'character';

            // Arrancar un modo nuevo, o seguir marcando/desmarcando dados del MISMO símbolo ya en
            // curso (incluye sumar más presupuesto de Focus/Reroll, SPEC-008a/023): mismo `selectDie`
            // genérico de siempre. Arrancar un modo nuevo exige además que sea tu turno (SPEC-025);
            // si el modo ya está abierto, por invariante turn === 'player' desde que se abrió, así
            // que el chequeo no cambia el comportamiento de seguir marcando/desmarcando.
            // Modificador genérico +X* (SPEC-027): no tiene símbolo propio (no puede abrir modo por
            // sí solo), pero cuenta como "del símbolo del modo abierto" para cualquier símbolo salvo
            // especial (valor fijo, no modificable). Especial (SPEC-039): una vez hay un modo
            // abierto, no se vuelve a interactuar con él vía `selectDie` (el flujo sigue por
            // `pickLuminaraTarget`/`resolveVaderTarget`/`resolveSpecial`/`cancelResolve`).
            const canSelect =
              interactive &&
              turn === 'player' &&
              (mode === null
                ? symbol !== null
                : mode.symbol !== 'special' && mode.focusFaceChoice == null && (mode.symbol === symbol || isGeneric));

            // Elegir dado para una habilidad de personaje (SPEC-042): mientras hay una habilidad
            // pidiendo objetivos, el clic va a ella y no a las resoluciones normales. El propio
            // store filtra qué dados valen (propios / cualquiera / amarillos / de apoyo), así que
            // aquí basta con enrutar el clic.
            const canPickAbilityDie = abilityTargeting !== null && abilityTargeting.side === 'player';
            const isAbilityPick =
              abilityTargeting !== null &&
              (abilityTargeting.dice.some((t) => t.side === side && t.poolIndex === i) ||
                (side === abilityTargeting.side && abilityTargeting.faceTarget === i));

            const onClick = canPickAbilityDie
              ? () => pickAbilityDie(side, i)
              : canPickFocusTarget
              ? () => pickFocusTarget(i)
              : canPickRerollTarget
                ? () => pickRerollTarget(side, i)
                : canPickLuminaraTarget
                  ? () => pickLuminaraTarget(i)
                  : canSelect
                    ? () => selectDie(side, i)
                    : undefined;

            const marked = isMarked || isRerollTarget || isFocusPick || isAbilityPick;
            const dimmed =
              mode !== null && symbol !== null && symbol !== mode.symbol && !canPickRerollTarget && !canPickLuminaraTarget;
            const cls =
              'pool-die' +
              (symbol ? ` pool-die--${symbolClass(symbol)}` : isGeneric ? ' pool-die--generic' : '') +
              (marked ? ' pool-die--selected' : '') +
              (dimmed ? ' pool-die--dimmed' : '') +
              (canPickFocusTarget || canPickRerollTarget || canPickLuminaraTarget || canPickAbilityDie ? ' pool-die--pickable' : '');
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
    case 'disrupt':
      return 'disrupt';
    case 'discard':
      return 'descarte';
    default:
      return s;
  }
}

function symbolClass(s: string): string {
  if (s === 'shield') return 'shield';
  if (s === 'resource') return 'resource';
  if (s === 'focus' || s === 'reroll' || s === 'special' || s === 'disrupt' || s === 'discard') return 'utility';
  return 'damage';
}

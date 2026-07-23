import { readCache } from './import/resolveCards';
import { useGameStore, opposite, type Side } from './store/gameStore';
import { ImportPanel } from './components/ImportPanel';
import { CharacterCard } from './components/CharacterCard';
import { DicePool } from './components/DicePool';
import { DifficultySelector } from './components/DifficultySelector';
import { Hand } from './components/Hand';
import { SupportList } from './components/SupportList';
import { currentHealth, isKO } from './game/damage';

function BattleSide({ side, label }: { side: Side; label: string }) {
  const s = useGameStore((st) => st.sides[side]);
  const resolve = useGameStore((st) => st.resolve);
  const playUpgrade = useGameStore((st) => st.playUpgrade);
  const mulligan = useGameStore((st) => st.mulligan);
  const outcome = useGameStore((st) => st.outcome);
  const activate = useGameStore((st) => st.activate);
  const applyDieTo = useGameStore((st) => st.applyDieTo);
  const playUpgradeOn = useGameStore((st) => st.playUpgradeOn);
  const activateSupport = useGameStore((st) => st.activateSupport);
  const drawCard = useGameStore((st) => st.drawCard);
  const toggleMulliganCard = useGameStore((st) => st.toggleMulliganCard);
  const cancelPlayUpgrade = useGameStore((st) => st.cancelPlayUpgrade);
  const confirmMulligan = useGameStore((st) => st.confirmMulligan);

  // Objetivo válido de un PERSONAJE. Con pendingEffect (SPEC-010) se elige el receptor del coste
  // indirecto: SIEMPRE el propio bando. Si no, daño → bando contrario, escudo → propio; recurso,
  // focus, reroll de dado y especial no usan objetivo de personaje (recurso/especial resuelven con
  // su botón; focus/reroll de dado eligen dado objetivo en el propio DicePool, SPEC-023).
  const active = outcome === null && resolve !== null && resolve.marked.length > 0;
  const noCharacterTarget = (s: string) => s === 'resource' || s === 'special' || s === 'focus' || s === 'reroll';
  const targetableSide = active
    ? resolve!.pendingEffect
      ? resolve!.side === side
      : !noCharacterTarget(resolve!.symbol) &&
        (resolve!.symbol === 'shield' ? resolve!.side === side : opposite(resolve!.side) === side)
    : false;
  // Eligiendo objetivo para una mejora (SPEC-020): siempre el propio bando de quien la juega.
  const upgradeTargetableSide = outcome === null && playUpgrade !== null && playUpgrade.side === side;
  const isPlayer = side === 'player';

  return (
    <section className={`battle-side battle-side--${side}`}>
      <div className="battle-side__head">
        <h2>{label}</h2>
        {!isPlayer && <DifficultySelector />}
        <ImportPanel side={side} label={label} />
      </div>
      {isPlayer && playUpgrade && outcome === null && (
        <p className="app__hint">
          Mejora seleccionada. Pulsa uno de tus personajes para jugarla sobre él.{' '}
          <button onClick={cancelPlayUpgrade}>Cancelar</button>
        </p>
      )}
      {isPlayer && mulligan && outcome === null && (
        <p className="app__hint">
          Mulligan pendiente. Marca en tu mano las cartas que quieras devolver al mazo (0 a 5) y
          confirma para robar la misma cantidad de vuelta.{' '}
          <button onClick={confirmMulligan}>Confirmar mulligan</button>
        </p>
      )}
      {s.characters.length === 0 ? (
        <p className="roster__empty">Sin mazo importado.</p>
      ) : (
        <>
          <p className="draw-pile__count">
            Mazo: {s.drawPile.length} · Mano: {s.hand.length}
            {isPlayer && (
              <button
                className="hand__draw-button"
                onClick={() => drawCard(side)}
                disabled={outcome !== null || mulligan !== null}
              >
                Robar
              </button>
            )}
          </p>
          {isPlayer && (
            <Hand
              side={side}
              codes={s.hand}
              mulligan={mulligan}
              onToggleMulligan={toggleMulliganCard}
            />
          )}
          <div className="roster__grid">
            {s.characters.map((c, i) => {
              const dmg = s.damage[i] ?? 0;
              const ko = isKO(c, dmg);
              const upgradeCards = (s.upgrades[i] ?? []).map((code) => {
                const card = readCache(code);
                return { name: card?.name ?? code, sides: card?.sides };
              });
              return (
                <CharacterCard
                  character={c}
                  activated={s.activated[i] === true}
                  health={currentHealth(c, dmg)}
                  shields={s.shields[i] ?? 0}
                  ko={ko}
                  targetable={(targetableSide || upgradeTargetableSide) && !ko}
                  showActivate={isPlayer}
                  upgrades={upgradeCards}
                  activateDisabled={playUpgrade !== null || mulligan !== null}
                  onActivate={() => activate(side, i)}
                  onTarget={() => (upgradeTargetableSide ? playUpgradeOn(i) : applyDieTo(side, i))}
                  key={`${c.code}-${i}`}
                />
              );
            })}
          </div>
          <SupportList
            codes={s.supports}
            activated={s.supportsActivated}
            onActivate={(i) => activateSupport(side, i)}
          />
        </>
      )}
      <DicePool side={side} />
    </section>
  );
}

export function App() {
  const outcome = useGameStore((s) => s.outcome);
  const resolve = useGameStore((s) => s.resolve);
  const playUpgrade = useGameStore((s) => s.playUpgrade);
  const mulligan = useGameStore((s) => s.mulligan);
  const startGame = useGameStore((s) => s.startGame);
  const newRound = useGameStore((s) => s.newRound);
  const resetAll = useGameStore((s) => s.resetAll);
  const enemyTurn = useGameStore((s) => s.enemyTurn);
  const lastEnemyAction = useGameStore((s) => s.lastEnemyAction);
  const enemyHasDeck = useGameStore((s) => s.sides.enemy.characters.length > 0);
  const playerHand = useGameStore((s) => s.sides.player.hand);
  const enemyHand = useGameStore((s) => s.sides.enemy.hand);
  const playerCharacters = useGameStore((s) => s.sides.player.characters.length);
  const enemyCharacters = useGameStore((s) => s.sides.enemy.characters.length);
  // "Nueva partida" (SPEC-024): solo tiene sentido en estado fresco, ambos bandos con mazo
  // importado y mano vacía (si no, ya se está jugando o falta importar).
  const canStartGame =
    outcome === null &&
    playerCharacters > 0 &&
    enemyCharacters > 0 &&
    playerHand.length === 0 &&
    enemyHand.length === 0;

  const hint =
    resolve === null || outcome !== null || resolve.marked.length === 0
      ? null
      : resolve.pendingEffect
        ? 'Elige el personaje de tu bando que recibe el coste indirecto.'
        : resolve.symbol === 'shield'
          ? 'Dado de escudo marcado. Pulsa un personaje de tu propio bando para aplicarlo.'
          : resolve.symbol === 'resource'
            ? null
            : resolve.symbol === 'special'
              ? null
              : resolve.symbol === 'focus'
                ? resolve.focusFaceChoice != null
                  ? null
                  : 'Dado de Focus marcado. Pulsa un dado propio en tu pool para elegir su nueva cara.'
                : resolve.symbol === 'reroll'
                  ? 'Dado de Reroll marcado. Pulsa un dado (de cualquier pool) para rerollearlo.'
                  : 'Dado de daño marcado. Pulsa un personaje enemigo para aplicarlo.';

  return (
    <main className="app">
      <h1>Star Wars Destiny — PVE</h1>

      {outcome && (
        <div className={`outcome outcome--${outcome}`} role="status">
          {outcome === 'victory' ? '🏆 Victoria' : '💀 Derrota'}
        </div>
      )}
      {hint && <p className="app__hint">{hint}</p>}
      {lastEnemyAction && <p className="app__hint">{lastEnemyAction}</p>}

      <div className="controls">
        <button onClick={startGame} disabled={!canStartGame}>
          Nueva partida
        </button>
        <button onClick={newRound} disabled={outcome !== null || mulligan !== null}>
          Nueva ronda
        </button>
        <button onClick={resetAll}>Reset total</button>
        <button
          onClick={enemyTurn}
          // Bloqueado con cualquier dado marcado sin aplicar (no solo pendingEffect, SPEC-023): desde
          // que Reroll de dado puede tocar el pool del jugador, dejar un dado marcado a medio resolver
          // mientras el autómata juega podría rerollearlo bajo el jugador (revisor-codigo lo detectó
          // como riesgo real). Terminar o cancelar la resolución en curso antes de pasar turno evita
          // aplicar un efecto con la cara/símbolo ya obsoleto del dado. Bloqueado también con un
          // mulligan pendiente de confirmar (SPEC-024), mismo criterio que playUpgrade.
          disabled={
            outcome !== null ||
            !enemyHasDeck ||
            (resolve !== null && resolve.marked.length > 0) ||
            playUpgrade !== null ||
            mulligan !== null
          }
        >
          Turno enemigo
        </button>
      </div>

      <BattleSide side="enemy" label="Enemigo" />
      <BattleSide side="player" label="Jugador" />
    </main>
  );
}

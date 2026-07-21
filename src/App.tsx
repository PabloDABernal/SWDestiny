import { useGameStore, opposite, type Side } from './store/gameStore';
import { ImportPanel } from './components/ImportPanel';
import { CharacterCard } from './components/CharacterCard';
import { DicePool } from './components/DicePool';
import { DifficultySelector } from './components/DifficultySelector';
import { currentHealth, isKO } from './game/damage';

function BattleSide({ side, label }: { side: Side; label: string }) {
  const s = useGameStore((st) => st.sides[side]);
  const resolve = useGameStore((st) => st.resolve);
  const outcome = useGameStore((st) => st.outcome);
  const activate = useGameStore((st) => st.activate);
  const applyDieTo = useGameStore((st) => st.applyDieTo);

  // Objetivo válido. Con pendingEffect (SPEC-010) se elige el receptor del coste indirecto: SIEMPRE
  // el propio bando. Si no, daño → bando contrario, escudo → propio; el recurso no tiene objetivo.
  const active = outcome === null && resolve !== null && resolve.marked.length > 0;
  const targetableSide = active
    ? resolve!.pendingEffect
      ? resolve!.side === side
      : resolve!.symbol !== 'resource' &&
        (resolve!.symbol === 'shield' ? resolve!.side === side : opposite(resolve!.side) === side)
    : false;
  const isPlayer = side === 'player';

  return (
    <section className={`battle-side battle-side--${side}`}>
      <div className="battle-side__head">
        <h2>{label}</h2>
        {!isPlayer && <DifficultySelector />}
        <ImportPanel side={side} label={label} />
      </div>
      {s.characters.length === 0 ? (
        <p className="roster__empty">Sin mazo importado.</p>
      ) : (
        <>
          <p className="draw-pile__count">Mazo: {s.drawPile.length}</p>
          <div className="roster__grid">
            {s.characters.map((c, i) => {
              const dmg = s.damage[i] ?? 0;
              const ko = isKO(c, dmg);
              return (
                <CharacterCard
                  character={c}
                  activated={s.activated[i] === true}
                  health={currentHealth(c, dmg)}
                  shields={s.shields[i] ?? 0}
                  ko={ko}
                  targetable={targetableSide && !ko}
                  showActivate={isPlayer}
                  onActivate={() => activate(side, i)}
                  onTarget={() => applyDieTo(side, i)}
                  key={`${c.code}-${i}`}
                />
              );
            })}
          </div>
        </>
      )}
      <DicePool side={side} />
    </section>
  );
}

export function App() {
  const outcome = useGameStore((s) => s.outcome);
  const resolve = useGameStore((s) => s.resolve);
  const newRound = useGameStore((s) => s.newRound);
  const resetAll = useGameStore((s) => s.resetAll);
  const enemyTurn = useGameStore((s) => s.enemyTurn);
  const lastEnemyAction = useGameStore((s) => s.lastEnemyAction);
  const enemyHasDeck = useGameStore((s) => s.sides.enemy.characters.length > 0);

  const hint =
    resolve === null || outcome !== null || resolve.marked.length === 0
      ? null
      : resolve.pendingEffect
        ? 'Elige el personaje de tu bando que recibe el coste indirecto.'
        : resolve.symbol === 'shield'
          ? 'Dado de escudo marcado. Pulsa un personaje de tu propio bando para aplicarlo.'
          : resolve.symbol === 'resource'
            ? null
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
        <button onClick={newRound} disabled={outcome !== null}>
          Nueva ronda
        </button>
        <button onClick={resetAll}>Reset total</button>
        <button
          onClick={enemyTurn}
          disabled={outcome !== null || !enemyHasDeck || resolve?.pendingEffect != null}
        >
          Turno enemigo
        </button>
      </div>

      <BattleSide side="enemy" label="Enemigo" />
      <BattleSide side="player" label="Jugador" />
    </main>
  );
}

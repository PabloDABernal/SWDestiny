import { useGameStore, opposite, type Side } from './store/gameStore';
import { ImportPanel } from './components/ImportPanel';
import { CharacterCard } from './components/CharacterCard';
import { DicePool } from './components/DicePool';
import { currentHealth, isKO } from './game/damage';

function BattleSide({ side, label }: { side: Side; label: string }) {
  const s = useGameStore((st) => st.sides[side]);
  const selection = useGameStore((st) => st.selection);
  const outcome = useGameStore((st) => st.outcome);
  const activate = useGameStore((st) => st.activate);
  const applyDamageTo = useGameStore((st) => st.applyDamageTo);

  // Esta ficha es objetivo válido si el dado seleccionado es del bando contrario y no hay fin.
  const targetableSide = outcome === null && selection !== null && opposite(selection.side) === side;
  const isPlayer = side === 'player';

  return (
    <section className={`battle-side battle-side--${side}`}>
      <div className="battle-side__head">
        <h2>{label}</h2>
        <ImportPanel side={side} label={label} />
      </div>
      {s.characters.length === 0 ? (
        <p className="roster__empty">Sin mazo importado.</p>
      ) : (
        <div className="roster__grid">
          {s.characters.map((c, i) => {
            const dmg = s.damage[i] ?? 0;
            const ko = isKO(c, dmg);
            return (
              <CharacterCard
                character={c}
                activated={s.activated[i] === true}
                health={currentHealth(c, dmg)}
                ko={ko}
                targetable={targetableSide && !ko}
                showActivate={isPlayer}
                onActivate={() => activate(side, i)}
                onTarget={() => applyDamageTo(side, i)}
                key={`${c.code}-${i}`}
              />
            );
          })}
        </div>
      )}
      <DicePool side={side} />
    </section>
  );
}

export function App() {
  const outcome = useGameStore((s) => s.outcome);
  const selection = useGameStore((s) => s.selection);
  const reset = useGameStore((s) => s.reset);
  const enemyTurn = useGameStore((s) => s.enemyTurn);
  const lastEnemyAction = useGameStore((s) => s.lastEnemyAction);
  const enemyHasDeck = useGameStore((s) => s.sides.enemy.characters.length > 0);

  return (
    <main className="app">
      <h1>Star Wars Destiny — PVE</h1>

      {outcome && (
        <div className={`outcome outcome--${outcome}`} role="status">
          {outcome === 'victory' ? '🏆 Victoria' : '💀 Derrota'}
        </div>
      )}
      {selection !== null && outcome === null && (
        <p className="app__hint">Dado de daño seleccionado. Pulsa un personaje enemigo para aplicarlo.</p>
      )}
      {lastEnemyAction && <p className="app__hint">{lastEnemyAction}</p>}

      <div className="controls">
        <button onClick={reset}>Reset (nueva ronda)</button>
        <button onClick={enemyTurn} disabled={outcome !== null || !enemyHasDeck}>
          Turno enemigo
        </button>
      </div>

      <BattleSide side="enemy" label="Enemigo" />
      <BattleSide side="player" label="Jugador" />
    </main>
  );
}

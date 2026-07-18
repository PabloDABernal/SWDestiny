import { useGameStore } from './store/gameStore';
import { ImportPanel } from './components/ImportPanel';
import { CharacterCard } from './components/CharacterCard';
import { DicePool } from './components/DicePool';
import { currentHealth, isKO } from './game/damage';

export function App() {
  const characters = useGameStore((s) => s.characters);
  const activated = useGameStore((s) => s.activated);
  const damage = useGameStore((s) => s.damage);
  const selectedDie = useGameStore((s) => s.selectedDie);
  const activate = useGameStore((s) => s.activate);
  const applyDamageTo = useGameStore((s) => s.applyDamageTo);

  return (
    <main className="app">
      <h1>Star Wars Destiny — PVE</h1>
      <ImportPanel />
      <section className="roster">
        <h2>Personajes ({characters.length})</h2>
        {characters.length === 0 ? (
          <p className="roster__empty">Aún no hay personajes. Importa un mazo arriba.</p>
        ) : (
          <div className="roster__grid">
            {characters.map((c, i) => {
              const dmg = damage[i] ?? 0;
              return (
                <CharacterCard
                  character={c}
                  activated={activated[i] === true}
                  health={currentHealth(c, dmg)}
                  ko={isKO(c, dmg)}
                  targetable={selectedDie !== null}
                  onActivate={() => activate(i)}
                  onTarget={() => applyDamageTo(i)}
                  key={`${c.code}-${i}`}
                />
              );
            })}
          </div>
        )}
      </section>
      <DicePool />
    </main>
  );
}

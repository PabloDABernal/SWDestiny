import { useGameStore } from './store/gameStore';
import { ImportPanel } from './components/ImportPanel';
import { CharacterCard } from './components/CharacterCard';
import { DicePool } from './components/DicePool';

export function App() {
  const characters = useGameStore((s) => s.characters);
  const activated = useGameStore((s) => s.activated);
  const activate = useGameStore((s) => s.activate);

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
            {characters.map((c, i) => (
              <CharacterCard
                character={c}
                activated={activated[i] === true}
                onActivate={() => activate(i)}
                key={`${c.code}-${i}`}
              />
            ))}
          </div>
        )}
      </section>
      <DicePool />
    </main>
  );
}

import { useGameStore } from './store/gameStore';
import { ImportPanel } from './components/ImportPanel';
import { CharacterCard } from './components/CharacterCard';

export function App() {
  const characters = useGameStore((s) => s.characters);

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
              <CharacterCard character={c} key={`${c.code}-${i}`} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

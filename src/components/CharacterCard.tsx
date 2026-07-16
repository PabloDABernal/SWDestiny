import type { Character } from '../model/types';

export function CharacterCard({ character }: { character: Character }) {
  return (
    <div className="character-card">
      <header className="character-card__head">
        <span className="character-card__name">{character.name}</span>
        <span className="character-card__health" title="Vida">
          ♥ {character.health}
        </span>
      </header>
      <div className="character-card__meta">
        {character.isUnique ? 'Único' : 'No único'}
        {character.isElite ? ' · Elite' : ''}
        {` · ${character.dice.length} dado${character.dice.length > 1 ? 's' : ''}`}
      </div>
      <div className="dice">
        {character.dice.map((die, i) => (
          <div className="die" key={i}>
            <span className="die__label">Dado {i + 1}</span>
            <ol className="die__sides">
              {die.sides.map((side, j) => (
                <li className="side" key={j}>
                  {side}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

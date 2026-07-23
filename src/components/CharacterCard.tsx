import type { Character } from '../model/types';
import { MAX_SHIELDS } from '../game/damage';

interface CharacterCardProps {
  character: Character;
  activated: boolean;
  /** Vida restante (vida base menos daño). */
  health: number;
  /** Escudos acumulados (0-3, SPEC-005). */
  shields: number;
  ko: boolean;
  /** true si hay un dado de daño seleccionado esperando objetivo (y esta ficha es válida). */
  targetable: boolean;
  /** El enemigo es pasivo en v1: no muestra botón Activar. */
  showActivate: boolean;
  /** Mejoras en juego ligadas a este personaje (SPEC-020), con sus caras de dado si tiene. */
  upgrades: { name: string; sides?: string[] }[];
  /** true mientras se elige objetivo para jugar una mejora (SPEC-020): Activar queda deshabilitado
   * para que no parezca un clic sin efecto. */
  activateDisabled?: boolean;
  onActivate: () => void;
  onTarget: () => void;
}

export function CharacterCard({
  character,
  activated,
  health,
  shields,
  ko,
  targetable,
  showActivate,
  upgrades,
  activateDisabled,
  onActivate,
  onTarget,
}: CharacterCardProps) {
  // Un KO no es objetivo; si hay dado seleccionado y no es KO, la ficha es clicable como objetivo.
  const canTarget = targetable && !ko;
  const className =
    'character-card' +
    (activated ? ' character-card--activated' : '') +
    (ko ? ' character-card--ko' : '') +
    (canTarget ? ' character-card--targetable' : '');

  return (
    <div
      className={className}
      onClick={canTarget ? onTarget : undefined}
      role={canTarget ? 'button' : undefined}
    >
      <header className="character-card__head">
        <span className="character-card__name">
          {character.name}
          {ko && <span className="character-card__ko"> · KO</span>}
        </span>
        <span className="character-card__health" title="Vida restante">
          ♥ {health}/{character.health}
        </span>
        {shields > 0 && (
          <span className="character-card__shields" title="Escudos">
            🛡 {shields}/{MAX_SHIELDS}
          </span>
        )}
      </header>
      <div className="character-card__meta">
        {character.isUnique ? 'Único' : 'No único'}
        {character.isElite ? ' · Elite' : ''}
        {` · ${character.dice.length} dado${character.dice.length > 1 ? 's' : ''}`}
      </div>
      {upgrades.length > 0 && (
        <ul className="character-card__upgrades">
          {upgrades.map((upgrade, i) => (
            <li key={i}>
              <span className="character-card__upgrade-name">⚙ {upgrade.name}</span>
              {upgrade.sides && upgrade.sides.length > 0 && (
                <ol className="die__sides">
                  {upgrade.sides.map((side, j) => (
                    <li className="side" key={j}>
                      {side}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}
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
      {showActivate && (
        <div className="character-card__actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
            }}
            disabled={activated || ko || activateDisabled}
          >
            {ko ? 'KO' : activated ? 'Activado' : 'Activar'}
          </button>
        </div>
      )}
    </div>
  );
}

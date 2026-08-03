import type { Character } from '../model/types';
import { MAX_SHIELDS } from '../game/damage';
import { CardTextToggle } from './CardText';

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
  upgrades: { code?: string; name: string; sides?: string[] }[];
  /** true mientras se elige objetivo para jugar una mejora (SPEC-020): Activar queda deshabilitado
   * para que no parezca un clic sin efecto. */
  activateDisabled?: boolean;
  onActivate: () => void;
  onTarget: () => void;
  /** SPEC-042: solo se pasa si este personaje tiene una habilidad `Action -` implementada. */
  onUseAbility?: () => void;
  /** Texto de esa habilidad, como tooltip del botón. */
  abilityText?: string;
  abilityDisabled?: boolean;
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
  onUseAbility,
  abilityText,
  abilityDisabled,
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
      {/* Texto de reglas del personaje (SPEC-044): cerrado por defecto, y no se pinta si la carta
          no tiene texto. Aplica igual a los personajes del enemigo. */}
      <CardTextToggle code={character.code} />
      {upgrades.length > 0 && (
        <ul className="character-card__upgrades">
          {upgrades.map((upgrade, i) => (
            <li key={i}>
              <span className="character-card__upgrade-name">⚙ {upgrade.name}</span>
              {upgrade.code && <CardTextToggle code={upgrade.code} compact />}
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
          {/* Habilidad `Action -` de su texto (SPEC-042). Solo se pinta si ese personaje tiene una y
              se puede usar ahora mismo: gasta la acción del turno, igual que activar. */}
          {onUseAbility && (
            <button
              className="character-card__ability"
              onClick={(e) => {
                e.stopPropagation();
                onUseAbility();
              }}
              disabled={ko || abilityDisabled}
              title={abilityText}
            >
              Habilidad
            </button>
          )}
        </div>
      )}
    </div>
  );
}

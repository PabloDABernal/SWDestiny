import { readCache } from '../import/resolveCards';

/** Apoyos en juego de un bando (SPEC-021): no van ligados a ningún personaje, cada uno con su
 * propio botón "Activar" (parecido a un personaje, pero sin vida/escudos/KO). El enemigo es pasivo
 * (autómata, SPEC-025): no muestra botón "Activar", igual que ya hace `CharacterCard` con
 * `showActivate`. */
export function SupportList({
  codes,
  activated,
  showActivate,
  activateDisabled,
  onActivate,
}: {
  codes: string[];
  activated: boolean[];
  showActivate: boolean;
  /** true fuera de tu turno, con la partida terminada, o con otro modo abierto (SPEC-025). */
  activateDisabled?: boolean;
  onActivate: (index: number) => void;
}) {
  if (codes.length === 0) return null;
  return (
    <ul className="supports">
      {codes.map((code, i) => {
        const card = readCache(code);
        const isActivated = activated[i] === true;
        return (
          <li className="support-card" key={`${code}-${i}`}>
            <span className="support-card__name">{card?.name ?? code}</span>
            {card?.sides && (
              <ol className="die__sides">
                {card.sides.map((face, j) => (
                  <li className="side" key={j}>
                    {face}
                  </li>
                ))}
              </ol>
            )}
            {showActivate && (
              <button onClick={() => onActivate(i)} disabled={isActivated || activateDisabled}>
                {isActivated ? 'Activado' : 'Activar'}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

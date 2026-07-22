import { readCache } from '../import/resolveCards';

/** Apoyos en juego de un bando (SPEC-021): no van ligados a ningún personaje, cada uno con su
 * propio botón "Activar" (parecido a un personaje, pero sin vida/escudos/KO). */
export function SupportList({
  codes,
  activated,
  onActivate,
}: {
  codes: string[];
  activated: boolean[];
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
            <button onClick={() => onActivate(i)} disabled={isActivated}>
              {isActivated ? 'Activado' : 'Activar'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

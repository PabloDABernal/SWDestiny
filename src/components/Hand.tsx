import { readCache } from '../import/resolveCards';
import { useGameStore, type Side } from '../store/gameStore';

/** Mano visible del jugador (SPEC-018): nombre de cada carta, resuelto desde la caché de import
 * (sin llamadas nuevas a la API; la carta ya se resolvió al importar el mazo). Las mejoras
 * (SPEC-020) muestran un botón "Jugar" que arranca la selección de personaje objetivo. */
export function Hand({ side, codes }: { side: Side; codes: string[] }) {
  const playUpgrade = useGameStore((s) => s.playUpgrade);
  const selectUpgradeCard = useGameStore((s) => s.selectUpgradeCard);

  if (codes.length === 0) return null;
  return (
    <ul className="hand">
      {codes.map((code, i) => {
        const card = readCache(code);
        const isUpgrade = card?.type_code === 'upgrade';
        const selected = playUpgrade?.side === side && playUpgrade.code === code;
        return (
          <li className={`hand__card${selected ? ' hand__card--selected' : ''}`} key={`${code}-${i}`}>
            {card?.name ?? code}
            {isUpgrade && (
              <button
                className="hand__play-button"
                onClick={() => selectUpgradeCard(side, code)}
                disabled={selected}
              >
                Jugar
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

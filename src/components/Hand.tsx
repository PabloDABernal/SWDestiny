import { readCache } from '../import/resolveCards';
import { useGameStore, type Side } from '../store/gameStore';

/** Mano visible del jugador (SPEC-018): nombre de cada carta, resuelto desde la caché de import
 * (sin llamadas nuevas a la API; la carta ya se resolvió al importar el mazo). Las mejoras
 * (SPEC-020) muestran un botón "Jugar" que arranca la selección de personaje objetivo. Los apoyos
 * (SPEC-021) se juegan de inmediato al pulsar "Jugar" (no requieren objetivo). Con un mulligan
 * pendiente (SPEC-024, solo mano del jugador), cada carta muestra en su lugar una casilla para
 * marcarla como devuelta al mazo; "Jugar" queda deshabilitado mientras tanto. Fuera de tu turno
 * (SPEC-025), "Jugar" también queda deshabilitado (bloqueado también en el store). Ya no hay botón
 * "Descartar" suelto: descartar solo pasa dentro del mantenimiento automático (SPEC-025). */
export function Hand({
  side,
  codes,
  mulligan,
  onToggleMulligan,
}: {
  side: Side;
  codes: string[];
  mulligan?: { marked: number[] } | null;
  onToggleMulligan?: (index: number) => void;
}) {
  const playUpgrade = useGameStore((s) => s.playUpgrade);
  const turn = useGameStore((s) => s.turn);
  const selectUpgradeCard = useGameStore((s) => s.selectUpgradeCard);
  const playSupport = useGameStore((s) => s.playSupport);

  if (codes.length === 0) return null;
  const mulliganActive = mulligan != null;
  const notYourTurn = turn !== side;
  return (
    <ul className="hand">
      {codes.map((code, i) => {
        const card = readCache(code);
        const isUpgrade = card?.type_code === 'upgrade';
        const isSupport = card?.type_code === 'support';
        const selected = playUpgrade?.side === side && playUpgrade.code === code;
        const marked = mulliganActive && mulligan!.marked.includes(i);
        return (
          <li
            className={`hand__card${selected ? ' hand__card--selected' : ''}${marked ? ' hand__card--marked' : ''}`}
            key={`${code}-${i}`}
          >
            {mulliganActive && (
              <label className="hand__mulligan-mark">
                <input type="checkbox" checked={marked} onChange={() => onToggleMulligan?.(i)} />
                Devolver
              </label>
            )}
            {card?.name ?? code}
            {isUpgrade && (
              <button
                className="hand__play-button"
                onClick={() => selectUpgradeCard(side, code)}
                disabled={selected || mulliganActive || notYourTurn}
              >
                Jugar
              </button>
            )}
            {isSupport && (
              <button
                className="hand__play-button"
                onClick={() => playSupport(side, code)}
                disabled={mulliganActive || notYourTurn}
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

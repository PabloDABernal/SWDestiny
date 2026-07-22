import { readCache } from '../import/resolveCards';

/** Mano visible del jugador (SPEC-018): nombre de cada carta, resuelto desde la caché de import
 * (sin llamadas nuevas a la API; la carta ya se resolvió al importar el mazo). */
export function Hand({ codes }: { codes: string[] }) {
  if (codes.length === 0) return null;
  return (
    <ul className="hand">
      {codes.map((code, i) => (
        <li className="hand__card" key={`${code}-${i}`}>
          {readCache(code)?.name ?? code}
        </li>
      ))}
    </ul>
  );
}

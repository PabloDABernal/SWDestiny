import { useState, type ReactNode } from 'react';
import { getCardFromSnapshot } from '../data/cards';
import { readCache } from '../import/resolveCards';
import { hasImplementedText } from '../game/characterAbilities';

// Texto de reglas de una carta, legible (SPEC-039) y desplegable en la mesa de juego (SPEC-044).
// Vivía dentro de DbSection; se sacó aquí para poder usarlo también jugando, sin duplicarlo.

// Tokens entre corchetes confirmados en el texto real de cartas (src/data/cards.json); uno no
// listado aquí se deja tal cual entre corchetes (ver `formatCardText`).
const TEXT_TOKEN_LABEL: Record<string, string> = {
  special: 'Especial',
  melee: 'Melee',
  ranged: 'A distancia',
  indirect: 'Indirecto',
  shield: 'Escudo',
  resource: 'Recurso',
  discard: 'Descarte',
  disrupt: 'Disrupt',
  focus: 'Focus',
  blank: 'Blanco',
};

/** Da formato legible al texto de una carta (SPEC-039, BACKLOG): sustituye los tokens `[token]`
 * conocidos por una etiqueta legible y convierte `<i>`/`<b>`/`<em>` en cursiva/negrita, en vez de
 * mostrar el markup en crudo. Parseo manual acotado a estos patrones conocidos (nada de
 * `dangerouslySetInnerHTML`); un token no reconocido se deja tal cual entre corchetes. */
export function formatCardText(text: string): ReactNode[] {
  const pattern = /\[(\w+)\]|<(i|b|em)>([\s\S]*?)<\/\2>/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1]) {
      // Reconocido: la etiqueta legible sustituye TODO el token, sin corchetes (ya no es markup en
      // crudo); no reconocido: se deja tal cual, con corchetes, como pide la spec.
      const label = TEXT_TOKEN_LABEL[match[1].toLowerCase()];
      nodes.push(label ?? match[0]);
    } else if (match[2] === 'b') {
      nodes.push(<strong key={key++}>{match[3]}</strong>);
    } else {
      nodes.push(<em key={key++}>{match[3]}</em>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/** Texto de reglas de esa carta, o null si no tiene (o no está en el snapshot). Busca primero en el
 *  snapshot bundleado y luego en la caché de import, igual que hace el resto de la mesa. */
export function cardText(code: string): string | null {
  const text = getCardFromSnapshot(code)?.text ?? readCache(code)?.text;
  return text && text.trim() !== '' ? text : null;
}

/** Desplegable "ℹ Texto" de una carta en la mesa (SPEC-044). Cerrado por defecto; si la carta no
 *  tiene texto no se pinta nada, ni el control (decisión del usuario, 2026-08-03).
 *
 *  La marca de "el juego ya aplica este texto" sale de `hasImplementedText`, que se deriva del
 *  registro de habilidades: cada spec futura que implemente un texto la enciende sola. */
export function CardTextToggle({ code, compact }: { code: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const text = cardText(code);
  if (text === null) return null;
  const implemented = hasImplementedText(code);

  return (
    <div className={compact ? 'card-text card-text--compact' : 'card-text'}>
      <button
        type="button"
        className="card-text__toggle"
        onClick={(e) => {
          e.stopPropagation(); // la ficha de personaje entera es clicable como objetivo
          setOpen((v) => !v);
        }}
        aria-expanded={open}
      >
        ℹ Texto {implemented ? <span title="El juego aplica este texto">✅</span> : null}
      </button>
      {open && (
        <p
          className={implemented ? 'card-text__body card-text__body--live' : 'card-text__body'}
          onClick={(e) => e.stopPropagation()}
        >
          {formatCardText(text)}
          {!implemented && (
            <span className="card-text__note"> · (informativo: el juego aún no aplica este texto)</span>
          )}
        </p>
      )}
    </div>
  );
}

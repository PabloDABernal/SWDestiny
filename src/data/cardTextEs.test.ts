import { describe, it, expect } from 'vitest';
import { CARD_TEXT_ES } from './cardTextEs';
import { getCardFromSnapshot } from './cards';

// Valida el fichero de traducciones (SPEC-045). No comprueba que la traducción sea BUENA —eso es
// criterio humano— sino que no esté rota: que apunte a cartas reales, que no haya huecos, y sobre
// todo que no se hayan traducido "por dentro" los tokens de símbolo, que romperían el formateo.

describe('traducciones al castellano (SPEC-045)', () => {
  const entries = Object.entries(CARD_TEXT_ES);

  it('hay traducciones cargadas', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('todos los códigos traducidos existen en el snapshot', () => {
    const huerfanos = entries.filter(([code]) => getCardFromSnapshot(code) === null).map(([code]) => code);
    expect(huerfanos).toEqual([]);
  });

  it('ninguna traducción está vacía', () => {
    const vacias = entries.filter(([, text]) => text.trim() === '').map(([code]) => code);
    expect(vacias).toEqual([]);
  });

  it('la carta traducida tiene texto original (no se traduce lo que no existe)', () => {
    const sinOriginal = entries
      .filter(([code]) => {
        const original = getCardFromSnapshot(code)?.text;
        return !original || original.trim() === '';
      })
      .map(([code]) => code);
    expect(sinOriginal).toEqual([]);
  });

  it('conserva exactamente los mismos tokens [simbolo] que el original', () => {
    // Traducir "dentro" de un token (p. ej. [escudo] en vez de [shield]) rompería el formateo de
    // SPEC-039, que los sustituye por su etiqueta legible.
    const tokens = (s: string) => (s.match(/\[\w+\]/g) ?? []).slice().sort();
    const rotas: string[] = [];
    for (const [code, es] of entries) {
      const original = getCardFromSnapshot(code)?.text ?? '';
      const a = tokens(original).join(',');
      const b = tokens(es).join(',');
      if (a !== b) rotas.push(`${code}: original [${a}] vs traducción [${b}]`);
    }
    expect(rotas).toEqual([]);
  });

  it('no deja etiquetas de formato sin cerrar', () => {
    const rotas = entries
      .filter(([, es]) => {
        for (const tag of ['i', 'b', 'em']) {
          const abre = (es.match(new RegExp(`<${tag}>`, 'g')) ?? []).length;
          const cierra = (es.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
          if (abre !== cierra) return true;
        }
        return false;
      })
      .map(([code]) => code);
    expect(rotas).toEqual([]);
  });

  it('el set 01 está traducido entero', () => {
    // Es el alcance acordado de esta spec: si falta alguna, es que se quedó a medias.
    const set01 = Object.keys(CARD_TEXT_ES).filter((c) => c.startsWith('01'));
    expect(set01.length).toBe(170);
  });
});

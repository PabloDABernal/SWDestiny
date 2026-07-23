import { describe, it, expect } from 'vitest';
import { parseTextDeck } from './parseTextDeck';
import { ImportError } from './errors';

// Fragmento del "text file" real de "Unduli, clone commander" (SPEC-017).
const UNDULI = `Unduli, clone commander (Retro 1-4)

Hero
Command / Force
Sets: From Awakenings to Rivals

BATTLEFIELD
-----------
Emperor's Throne Room, Death Star II (Awakenings #167)

CHARACTER
---------
2x Luminara Unduli, Inspiring Commander (Spirit of Rebellion #36)
2x Clone Trooper (Legacies #38)

UPGRADE
-------
2x Force Focus (Legacies #56)

SUPPORT
-------
2x C-3PO (Spirit of Rebellion #30)

EVENT
-----
1x Rearm (Awakenings #109)
2x Hidden Motive (Rivals #5)
1x Emulate (Rivals #11)

PLOT
----
Rescue Han Solo (Transformations #15)`;

describe('parseTextDeck', () => {
  it('convierte el text file de ARH DB a DeckSlot[] con códigos NN+nnn', () => {
    const slots = parseTextDeck(UNDULI);
    expect(slots).toEqual([
      { code: '01167', qty: 1 }, // battlefield, sin "Nx" → cantidad 1
      { code: '02036', qty: 2 }, // Spirit of Rebellion #36
      { code: '05038', qty: 2 }, // Legacies #38
      { code: '05056', qty: 2 },
      { code: '02030', qty: 2 },
      { code: '01109', qty: 1 },
      { code: '06005', qty: 2 }, // Rivals #5 → 005 (relleno a 3 dígitos)
      { code: '06011', qty: 1 },
    ]);
  });

  it('ignora cabeceras, guiones y líneas en blanco (no lanza)', () => {
    const slots = parseTextDeck('CHARACTER\n---------\n\n2x Clone Trooper (Legacies #38)\n');
    expect(slots).toEqual([{ code: '05038', qty: 2 }]);
  });

  it('rellena el número de coleccionista a 3 dígitos', () => {
    expect(parseTextDeck('1x X (Rivals #5)')).toEqual([{ code: '06005', qty: 1 }]);
  });

  it('reconoce el set Transformations (código 13, confirmado el 2026-07-22)', () => {
    expect(parseTextDeck('1x Rescue Han Solo (Transformations #7)')).toEqual([
      { code: '13007', qty: 1 },
    ]);
  });

  it('reconoce el set Display of Power (código 22, confirmado el 2026-07-23)', () => {
    expect(parseTextDeck('Hangar Bay, Jabiim (Display of Power #99)')).toEqual([
      { code: '22099', qty: 1 },
    ]);
  });

  it('reconoce el set Awaiting Fate (código 24, confirmado el 2026-07-23)', () => {
    expect(parseTextDeck('2x Darth Plagueis, The Wise (Awaiting Fate #3)')).toEqual([
      { code: '24003', qty: 2 },
    ]);
  });

  it('reconoce el set High Stakes (código 16, confirmado el 2026-07-23)', () => {
    expect(parseTextDeck('1x Proton Grenades (High Stakes #96)')).toEqual([
      { code: '16096', qty: 1 },
    ]);
  });

  it('ignora las cartas de la sección PLOT sin intentar resolverlas (dos caras A/B, SPEC-017)', () => {
    const slots = parseTextDeck(
      'CHARACTER\n---------\n2x Clone Trooper (Legacies #38)\n\nPLOT\n----\nRescue Han Solo (Transformations #15)\n',
    );
    expect(slots).toEqual([{ code: '05038', qty: 2 }]);
  });

  it('un mazo con solo una carta PLOT (set desconocido incluido) no lanza por el plot', () => {
    const slots = parseTextDeck(
      'CHARACTER\n---------\n1x Clone Trooper (Legacies #38)\n\nPLOT\n----\nAlguna trama (SetRarísimo #1)\n',
    );
    expect(slots).toEqual([{ code: '05038', qty: 1 }]);
  });

  it('falla con invalid-text si el set no está en la tabla', () => {
    try {
      parseTextDeck('2x Carta rara (Foobar #12)');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as ImportError).reason).toBe('invalid-text');
    }
  });

  it('falla con invalid-text si no se reconoce ninguna carta', () => {
    try {
      parseTextDeck('CHARACTER\n-------\nSets: From Awakenings to Rivals');
      throw new Error('debería haber lanzado');
    } catch (e) {
      expect((e as ImportError).reason).toBe('invalid-text');
    }
  });

  it('suma cantidades si el mismo código aparece en dos líneas (defensivo)', () => {
    const slots = parseTextDeck('2x Clone Trooper (Legacies #38)\n1x Clone Trooper (Legacies #38)');
    expect(slots).toEqual([{ code: '05038', qty: 3 }]);
  });

  it('tolera espacios/tabs sobrantes y dobles espacios', () => {
    const slots = parseTextDeck('   2x   Clone   Trooper   (Legacies #38)   ');
    expect(slots).toEqual([{ code: '05038', qty: 2 }]);
  });
});

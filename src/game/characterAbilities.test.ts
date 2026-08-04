import { describe, it, expect } from 'vitest';
import { luminaraBoostAmount, LUMINARA_CODE, ZUCKUSS_CODE, VADER_CODE, KNOWN_SPECIAL_CODES, hasImplementedText } from './characterAbilities';

describe('luminaraBoostAmount (SPEC-039)', () => {
  it('+2 si el dueño del dado objetivo es único', () => {
    expect(luminaraBoostAmount(true)).toBe(2);
  });

  it('+3 si el dueño del dado objetivo NO es único', () => {
    expect(luminaraBoostAmount(false)).toBe(3);
  });
});

describe('KNOWN_SPECIAL_CODES (SPEC-039)', () => {
  it('incluye exactamente Luminara, Zuckuss y Vader', () => {
    expect(KNOWN_SPECIAL_CODES.has(LUMINARA_CODE)).toBe(true);
    expect(KNOWN_SPECIAL_CODES.has(ZUCKUSS_CODE)).toBe(true);
    expect(KNOWN_SPECIAL_CODES.has(VADER_CODE)).toBe(true);
    expect(KNOWN_SPECIAL_CODES.size).toBe(3);
  });

  it('un código cualquiera no cubierto no está en el set', () => {
    expect(KNOWN_SPECIAL_CODES.has('99999')).toBe(false);
  });
});

describe('hasImplementedText (SPEC-044)', () => {
  it('marca los 3 Especiales de SPEC-039', () => {
    for (const code of [LUMINARA_CODE, ZUCKUSS_CODE, VADER_CODE]) {
      expect(hasImplementedText(code)).toBe(true);
    }
  });

  it('marca los 7 personajes de SPEC-042', () => {
    // Veers, Nightsister, Leia, Vader (Awakenings), Jabba, Tusken, Luke (Awakenings)
    for (const code of ['01004', '01012', '01028', '01010', '01020', '01022', '01035']) {
      expect(hasImplementedText(code)).toBe(true);
    }
  });

  it('NO marca cartas cuyo texto el juego no aplica', () => {
    // 05031 es el Luke de Legacies, justo el que confundió al usuario en el playtest de SPEC-042.
    expect(hasImplementedText('05031')).toBe(false);
    expect(hasImplementedText('01001')).toBe(false); // Captain Phasma (keyword, SPEC-046)
    expect(hasImplementedText('NO-EXISTE')).toBe(false);
  });

  it('distingue los dos Darth Vader', () => {
    expect(hasImplementedText('01010')).toBe(true); // Awakenings, habilidad de SPEC-042
    expect(hasImplementedText('02010')).toBe(true); // Especial de SPEC-039
  });
});

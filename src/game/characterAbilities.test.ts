import { describe, it, expect } from 'vitest';
import { luminaraBoostAmount, LUMINARA_CODE, ZUCKUSS_CODE, VADER_CODE, KNOWN_SPECIAL_CODES } from './characterAbilities';

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

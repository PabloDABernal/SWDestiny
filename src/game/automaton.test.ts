import { describe, it, expect } from 'vitest';
import {
  nextAutomatonAction,
  applyEnemyHealthMultiplier,
  DIFFICULTY_SETTINGS,
  type AutomatonSide,
  type AutomatonOpponent,
  type RerollsUsed,
} from './automaton';
import type { Character } from '../model/types';
import type { PooledDie } from './roll';

function ch(name: string, health: number): Character {
  return { code: name, name, health, isUnique: false, isElite: false, dice: [] };
}

function die(characterIndex: number, face: string, dieIndex = 0): PooledDie {
  return { characterIndex, code: `c${characterIndex}`, name: `c${characterIndex}`, dieIndex, face };
}

const noRerollsUsed = { free: false, extra: 0 };

/** Extra de "Normal" por defecto (1); los tests de reroll ajustan el valor cuando hace falta. */
const NORMAL_EXTRA_REROLLS = DIFFICULTY_SETTINGS.normal.extraRerolls;

function next(
  enemy: AutomatonSide,
  player: AutomatonOpponent,
  rerollsUsed: RerollsUsed = noRerollsUsed,
  extraRerolls: number = NORMAL_EXTRA_REROLLS,
) {
  return nextAutomatonAction(enemy, player, rerollsUsed, extraRerolls);
}

/** Recursos generosos por defecto: los tests de coste ajustan `resources` explícitamente. */
const AMPLE_RESOURCES = 99;

function enemySide(over: Partial<AutomatonSide> = {}): AutomatonSide {
  return {
    characters: [ch('Enemigo A', 10), ch('Enemigo B', 8)],
    damage: [0, 0],
    activated: [false, false],
    pool: [],
    shields: [0, 0],
    resources: AMPLE_RESOURCES,
    ...over,
  };
}

function playerSide(over: Partial<AutomatonOpponent> = {}): AutomatonOpponent {
  return {
    characters: [ch('Jugador A', 11), ch('Jugador B', 6)],
    damage: [0, 0],
    shields: [0, 0],
    ...over,
  };
}

describe('nextAutomatonAction — prioridad 1: atacar', () => {
  it('con un dado de daño en el pool, ataca al objetivo de menos vida', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')] });
    const player = playerSide({ damage: [5, 0] }); // A: 6 vida, B: 6 vida (empate)
    const action = next(enemy, player, noRerollsUsed);
    expect(action).toEqual({
      type: 'attack',
      dieIndices: [0],
      targetIndex: 0,
      costReceiverIndex: null,
    });
  });

  it('combina TODOS los dados base de daño en una sola tanda si caben sin overkill', () => {
    const enemy = enemySide({ pool: [die(0, '1MD'), die(1, '3RD'), die(0, '2ID')] });
    const player = playerSide(); // objetivo B: 6 vida, total tanda 1+3+2=6, cabe justo
    const action = next(enemy, player, noRerollsUsed);
    expect(action).toEqual({
      type: 'attack',
      dieIndices: [1, 2, 0], // orden de mayor a menor valor: 3RD, 2ID, 1MD
      targetIndex: 1,
      costReceiverIndex: null,
    });
  });

  it('combina un dado base con su modificador +X del mismo símbolo', () => {
    const enemy = enemySide({ pool: [die(0, '2MD'), die(0, '+1MD')] });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toEqual({
      type: 'attack',
      dieIndices: [0, 1],
      targetIndex: 1, // Jugador A:11, B:6 → objetivo de menos vida es B (índice 1)
      costReceiverIndex: null,
    });
  });

  it('ignora dados sin daño (blanco/recurso/focus/escudo/especial/descarte)', () => {
    const enemy = enemySide({ pool: [die(0, '-'), die(0, '1R'), die(0, '1F'), die(0, '2Sh'), die(0, 'Sp'), die(0, 'Dc')] });
    const player = playerSide();
    const action = next(enemy, player, noRerollsUsed);
    expect(action.type).not.toBe('attack');
  });

  it('objetivo: gana el jugador de menos vida cuando el dado cabe en su margen', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')] });
    const player = playerSide({ damage: [0, 3] }); // A: 11, B: 3 → gana B (menos vida, 2 cabe en 3)
    expect(next(enemy, player, noRerollsUsed)).toEqual({
      type: 'attack',
      dieIndices: [0],
      targetIndex: 1,
      costReceiverIndex: null,
    });
  });

  it('no ataca a personajes del jugador ya KO; elige el siguiente con menos vida', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')] });
    const player = playerSide({ damage: [11, 5] }); // A KO, B con 1 vida
    expect(next(enemy, player, noRerollsUsed)).toEqual({
      type: 'attack',
      dieIndices: [0],
      targetIndex: 1,
      costReceiverIndex: null,
    });
  });

  it('si el jugador está entero KO no hay objetivo: cae a la siguiente prioridad', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')] });
    const player = playerSide({ damage: [11, 6] });
    const action = next(enemy, player, noRerollsUsed);
    expect(action.type).not.toBe('attack');
  });

  it('atacar tiene prioridad sobre activar aunque haya personajes sin activar', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')], activated: [false, false] });
    const player = playerSide();
    expect(next(enemy, player, noRerollsUsed).type).toBe('attack');
  });
});

describe('nextAutomatonAction — multi-objetivo en daño (SPEC-014)', () => {
  it('sin overkill: si caben todos en el objetivo más débil, no reparte', () => {
    const enemy = enemySide({ pool: [die(0, '2MD'), die(1, '1MD')] });
    // Jugador B: 6 vida, tanda total 3 <= 6 → todo a B, sin repartir.
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', targetIndex: 1, dieIndices: [0, 1] });
  });

  it('si el objetivo más débil no puede recibir la tanda sin overkill pero otro sí, va a ese otro', () => {
    const enemy = enemySide({ pool: [die(0, '5MD'), die(1, '5MD')] });
    const player = playerSide({ damage: [0, 4] }); // A: 11 vida, B: 2 vida restante (más débil)
    const action = next(enemy, player, noRerollsUsed);
    // B (más débil) no puede recibir ni un 5MD sin overkill (margen 2); A sí puede con toda la tanda
    // (10 <= 11): se prueba primero el más débil, y si no acepta nada se prueba el siguiente.
    expect(action).toMatchObject({ type: 'attack', targetIndex: 0, dieIndices: [0, 1] });
  });

  it('si NINGÚN objetivo puede evitar el overkill, se aplica igual al más débil (inevitable)', () => {
    const enemy = enemySide({ pool: [die(0, '5MD')] });
    const player = playerSide({ damage: [10, 5] }); // A: 1 vida, B: 1 vida — ninguno soporta un 5MD
    const action = next(enemy, player, noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', targetIndex: 0, dieIndices: [0] });
  });

  it('con un dado pequeño que sí cabe y otro grande que no, reparte: el pequeño al débil, el grande queda para otra pulsación', () => {
    const enemy = enemySide({ pool: [die(0, '5MD'), die(1, '1MD')] });
    const player = playerSide({ damage: [0, 5] }); // B: 1 vida restante
    const action = next(enemy, player, noRerollsUsed);
    // 5MD (índice 0, mayor valor, se procesa primero) no cabe en 1 de margen → se salta;
    // 1MD (índice 1) sí cabe exacto → tanda de esta pulsación es solo [1].
    expect(action).toMatchObject({ type: 'attack', targetIndex: 1, dieIndices: [1] });
  });

  it('el margen de daño cuenta los escudos del objetivo (SPEC-005)', () => {
    const enemy = enemySide({ pool: [die(0, '3MD')] });
    const player = playerSide({ damage: [0, 5], shields: [0, 2] }); // B: 1 vida + 2 escudo = margen 3
    const action = next(enemy, player, noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', targetIndex: 1, dieIndices: [0] });
  });

  it('con un solo objetivo vivo y la tanda le cabe entera, se comporta como SPEC-013 (una sola pulsación)', () => {
    const enemy = enemySide({ pool: [die(0, '2MD'), die(1, '1MD')] });
    const player = playerSide({ damage: [11, 0] }); // A KO, solo B vivo (6 de vida, tanda 3 <= 6)
    const action = next(enemy, player, noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', targetIndex: 1, dieIndices: [0, 1] });
  });

  it('con un solo objetivo vivo, se sigue evitando el overkill aunque tarde varias pulsaciones', () => {
    const enemy = enemySide({ pool: [die(0, '5MD'), die(1, '5MD')] });
    const player = playerSide({ damage: [11, 0] }); // A KO, solo B vivo (6 de vida, tanda 10 > 6)
    const action = next(enemy, player, noRerollsUsed);
    // No hay otro objetivo al que redirigir, pero se sigue evitando pasarse mientras se pueda: solo
    // el primer 5MD cabe (5<=6); el segundo queda para una pulsación futura, cuando B tenga menos vida.
    expect(action).toMatchObject({ type: 'attack', targetIndex: 1, dieIndices: [0] });
  });
});

describe('nextAutomatonAction — coste de recurso', () => {
  it('con recursos suficientes, resuelve un dado de daño con coste y lo incluye en la tanda', () => {
    const enemy = enemySide({ pool: [die(0, '2MD3')], resources: 3 });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', dieIndices: [0] });
  });

  it('con recursos insuficientes para el dado más caro, lo descarta y usa otro pagable', () => {
    const enemy = enemySide({ pool: [die(0, '2MD3'), die(1, '1MD')], resources: 1 });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', dieIndices: [1] });
  });

  it('un dado impagable intercalado se salta pero no bloquea el resto de la tanda', () => {
    // 3MD3 (impagable con 2 recursos) queda fuera; 2MD y 1MD (pagables) sí se combinan.
    const enemy = enemySide({ pool: [die(0, '3MD3'), die(0, '2MD'), die(1, '1MD')], resources: 2 });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', dieIndices: [1, 2] });
  });

  it('si ningún dado de daño es pagable, esa prioridad no aplica (cae a la siguiente)', () => {
    const enemy = enemySide({ pool: [die(0, '2MD3')], resources: 0 });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action.type).not.toBe('attack');
  });

  it('solo modificadores sin dado base pagable: esa prioridad no aplica', () => {
    const enemy = enemySide({ pool: [die(0, '+1MD')] });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action.type).not.toBe('attack');
  });
});

describe('nextAutomatonAction — coste de daño indirecto propio', () => {
  it('elige como receptor al aliado no-KO que sobrevive y ya tiene escudos', () => {
    const enemy = enemySide({
      pool: [die(0, '2IDi1')],
      characters: [ch('A', 10), ch('B', 10)],
      damage: [0, 0],
      shields: [1, 0],
    });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', dieIndices: [0], costReceiverIndex: 0 });
  });

  it('sin escudos en ningún aliado, elige al superviviente de más vida', () => {
    const enemy = enemySide({
      pool: [die(0, '2IDi1')],
      characters: [ch('A', 10), ch('B', 5)],
      damage: [0, 0],
      shields: [0, 0],
    });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', costReceiverIndex: 0 });
  });

  it('si el coste mataría a cualquiera, se aplica igualmente al de más vida (inevitable)', () => {
    const enemy = enemySide({
      pool: [die(0, '2IDi5')],
      characters: [ch('A', 3), ch('B', 2)],
      damage: [0, 0],
      shields: [0, 0],
    });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', costReceiverIndex: 0 });
  });

  it('sin ningún aliado no-KO, el dado con coste indirecto se descarta de la tanda de daño', () => {
    const enemy = enemySide({
      pool: [die(0, '2IDi1'), die(1, '1MD')],
      characters: [ch('A', 10), ch('B', 10)],
      damage: [10, 10], // ambos KO
    });
    // El bando enemigo entero KO no debería darse en juego normal (sería Derrota), pero la función
    // debe seguir siendo pura y no romperse: excluye el dado con coste indirecto de la tanda.
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'attack', dieIndices: [1], costReceiverIndex: null });
  });
});

describe('nextAutomatonAction — prioridad 2: activar', () => {
  it('sin dados de daño en el pool, activa al personaje enemigo de más vida', () => {
    const enemy = enemySide();
    const player = playerSide();
    expect(next(enemy, player, noRerollsUsed)).toEqual({
      type: 'activate',
      index: 0,
    });
  });

  it('desempate por menor índice cuando hay empate de vida entre activables', () => {
    const enemy = enemySide({ characters: [ch('A', 10), ch('B', 10)] });
    expect(next(enemy, playerSide(), noRerollsUsed)).toEqual({
      type: 'activate',
      index: 0,
    });
  });

  it('no activa personajes ya activados', () => {
    const enemy = enemySide({ activated: [true, false] });
    expect(next(enemy, playerSide(), noRerollsUsed)).toEqual({
      type: 'activate',
      index: 1,
    });
  });

  it('no activa personajes KO', () => {
    const enemy = enemySide({ damage: [10, 0] }); // A (10 vida) queda KO
    expect(next(enemy, playerSide(), noRerollsUsed)).toEqual({
      type: 'activate',
      index: 1,
    });
  });
});

describe('nextAutomatonAction — escudo', () => {
  it('con un dado de escudo y sin daño, lo aplica al aliado no-KO de menor vida', () => {
    const enemy = enemySide({ pool: [die(0, '2Sh')], damage: [0, 3] }); // A:10, B:5 → B
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toEqual({
      type: 'shield',
      dieIndices: [0],
      targetIndex: 1,
      costReceiverIndex: null,
    });
  });

  it('con dos dados de escudo, solo incluye los que caben sin pasar de MAX_SHIELDS en el objetivo', () => {
    const enemy = enemySide({ pool: [die(0, '1Sh'), die(1, '3Sh')] });
    // Objetivo (menos vida, sin escudo): B (8 vida). Margen 3. Orden por valor: 3Sh (i1) primero,
    // cabe justo (total 3); el 1Sh (i0) ya no cabría (3+1=4>3), se salta para otra pulsación.
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'shield', targetIndex: 1, dieIndices: [1] });
  });

  it('atacar tiene prioridad sobre escudar', () => {
    const enemy = enemySide({ pool: [die(0, '2Sh'), die(1, '2MD')] });
    expect(next(enemy, playerSide(), noRerollsUsed).type).toBe('attack');
  });

  it('escudar tiene prioridad sobre activar', () => {
    const enemy = enemySide({ pool: [die(0, '2Sh')], activated: [false, false] });
    expect(next(enemy, playerSide(), noRerollsUsed).type).toBe('shield');
  });

  it('no escuda si el único aliado con vida es KO... cae a otra prioridad', () => {
    // ambos KO no puede pasar (sería Derrota); probamos que sin objetivo válido no hay 'shield'
    const enemy = enemySide({ pool: [die(0, '1Sh')], damage: [10, 8], activated: [true, true] });
    expect(next(enemy, playerSide(), noRerollsUsed).type).not.toBe('shield');
  });

  it('con recursos insuficientes para el coste de un dado de escudo, esa prioridad no aplica', () => {
    const enemy = enemySide({ pool: [die(0, '2Sh3')], resources: 0, activated: [true, true] });
    expect(next(enemy, playerSide(), noRerollsUsed).type).not.toBe('shield');
  });

  it('coste de daño indirecto propio en escudo (SPEC-014): aplica el coste a un aliado propio', () => {
    const enemy = enemySide({
      pool: [die(0, '3Shi1')],
      characters: [ch('A', 10), ch('B', 10)],
      damage: [0, 0],
      shields: [0, 0],
    });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'shield', dieIndices: [0], costReceiverIndex: 0 });
  });
});

describe('nextAutomatonAction — multi-objetivo en escudo (SPEC-014)', () => {
  it('reparte el sobrante al siguiente aliado con hueco cuando el más débil ya está a tope', () => {
    const enemy = enemySide({
      pool: [die(0, '3Sh'), die(1, '3Sh')],
      characters: [ch('A', 5), ch('B', 10)],
      damage: [0, 0],
      shields: [3, 0], // A (menos vida) ya está a tope de 3
    });
    const action = next(enemy, playerSide(), noRerollsUsed);
    // A no tiene hueco, así que el candidato es B (el único con hueco).
    expect(action).toMatchObject({ type: 'shield', targetIndex: 1 });
  });

  it('si todos los aliados están a tope de escudo, esa prioridad no aplica', () => {
    const enemy = enemySide({
      pool: [die(0, '2Sh')],
      characters: [ch('A', 10), ch('B', 8)],
      damage: [0, 0],
      shields: [3, 3],
      activated: [true, true],
    });
    expect(next(enemy, playerSide(), noRerollsUsed).type).not.toBe('shield');
  });
});

describe('nextAutomatonAction — recurso', () => {
  it('con un dado de recurso y nada mejor que hacer, lo resuelve', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '2R')] });
    expect(next(enemy, playerSide(), noRerollsUsed)).toEqual({
      type: 'resource',
      dieIndices: [0],
      costReceiverIndex: null,
    });
  });

  it('combina varios dados de recurso (base + modificador) en una sola tanda', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '1R'), die(1, '2R'), die(0, '+1R')] });
    // Orden por valor desc (2,1,1); empate 1R/+1R se resuelve por orden de aparición en el pool.
    expect(next(enemy, playerSide(), noRerollsUsed)).toMatchObject({
      type: 'resource',
      dieIndices: [1, 0, 2],
    });
  });

  it('coste de daño indirecto propio en recurso (SPEC-014): aplica el coste a un aliado propio', () => {
    const enemy = enemySide({
      activated: [true, true],
      pool: [die(0, '2Ri1')],
      characters: [ch('A', 10), ch('B', 10)],
      damage: [0, 0],
      shields: [0, 0],
    });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'resource', dieIndices: [0], costReceiverIndex: 0 });
  });

  it('activar tiene prioridad sobre recurso', () => {
    const enemy = enemySide({ activated: [false, true], pool: [die(0, '2R')] });
    expect(next(enemy, playerSide(), noRerollsUsed).type).toBe('activate');
  });

  it('recurso tiene prioridad sobre reroll de blancos', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '2R'), die(0, '-'), die(1, '-')] });
    expect(next(enemy, playerSide(), noRerollsUsed).type).toBe('resource');
  });

  it('1R (recurso) no se confunde con daño ranged 1RD', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '1R')] });
    expect(next(enemy, playerSide(), noRerollsUsed).type).toBe('resource');
    const enemyRD = enemySide({ pool: [die(0, '1RD')] });
    expect(next(enemyRD, playerSide(), noRerollsUsed).type).toBe('attack');
  });
});

describe('nextAutomatonAction — prioridad 3/4: reroll gratuito y extra', () => {
  it('con 2+ blancos y nada más que hacer, rerollea gratis', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-'), die(1, '-')] });
    const action = next(enemy, playerSide(), noRerollsUsed);
    expect(action).toEqual({ type: 'reroll', dieIndices: [0, 1], kind: 'free' });
  });

  it('con menos de 2 blancos no rerollea: roba una carta (SPEC-018)', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-')] });
    expect(next(enemy, playerSide(), noRerollsUsed)).toEqual({ type: 'draw' });
  });

  it('con el reroll gratuito ya gastado, usa el reroll extra de la trampa', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-'), die(1, '-')] });
    const action = next(enemy, playerSide(), { free: true, extra: 0 });
    expect(action).toEqual({ type: 'reroll', dieIndices: [0, 1], kind: 'extra' });
  });

  it('con gratuito y extra ya agotados, roba una carta aunque queden 2+ blancos (SPEC-018)', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-'), die(1, '-')] });
    const action = next(enemy, playerSide(), {
      free: true,
      extra: NORMAL_EXTRA_REROLLS,
    });
    expect(action).toEqual({ type: 'draw' });
  });

  it('reroll no se dispara si hay dados de daño o personajes por activar', () => {
    const enemyConDanio = enemySide({
      activated: [true, true],
      pool: [die(0, '-'), die(1, '-'), die(0, '2MD')],
    });
    expect(next(enemyConDanio, playerSide(), noRerollsUsed).type).toBe('attack');

    const enemyConActivar = enemySide({ pool: [die(0, '-'), die(1, '-')] });
    expect(next(enemyConActivar, playerSide(), noRerollsUsed).type).toBe('activate');
  });
});

describe('nextAutomatonAction — robar (SPEC-018)', () => {
  it('roba una carta si no hay nada más legal que hacer', () => {
    const enemy = enemySide({ activated: [true, true], pool: [] });
    expect(next(enemy, playerSide(), noRerollsUsed)).toEqual({ type: 'draw' });
  });
});

describe('applyEnemyHealthMultiplier', () => {
  it('multiplica la vida por el multiplicador dado, redondeando hacia arriba', () => {
    const result = applyEnemyHealthMultiplier([ch('A', 10), ch('B', 11)], DIFFICULTY_SETTINGS.normal.healthMultiplier);
    expect(result[0].health).toBe(15);
    expect(result[1].health).toBe(17); // 11 * 1.5 = 16.5 → 17
  });

  it('no muta los personajes originales', () => {
    const original = [ch('A', 10)];
    applyEnemyHealthMultiplier(original, DIFFICULTY_SETTINGS.normal.healthMultiplier);
    expect(original[0].health).toBe(10);
  });

  it('conserva el resto de campos del personaje', () => {
    const original = { ...ch('A', 10), isElite: true, dice: [{ sides: ['-'] }] };
    const [result] = applyEnemyHealthMultiplier([original], DIFFICULTY_SETTINGS.normal.healthMultiplier);
    expect(result).toMatchObject({ code: 'A', name: 'A', isElite: true, isUnique: false });
    expect(result.dice).toEqual(original.dice);
  });

  it('con Fácil (x1), la vida no cambia', () => {
    const [result] = applyEnemyHealthMultiplier([ch('A', 10)], DIFFICULTY_SETTINGS.easy.healthMultiplier);
    expect(result.health).toBe(10);
  });

  it('con Difícil (x2), la vida se duplica', () => {
    const [result] = applyEnemyHealthMultiplier([ch('A', 10)], DIFFICULTY_SETTINGS.hard.healthMultiplier);
    expect(result.health).toBe(20);
  });
});

describe('DIFFICULTY_SETTINGS — reroll extra por nivel', () => {
  it('Fácil (0 rerolls extra): con el gratuito ya gastado, no rerollea más y roba una carta', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-'), die(1, '-')] });
    const action = next(enemy, playerSide(), { free: true, extra: 0 }, DIFFICULTY_SETTINGS.easy.extraRerolls);
    expect(action).toEqual({ type: 'draw' });
  });

  it('Difícil (2 rerolls extra): permite un segundo reroll extra tras el primero', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-'), die(1, '-')] });
    const action = next(enemy, playerSide(), { free: true, extra: 1 }, DIFFICULTY_SETTINGS.hard.extraRerolls);
    expect(action).toEqual({ type: 'reroll', dieIndices: [0, 1], kind: 'extra' });
  });
});

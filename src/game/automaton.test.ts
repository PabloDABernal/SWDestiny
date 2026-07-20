import { describe, it, expect } from 'vitest';
import {
  nextAutomatonAction,
  applyEnemyHealthMultiplier,
  ENEMY_HEALTH_MULTIPLIER,
  ENEMY_EXTRA_REROLLS_PER_ROUND,
  type AutomatonSide,
} from './automaton';
import type { SideView } from './outcome';
import type { Character } from '../model/types';
import type { PooledDie } from './roll';

function ch(name: string, health: number): Character {
  return { code: name, name, health, isUnique: false, isElite: false, dice: [] };
}

function die(characterIndex: number, face: string, dieIndex = 0): PooledDie {
  return { characterIndex, code: `c${characterIndex}`, name: `c${characterIndex}`, dieIndex, face };
}

const noRerollsUsed = { free: false, extra: 0 };

function enemySide(over: Partial<AutomatonSide> = {}): AutomatonSide {
  return {
    characters: [ch('Enemigo A', 10), ch('Enemigo B', 8)],
    damage: [0, 0],
    activated: [false, false],
    pool: [],
    ...over,
  };
}

function playerSide(over: Partial<SideView> = {}): SideView {
  return {
    characters: [ch('Jugador A', 11), ch('Jugador B', 6)],
    damage: [0, 0],
    ...over,
  };
}

describe('nextAutomatonAction — prioridad 1: atacar', () => {
  it('con un dado de daño en el pool, ataca al objetivo de menos vida', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')] });
    const player = playerSide({ damage: [5, 0] }); // A: 6 vida, B: 6 vida (empate)
    const action = nextAutomatonAction(enemy, player, noRerollsUsed);
    expect(action).toEqual({ type: 'attack', dieIndex: 0, targetIndex: 0 });
  });

  it('elige el dado de daño de MAYOR valor si hay varios', () => {
    const enemy = enemySide({ pool: [die(0, '1MD'), die(1, '3RD'), die(0, '2ID')] });
    const player = playerSide();
    const action = nextAutomatonAction(enemy, player, noRerollsUsed);
    expect(action).toEqual({ type: 'attack', dieIndex: 1, targetIndex: 1 });
  });

  it('ignora dados sin daño (blanco/recurso/focus/escudo/especial/descarte)', () => {
    const enemy = enemySide({ pool: [die(0, '-'), die(0, '1R'), die(0, '1F'), die(0, '2Sh'), die(0, 'Sp'), die(0, 'Dc')] });
    const player = playerSide();
    const action = nextAutomatonAction(enemy, player, noRerollsUsed);
    expect(action.type).not.toBe('attack');
  });

  it('objetivo: desempate por menor índice cuando hay empate de vida', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')] });
    const player = playerSide({ damage: [0, 5] }); // A: 11, B: 1 → gana B (menos vida)
    expect(nextAutomatonAction(enemy, player, noRerollsUsed)).toEqual({
      type: 'attack',
      dieIndex: 0,
      targetIndex: 1,
    });
  });

  it('no ataca a personajes del jugador ya KO; elige el siguiente con menos vida', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')] });
    const player = playerSide({ damage: [11, 5] }); // A KO, B con 1 vida
    expect(nextAutomatonAction(enemy, player, noRerollsUsed)).toEqual({
      type: 'attack',
      dieIndex: 0,
      targetIndex: 1,
    });
  });

  it('si el jugador está entero KO no hay objetivo: cae a la siguiente prioridad', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')] });
    const player = playerSide({ damage: [11, 6] });
    const action = nextAutomatonAction(enemy, player, noRerollsUsed);
    expect(action.type).not.toBe('attack');
  });

  it('atacar tiene prioridad sobre activar aunque haya personajes sin activar', () => {
    const enemy = enemySide({ pool: [die(0, '2MD')], activated: [false, false] });
    const player = playerSide();
    expect(nextAutomatonAction(enemy, player, noRerollsUsed).type).toBe('attack');
  });
});

describe('nextAutomatonAction — prioridad 2: activar', () => {
  it('sin dados de daño en el pool, activa al personaje enemigo de más vida', () => {
    const enemy = enemySide();
    const player = playerSide();
    expect(nextAutomatonAction(enemy, player, noRerollsUsed)).toEqual({
      type: 'activate',
      index: 0,
    });
  });

  it('desempate por menor índice cuando hay empate de vida entre activables', () => {
    const enemy = enemySide({ characters: [ch('A', 10), ch('B', 10)] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed)).toEqual({
      type: 'activate',
      index: 0,
    });
  });

  it('no activa personajes ya activados', () => {
    const enemy = enemySide({ activated: [true, false] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed)).toEqual({
      type: 'activate',
      index: 1,
    });
  });

  it('no activa personajes KO', () => {
    const enemy = enemySide({ damage: [10, 0] }); // A (10 vida) queda KO
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed)).toEqual({
      type: 'activate',
      index: 1,
    });
  });
});

describe('nextAutomatonAction — escudo (SPEC-007)', () => {
  it('con un dado de escudo y sin daño, lo aplica al aliado no-KO de menor vida', () => {
    const enemy = enemySide({ pool: [die(0, '2Sh')], damage: [0, 3] }); // A:10, B:5 → B
    const action = nextAutomatonAction(enemy, playerSide(), noRerollsUsed);
    expect(action).toEqual({ type: 'shield', dieIndex: 0, targetIndex: 1 });
  });

  it('elige el dado de escudo de MAYOR valor si hay varios', () => {
    const enemy = enemySide({ pool: [die(0, '1Sh'), die(1, '3Sh')] });
    const action = nextAutomatonAction(enemy, playerSide(), noRerollsUsed);
    expect(action).toMatchObject({ type: 'shield', dieIndex: 1 });
  });

  it('atacar tiene prioridad sobre escudar', () => {
    const enemy = enemySide({ pool: [die(0, '2Sh'), die(1, '2MD')] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed).type).toBe('attack');
  });

  it('escudar tiene prioridad sobre activar', () => {
    const enemy = enemySide({ pool: [die(0, '2Sh')], activated: [false, false] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed).type).toBe('shield');
  });

  it('no escuda si el único aliado con vida es KO... cae a otra prioridad', () => {
    // ambos KO no puede pasar (sería Derrota); probamos que sin objetivo válido no hay 'shield'
    const enemy = enemySide({ pool: [die(0, '1Sh')], damage: [10, 8], activated: [true, true] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed).type).not.toBe('shield');
  });
});

describe('nextAutomatonAction — recurso (SPEC-007)', () => {
  it('con un dado de recurso y nada mejor que hacer, lo resuelve', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '2R')] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed)).toEqual({
      type: 'resource',
      dieIndex: 0,
    });
  });

  it('elige el dado de recurso de MAYOR valor', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '1R'), die(1, '2R')] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed)).toMatchObject({
      type: 'resource',
      dieIndex: 1,
    });
  });

  it('activar tiene prioridad sobre recurso', () => {
    const enemy = enemySide({ activated: [false, true], pool: [die(0, '2R')] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed).type).toBe('activate');
  });

  it('recurso tiene prioridad sobre reroll de blancos', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '2R'), die(0, '-'), die(1, '-')] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed).type).toBe('resource');
  });

  it('1R (recurso) no se confunde con daño ranged 1RD', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '1R')] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed).type).toBe('resource');
    const enemyRD = enemySide({ pool: [die(0, '1RD')] });
    expect(nextAutomatonAction(enemyRD, playerSide(), noRerollsUsed).type).toBe('attack');
  });
});

describe('nextAutomatonAction — prioridad 3/4: reroll gratuito y extra', () => {
  it('con 2+ blancos y nada más que hacer, rerollea gratis', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-'), die(1, '-')] });
    const action = nextAutomatonAction(enemy, playerSide(), noRerollsUsed);
    expect(action).toEqual({ type: 'reroll', dieIndices: [0, 1], kind: 'free' });
  });

  it('con menos de 2 blancos no rerollea: pasa', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-')] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed)).toEqual({ type: 'pass' });
  });

  it('con el reroll gratuito ya gastado, usa el reroll extra de la trampa', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-'), die(1, '-')] });
    const action = nextAutomatonAction(enemy, playerSide(), { free: true, extra: 0 });
    expect(action).toEqual({ type: 'reroll', dieIndices: [0, 1], kind: 'extra' });
  });

  it('con gratuito y extra ya agotados, pasa aunque queden 2+ blancos', () => {
    const enemy = enemySide({ activated: [true, true], pool: [die(0, '-'), die(1, '-')] });
    const action = nextAutomatonAction(enemy, playerSide(), {
      free: true,
      extra: ENEMY_EXTRA_REROLLS_PER_ROUND,
    });
    expect(action).toEqual({ type: 'pass' });
  });

  it('reroll no se dispara si hay dados de daño o personajes por activar', () => {
    const enemyConDanio = enemySide({
      activated: [true, true],
      pool: [die(0, '-'), die(1, '-'), die(0, '2MD')],
    });
    expect(nextAutomatonAction(enemyConDanio, playerSide(), noRerollsUsed).type).toBe('attack');

    const enemyConActivar = enemySide({ pool: [die(0, '-'), die(1, '-')] });
    expect(nextAutomatonAction(enemyConActivar, playerSide(), noRerollsUsed).type).toBe('activate');
  });
});

describe('nextAutomatonAction — pasa', () => {
  it('pasa si no hay nada legal que hacer', () => {
    const enemy = enemySide({ activated: [true, true], pool: [] });
    expect(nextAutomatonAction(enemy, playerSide(), noRerollsUsed)).toEqual({ type: 'pass' });
  });
});

describe('applyEnemyHealthMultiplier', () => {
  it(`multiplica la vida por x${ENEMY_HEALTH_MULTIPLIER} redondeando hacia arriba`, () => {
    const result = applyEnemyHealthMultiplier([ch('A', 10), ch('B', 11)]);
    expect(result[0].health).toBe(15);
    expect(result[1].health).toBe(17); // 11 * 1.5 = 16.5 → 17
  });

  it('no muta los personajes originales', () => {
    const original = [ch('A', 10)];
    applyEnemyHealthMultiplier(original);
    expect(original[0].health).toBe(10);
  });

  it('conserva el resto de campos del personaje', () => {
    const original = { ...ch('A', 10), isElite: true, dice: [{ sides: ['-'] }] };
    const [result] = applyEnemyHealthMultiplier([original]);
    expect(result).toMatchObject({ code: 'A', name: 'A', isElite: true, isUnique: false });
    expect(result.dice).toEqual(original.dice);
  });
});

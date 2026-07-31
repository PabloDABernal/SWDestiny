import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import type { Character } from '../model/types';

// Red de seguridad del store (SPEC-043). Fija el comportamiento ACTUAL de la máquina de turnos y de
// las resoluciones, que hasta ahora no tenía ningún test: solo lo tenían las funciones puras. Existe
// porque SPEC-042 va a diferir el cambio de turno de `activate()` y a generalizar la maquinaria de
// Focus, las dos cosas sobre código ya jugado.
//
// Los tests montan el estado a mano con `setState` en vez de importar mazos: no dependen de red, ni
// de localStorage, ni del snapshot, y cada uno describe exactamente la situación que prueba.

/** Personaje de prueba con dados de caras fijas. Las caras se eligen para que el test sea legible. */
function character(name: string, health: number, faces: string[][] = [['1MD', '1MD', '1MD', '1MD', '1MD', '1MD']]): Character {
  return {
    code: `TEST-${name}`,
    name,
    health,
    isUnique: false,
    isElite: false,
    dice: faces.map((sides) => ({ sides })),
  };
}

/** Monta una partida en curso controlada: dos bandos con personajes, turno del jugador, sin modos
 *  abiertos. Devuelve el estado a un punto conocido antes de cada test. */
function setUpGame(options: { playerChars?: Character[]; enemyChars?: Character[] } = {}) {
  const playerChars = options.playerChars ?? [character('Héroe', 10)];
  const enemyChars = options.enemyChars ?? [character('Villano', 10)];

  const side = (characters: Character[]) => ({
    characters,
    drawPile: ['01001', '01002', '01003'],
    hand: [],
    upgrades: characters.map(() => []),
    supports: [],
    discardPile: [],
    supportsActivated: [],
    activated: characters.map(() => false),
    damage: characters.map(() => 0),
    shields: characters.map(() => 0),
    resources: 2,
    pool: [],
    rerollsUsed: { free: false, extra: 0 },
    importStatus: 'idle' as const,
    importError: null,
  });

  useGameStore.setState({
    sides: { player: side(playerChars), enemy: side(enemyChars) },
    resolve: null,
    resolveError: null,
    playUpgrade: null,
    mulligan: null,
    indirectDistribution: null,
    turn: 'player',
    passStreak: 0,
    outcome: null,
    lastEnemyAction: null,
  });
}

const state = () => useGameStore.getState();

beforeEach(() => {
  // Tiradas deterministas: sin esto, cualquier test que active un personaje falla de vez en cuando.
  vi.spyOn(Math, 'random').mockReturnValue(0);
  setUpGame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('turnos (SPEC-025)', () => {
  it('activar un personaje pasa el turno al rival', () => {
    // OJO: SPEC-042 va a cambiar esto a propósito para los personajes con habilidad "tras activar".
    // Si este test falla sin que nadie lo haya tocado adrede, es que se rompió la atomicidad.
    expect(state().turn).toBe('player');
    state().activate('player', 0);
    expect(state().turn).toBe('enemy');
  });

  it('activar tira los dados del personaje al pool', () => {
    state().activate('player', 0);
    expect(state().sides.player.pool).toHaveLength(1);
    expect(state().sides.player.activated[0]).toBe(true);
  });

  it('no se puede activar fuera de tu turno', () => {
    useGameStore.setState({ turn: 'enemy' });
    state().activate('player', 0);
    expect(state().sides.player.pool).toHaveLength(0);
    expect(state().sides.player.activated[0]).toBe(false);
  });

  it('no se puede activar dos veces el mismo personaje', () => {
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' }); // devolvemos el turno a mano
    state().activate('player', 0);
    expect(state().sides.player.pool).toHaveLength(1);
  });

  it('pasar cede el turno sin hacer nada', () => {
    state().pass('player');
    expect(state().turn).toBe('enemy');
    expect(state().passStreak).toBe(1);
    expect(state().sides.player.pool).toHaveLength(0);
  });

  it('un pase suelto NO dispara el mantenimiento', () => {
    const recursosAntes = state().sides.player.resources;
    state().pass('player');
    expect(state().sides.player.resources).toBe(recursosAntes);
  });

  it('dos pases consecutivos disparan el mantenimiento y devuelven el turno al jugador', () => {
    const recursosAntes = state().sides.player.resources;
    state().pass('player');
    state().pass('enemy');
    expect(state().passStreak).toBe(0);
    expect(state().turn).toBe('player');
    // El mantenimiento da +2 recursos a cada bando (SPEC-011).
    expect(state().sides.player.resources).toBe(recursosAntes + 2);
    expect(state().sides.enemy.resources).toBe(recursosAntes + 2);
  });

  it('no se puede pasar fuera de tu turno', () => {
    state().pass('enemy');
    expect(state().turn).toBe('player');
    expect(state().passStreak).toBe(0);
  });

  it('una acción real entre dos pases reinicia la racha', () => {
    state().pass('player'); // passStreak = 1
    state().activate('enemy', 0); // acción real del enemigo
    expect(state().passStreak).toBe(0);
  });
});

describe('guardas de exclusión mutua (SPEC-020/024/025)', () => {
  it('con una mejora pendiente de objetivo no se puede activar ni pasar', () => {
    useGameStore.setState({ playUpgrade: { side: 'player', code: '01002' } });
    state().activate('player', 0);
    state().pass('player');
    expect(state().sides.player.pool).toHaveLength(0);
    expect(state().turn).toBe('player');
  });

  it('con un mulligan sin confirmar no se puede activar ni pasar', () => {
    useGameStore.setState({ mulligan: { marked: [] } });
    state().activate('player', 0);
    state().pass('player');
    expect(state().sides.player.pool).toHaveLength(0);
    expect(state().turn).toBe('player');
  });

  it('con una resolución abierta no se puede pasar', () => {
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    expect(state().resolve).not.toBeNull();
    state().pass('player');
    expect(state().turn).toBe('player');
  });
});

describe('fin de partida', () => {
  it('con la partida terminada ninguna acción de turno tiene efecto', () => {
    useGameStore.setState({ outcome: 'victory' });
    state().activate('player', 0);
    state().pass('player');
    expect(state().sides.player.pool).toHaveLength(0);
    expect(state().turn).toBe('player');
  });

  it('dejar KO al último personaje enemigo da la Victoria', () => {
    setUpGame({
      playerChars: [character('Héroe', 10)],
      enemyChars: [character('Villano', 1)], // muere de un golpe
    });
    state().activate('player', 0); // saca una cara 1MD (daño melee 1)
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().applyDieTo('enemy', 0);
    expect(state().sides.enemy.damage[0]).toBeGreaterThanOrEqual(1);
    expect(state().outcome).toBe('victory');
  });

  it('el daño se acumula sin matar si no llega a la vida', () => {
    setUpGame({
      playerChars: [character('Héroe', 10)],
      enemyChars: [character('Villano', 5)],
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().applyDieTo('enemy', 0);
    expect(state().sides.enemy.damage[0]).toBe(1);
    expect(state().outcome).toBeNull();
  });
});

describe('resolución de dados', () => {
  it('cancelar una resolución deja el dado en el pool', () => {
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    expect(state().resolve).not.toBeNull();
    state().cancelResolve();
    expect(state().resolve).toBeNull();
    expect(state().sides.player.pool).toHaveLength(1);
  });

  it('un dado de recurso suma al contador del bando', () => {
    setUpGame({
      playerChars: [character('Héroe', 10, [['2R', '2R', '2R', '2R', '2R', '2R']])],
    });
    const antes = state().sides.player.resources;
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().resolveResources();
    expect(state().sides.player.resources).toBe(antes + 2);
    expect(state().sides.player.pool).toHaveLength(0);
  });
});

describe('Focus (SPEC-023)', () => {
  // Esta es la maquinaria que SPEC-042 va a generalizar para Veers y Leia: interesa tenerla clavada.
  //
  // OJO: aquí NO valen personajes inventados. `chooseFocusFace` valida la cara elegida contra las 6
  // caras reales del dado, que busca en el snapshot por `code` (SPEC-023). Con un código que no
  // existe no encuentra el dado y la acción se ignora en silencio. Por eso estos dos son cartas
  // reales, con sus caras reales.
  const DOOKU = { code: '10001', faces: ['2MD', '2MD', '1F', '1Dc', '1R', '-'] }; // tiene cara Focus
  const KYLO = { code: '11002', faces: ['1MD', '2MD', '1Dc', '1R', 'Sp', '-'] }; // objetivo a girar

  function realCharacter(code: string, name: string, faces: string[]): Character {
    return { code, name, health: 10, isUnique: false, isElite: false, dice: [{ sides: faces }] };
  }

  it('gira el dado elegido a la cara elegida y consume el dado de Focus', () => {
    setUpGame({
      playerChars: [
        realCharacter(DOOKU.code, 'Count Dooku', DOOKU.faces),
        realCharacter(KYLO.code, 'Kylo Ren', KYLO.faces),
      ],
    });
    // Con Math.random = 0 sale siempre la primera cara, así que se fuerza el pool a mano: un dado de
    // Focus del primero y un blanco del segundo.
    useGameStore.setState({
      sides: {
        ...state().sides,
        player: {
          ...state().sides.player,
          pool: [
            { characterIndex: 0, code: DOOKU.code, name: 'Count Dooku', dieIndex: 0, face: '1F' },
            { characterIndex: 1, code: KYLO.code, name: 'Kylo Ren', dieIndex: 0, face: '-' },
          ],
        },
      },
    });

    state().selectDie('player', 0);
    expect(state().resolve?.symbol).toBe('focus');
    state().pickFocusTarget(1);
    state().chooseFocusFace('2MD'); // una de las caras reales de Kylo
    expect(state().resolve?.focusPicks).toHaveLength(1);
    state().confirmFocus();

    // El dado de Focus se consumió y el objetivo quedó girado a la cara elegida.
    expect(state().sides.player.pool.some((d) => d.face === '1F')).toBe(false);
    expect(state().sides.player.pool.some((d) => d.face === '2MD')).toBe(true);
    expect(state().resolve).toBeNull();
  });

  it('el presupuesto limita cuántos dados se pueden elegir', () => {
    setUpGame({
      playerChars: [
        realCharacter(DOOKU.code, 'Count Dooku', DOOKU.faces),
        realCharacter(KYLO.code, 'Kylo Ren', KYLO.faces),
      ],
    });
    useGameStore.setState({
      sides: {
        ...state().sides,
        player: {
          ...state().sides.player,
          pool: [
            { characterIndex: 0, code: DOOKU.code, name: 'Count Dooku', dieIndex: 0, face: '1F' },
            { characterIndex: 1, code: KYLO.code, name: 'Kylo Ren', dieIndex: 0, face: '-' },
            { characterIndex: 1, code: KYLO.code, name: 'Kylo Ren', dieIndex: 0, face: '1R' },
          ],
        },
      },
    });

    state().selectDie('player', 0); // Focus de valor 1 → presupuesto 1
    state().pickFocusTarget(1);
    state().chooseFocusFace('2MD');
    // Con el presupuesto agotado, el segundo objetivo se ignora.
    state().pickFocusTarget(2);
    expect(state().resolve?.focusFaceChoice ?? null).toBeNull();
    expect(state().resolve?.focusPicks).toHaveLength(1);
  });
});

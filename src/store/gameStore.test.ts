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
    // Imprescindible resetearlos: `setState` MEZCLA, así que un test que deje una habilidad abierta
    // envenena a los siguientes (pasó de verdad al añadir SPEC-042: reventaron los tests de Focus,
    // porque los guardas bloquean todo mientras haya una habilidad en curso). Cualquier modo nuevo
    // del store tiene que añadirse aquí.
    pendingAbility: null,
    abilityTargeting: null,
    reactiveAbility: null,
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

describe('habilidades de personaje "tras activar" (SPEC-042)', () => {
  // Códigos reales del set 01. Las caras no importan aquí: lo que se prueba es el disparo.
  const LUKE = '01035'; // "draw a card" — OBLIGATORIA (su texto no dice "you may")
  const VADER_01 = '01010'; // "you may force an opponent to discard" — opcional
  const CARAS = ['2MD', '3MD', '1F', '1Sh', '1R', '-'];

  const conCodigo = (code: string, name: string): Character => ({
    code,
    name,
    health: 12,
    isUnique: true,
    isElite: false,
    dice: [{ sides: CARAS }],
  });

  it('un personaje SIN habilidad cierra el turno como siempre', () => {
    setUpGame();
    state().activate('player', 0);
    expect(state().pendingAbility).toBeNull();
    expect(state().turn).toBe('enemy');
  });

  it('Luke roba una carta sola, sin preguntar, y cierra el turno', () => {
    setUpGame({ playerChars: [conCodigo(LUKE, 'Luke Skywalker')] });
    const manoAntes = state().sides.player.hand.length;
    const mazoAntes = state().sides.player.drawPile.length;

    state().activate('player', 0);

    expect(state().sides.player.hand).toHaveLength(manoAntes + 1);
    expect(state().sides.player.drawPile).toHaveLength(mazoAntes - 1);
    expect(state().pendingAbility).toBeNull(); // no pregunta: es obligatoria
    expect(state().turn).toBe('enemy');
  });

  it('Vader deja la activación abierta y NO cede el turno hasta decidir', () => {
    setUpGame({ playerChars: [conCodigo(VADER_01, 'Darth Vader')] });
    state().activate('player', 0);

    expect(state().pendingAbility).toEqual({ side: 'player', characterIndex: 0, code: VADER_01 });
    expect(state().turn).toBe('player'); // el turno se difiere: es la cirugía de SPEC-042
    expect(state().sides.player.pool.length).toBeGreaterThan(0); // pero el dado ya se tiró
  });

  it('usar la habilidad de Vader hace descartar al rival y cierra el turno', () => {
    setUpGame({ playerChars: [conCodigo(VADER_01, 'Darth Vader')] });
    useGameStore.setState({
      sides: {
        ...state().sides,
        enemy: { ...state().sides.enemy, hand: ['01001', '01002'] },
      },
    });
    state().activate('player', 0);
    state().useAbility();

    expect(state().sides.enemy.hand).toHaveLength(1);
    expect(state().sides.enemy.discardPile).toHaveLength(1);
    expect(state().pendingAbility).toBeNull();
    expect(state().turn).toBe('enemy');
  });

  it('renunciar a la habilidad cede el turno igual, sin aplicar nada', () => {
    setUpGame({ playerChars: [conCodigo(VADER_01, 'Darth Vader')] });
    useGameStore.setState({
      sides: { ...state().sides, enemy: { ...state().sides.enemy, hand: ['01001'] } },
    });
    state().activate('player', 0);
    state().skipAbility();

    expect(state().sides.enemy.hand).toHaveLength(1); // intacta
    expect(state().pendingAbility).toBeNull();
    expect(state().turn).toBe('enemy');
  });

  it('con el rival sin cartas, usar la habilidad no rompe nada', () => {
    setUpGame({ playerChars: [conCodigo(VADER_01, 'Darth Vader')] });
    useGameStore.setState({
      sides: { ...state().sides, enemy: { ...state().sides.enemy, hand: [] } },
    });
    state().activate('player', 0);
    state().useAbility();

    expect(state().sides.enemy.hand).toHaveLength(0);
    expect(state().turn).toBe('enemy');
  });

  it('el autómata resuelve su habilidad en el acto y NO deja la partida colgada', () => {
    // Sin esto, `activate` difiere el turno también para el enemigo: el aviso quedaría abierto del
    // lado enemigo, el jugador no tendría forma de tocarlo y el turno no volvería nunca.
    setUpGame({
      playerChars: [character('Héroe', 10)],
      enemyChars: [conCodigo(VADER_01, 'Darth Vader')],
    });
    useGameStore.setState({
      turn: 'enemy',
      sides: { ...state().sides, player: { ...state().sides.player, hand: ['01001', '01002'] } },
    });

    state().enemyTurn();

    expect(state().pendingAbility).toBeNull();
    expect(state().turn).toBe('player');
  });

  it('el autómata tampoco se cuelga con una habilidad que pide objetivos', () => {
    // Jabba abre modo de selección al usar su habilidad. Si el autómata no lo cierra (eligiendo o
    // renunciando), el turno se queda en 'enemy' esperando una elección que nadie puede hacer.
    setUpGame({
      playerChars: [character('Héroe', 10)],
      enemyChars: [conCodigo('01020', 'Jabba the Hutt')],
    });
    useGameStore.setState({ turn: 'enemy' });

    state().enemyTurn();

    expect(state().abilityTargeting).toBeNull();
    expect(state().pendingAbility).toBeNull();
    expect(state().turn).toBe('player');
  });

  it('Jabba rerollea su dado amarillo aunque haya otro blanco no-amarillo antes en el pool', () => {
    // Bug encontrado por revisor-codigo: el autómata cogía los blancos y LUEGO filtraba por color,
    // así que un blanco no elegible se comía el único hueco y la habilidad se desperdiciaba según
    // el orden del pool.
    setUpGame({
      playerChars: [character('Héroe', 10)],
      enemyChars: [conCodigo('01020', 'Jabba the Hutt')],
    });
    useGameStore.setState({
      turn: 'enemy',
      sides: {
        ...state().sides,
        enemy: {
          ...state().sides.enemy,
          pool: [
            // Un blanco de una carta que no está en el snapshot (no es amarilla), ANTES que el suyo.
            { characterIndex: 0, code: 'NO-EXISTE', name: 'Gris', dieIndex: 0, face: '-' },
            { characterIndex: 0, code: '01020', name: 'Jabba the Hutt', dieIndex: 0, face: '-' },
          ],
        },
      },
    });

    state().enemyTurn();

    // El dado amarillo se ha vuelto a tirar (ya no es blanco) o al menos la habilidad se usó.
    expect(state().abilityTargeting).toBeNull();
    expect(state().lastEnemyAction).toContain('habilidad');
  });

  it('el autómata SÍ usa la habilidad de Tusken si tiene una carta elegible en la mano', () => {
    // Bug encontrado por revisor-codigo: el bloque genérico solo sabía manejar rerolls, así que
    // Tusken nunca llegaba a usar su habilidad.
    setUpGame({
      playerChars: [character('Héroe', 10)],
      enemyChars: [conCodigo('01022', 'Tusken Raider')],
    });
    useGameStore.setState({
      turn: 'enemy',
      sides: {
        ...state().sides,
        enemy: { ...state().sides.enemy, hand: ['01035'] }, // Luke: personaje con dado, elegible
      },
    });

    state().enemyTurn();

    expect(state().sides.enemy.hand).toHaveLength(0); // la descartó
    expect(state().sides.enemy.discardPile).toContain('01035');
    expect(state().abilityTargeting).toBeNull();
    expect(state().turn).toBe('player');
  });

  it('con una habilidad pendiente no se puede hacer otra cosa', () => {
    setUpGame({
      playerChars: [conCodigo(VADER_01, 'Darth Vader'), character('Otro', 10)],
    });
    state().activate('player', 0);
    expect(state().pendingAbility).not.toBeNull();

    state().activate('player', 1); // no debe activar al segundo
    state().pass('player'); // ni pasar

    expect(state().sides.player.activated[1]).toBe(false);
    expect(state().turn).toBe('player');
    expect(state().pendingAbility).not.toBeNull();
  });
});

describe('habilidades con objetivo (SPEC-042)', () => {
  const NIGHTSISTER = '01012'; // Action - Reroll a die. Deal 1 damage to this character.
  const LEIA = '01028'; // Action - Remove this die to reroll up to 2 of your dice.
  const VEERS = '01004'; // Action - Remove this die to turn one of your support dice to any side.
  const JABBA = '01020'; // After activate: you may reroll a Yellow die (Jabba es amarillo)
  const CARAS = ['1RD', '2RD', '1Dr', '1Dc', '1R', '-'];

  const conCodigo = (code: string, name: string, health = 10): Character => ({
    code,
    name,
    health,
    isUnique: true,
    isElite: false,
    dice: [{ sides: CARAS }],
  });

  it('Nightsister se puede usar SIN haberla activado (su texto no retira su dado)', () => {
    setUpGame({ playerChars: [conCodigo(NIGHTSISTER, 'Nightsister', 7)] });
    expect(state().sides.player.activated[0]).toBe(false);

    state().startAbility('player', 0);

    expect(state().abilityTargeting).not.toBeNull();
    expect(state().abilityTargeting?.code).toBe(NIGHTSISTER);
  });

  it('Leia NO se puede usar sin su dado en el pool (su texto dice "retira este dado")', () => {
    setUpGame({ playerChars: [conCodigo(LEIA, 'Leia Organa')] });
    state().startAbility('player', 0);
    expect(state().abilityTargeting).toBeNull();
  });

  it('Nightsister se lleva 1 de daño al usarla, y gasta el turno', () => {
    setUpGame({
      playerChars: [conCodigo(NIGHTSISTER, 'Nightsister', 7), character('Otro', 10)],
    });
    state().activate('player', 1); // hay un dado en el pool para rerollear
    useGameStore.setState({ turn: 'player' });

    state().startAbility('player', 0);
    state().pickAbilityDie('player', 0);
    state().confirmAbility();

    expect(state().sides.player.damage[0]).toBe(1);
    expect(state().abilityTargeting).toBeNull();
    expect(state().turn).toBe('enemy');
  });

  it('cancelar una `Action -` no gasta el turno ni retira el dado', () => {
    setUpGame({ playerChars: [conCodigo(LEIA, 'Leia Organa')] });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    const dadosAntes = state().sides.player.pool.length;

    state().startAbility('player', 0);
    state().cancelAbility();

    expect(state().abilityTargeting).toBeNull();
    expect(state().turn).toBe('player');
    expect(state().sides.player.pool).toHaveLength(dadosAntes);
  });

  it('Leia retira su dado al confirmar y rerollea hasta 2, no más', () => {
    setUpGame({
      playerChars: [conCodigo(LEIA, 'Leia Organa'), character('A', 10), character('B', 10)],
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().activate('player', 1);
    useGameStore.setState({ turn: 'player' });
    state().activate('player', 2);
    useGameStore.setState({ turn: 'player' });
    const dadosAntes = state().sides.player.pool.length;

    state().startAbility('player', 0);
    state().pickAbilityDie('player', 1);
    state().pickAbilityDie('player', 2);
    expect(state().abilityTargeting?.dice).toHaveLength(2);
    // El tercero no entra: el máximo es 2.
    state().pickAbilityDie('player', 0);
    expect(state().abilityTargeting?.dice).toHaveLength(2);

    state().confirmAbility();
    expect(state().sides.player.pool).toHaveLength(dadosAntes - 1); // su dado se retiró
    expect(state().turn).toBe('enemy');
  });

  it('Jabba solo acepta dados amarillos', () => {
    // Jabba (01020) es amarillo; el Héroe de prueba no tiene carta en el snapshot, así que no lo es.
    setUpGame({ playerChars: [conCodigo(JABBA, 'Jabba the Hutt'), character('Gris', 10)] });
    state().activate('player', 0); // deja la habilidad pendiente (es "tras activar" opcional)
    expect(state().pendingAbility?.code).toBe(JABBA);
    state().useAbility(); // abre el modo de selección
    expect(state().abilityTargeting).not.toBeNull();

    const poolJabba = state().sides.player.pool.findIndex((d) => d.code === JABBA);
    state().pickAbilityDie('player', poolJabba);
    expect(state().abilityTargeting?.dice).toHaveLength(1); // el suyo sí es amarillo
  });

  it('cancelar una habilidad "tras activar" vuelve al aviso, sin cerrar la activación', () => {
    setUpGame({ playerChars: [conCodigo(JABBA, 'Jabba the Hutt')] });
    state().activate('player', 0);
    state().useAbility();
    expect(state().pendingAbility).toBeNull();

    state().cancelAbility();

    expect(state().abilityTargeting).toBeNull();
    expect(state().pendingAbility?.code).toBe(JABBA); // vuelve el aviso Usar / No usar
    expect(state().turn).toBe('player'); // la activación sigue sin cerrarse
  });

  it('Veers solo deja elegir dados de APOYO', () => {
    setUpGame({ playerChars: [conCodigo(VEERS, 'General Veers')] });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });

    state().startAbility('player', 0);
    state().pickAbilityDie('player', 0); // su propio dado NO es de apoyo
    expect(state().abilityTargeting?.faceTarget).toBeNull();
  });
});

describe('caminos de daño — red para SPEC-046', () => {
  // Fija el comportamiento ACTUAL de los sitios por los que entra daño a un personaje, que es donde
  // SPEC-046 va a enganchar los disparadores reactivos (Dooku "antes de recibir daño"). Si al meter
  // esos ganchos alguno de estos caminos cambia sin querer, salta aquí.

  it('los escudos absorben antes que la vida', () => {
    setUpGame({
      playerChars: [character('Héroe', 10, [['2MD', '2MD', '2MD', '2MD', '2MD', '2MD']])],
      enemyChars: [character('Villano', 10)],
    });
    useGameStore.setState({
      sides: { ...state().sides, enemy: { ...state().sides.enemy, shields: [1] } },
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().applyDieTo('enemy', 0);

    // 2 de daño contra 1 escudo: se come el escudo y entra 1 a la vida.
    expect(state().sides.enemy.shields[0]).toBe(0);
    expect(state().sides.enemy.damage[0]).toBe(1);
  });

  it('con escudos de sobra no entra nada a la vida', () => {
    setUpGame({
      playerChars: [character('Héroe', 10, [['1MD', '1MD', '1MD', '1MD', '1MD', '1MD']])],
      enemyChars: [character('Villano', 10)],
    });
    useGameStore.setState({
      sides: { ...state().sides, enemy: { ...state().sides.enemy, shields: [3] } },
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().applyDieTo('enemy', 0);

    // Este es el caso en el que SPEC-046 NO debe ofrecer el aviso de Dooku: el golpe no llega a la vida.
    expect(state().sides.enemy.shields[0]).toBe(2);
    expect(state().sides.enemy.damage[0]).toBe(0);
  });

  it('el reparto de daño indirecto del enemigo entra por su propio camino', () => {
    setUpGame({
      playerChars: [character('Héroe', 10), character('Otro', 10)],
      enemyChars: [character('Villano', 10)],
    });
    useGameStore.setState({ indirectDistribution: { pending: 2 }, turn: 'enemy' });

    state().distributeIndirect(0);
    expect(state().sides.player.damage[0]).toBe(1);
    expect(state().indirectDistribution).toEqual({ pending: 1 });

    state().distributeIndirect(1);
    expect(state().sides.player.damage[1]).toBe(1);
    expect(state().indirectDistribution).toBeNull();
  });

  it('el KO se dispara al llegar el daño a la vida, no antes', () => {
    setUpGame({
      playerChars: [character('Héroe', 10, [['2MD', '2MD', '2MD', '2MD', '2MD', '2MD']])],
      enemyChars: [character('Villano', 2)],
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().applyDieTo('enemy', 0);

    expect(state().sides.enemy.damage[0]).toBe(2);
    expect(state().outcome).toBe('victory');
  });
});

describe('el turno del enemigo siempre vuelve', () => {
  // Detectado JUGANDO SPEC-046 (2026-08-07): con dos Especiales sin implementar, el primero se
  // resolvía, el turno seguía siendo del enemigo por la excepción de SPEC-039, y la app —que solo
  // llama al autómata cuando CAMBIA el turno— dejaba la partida muerta.
  it('con dos Especiales pendientes de implementar, una sola llamada resuelve el turno', () => {
    const yoda: Character = {
      code: '05033', // Yoda de Legacies: dos caras Sp, sin efecto implementado
      name: 'Yoda',
      health: 10,
      isUnique: true,
      isElite: false,
      dice: [{ sides: ['2F', '1Dr', '1Dc', '1Sh', 'Sp', 'Sp'] }],
    };
    setUpGame({ playerChars: [character('Héroe', 10)], enemyChars: [yoda] });
    useGameStore.setState({
      turn: 'enemy',
      sides: {
        ...state().sides,
        enemy: {
          ...state().sides.enemy,
          activated: [true],
          pool: [
            { characterIndex: 0, code: '05033', name: 'Yoda', dieIndex: 0, face: 'Sp' },
            { characterIndex: 0, code: '05033', name: 'Yoda', dieIndex: 1, face: 'Sp' },
          ],
        },
      },
    });

    state().enemyTurn();

    expect(state().turn).toBe('player');
    expect(state().sides.enemy.pool.filter((d) => d.face === 'Sp')).toHaveLength(0);
  });

  it('el bucle no se come el turno cuando hay que esperar al jugador', () => {
    // Con un reparto de indirecto pendiente, el autómata NO debe seguir encadenando acciones.
    setUpGame({
      playerChars: [character('Héroe', 10), character('Otro', 10)],
      enemyChars: [character('Villano', 10)],
    });
    useGameStore.setState({ turn: 'enemy', indirectDistribution: { pending: 2 } });

    state().enemyTurn();

    expect(state().indirectDistribution).toEqual({ pending: 2 }); // intacto
    expect(state().turn).toBe('enemy'); // sigue esperando tu reparto
  });
});

describe('habilidades reactivas (SPEC-046)', () => {
  const DOOKU = '01009'; // Antes de recibir daño: descarta una carta para ganar 1 escudo
  const BALATIK = '01019'; // Tras caer un rival: puedes enderezarlo
  const ATACANTE = ['2MD', '2MD', '2MD', '2MD', '2MD', '2MD'];

  const conCodigo = (code: string, name: string, health: number, faces = ATACANTE): Character => ({
    code,
    name,
    health,
    isUnique: true,
    isElite: false,
    dice: [{ sides: faces }],
  });

  /** Deja al jugador con un dado de 2 de daño marcado, listo para mandarlo a un enemigo. */
  function conDadoListo() {
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
  }

  it('el Dooku del AUTÓMATA lo decide él, sin preguntarte', () => {
    // Es su carta: pararte la partida para que decidas por él no tendría sentido.
    setUpGame({
      playerChars: [conCodigo('ATA', 'Atacante', 10)],
      enemyChars: [conCodigo(DOOKU, 'Count Dooku', 10)],
    });
    useGameStore.setState({
      sides: { ...state().sides, enemy: { ...state().sides.enemy, hand: ['01001'] } },
    });
    conDadoListo();
    state().applyDieTo('enemy', 0);

    expect(state().reactiveAbility).toBeNull(); // no te pregunta
    expect(state().sides.enemy.hand).toHaveLength(0); // el autómata la usó
    expect(state().sides.enemy.damage[0]).toBe(1); // su escudo absorbió 1 de los 2
  });

  it('el Dooku del JUGADOR sí para el turno del autómata y espera tu decisión', () => {
    // Este es el caso de verdad: te atacan y decides si te proteges.
    setUpGame({
      playerChars: [conCodigo(DOOKU, 'Count Dooku', 10)],
      enemyChars: [conCodigo('ATA', 'Atacante', 10)],
    });
    useGameStore.setState({
      turn: 'enemy',
      sides: {
        ...state().sides,
        player: { ...state().sides.player, hand: ['01001'] },
        enemy: {
          ...state().sides.enemy,
          activated: [true],
          pool: [{ characterIndex: 0, code: 'ATA', name: 'Atacante', dieIndex: 0, face: '2MD' }],
        },
      },
    });

    state().enemyTurn();

    expect(state().reactiveAbility?.code).toBe(DOOKU);
    expect(state().sides.player.damage[0]).toBe(0); // el daño aún no ha entrado
    expect(state().turn).toBe('enemy'); // su turno sigue parado

    state().resolveReactive(true);
    state().pickReactiveHandCard(0); // ahora eliges TÚ qué carta descartas
    expect(state().sides.player.hand).toHaveLength(0);
    expect(state().sides.player.damage[0]).toBe(1); // el escudo absorbió 1 de los 2
    expect(state().reactiveAbility).toBeNull();
    expect(state().turn).toBe('player'); // y el turno vuelve
  });

  it('el escudo de Dooku absorbe el MISMO golpe que disparó su habilidad', () => {
    setUpGame({
      playerChars: [conCodigo('ATA', 'Atacante', 10)],
      enemyChars: [conCodigo(DOOKU, 'Count Dooku', 10)],
    });
    useGameStore.setState({
      sides: { ...state().sides, enemy: { ...state().sides.enemy, hand: ['01001'] } },
    });
    conDadoListo();
    state().applyDieTo('enemy', 0);
    state().resolveReactive(true);
    state().pickReactiveHandCard(0); // ahora eliges TÚ qué carta descartas

    expect(state().sides.enemy.hand).toHaveLength(0); // descartó
    // 2 de daño contra el escudo recién ganado: absorbe 1, entra 1. Ese es el criterio del usuario.
    expect(state().sides.enemy.damage[0]).toBe(1);
    expect(state().reactiveAbility).toBeNull();
  });

  it('renunciar deja entrar el daño entero', () => {
    setUpGame({
      playerChars: [conCodigo(DOOKU, 'Count Dooku', 10)],
      enemyChars: [conCodigo('ATA', 'Atacante', 10)],
    });
    useGameStore.setState({
      turn: 'enemy',
      sides: {
        ...state().sides,
        player: { ...state().sides.player, hand: ['01001'] },
        enemy: {
          ...state().sides.enemy,
          activated: [true],
          pool: [{ characterIndex: 0, code: 'ATA', name: 'Atacante', dieIndex: 0, face: '2MD' }],
        },
      },
    });
    state().enemyTurn();
    state().resolveReactive(false);

    expect(state().sides.player.hand).toHaveLength(1); // no descartó
    expect(state().sides.player.damage[0]).toBe(2); // el golpe entero
    expect(state().reactiveAbility).toBeNull();
    expect(state().turn).toBe('player');
  });

  it('con la mano vacía Dooku no interrumpe nada', () => {
    setUpGame({
      playerChars: [conCodigo('ATA', 'Atacante', 10)],
      enemyChars: [conCodigo(DOOKU, 'Count Dooku', 10)],
    });
    conDadoListo();
    state().applyDieTo('enemy', 0);

    expect(state().reactiveAbility).toBeNull();
    expect(state().sides.enemy.damage[0]).toBe(2);
  });

  it('si los escudos ya absorbían el golpe, Dooku no se dispara', () => {
    setUpGame({
      playerChars: [conCodigo('ATA', 'Atacante', 10)],
      enemyChars: [conCodigo(DOOKU, 'Count Dooku', 10)],
    });
    useGameStore.setState({
      sides: {
        ...state().sides,
        enemy: { ...state().sides.enemy, hand: ['01001'], shields: [3] },
      },
    });
    conDadoListo();
    state().applyDieTo('enemy', 0);

    expect(state().reactiveAbility).toBeNull();
    expect(state().sides.enemy.damage[0]).toBe(0);
    expect(state().sides.enemy.shields[0]).toBe(1);
  });

  it('Bala-Tik se ofrece tras caer un rival, y enderezarlo le deja volver a activarse', () => {
    setUpGame({
      playerChars: [conCodigo('ATA', 'Atacante', 10), conCodigo(BALATIK, 'Bala-Tik', 10)],
      enemyChars: [conCodigo('VIC', 'Víctima', 2), conCodigo('OTRO', 'Otro', 10)],
    });
    // Bala-Tik ya activado: si no, no hay nada que enderezar.
    useGameStore.setState({
      sides: { ...state().sides, player: { ...state().sides.player, activated: [false, true] } },
    });
    conDadoListo();
    state().applyDieTo('enemy', 0); // 2 de daño a un enemigo de 2 de vida → cae

    expect(state().sides.enemy.damage[0]).toBe(2);
    expect(state().reactiveAbility?.code).toBe(BALATIK);

    state().resolveReactive(true);
    expect(state().sides.player.activated[1]).toBe(false); // enderezado
    expect(state().reactiveAbility).toBeNull();
  });

  it('si el KO termina la partida no queda ningún aviso colgado', () => {
    setUpGame({
      playerChars: [conCodigo('ATA', 'Atacante', 10), conCodigo(BALATIK, 'Bala-Tik', 10)],
      enemyChars: [conCodigo('VIC', 'Víctima', 2)], // único enemigo: su KO da la victoria
    });
    useGameStore.setState({
      sides: { ...state().sides, player: { ...state().sides.player, activated: [false, true] } },
    });
    conDadoListo();
    state().applyDieTo('enemy', 0);

    expect(state().outcome).toBe('victory');
    expect(state().reactiveAbility).toBeNull();
  });

  it('Qui-Gon salta al ir a ganar escudos, y solo si ya tiene alguno', () => {
    const QUIGON = '01037';
    const ESCUDO = ['1Sh', '1Sh', '1Sh', '1Sh', '1Sh', '1Sh'];
    setUpGame({
      playerChars: [conCodigo(QUIGON, 'Qui-Gon Jinn', 10, ESCUDO)],
      enemyChars: [conCodigo('VIC', 'Víctima', 10)],
    });
    // Sin escudos previos: no hay nada que quitarse, así que no interrumpe.
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().applyDieTo('player', 0);
    expect(state().reactiveAbility).toBeNull();
    expect(state().sides.player.shields[0]).toBe(1);
  });

  it('Qui-Gon: usar la habilidad le quita 1 escudo y pega 1 a quien elijas', () => {
    const QUIGON = '01037';
    const ESCUDO = ['1Sh', '1Sh', '1Sh', '1Sh', '1Sh', '1Sh'];
    setUpGame({
      playerChars: [conCodigo(QUIGON, 'Qui-Gon Jinn', 10, ESCUDO)],
      enemyChars: [conCodigo('VIC', 'Víctima', 10)],
    });
    useGameStore.setState({
      sides: { ...state().sides, player: { ...state().sides.player, shields: [1] } },
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().applyDieTo('player', 0);

    expect(state().reactiveAbility?.code).toBe(QUIGON);
    state().resolveReactive(true);
    expect(state().reactiveAbility?.awaitingTarget).toBe(true); // espera objetivo

    state().pickReactiveTarget('enemy', 0);
    expect(state().sides.enemy.damage[0]).toBe(1); // pegó
    // Perdió 1 escudo por el efecto y ganó 1 por el dado que disparó todo: se queda como estaba.
    expect(state().sides.player.shields[0]).toBe(1);
    expect(state().reactiveAbility).toBeNull();
  });

  it('con un aviso reactivo abierto no se puede hacer otra cosa', () => {
    // Bloqueante que encontró revisor-codigo: sin este guard se podía mandar el dado a otro objetivo
    // con el aviso de Qui-Gon en pantalla, y la acción guardada se perdía en silencio.
    const QUIGON = '01037';
    const ESCUDO = ['1Sh', '1Sh', '1Sh', '1Sh', '1Sh', '1Sh'];
    setUpGame({
      playerChars: [conCodigo(QUIGON, 'Qui-Gon Jinn', 10, ESCUDO)],
      enemyChars: [conCodigo('VIC', 'Víctima', 10)],
    });
    useGameStore.setState({
      sides: { ...state().sides, player: { ...state().sides.player, shields: [1] } },
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().applyDieTo('player', 0);
    expect(state().reactiveAbility).not.toBeNull();

    const antes = JSON.stringify(state().sides);
    state().applyDieTo('enemy', 0); // intento de colar otra acción
    state().activate('player', 0);
    expect(JSON.stringify(state().sides)).toBe(antes); // no ha pasado nada
    expect(state().reactiveAbility).not.toBeNull(); // el aviso sigue ahí
  });

  it('un KO causado por Qui-Gon limpia los dados y las mejoras del muerto', () => {
    // Bloqueante de revisor-codigo: duplicaba el cálculo del daño y dejaba el KO a medio limpiar.
    const QUIGON = '01037';
    const ESCUDO = ['1Sh', '1Sh', '1Sh', '1Sh', '1Sh', '1Sh'];
    setUpGame({
      playerChars: [conCodigo(QUIGON, 'Qui-Gon Jinn', 10, ESCUDO)],
      enemyChars: [conCodigo('VIC', 'Víctima', 1)], // muere con 1 de daño
    });
    useGameStore.setState({
      sides: {
        ...state().sides,
        player: { ...state().sides.player, shields: [1] },
        enemy: {
          ...state().sides.enemy,
          upgrades: [['01008']],
          pool: [{ characterIndex: 0, code: 'VIC', name: 'Víctima', dieIndex: 0, face: '2MD' }],
        },
      },
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().applyDieTo('player', 0);
    state().resolveReactive(true);
    state().pickReactiveTarget('enemy', 0);

    expect(state().sides.enemy.damage[0]).toBe(1);
    expect(state().sides.enemy.pool).toHaveLength(0); // su dado se retiró
    expect(state().sides.enemy.upgrades[0]).toEqual([]); // su mejora se descartó
  });

  it('Bala-Tik reacciona a un KO causado por el ataque normal del autómata', () => {
    // Bloqueante de revisor-codigo: solo saltaba si además había un Dooku parando la acción.
    setUpGame({
      // Dos personajes: si muriera el único, la partida terminaría y no debe saltar ningún aviso.
      playerChars: [conCodigo('VIC', 'Víctima', 2), conCodigo('OTRO', 'Otro', 10)],
      enemyChars: [conCodigo('ATA', 'Atacante', 10), conCodigo(BALATIK, 'Bala-Tik', 10)],
    });
    useGameStore.setState({
      turn: 'enemy',
      sides: {
        ...state().sides,
        enemy: {
          ...state().sides.enemy,
          activated: [true, true], // Bala-Tik activado: hay algo que enderezar
          pool: [{ characterIndex: 0, code: 'ATA', name: 'Atacante', dieIndex: 0, face: '2MD' }],
        },
      },
    });

    state().enemyTurn(); // ataca y mata

    expect(state().sides.player.damage[0]).toBe(2);
    // Es el Bala-Tik del AUTÓMATA: lo decide él y se endereza solo, sin preguntar.
    expect(state().sides.enemy.activated[1]).toBe(false);
    expect(state().reactiveAbility).toBeNull();
  });

  it('Dooku también reacciona al repartir daño indirecto sobre él', () => {
    // Caso límite explícito de la spec: repartir indirecto sobre tu propio Dooku también es
    // "recibir daño". No estaba enganchado (lo cazó revisor-codigo).
    setUpGame({
      playerChars: [conCodigo(DOOKU, 'Count Dooku', 10), conCodigo('OTRO', 'Otro', 10)],
      enemyChars: [conCodigo('ATA', 'Atacante', 10)],
    });
    useGameStore.setState({
      indirectDistribution: { pending: 2 },
      turn: 'enemy',
      sides: { ...state().sides, player: { ...state().sides.player, hand: ['01001'] } },
    });

    state().distributeIndirect(0);
    expect(state().reactiveAbility?.code).toBe(DOOKU);
    expect(state().sides.player.damage[0]).toBe(0); // aún no ha entrado

    state().resolveReactive(true);
    state().pickReactiveHandCard(0); // ahora eliges TÚ qué carta descartas
    expect(state().sides.player.hand).toHaveLength(0); // descartó
    expect(state().sides.player.damage[0]).toBe(0); // el escudo absorbió el punto entero
    expect(state().indirectDistribution).toEqual({ pending: 1 }); // el reparto continúa
  });

  it('Dooku reacciona al coste indirecto que paga su propio bando', () => {
    // Caso límite de la spec: pagar un dado con daño a los tuyos también es "recibir daño".
    // La cara `2Ri1` es recurso 2 con coste de 1 de daño indirecto propio.
    setUpGame({
      playerChars: [
        conCodigo(DOOKU, 'Count Dooku', 10, ['2Ri1', '2Ri1', '2Ri1', '2Ri1', '2Ri1', '2Ri1']),
      ],
      enemyChars: [conCodigo('ATA', 'Atacante', 10)],
    });
    useGameStore.setState({
      sides: { ...state().sides, player: { ...state().sides.player, hand: ['01001'] } },
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().resolveResources();

    expect(state().reactiveAbility?.code).toBe(DOOKU);

    state().resolveReactive(true);
    state().pickReactiveHandCard(0); // ahora eliges TÚ qué carta descartas
    expect(state().sides.player.hand).toHaveLength(0); // descartó para protegerse
    expect(state().sides.player.damage[0]).toBe(0); // el escudo absorbió el coste
    expect(state().reactiveAbility).toBeNull();
    expect(state().reactiveHandled).toBeNull(); // la marca se limpia al terminar
  });

  it('reanudar tras el aviso no vuelve a preguntar por el mismo personaje', () => {
    // Sin la marca `reactiveHandled`, reanudar la acción volvería a disparar el mismo aviso: bucle.
    setUpGame({
      playerChars: [
        conCodigo(DOOKU, 'Count Dooku', 10, ['2Ri1', '2Ri1', '2Ri1', '2Ri1', '2Ri1', '2Ri1']),
      ],
      enemyChars: [conCodigo('ATA', 'Atacante', 10)],
    });
    useGameStore.setState({
      sides: { ...state().sides, player: { ...state().sides.player, hand: ['01001'] } },
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().resolveResources();
    state().resolveReactive(false); // renuncia

    expect(state().reactiveAbility).toBeNull(); // no vuelve a preguntar
    expect(state().sides.player.resources).toBeGreaterThan(2); // y el recurso se resolvió
  });

  it('Bala-Tik también reacciona a un KO por reparto de indirecto', () => {
    // Segunda pasada del revisor: se había enganchado el lado de Dooku pero no el de Bala-Tik.
    setUpGame({
      playerChars: [conCodigo('VIC', 'Víctima', 1), conCodigo('OTRO', 'Otro', 10)],
      enemyChars: [conCodigo(BALATIK, 'Bala-Tik', 10)],
    });
    useGameStore.setState({
      indirectDistribution: { pending: 2 },
      turn: 'enemy',
      sides: { ...state().sides, enemy: { ...state().sides.enemy, activated: [true] } },
    });

    state().distributeIndirect(0); // 1 de daño mata a la Víctima

    expect(state().sides.player.damage[0]).toBe(1);
    // Es el Bala-Tik del autómata: decide él y se endereza solo.
    expect(state().sides.enemy.activated[0]).toBe(false);
  });

  it('no se puede cancelar la resolución con un aviso reactivo abierto', () => {
    // Segunda pasada del revisor: cancelar dejaba el aviso colgado y al responder se desperdiciaba
    // la carta y el escudo de Dooku sin motivo.
    setUpGame({
      playerChars: [
        conCodigo(DOOKU, 'Count Dooku', 10, ['2Ri1', '2Ri1', '2Ri1', '2Ri1', '2Ri1', '2Ri1']),
      ],
      enemyChars: [conCodigo('ATA', 'Atacante', 10)],
    });
    useGameStore.setState({
      sides: { ...state().sides, player: { ...state().sides.player, hand: ['01001'] } },
    });
    state().activate('player', 0);
    useGameStore.setState({ turn: 'player' });
    state().selectDie('player', 0);
    state().resolveResources();
    expect(state().reactiveAbility).not.toBeNull();

    state().cancelResolve();
    expect(state().resolve).not.toBeNull(); // no se ha cancelado
    expect(state().reactiveAbility).not.toBeNull(); // el aviso sigue

    state().resolveReactive(true);
    state().pickReactiveHandCard(0); // ahora eliges TÚ qué carta descartas
    expect(state().sides.player.resources).toBeGreaterThan(2); // la acción sí se completó
  });

  it('Bala-Tik sin activar no se ofrece', () => {
    setUpGame({
      playerChars: [conCodigo('ATA', 'Atacante', 10), conCodigo(BALATIK, 'Bala-Tik', 10)],
      enemyChars: [conCodigo('VIC', 'Víctima', 2), conCodigo('OTRO', 'Otro', 10)],
    });
    conDadoListo();
    state().applyDieTo('enemy', 0);

    expect(state().reactiveAbility).toBeNull();
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

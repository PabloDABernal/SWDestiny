import { useEffect } from 'react';
import { readCache } from './import/resolveCards';
import { useGameStore, opposite, abilityHasTargets, type Side } from './store/gameStore';
import { CharacterCard } from './components/CharacterCard';
import { DicePool } from './components/DicePool';
import { DifficultySelector } from './components/DifficultySelector';
import { DbSection } from './components/DbSection';
import { DeckPicker } from './components/DeckPicker';
import { Hand } from './components/Hand';
import { SupportList } from './components/SupportList';
import { currentHealth, isKO } from './game/damage';
import { VADER_CODE, abilityFor } from './game/characterAbilities';

function BattleSide({ side, label }: { side: Side; label: string }) {
  const s = useGameStore((st) => st.sides[side]);
  const resolve = useGameStore((st) => st.resolve);
  const playUpgrade = useGameStore((st) => st.playUpgrade);
  const mulligan = useGameStore((st) => st.mulligan);
  const turn = useGameStore((st) => st.turn);
  const outcome = useGameStore((st) => st.outcome);
  const indirectDistribution = useGameStore((st) => st.indirectDistribution);
  const pendingAbility = useGameStore((st) => st.pendingAbility);
  const abilityTargeting = useGameStore((st) => st.abilityTargeting);
  const allSides = useGameStore((st) => st.sides);
  const startAbility = useGameStore((st) => st.startAbility);
  const activate = useGameStore((st) => st.activate);
  const applyDieTo = useGameStore((st) => st.applyDieTo);
  const resolveVaderTarget = useGameStore((st) => st.resolveVaderTarget);
  const playUpgradeOn = useGameStore((st) => st.playUpgradeOn);
  const distributeIndirect = useGameStore((st) => st.distributeIndirect);
  const activateSupport = useGameStore((st) => st.activateSupport);
  const toggleMulliganCard = useGameStore((st) => st.toggleMulliganCard);
  const cancelPlayUpgrade = useGameStore((st) => st.cancelPlayUpgrade);
  const confirmMulligan = useGameStore((st) => st.confirmMulligan);
  // Dueño del dado de Especial marcado (SPEC-039), si lo hay: decide si Vader necesita objetivo de
  // personaje en AMBOS bandos (a diferencia del resto de símbolos, con un único bando targetable).
  const specialOwnerCode = useGameStore((st) => {
    const r = st.resolve;
    if (!r || r.symbol !== 'special' || r.marked.length !== 1) return undefined;
    return st.sides[r.side].pool[r.marked[0]]?.code;
  });

  // Objetivo válido de un PERSONAJE: daño → bando contrario, escudo → propio; recurso, focus,
  // reroll de dado y especial no usan objetivo de personaje (recurso/especial resuelven con su
  // botón; focus/reroll de dado eligen dado objetivo en el propio DicePool, SPEC-023). El receptor
  // del coste indirecto ya no lo elige el jugador (corrección de SPEC-010): se determina solo.
  const active = outcome === null && resolve !== null && resolve.marked.length > 0;
  const noCharacterTarget = (s: string) => s === 'resource' || s === 'special' || s === 'focus' || s === 'reroll';
  const targetableSide = active
    ? !noCharacterTarget(resolve!.symbol) &&
      (resolve!.symbol === 'shield' ? resolve!.side === side : opposite(resolve!.side) === side)
    : false;
  // Vader (SPEC-039): su Especial ataca a un personaje de CUALQUIER bando (propio o rival, como dice
  // su texto real), a diferencia del resto de símbolos — targetable en los dos tableros a la vez.
  const vaderTargetable = active && specialOwnerCode === VADER_CODE;
  // Eligiendo objetivo para una mejora (SPEC-020): siempre el propio bando de quien la juega.
  const upgradeTargetableSide = outcome === null && playUpgrade !== null && playUpgrade.side === side;
  // Reparto de daño indirecto del autómata (SPEC-028): el jugador reparte clic a clic sobre sus
  // PROPIOS personajes, aunque no sea su turno (la acción sigue siendo del autómata).
  const distributingIndirect = outcome === null && indirectDistribution !== null && side === 'player';
  const isPlayer = side === 'player';

  return (
    <section className={`battle-side battle-side--${side}`}>
      <div className="battle-side__head">
        <h2>{label}</h2>
        {!isPlayer && <DifficultySelector />}
        <DeckPicker side={side} label={label} />
      </div>
      {isPlayer && playUpgrade && outcome === null && (
        <p className="app__hint">
          Mejora seleccionada. Pulsa uno de tus personajes para jugarla sobre él.{' '}
          <button onClick={cancelPlayUpgrade}>Cancelar</button>
        </p>
      )}
      {isPlayer && mulligan && outcome === null && (
        <p className="app__hint">
          Mulligan pendiente. Marca en tu mano las cartas que quieras devolver al mazo (0 a 5) y
          confirma para robar la misma cantidad de vuelta.{' '}
          <button onClick={confirmMulligan}>Confirmar mulligan</button>
        </p>
      )}
      {s.characters.length === 0 ? (
        <p className="roster__empty">Sin mazo importado.</p>
      ) : (
        <>
          <p className="draw-pile__count">Mazo: {s.drawPile.length} · Mano: {s.hand.length}</p>
          {isPlayer && (
            <Hand
              side={side}
              codes={s.hand}
              mulligan={mulligan}
              onToggleMulligan={toggleMulliganCard}
            />
          )}
          <div className="roster__grid">
            {s.characters.map((c, i) => {
              const dmg = s.damage[i] ?? 0;
              const ko = isKO(c, dmg);
              const upgradeCards = (s.upgrades[i] ?? []).map((code) => {
                const card = readCache(code);
                // `code` va también para poder desplegar el texto de la mejora (SPEC-044).
                return { code, name: card?.name ?? code, sides: card?.sides };
              });
              return (
                <CharacterCard
                  character={c}
                  activated={s.activated[i] === true}
                  health={currentHealth(c, dmg)}
                  shields={s.shields[i] ?? 0}
                  ko={ko}
                  targetable={(targetableSide || vaderTargetable || upgradeTargetableSide || distributingIndirect) && !ko}
                  showActivate={isPlayer}
                  upgrades={upgradeCards}
                  activateDisabled={outcome !== null || playUpgrade !== null || mulligan !== null || pendingAbility !== null || turn !== side}
                  onActivate={() => activate(side, i)}
                  {...(isPlayer && abilityFor(c.code)?.trigger === 'action'
                    ? {
                        onUseAbility: () => startAbility(side, i),
                        abilityText: abilityFor(c.code)?.prompt,
                        // "Retira este dado" (Veers, Leia) exige tenerlo en el pool; Nightsister no.
                        abilityDisabled:
                          outcome !== null ||
                          turn !== side ||
                          resolve !== null ||
                          playUpgrade !== null ||
                          mulligan !== null ||
                          pendingAbility !== null ||
                          abilityTargeting !== null ||
                          (abilityFor(c.code)?.removesOwnDie === true &&
                            !s.pool.some((d) => d.characterIndex === i)) ||
                          // Sin nada que elegir (Veers sin apoyos, Leia sin más dados que el suyo),
                          // el botón se deshabilita en vez de llevar a una selección vacía.
                          !abilityHasTargets(allSides, side, i, abilityFor(c.code)!),
                      }
                    : {})}
                  onTarget={() =>
                    distributingIndirect
                      ? distributeIndirect(i)
                      : upgradeTargetableSide
                        ? playUpgradeOn(i)
                        : vaderTargetable
                          ? resolveVaderTarget(side, i)
                          : applyDieTo(side, i)
                  }
                  key={`${c.code}-${i}`}
                />
              );
            })}
          </div>
          <SupportList
            codes={s.supports}
            activated={s.supportsActivated}
            showActivate={isPlayer}
            activateDisabled={outcome !== null || playUpgrade !== null || mulligan !== null || pendingAbility !== null || turn !== side}
            onActivate={(i) => activateSupport(side, i)}
          />
        </>
      )}
      <DicePool side={side} />
    </section>
  );
}

export function App() {
  const view = useGameStore((s) => s.view);
  const setView = useGameStore((s) => s.setView);
  const outcome = useGameStore((s) => s.outcome);
  const resolve = useGameStore((s) => s.resolve);
  const playUpgrade = useGameStore((s) => s.playUpgrade);
  const mulligan = useGameStore((s) => s.mulligan);
  const turn = useGameStore((s) => s.turn);
  const indirectDistribution = useGameStore((s) => s.indirectDistribution);
  const pendingAbility = useGameStore((s) => s.pendingAbility);
  const useAbility = useGameStore((s) => s.useAbility);
  const skipAbility = useGameStore((s) => s.skipAbility);
  const abilityTargeting = useGameStore((s) => s.abilityTargeting);
  // Jabba sin dados amarillos, Tusken con la mano sin cartas elegibles: el aviso sale igual (el
  // personaje se activó) pero "Usar" se deshabilita y solo cabe "No usar", como pide la spec.
  const pendingAbilityHasTargets = useGameStore((s) => {
    const p = s.pendingAbility;
    if (!p) return false;
    const ability = abilityFor(p.code);
    return ability ? abilityHasTargets(s.sides, p.side, p.characterIndex, ability) : false;
  });
  const confirmAbility = useGameStore((s) => s.confirmAbility);
  const cancelAbility = useGameStore((s) => s.cancelAbility);
  const chooseAbilityFace = useGameStore((s) => s.chooseAbilityFace);
  // Caras entre las que elegir ahora mismo (Veers: las del dado de apoyo elegido; Tusken: las de la
  // carta de la mano elegida). Vacío si no toca elegir cara.
  //
  // OJO: esto NO puede calcularse dentro de un selector de Zustand. Devolver un array nuevo en cada
  // llamada hace que el store crea que el estado cambió siempre y se entra en un bucle infinito de
  // renders (React #185, reventaba la app entera). Se deriva aquí, en el cuerpo del componente, de
  // valores que sí son estables.
  const playerSides = useGameStore((s) => s.sides.player);
  const abilityFaceOptions: string[] =
    abilityTargeting === null || abilityTargeting.side !== 'player' || abilityTargeting.face !== null
      ? []
      : abilityTargeting.faceTarget !== null
        ? (readCache(playerSides.pool[abilityTargeting.faceTarget]?.code ?? '')?.sides ?? [])
        : abilityTargeting.handCardIndex !== null
          ? (readCache(playerSides.hand[abilityTargeting.handCardIndex] ?? '')?.sides ?? [])
          : [];
  // ¿Se puede confirmar ya? Depende de qué pida la habilidad.
  const abilityReady = useGameStore((s) => {
    const cur = s.abilityTargeting;
    if (!cur) return false;
    const kind = abilityFor(cur.code)?.targeting.kind;
    if (kind === 'reroll') return cur.dice.length > 0;
    if (kind === 'turnSupportDie') return cur.faceTarget !== null && cur.face !== null;
    if (kind === 'discardHandCardForDie') return cur.handCardIndex !== null && cur.face !== null;
    return true;
  });
  const startGame = useGameStore((s) => s.startGame);
  const pass = useGameStore((s) => s.pass);
  const resetAll = useGameStore((s) => s.resetAll);
  const enemyTurn = useGameStore((s) => s.enemyTurn);
  const lastEnemyAction = useGameStore((s) => s.lastEnemyAction);
  const enemyHasDeck = useGameStore((s) => s.sides.enemy.characters.length > 0);
  const playerHand = useGameStore((s) => s.sides.player.hand);
  const enemyHand = useGameStore((s) => s.sides.enemy.hand);
  const playerCharacters = useGameStore((s) => s.sides.player.characters.length);
  const enemyCharacters = useGameStore((s) => s.sides.enemy.characters.length);
  // "Nueva partida" (SPEC-024): solo tiene sentido en estado fresco, ambos bandos con mazo
  // importado y mano vacía (si no, ya se está jugando o falta importar).
  const canStartGame =
    outcome === null &&
    playerCharacters > 0 &&
    enemyCharacters > 0 &&
    playerHand.length === 0 &&
    enemyHand.length === 0;

  // Turnos reales alternados (SPEC-025): en cuanto es el turno del enemigo, el autómata ejecuta su
  // siguiente acción automáticamente, sin botón. `enemyTurn` re-lee el estado fresco y solo actúa si
  // `turn === 'enemy'` (guard interno), así que una doble invocación (React StrictMode) es inofensiva.
  useEffect(() => {
    if (turn === 'enemy' && outcome === null && enemyHasDeck) {
      enemyTurn();
    }
  }, [turn, outcome, enemyHasDeck, enemyTurn]);

  const hint =
    resolve === null || outcome !== null || resolve.marked.length === 0
      ? null
      : resolve.symbol === 'shield'
          ? 'Dado de escudo marcado. Pulsa un personaje de tu propio bando para aplicarlo.'
          : resolve.symbol === 'resource'
            ? null
            : resolve.symbol === 'special'
              ? null
              : resolve.symbol === 'focus'
                ? resolve.focusFaceChoice != null
                  ? null
                  : 'Dado de Focus marcado. Pulsa un dado propio en tu pool para elegir su nueva cara.'
                : resolve.symbol === 'reroll'
                  ? 'Dado de Reroll marcado. Pulsa un dado (de cualquier pool) para rerollearlo.'
                  : resolve.symbol === 'disrupt' || resolve.symbol === 'discard'
                    ? null
                    : 'Dado de daño marcado. Pulsa un personaje enemigo para aplicarlo.';

  return (
    <main className="app">
      <h1>Star Wars Destiny — PVE</h1>

      <div className="tabs" role="tablist">
        <button
          className={view === 'play' ? 'tabs__tab tabs__tab--active' : 'tabs__tab'}
          onClick={() => setView('play')}
        >
          Jugar
        </button>
        <button
          className={view === 'db' ? 'tabs__tab tabs__tab--active' : 'tabs__tab'}
          onClick={() => setView('db')}
        >
          DB
        </button>
      </div>

      {view === 'db' ? (
        <DbSection />
      ) : (
        <>
      {outcome && (
        <div className={`outcome outcome--${outcome}`} role="status">
          {outcome === 'victory' ? '🏆 Victoria' : '💀 Derrota'}
        </div>
      )}
      {hint && <p className="app__hint">{hint}</p>}
      {pendingAbility && pendingAbility.side === 'player' && outcome === null && (
        <p className="app__hint app__hint--ability">
          {abilityFor(pendingAbility.code)?.prompt ?? 'Habilidad de personaje disponible.'}{' '}
          {!pendingAbilityHasTargets && <em>(sin objetivos válidos)</em>}{' '}
          <button onClick={useAbility} disabled={!pendingAbilityHasTargets}>
            Usar
          </button>{' '}
          <button onClick={skipAbility}>No usar</button>
        </p>
      )}
      {abilityTargeting && abilityTargeting.side === 'player' && outcome === null && (
        <p className="app__hint app__hint--ability">
          {abilityFor(abilityTargeting.code)?.prompt}{' '}
          {abilityTargeting.faceTarget !== null && abilityTargeting.face === null
            ? 'Elige la cara a la que girarlo.'
            : abilityTargeting.handCardIndex !== null && abilityTargeting.face === null
              ? 'Elige la cara de esa carta a resolver.'
              : abilityFor(abilityTargeting.code)?.targeting.kind === 'reroll'
                ? `Pulsa los dados a volver a tirar (${abilityTargeting.dice.length}).`
                : abilityFor(abilityTargeting.code)?.targeting.kind === 'turnSupportDie'
                  ? 'Pulsa uno de tus dados de apoyo.'
                  : 'Pulsa una carta de tu mano.'}{' '}
          <button onClick={confirmAbility} disabled={!abilityReady}>
            Confirmar
          </button>{' '}
          <button onClick={cancelAbility}>Cancelar</button>
        </p>
      )}
      {abilityFaceOptions.length > 0 && (
        <p className="app__hint app__hint--ability">
          Caras:{' '}
          {abilityFaceOptions.map((face) => (
            <button key={face} onClick={() => chooseAbilityFace(face)}>
              {face}
            </button>
          ))}
        </p>
      )}
      {indirectDistribution && outcome === null && (
        <p className="app__hint">
          El enemigo te ataca con daño indirecto: reparte {indirectDistribution.pending} punto(s)
          pulsando tus propios personajes (puedes concentrarlo todo en uno solo).
        </p>
      )}
      {turn === 'enemy' && outcome === null && !indirectDistribution && (
        <p className="app__hint">Turno del enemigo...</p>
      )}
      {lastEnemyAction && <p className="app__hint">{lastEnemyAction}</p>}

      <div className="controls">
        <button onClick={startGame} disabled={!canStartGame}>
          Nueva partida
        </button>
        <button onClick={resetAll}>Reset total</button>
        <button
          onClick={() => pass('player')}
          // Bloqueado con cualquier dado marcado sin aplicar, con una mejora seleccionada, o con un
          // mulligan pendiente de confirmar (SPEC-024/025): no tiene sentido pasar con una acción a
          // medio construir, hay que cancelarla primero. Y, claro, solo se puede pasar en tu turno.
          disabled={
            outcome !== null ||
            turn !== 'player' ||
            resolve !== null ||
            playUpgrade !== null ||
            mulligan !== null
          }
        >
          Pasar
        </button>
      </div>

      <div className="battle-sides">
        <BattleSide side="enemy" label="Enemigo" />
        <BattleSide side="player" label="Jugador" />
      </div>
        </>
      )}
    </main>
  );
}

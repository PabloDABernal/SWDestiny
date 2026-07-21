import { useGameStore } from '../store/gameStore';
import type { Difficulty } from '../game/automaton';

const LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  normal: 'Normal',
  hard: 'Difícil',
};

/** Selector de dificultad del autómata enemigo (SPEC-015). Solo afecta a la próxima importación del
 * mazo enemigo (vida); el reroll extra de la trampa se aplica de inmediato. */
export function DifficultySelector() {
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);

  return (
    <label className="difficulty-selector">
      <span className="difficulty-selector__label">Dificultad</span>
      <select
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value as Difficulty)}
      >
        {(Object.keys(LABELS) as Difficulty[]).map((level) => (
          <option key={level} value={level}>
            {LABELS[level]}
          </option>
        ))}
      </select>
    </label>
  );
}

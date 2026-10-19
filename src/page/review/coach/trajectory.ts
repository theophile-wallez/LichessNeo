import type { Color } from '#shared/chess/index.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { ReviewLanguage, Standing } from '#page/review/i18n/types.ts';

// How a move changed the game: "The game was balanced, but now Black has a
// clear advantage."

function winLevel(winChance: number): number {
  if (winChance >= 90) return 3;
  if (winChance >= 70) return 2;
  return winChance >= 58 ? 1 : 0;
}

function lossLevel(winChance: number): number {
  if (winChance <= 10) return 3;
  if (winChance <= 30) return 2;
  return winChance <= 42 ? 1 : 0;
}

/** White's view of a position, from -4 (Black mates) to 4 (White mates). */
export function evaluationLevel(record: PositionRecord): number {
  if ('mate' in record)
    return record.mate > 0 || (record.mate === 0 && record.whiteWinChance > 50) ? 4 : -4;
  return winLevel(record.whiteWinChance) - lossLevel(record.whiteWinChance);
}

/** "a clear advantage", or "a mate in 3" when there's a mate to count. */
export function advantageName(
  level: number,
  record: PositionRecord,
  language: ReviewLanguage,
): string {
  const { advantages, mateIn } = language.trajectory;
  if (Math.abs(level) === 4 && 'mate' in record && record.mate !== 0)
    return mateIn(Math.abs(record.mate));
  return advantages[Math.abs(level)] ?? '';
}

export interface TrajectoryInput {
  readonly before: PositionRecord;
  readonly after: PositionRecord;
  readonly mover: Color;
  /** Picks among the sentences that say the same thing. */
  readonly seed: number;
}

const sideOf = (level: number): Color => (level > 0 ? 'white' : 'black');

export function trajectory(input: TrajectoryInput, language: ReviewLanguage): string {
  const sentences = language.trajectory;
  const levelBefore = evaluationLevel(input.before);
  const levelAfter = evaluationLevel(input.after);
  const before: Standing = {
    side: sideOf(levelBefore),
    advantage: advantageName(levelBefore, input.before, language),
  };
  const after: Standing = {
    side: sideOf(levelAfter),
    advantage: advantageName(levelAfter, input.after, language),
  };
  const pick = (ways: readonly string[]): string => ways[input.seed % ways.length] ?? '';
  if (levelBefore === levelAfter)
    return pick(levelAfter === 0 ? sentences.stillBalanced : sentences.stillAhead(after));
  if (levelBefore === 0) return pick(sentences.wasBalanced(after, after.side === input.mover));
  if (levelAfter === 0) return pick(sentences.nowBalanced(before));
  if (after.side !== before.side) return pick(sentences.swings(before, after));
  return pick(
    Math.abs(levelAfter) > Math.abs(levelBefore)
      ? sentences.grows(after.side, before.advantage, after.advantage)
      : sentences.shrinks(after.side, before.advantage, after.advantage),
  );
}

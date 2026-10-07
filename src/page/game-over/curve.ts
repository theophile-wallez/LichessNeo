import type { ReviewCurve } from '#shared/protocol.ts';
import { forColor, type PositionRecord } from '#page/review/evaluation/score.ts';
import { isPlayed, type GamePosition } from '#page/review/judge/types.ts';
import { moveLabel } from '#page/review/view/moments.ts';

// What the game's panel shows of Game Review's analysis before it's opened
// (content/game/review-invite): White's win chances along the game, and the
// move it turned on.

/** The least win chance a move must give away for the game to have turned on it. */
const TURNING_LOSS = 20;

export function reviewCurve(
  positions: readonly GamePosition[],
  records: readonly (PositionRecord | undefined)[],
): Omit<ReviewCurve, 'gameId'> {
  const whiteWinChances = positions.map((_, i) => records[i]?.whiteWinChance ?? null);
  let turning: ReviewCurve['turning'] = null;
  let worst = TURNING_LOSS;
  for (const [i, position] of positions.entries()) {
    const before = whiteWinChances[i - 1];
    const after = whiteWinChances[i];
    if (!isPlayed(position) || typeof before !== 'number' || typeof after !== 'number') continue;
    const mover = position.ply % 2 === 1 ? 'white' : 'black';
    const loss = forColor(before, mover) - forColor(after, mover);
    if (loss < worst) continue;
    worst = loss;
    turning = { index: i, move: moveLabel(position) };
  }
  return { whiteWinChances, turning };
}

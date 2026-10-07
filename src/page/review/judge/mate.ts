import type { Color } from '#shared/chess/index.ts';
import { forColor, type PositionRecord } from '#page/review/evaluation/score.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';

/**
 * The longest mate our depth gets exact: a longer one comes out long (a mate
 * in 8 as a mate in 12), so only a move's short side is trusted.
 */
export const SURE_MATE = 5;

export type MateVerdict = Extract<MoveClass, 'excellent' | 'good' | 'inaccuracy'>;

const mateOf = (record: PositionRecord): number | undefined =>
  'mate' in record ? record.mate : undefined;

// No mate after the move: losing a mate counts as giving away endless moves.
const mateLost = (own: number): number => (own > 0 ? Infinity : 0);

// The loser's mate, sure and come sooner: in 2 or fewer, every other move lasted longer.
const soonerMate = (moves: number): MateVerdict => (moves <= 2 ? 'inaccuracy' : 'good');

function slowerMate(movesLost: number): MateVerdict | null {
  if (movesLost <= 0) return null;
  if (movesLost <= 2) return 'excellent';
  return movesLost <= 5 ? 'good' : 'inaccuracy';
}

/** Under this share of winning chances, the mover was lost already. */
const LOST = 5;

/**
 * A lost position's move that lets in a sure mate where there was none: it
 * costs next to no win probability, the game being lost anyway.
 */
function letInMate(
  before: PositionRecord,
  mateAfter: number | undefined,
  color: Color,
): MateVerdict | null {
  const chances = forColor(before.whiteWinChance, color);
  const matedIn = -(mateAfter ?? 0) * (color === 'white' ? 1 : -1);
  return chances < LOST && matedIn > 0 && matedIn <= SURE_MATE ? soonerMate(matedIn) : null;
}

/**
 * The verdict a move deserves from mate distances, which the win probability
 * can't see (a slower mate is 100% all the same). The winner of a sure mate
 * is judged by the moves given away; the loser, when a sure mate comes
 * clearly sooner or is let in where there was none, by how soon. Never worse
 * than an inaccuracy: the result stays the same.
 */
export function mateVerdict(
  before: PositionRecord,
  after: PositionRecord,
  color: Color,
): MateVerdict | null {
  const mateBefore = mateOf(before);
  const mateAfter = mateOf(after);
  const sign = color === 'white' ? 1 : -1;
  if (mateBefore === undefined) return letInMate(before, mateAfter, color);
  if (!mateBefore || mateAfter === 0) return null;
  const own = mateBefore * sign;
  const ownAfter = mateAfter === undefined ? mateLost(own) : mateAfter * sign;
  if (own > 0 && own <= SURE_MATE && ownAfter > 0) return slowerMate(ownAfter - (own - 1));
  if (own < 0 && ownAfter < 0 && -ownAfter <= SURE_MATE && ownAfter - own >= 3)
    return soonerMate(-ownAfter);
  return null;
}

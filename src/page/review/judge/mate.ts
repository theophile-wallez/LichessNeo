import type { Color } from '#shared/chess/index.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
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

// Lichess's ladder for a mate let in where there was none, by the mover's
// score before it: from a game still on, a blunder; nearly lost, a mistake.
const STILL_ON = -700;
const NEARLY_LOST = -1000;

/** How many moves the mover is mated in after a move that lets a mate in, from no mate before. */
function matedIn(before: PositionRecord, after: PositionRecord, color: Color): number | null {
  const mate = mateOf(after);
  if (mateOf(before) !== undefined || mate === undefined) return null;
  const moves = -mate * (color === 'white' ? 1 : -1);
  return moves > 0 ? moves : null;
}

/** The mover's score before the move, in centipawns, when it was one. */
const ownScore = (before: PositionRecord, color: Color): number | null =>
  'cp' in before ? before.cp * (color === 'white' ? 1 : -1) : null;

/**
 * The least a move that lets in a mate where there was none costs: the win
 * probability barely sees it from a bad position (+6 against is a few points).
 */
export function letInMateClass(
  before: PositionRecord,
  after: PositionRecord,
  color: Color,
): Extract<MoveClass, 'mistake' | 'blunder'> | null {
  const score = ownScore(before, color);
  if (score === null || matedIn(before, after, color) === null) return null;
  if (score >= STILL_ON) return 'blunder';
  return score >= NEARLY_LOST ? 'mistake' : null;
}

/**
 * A lost position's move that lets in a sure mate where there was none: it
 * costs next to no win probability, the game being lost anyway.
 */
function letInMate(
  before: PositionRecord,
  after: PositionRecord,
  color: Color,
): MateVerdict | null {
  const moves = matedIn(before, after, color);
  const score = ownScore(before, color);
  const lost = score !== null && score < NEARLY_LOST;
  return lost && moves !== null && moves <= SURE_MATE ? soonerMate(moves) : null;
}

/**
 * The verdict a move deserves from mate distances, which the win probability
 * can't see (a slower mate is 100% all the same). The winner of a sure mate
 * is judged by the moves given away; the loser, when a sure mate comes
 * clearly sooner or is let in from a lost position, by how soon. Never worse
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
  if (mateBefore === undefined) return letInMate(before, after, color);
  if (!mateBefore || mateAfter === 0) return null;
  const own = mateBefore * sign;
  const ownAfter = mateAfter === undefined ? mateLost(own) : mateAfter * sign;
  if (own > 0 && own <= SURE_MATE && ownAfter > 0) return slowerMate(ownAfter - (own - 1));
  if (own < 0 && ownAfter < 0 && -ownAfter <= SURE_MATE && ownAfter - own >= 3)
    return soonerMate(-ownAfter);
  return null;
}

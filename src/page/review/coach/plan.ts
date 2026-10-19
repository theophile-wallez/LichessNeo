import { type Board, type Color, parseSquare, type Square } from '#shared/chess/index.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { PlanSentences, Ways } from '#page/review/i18n/types.ts';
import { isPlain, type Plan } from './idea.ts';
import { pressureOf, rookPlan, rooksConnected, takesCenter } from './pressure.ts';
import { type Fact, oneOf, said } from './said.ts';
import { centerDistance, isEndgame, isOutpost, isPassed, ownRank } from './structure.ts';

// What a quiet move does for the position when it wins or stops nothing: it
// pins or chases a piece, develops one, takes an open file or the seventh
// rank, settles on an outpost, makes or pushes a passed pawn, brings the king
// to the center of an endgame. Said of the move played, or of the better move
// as what it did.

/** A move on the board, to read its plan from. */
export interface Play {
  readonly color: Color;
  readonly ply: number;
  readonly uci: string;
  readonly san: string;
  readonly before: Board;
  readonly after: Board;
}

// The opening's moves, by ply, in which a minor piece's first move develops it,
// and a central pawn's takes the center.
const OPENING_PLIES = 30;
const CENTER_PLIES = 16;
const BACK_SQUARES: Readonly<Record<Color, readonly string[]>> = {
  white: ['b1', 'c1', 'f1', 'g1'],
  black: ['b8', 'c8', 'f8', 'g8'],
};

function piecePlan(play: Play, from: Square, to: Square): Plan | null {
  const { after, color } = play;
  const piece = after.get(to);
  if (!piece) return null;
  const opening = play.ply <= OPENING_PLIES && BACK_SQUARES[color].includes(from);
  if (opening && (piece.role === 'knight' || piece.role === 'bishop'))
    return { kind: 'develops', piece };
  if (piece.role === 'knight' && isOutpost(after, to, piece)) return { kind: 'outpost', piece };
  if (piece.role === 'rook' && ownRank(from, color) !== 6) return rookPlan(after, to, color);
  if (piece.role === 'king' && isEndgame(after) && centerDistance(to) < centerDistance(from))
    return { kind: 'centralKing' };
  return null;
}

// A piece off the back rank that leaves the rooks seeing each other.
const connects = ({ before, after, color }: Play, from: Square): boolean =>
  ownRank(from, color) === 0 && !rooksConnected(before, color) && rooksConnected(after, color);

function pawnPlan(play: Play, from: Square, to: Square): Plan | null {
  const { after, before, color } = play;
  if (isPassed(after, to, color))
    return { kind: 'passedPawn', made: !isPassed(before, from, color) };
  if (play.ply <= CENTER_PLIES && takesCenter(to, color)) return { kind: 'center' };
  return null;
}

/** What the move does for the position, if it's one of the plans the coach names. */
export function planOf(play: Play): Plan | null {
  const from = parseSquare(play.uci.slice(0, 2));
  const to = parseSquare(play.uci.slice(2, 4));
  if (!from || !to || /[x+]/.test(play.san) || play.san.startsWith('O-O')) return null;
  const pawn = play.after.get(to)?.role === 'pawn';
  const quiet = pawn ? pawnPlan(play, from, to) : null;
  if (quiet) return quiet;
  const pressure = pressureOf(play.after, to, play.color);
  if (pressure || pawn) return pressure;
  return piecePlan(play, from, to) ?? (connects(play, from) ? { kind: 'connectsRooks' } : null);
}

/** The ways to say a plan. */
export function planWays(plan: Plan, sentences: PlanSentences): Ways {
  if (isPlain(plan)) return sentences[plan.kind];
  if (plan.kind === 'develops') return sentences.develops(plan.piece);
  if (plan.kind === 'outpost') return sentences.outpost(plan.piece);
  if (plan.kind === 'openFile') return sentences.openFile(plan.halfOpen);
  if (plan.kind === 'passedPawn') return sentences.passedPawn(plan.made);
  if (plan.kind === 'chases') return sentences.chases(plan.piece);
  return sentences.pins(plan.piece, plan.behind);
}

export interface PlanInput {
  readonly move: MoveVerdict;
  readonly sentences: PlanSentences;
  readonly before: Board;
  readonly after: Board;
}

/** What the quiet move played does for the position. */
export function planFact({ move, sentences, before, after }: PlanInput): Fact | null {
  // With a mate on the board, the mate is the point, not the plan.
  if ('mate' in move.before || 'mate' in move.after) return null;
  const plan = planOf({
    color: move.color,
    ply: move.ply,
    uci: move.uci,
    san: move.san,
    before,
    after,
  });
  return plan && said(oneOf(planWays(plan, sentences), move));
}

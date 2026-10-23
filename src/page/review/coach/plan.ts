import {
  type Board,
  type Color,
  opposite,
  parseFen,
  parseSquare,
  type Role,
  type Square,
} from '#shared/chess/index.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { PlanSentences, Ways } from '#page/review/i18n/types.ts';
import { isPlain, type Plan, type Reason } from './idea.ts';
import {
  contestsFile,
  fightsCenter,
  loosePawnOf,
  pressureOf,
  rookPlan,
  rooksConnected,
  supportsCenter,
  takesCenter,
  uncoveredOf,
} from './pressure.ts';
import { batteryPlan, batteryReady } from './battery.ts';
import { discoveryOf } from './discovery.ts';
import { reasonMarks } from './drawing.ts';
import { takesOpposition } from './opposition.ts';
import { entersSquare, outOfReach, outruns } from './pawn-square.ts';
import { behindPasser, centralSquare, makesLuft, pawnGuards, safetyPlan } from './safety.ts';
import { type Fact, oneOf, said } from './said.ts';
import { centerDistance, isEndgame, isOutpost, isPassed, ownRank } from './structure.ts';
import { evaluationLevel } from './trajectory.ts';

// What a quiet move does for the position when it wins or stops nothing: it
// pins or chases a piece, sets up a discovery, develops one, takes an open file or the seventh
// rank, settles on an outpost or in the center, makes or pushes a passed pawn,
// backs it with a rook, brings the king to the center of an endgame, takes a
// piece out of danger or defends one. Said of the move played, or of the
// better move as what it did.

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

// A knight's or a rook's square: an outpost, the center, behind a passed pawn, a
// file or rank; a bishop's or the queen's, a battery, or the queen's, a file contested.
function squarePlan({ after, color }: Play, from: Square, to: Square): Plan | null {
  const piece = after.get(to);
  if (piece?.role === 'knight') {
    if (isOutpost(after, to, piece)) return { kind: 'outpost', piece };
    return centralSquare(to) && !centralSquare(from) ? { kind: 'centralizes', piece } : null;
  }
  if (piece?.role === 'bishop') return batteryPlan(after, [from, to]);
  if (piece?.role === 'queen')
    return batteryPlan(after, [from, to]) ?? contestsFile(after, [from, to], color);
  if (piece?.role !== 'rook') return null;
  if (behindPasser(after, to, color)) return { kind: 'behindPasser' };
  return ownRank(from, color) === 6 ? null : rookPlan(after, [from, to], color);
}

function piecePlan(play: Play, from: Square, to: Square): Plan | null {
  const { after, color } = play;
  const piece = after.get(to);
  if (!piece) return null;
  const opening = play.ply <= OPENING_PLIES && BACK_SQUARES[color].includes(from);
  if (opening && (piece.role === 'knight' || piece.role === 'bishop'))
    return { kind: 'develops', piece };
  if (piece.role === 'king') {
    const enters = entersSquare(play.before, after, color);
    if (enters) return enters;
    if (takesOpposition(play.before, after, color)) return { kind: 'opposition' };
    if (isEndgame(after) && centerDistance(to) < centerDistance(from))
      return { kind: 'centralKing' };
  }
  return squarePlan(play, from, to);
}

// A piece off the back rank that leaves the rooks seeing each other.
const connects = ({ before, after, color }: Play, from: Square): boolean =>
  ownRank(from, color) === 0 && !rooksConnected(before, color) && rooksConnected(after, color);

function pawnPlan(play: Play, from: Square, to: Square): Plan | null {
  const { after, before, color } = play;
  const made = !isPassed(before, from, color);
  const runs = outruns(after, to, color, made);
  if (runs) return runs;
  if (isPassed(after, to, color)) return { kind: 'passedPawn', made };
  if (play.ply <= CENTER_PLIES && takesCenter(to, color)) return { kind: 'center' };
  if (play.ply <= CENTER_PLIES && fightsCenter(to, color)) return { kind: 'fightsCenter' };
  if (play.ply <= OPENING_PLIES && supportsCenter(before, after, to, color))
    return { kind: 'supportsCenter' };
  return null;
}

const HEAVY: ReadonlySet<Role> = new Set<Role>(['rook', 'queen']);

// A back rank a rook or queen of the other side's could mate on: none of the
// side's own guards it.
function weakBackRank(board: Board, color: Color): boolean {
  const heavy = [...board].filter(([, piece]) => HEAVY.has(piece.role));
  const guarded = heavy.some(
    ([square, piece]) => piece.color === color && ownRank(square, color) === 0,
  );
  return !guarded && heavy.some(([, piece]) => piece.color !== color);
}

// What a pawn's move does once it attacks nothing: a piece or pawn of its own
// defended; a hole for the king, past the opening and on a weak back rank; a
// pawn on the fifth rank that cramps the other side.
function pawnShape({ before, after, color, ply }: Play, from: Square, to: Square): Plan | null {
  const guards = pawnGuards(before, after, to);
  if (guards) return guards;
  const weak = ply > OPENING_PLIES && weakBackRank(after, color);
  if (weak && makesLuft(before, [from, to], color)) return { kind: 'luft' };
  return ownRank(to, color) === 4 && !isEndgame(after) ? { kind: 'space' } : null;
}

// A piece pinned or chased, by the piece moved or a line it opened.
const attackOf = ({ before, after, color }: Play, to: Square): Plan | null =>
  pressureOf(after, to, color) ?? uncoveredOf(before, after, to);

/** What the move does for the position, if it's one of the plans the coach names. */
export function planOf(play: Play): Plan | null {
  const from = parseSquare(play.uci.slice(0, 2));
  const to = parseSquare(play.uci.slice(2, 4));
  if (!from || !to || /[x+]/.test(play.san) || play.san.startsWith('O-O')) return null;
  // A pawn that attacks a piece does so before it does anything for the king.
  if (play.after.get(to)?.role === 'pawn')
    return pawnPlan(play, from, to) ?? attackOf(play, to) ?? pawnShape(play, from, to);
  const pressure = attackOf(play, to);
  if (pressure) return pressure;
  return (
    discoveryOf(play.before, play.after, [from, to]) ??
    piecePlan(play, from, to) ??
    safetyPlan(play.before, play.after, [from, to]) ??
    (connects(play, from) ? { kind: 'connectsRooks' } : null) ??
    loosePawnPlan(play, to)
  );
}

// A pawn left hanging is the move's point only when it has no other.
function loosePawnPlan({ before, after }: Play, to: Square): Plan | null {
  const pawn = loosePawnOf(before, after, to);
  const piece = pawn && after.get(pawn);
  return pawn && piece ? { kind: 'attacksPawn', piece, square: pawn } : null;
}

// The tactics a move may set up while it defends a piece of its own.
const TACTICS: ReadonlySet<Plan['kind']> = new Set<Plan['kind']>([
  'chases',
  'attacksPawn',
  'pins',
  'discovery',
]);

/**
 * The move's plan, and when the plan is a tactic, the piece it defends on the
 * way, or else the battery it leaves ready on its file.
 */
export function reasonOf(play: Play): Reason | null {
  const plan = planOf(play);
  const from = parseSquare(play.uci.slice(0, 2));
  const to = parseSquare(play.uci.slice(2, 4));
  if (!plan || !from || !to || !TACTICS.has(plan.kind)) return plan;
  const also = safetyPlan(play.before, play.after, [from, to]) ?? batteryReady(play.after, to);
  return also ? { kind: 'both', first: also, second: plan } : plan;
}

/** The ways to say a plan. */
export function planWays(plan: Plan, sentences: PlanSentences): Ways {
  if (isPlain(plan)) return sentences[plan.kind];
  if (plan.kind === 'attacksPawn') return sentences.attacksPawn(plan.piece, plan.square);
  if (plan.kind === 'chases' || plan.kind === 'guards')
    return sentences[plan.kind](plan.piece, plan.square ?? null);
  if ('piece' in plan && plan.kind !== 'pins') return sentences[plan.kind](plan.piece);
  if (plan.kind === 'openFile') return sentences.openFile(plan.halfOpen, plan.contested);
  if (plan.kind === 'fileBattery')
    return sentences.fileBattery(plan.mover, plan.partner, plan.halfOpen);
  if (plan.kind === 'diagonalBattery')
    return sentences.diagonalBattery(plan.mover, plan.partner, plan.target);
  if (plan.kind === 'passedPawn') return sentences.passedPawn(plan.made);
  if (plan.kind === 'outruns') return sentences.outruns(plan.king);
  if (plan.kind === 'entersSquare') return sentences.entersSquare(plan.king);
  if (plan.kind === 'discovery') return sentences.discovery(plan.slider, plan.screen, plan.target);
  return sentences.pins(plan.piece, plan.behind);
}

export interface PlanInput {
  readonly move: MoveVerdict;
  readonly sentences: PlanSentences;
  readonly before: Board;
  readonly after: Board;
  /** The move is the opponent's: only the plans the reader must watch out for. */
  readonly theirs?: boolean;
}

// The opponent's plans that bear on the reader's game.
const WATCHED: ReadonlySet<Plan['kind']> = new Set<Plan['kind']>([
  'outpost',
  'openFile',
  'doublesRooks',
  'fileBattery',
  'diagonalBattery',
  'seventhRank',
  'passedPawn',
  'outruns',
  'opposition',
  'behindPasser',
  'chases',
  'attacksPawn',
  'pins',
  'discovery',
]);

/** Whether the plan, the opponent's, is one the reader must watch out for. */
export const watched = (plan: Plan): boolean => WATCHED.has(plan.kind);

// What the quiet move played does for the position, and the plan it follows.
function planFinding({ move, sentences, before, after, theirs }: PlanInput) {
  // With a mate on the board, the mate is the point, not the plan.
  if ('mate' in move.before || 'mate' in move.after) return null;
  const { color, uci, san } = move;
  // The move's ply on the board: a game from a position doesn't start at 0.
  const plan = planOf({ color, ply: move.position.ply, uci, san, before, after });
  if (!plan || (theirs && !watched(plan))) return null;
  const told = racing(plan, move);
  const scene = { uci, before, after, shown: after, toMove: opposite(color) };
  const fact = said(oneOf(planWays(told, sentences), move), null, reasonMarks(told, scene));
  return { plan: told, fact };
}

/** What the quiet move played does for the position. */
export const planFact = (input: PlanInput): Fact | null => planFinding(input)?.fact ?? null;

// The endings' rules, which come before a move's threats.
const RACES: ReadonlySet<Plan['kind']> = new Set<Plan['kind']>([
  'outruns',
  'entersSquare',
  'opposition',
]);

/** The rule of the square or the opposition the move follows, said before its threats. */
export function raceFact(input: PlanInput): Fact | null {
  const found = planFinding(input);
  return found && RACES.has(found.plan.kind) ? found.fact : null;
}

// A pawn out of reach is said once, when the king's last move let it go, and
// only if the engine agrees it wins: else it's a passed pawn pushed on.
function racing(plan: Plan, move: MoveVerdict): Plan {
  if (plan.kind !== 'outruns') return plan;
  const pushed: Plan = { kind: 'passedPawn', made: plan.made };
  if (evaluationLevel(move.after) * (move.color === 'white' ? 1 : -1) < 2) return pushed;
  const earlier = move.previousMove && parseFen(move.previousMove.previousPosition.fen).board;
  return earlier && outOfReach(plan, earlier, plan.king.color) ? pushed : plan;
}

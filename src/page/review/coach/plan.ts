import {
  type Board,
  type Color,
  opposite,
  parseFen,
  parseSquare,
  type Square,
} from '#shared/chess/index.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { PlanSentences, Ways } from '#page/review/i18n/types.ts';
import type { Plan, Reason } from './idea.ts';
import {
  contestsFile,
  fightsCenter,
  keptPinOf,
  pawnTargetOf,
  pressureOf,
  rookPlan,
  rooksConnected,
  supportsCenter,
  takesCenter,
  uncoveredOf,
} from './pressure.ts';
import { rookLiftOf } from './attack-plans.ts';
import { batteryPlan, batteryReady } from './battery.ts';
import { blockadeOf } from './blockade.ts';
import { discoveryOf } from './discovery.ts';
import { reasonMarks } from './drawing.ts';
import { cutsOffOf } from './endgame-plans.ts';
import { fianchettoOf } from './fianchetto.ts';
import { kingPlan } from './king-plan.ts';
import { openedLineOf } from './open-line.ts';
import { passedPlan } from './passed-pawns.ts';
import { philidorOf } from './philidor.ts';
import { outOfReach, outruns } from './pawn-square.ts';
import { pinnedTargetOf } from './pinned-target.ts';
import { planWays } from './plan-ways.ts';
import { queenTradeOf } from './queen-trade.ts';
import { behindPasser, blocksPasser, centralSquare, safetyPlan } from './safety.ts';
import { type Fact, oneOf, said } from './said.ts';
import { pawnShape } from './pawn-shape.ts';
import { isOutpost, isPassed, OPENING_PLIES, ownRank } from './structure.ts';
import { evaluationLevel } from './trajectory.ts';
import { isZugzwang } from './zugzwang.ts';

// What a quiet move does for the position when it wins or stops nothing: it
// pins or chases a piece, piles up on a pinned one, sets up a discovery,
// develops one or fianchettoes a bishop, takes an open file or the seventh
// rank, lifts a rook toward the king, settles on an outpost or in the center,
// makes or pushes a passed pawn, backs it with a rook or stops the other
// side's, storms the other king, pushes a majority, frees a bishop's retreat,
// keeps a piece off a square, cuts a king off, walks the king up in an
// endgame (king-plan.ts), puts the other side in zugzwang, offers or dodges
// the queens' trade, takes a piece out of danger or defends one, opens a line
// for a piece behind. Said of the move played, or of the better move as what
// it did.

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
const CENTER_PLIES = 16;
const BACK_SQUARES: Readonly<Record<Color, readonly string[]>> = {
  white: ['b1', 'c1', 'f1', 'g1'],
  black: ['b8', 'c8', 'f8', 'g8'],
};

// A knight's or a rook's square: a blockade, an outpost, the center, behind a passed pawn, a
// file or rank; a bishop's or the queen's, a battery, or the queen's, a file contested.
function squarePlan({ after, color }: Play, from: Square, to: Square): Plan | null {
  const piece = after.get(to);
  if (piece?.role === 'knight') {
    const blockade = blockadeOf(after, to, piece);
    if (blockade) return blockade;
    if (isOutpost(after, to, piece)) return { kind: 'outpost', piece };
    return centralSquare(to) && !centralSquare(from) ? { kind: 'centralizes', piece } : null;
  }
  if (piece?.role === 'bishop') return batteryPlan(after, [from, to]);
  if (piece?.role === 'queen')
    return batteryPlan(after, [from, to]) ?? contestsFile(after, [from, to], color);
  return piece?.role === 'rook' ? rookSquarePlan(after, [from, to], color) : null;
}

// Behind a passed pawn, the Philidor defense, in front of the other side's pawn,
// cutting the other king off,
// lifted toward the castled king, then the file or rank it takes.
function rookSquarePlan(after: Board, [from, to]: [Square, Square], color: Color): Plan | null {
  if (behindPasser(after, to, color)) return { kind: 'behindPasser' };
  const philidor = philidorOf(after, [from, to], color);
  if (philidor) return philidor;
  if (blocksPasser(after, to, color)) return { kind: 'blocksPasser' };
  const cut = cutsOffOf(after, [from, to], color) ?? rookLiftOf(after, [from, to], color);
  if (cut) return cut;
  return ownRank(from, color) === 6 ? null : rookPlan(after, [from, to], color);
}

function piecePlan(play: Play, from: Square, to: Square): Plan | null {
  const { after, color } = play;
  const piece = after.get(to);
  if (!piece) return null;
  const opening = play.ply <= OPENING_PLIES && BACK_SQUARES[color].includes(from);
  const fianchetto = opening ? fianchettoOf(after, to, color) : null;
  if (fianchetto) return fianchetto;
  if (opening && (piece.role === 'knight' || piece.role === 'bishop'))
    return { kind: 'develops', piece };
  if (piece.role === 'king') return kingPlan({ before: play.before, after, color, from, to });
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
  if (isPassed(after, to, color)) return passedPlan(play, [from, to], made);
  if (play.ply <= CENTER_PLIES && takesCenter(to, color)) return { kind: 'center' };
  if (play.ply <= CENTER_PLIES && fightsCenter(to, color)) return { kind: 'fightsCenter' };
  if (play.ply <= OPENING_PLIES && supportsCenter(before, after, to, color))
    return { kind: 'supportsCenter' };
  return null;
}

// A piece pinned already and piled up on, or one pinned or chased, by the
// piece moved or a line it opened.
const attackOf = ({ before, after, color }: Play, from: Square, to: Square): Plan | null =>
  pinnedTargetOf(before, after, [from, to]) ??
  pressureOf(before, after, [from, to], color) ??
  uncoveredOf(before, after, to);

/** What the move does for the position, if it's one of the plans the coach names. */
export function planOf(play: Play): Plan | null {
  const from = parseSquare(play.uci.slice(0, 2));
  const to = parseSquare(play.uci.slice(2, 4));
  if (!from || !to || /[x+]/.test(play.san) || play.san.startsWith('O-O')) return null;
  if (isZugzwang(play.after, [from, to], play.color)) return { kind: 'zugzwang' };
  // A pawn that attacks a piece does so before it does anything for the king.
  if (play.after.get(to)?.role === 'pawn')
    return pawnPlan(play, from, to) ?? attackOf(play, from, to) ?? pawnShape(play, from, to);
  return attackOf(play, from, to) ?? pieceMovePlan(play, from, to);
}

// What a piece's move does once it attacks nothing.
const pieceMovePlan = (play: Play, from: Square, to: Square): Plan | null =>
  discoveryOf(play.before, play.after, [from, to]) ??
  piecePlan(play, from, to) ??
  safetyPlan(play.before, play.after, [from, to]) ??
  (connects(play, from) ? { kind: 'connectsRooks' } : null) ??
  loosePawnPlan(play, to) ??
  queenTradeOf(play.before, play.after, [from, to], play.color) ??
  openedLineOf(play.before, play.after, [from, to]);

// A pawn left hanging, or outnumbered, is the move's point only when it has no other.
function loosePawnPlan({ before, after }: Play, to: Square): Plan | null {
  const target = pawnTargetOf(before, after, to);
  const piece = target && after.get(target.square);
  if (!target || !piece) return null;
  const { square, outnumbered } = target;
  return outnumbered
    ? { kind: 'attacksPawn', piece, square, outnumbered }
    : { kind: 'attacksPawn', piece, square };
}

// The tactics a move may set up while it defends a piece of its own.
const TACTICS: ReadonlySet<Plan['kind']> = new Set<Plan['kind']>([
  'chases',
  'attacksPawn',
  'hitsPinned',
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
  if (!plan || !from || !to) return plan;
  // A piece pinning another, chased off, that keeps the pin from its new square.
  if (plan.kind === 'saves') {
    const kept = keptPinOf(play.before, play.after, [from, to]);
    return kept ? { kind: 'both', first: plan, second: kept } : plan;
  }
  if (!TACTICS.has(plan.kind)) return plan;
  const also = safetyPlan(play.before, play.after, [from, to]) ?? batteryReady(play.after, to);
  return also ? { kind: 'both', first: also, second: plan } : plan;
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
  'zugzwang',
  'majority',
  'cutsOff',
  'behindPasser',
  'escorts',
  'chases',
  'attacksPawn',
  'hitsPinned',
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
  // A line opened behind is too slight a point to stand for a move a better one beat.
  if (plan.kind === 'opensLine' && move.moveClass === 'good') return null;
  // A chase the engine answers by taking the chaser: the piece needn't move.
  if (plan.kind === 'chases' && move.after.best?.slice(2, 4) === uci.slice(2, 4)) return null;
  const told = racing(plan, move);
  const scene = { uci, before, after, shown: after, toMove: opposite(color) };
  const ways = withTempo(
    told,
    { color, ply: move.position.ply, uci, san, before, after },
    sentences,
  );
  const fact = said(oneOf(ways, move), null, reasonMarks(told, scene));
  return { plan: told, fact };
}

// A minor piece's first move in the opening that chases a piece: development
// with tempo, said as both.
function withTempo(plan: Plan, play: Play, sentences: PlanSentences): Ways {
  const from = play.uci.slice(0, 2);
  const moved = parseSquare(play.uci.slice(2, 4));
  const piece = moved ? play.after.get(moved) : undefined;
  const developing =
    play.ply <= OPENING_PLIES &&
    BACK_SQUARES[play.color].includes(from) &&
    (piece?.role === 'knight' || piece?.role === 'bishop');
  if (plan.kind !== 'chases' || plan.trapped || !developing || !piece)
    return planWays(plan, sentences);
  return sentences.developsWithTempo(piece, plan.piece, plan.square ?? null);
}

/** What the quiet move played does for the position. */
export const planFact = (input: PlanInput): Fact | null => planFinding(input)?.fact ?? null;

// The endings' rules, which come before a move's threats.
const RACES: ReadonlySet<Plan['kind']> = new Set<Plan['kind']>([
  'outruns',
  'entersSquare',
  'opposition',
  'zugzwang',
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
  const pushed: Plan = { kind: 'passedPawn', made: plan.made, trait: null };
  if (evaluationLevel(move.after) * (move.color === 'white' ? 1 : -1) < 2) return pushed;
  const earlier = move.previousMove && parseFen(move.previousMove.previousPosition.fen).board;
  return earlier && outOfReach(plan, earlier, plan.king.color) ? pushed : plan;
}

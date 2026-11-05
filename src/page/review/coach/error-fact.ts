import {
  attackers,
  type Board,
  type Color,
  parseSquare,
  type Piece,
  type Square,
} from '#shared/chess/index.ts';
import type { Mark } from '#page/board/review-arrows.ts';
import { boardAfter, lineMoves } from '#page/review/chess/line.ts';
import { forkedBy } from '#page/review/chess/fork.ts';
import { attackerValues, PIECE_VALUES, pieceOn } from '#page/review/chess/material.ts';
import { sanOf } from '#page/review/chess/notation.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import { checkers, isDefended } from '#page/review/chess/rays.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { moveToken, squareToken } from '#page/review/comment/tokens.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { SURE_MATE } from '#page/review/judge/mate.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { bestFact, bestReason, missFact } from './best-fact.ts';
import { giftLetFact } from './greek-gift.ts';
import { holeFact } from './holes.ts';
import { mateBoard, withPattern } from './mate-pattern.ts';
import { perpetualLetFact } from './perpetual.ts';
import { takesReason } from './which-one.ts';
import type { FactInput, Findings } from './fact.ts';
import type { Reason } from './idea.ts';
import { bestGainFact, endsAhead, lossFact, mateLine } from './line-facts.ts';
import { reasonMarks, withMove } from './drawing.ts';
import { planOf, watched } from './plan.ts';
import { type Fact, oneOf, said } from './said.ts';
import { hangingMarks, mateMarks } from './tactic-marks.ts';
import { takeWins } from './swing.ts';
import { goesBackFact } from './tempo-fact.ts';
import { badBishopMade, tradeFact } from './bishops.ts';
import { kingWalkFact, knightOnRimFact, loosensKingFact } from './shape-facts.ts';
import {
  backwardFact,
  developmentFact,
  isolatedFact,
  passiveRookFact,
  pawnGrabFact,
  pieceTwiceFact,
  queenOutFact,
} from './structure-facts.ts';
import { letsThrough } from './threat-facts.ts';
import { sayOnce } from './told.ts';

// What an error did: the piece it left, the mate it let in or missed, the
// material it gave, the reply it lets in, the move to play instead.

const THREATENED: ReadonlySet<MoveClass> = new Set<MoveClass>(['inaccuracy', 'mistake', 'blunder']);

/** Whether the side of `sign` has a mate on the board. */
export const mates = (record: PositionRecord, sign: number): boolean =>
  'mate' in record && record.mate * sign > 0;

export const mateDistance = (record: PositionRecord): number =>
  'mate' in record ? record.mate : 0;

// A piece worth telling of, lost by a move that cost something: not one taken
// back where it took as much, a trade.
function worthTelling({ move, before }: FactInput, square: Square, victim: Piece): boolean {
  if (move.loss < 10 || PIECE_VALUES[victim.role] < 3) return false;
  const took = pieceOn(before, move.uci.slice(2, 4));
  const there = move.uci.slice(2, 4) === square;
  return !there || took === undefined || PIECE_VALUES[took.role] < PIECE_VALUES[victim.role];
}

// A piece of the mover's that the engine's reply wins.
function lostPieceFact(input: FactInput): Fact | null {
  const { move, facts, me, them, after, reply } = input;
  const taker = parseSquare(move.after.best?.slice(0, 2) ?? '');
  const square = parseSquare(move.after.best?.slice(2, 4) ?? '');
  const victim = square ? after.get(square) : undefined;
  if (!taker || !square || !victim || victim.color !== me || victim.role === 'king') return null;
  if (!worthTelling(input, square, victim)) return null;
  const lost = { piece: victim, square: squareToken(square), reply };
  const drawing = hangingMarks(after, square, taker);
  if (attackers(after, square, me).length === 0)
    return said(oneOf(facts.leftUndefended(lost), move), 'hanging', drawing);
  if (Math.min(...attackerValues(after, square, them)) < PIECE_VALUES[victim.role])
    return said(oneOf(facts.answersAndWins(them, lost), move), 'hanging', drawing);
  return null;
}

// The mate in one `uci` plays from `board`, and the net it throws over `color`'s king.
const mateDrawing = (board: Board, uci: string | null | undefined, color: Color) =>
  uci ? withMove(uci, 'attack', mateMarks(boardAfter(board, uci), color)) : null;

// A mate the move let in, or missed: a mate in one said as such, a mate with a name named.
function mateFact(input: FactInput): Fact | null {
  const { move, facts, me, them, sign, best, reply, told } = input;
  if (mates(move.after, -sign) && !mates(move.before, -sign) && reply) {
    const named = { mated: me, facts, told };
    if (Math.abs(mateDistance(move.after)) === 1) {
      const mated = mateDrawing(input.after, move.after.best, me);
      const end = move.after.best ? boardAfter(input.after, move.after.best) : null;
      return said(withPattern(oneOf(facts.matesNow(reply), move), end, named), 'mate', mated);
    }
    const line = mateLine(move.after, move.position.fen, 'a', { short: true });
    const ways = line ? facts.forcesMate(them, line) : facts.canForceMate(them, reply);
    const end = line ? mateBoard(move.after, move.position.fen) : null;
    return said(withPattern(oneOf(ways, move), end, named), 'mate');
  }
  if (mates(move.before, sign) && !mates(move.after, sign) && best) {
    const named = { mated: them, facts, told };
    const distance = Math.abs(mateDistance(move.before));
    if (distance === 1) {
      const mated = mateDrawing(input.before, move.best, them);
      const end = move.best ? boardAfter(input.before, move.best) : null;
      return said(withPattern(oneOf(facts.mateInOne(best), move), end, named), 'mate', mated);
    }
    const line = mateLine(move.before, move.previousPosition.fen, 'b', { short: true });
    const end = line ? mateBoard(move.before, move.previousPosition.fen) : null;
    // The engine reports long mates as longer than they are: their length goes unsaid.
    const sure = distance <= SURE_MATE ? distance : null;
    const text = oneOf(facts.wouldForceMate(best, line, sure), move);
    return said(withPattern(text, end, named), 'mate');
  }
  return null;
}

// What a reply takes is the error's point if its side keeps it: an inaccuracy
// that allows a capture often only allows a trade, or a sacrifice that the
// error's mover takes back.
const keeps = (move: MoveVerdict, side: Color): boolean =>
  move.moveClass !== 'inaccuracy' || endsAhead(move, side);

// A capture taken back evenly is a trade: no reason the move was an error.
const wins = ({ move, them, after }: FactInput, square: Square): boolean =>
  takeWins(after, square, them, playLine(move.position.fen, move.after.line ?? []));

/** What the reply does: what it takes (see `keeps`), the plan to watch out for, its check. */
function replyReason(input: FactInput, uci: string): Reason | null {
  const { move, me, them, after } = input;
  const taken = pieceOn(after, uci.slice(2, 4));
  const square = parseSquare(uci.slice(2, 4));
  if (taken?.color === me && square)
    return keeps(move, them) && wins(input, square) ? takesReason(after, square, taken) : null;
  const san = sanOf(move.position.fen, uci);
  const plan = planOf({
    color: them,
    ply: move.position.ply + 1,
    uci,
    san,
    before: after,
    after: boardAfter(after, uci),
  });
  if (plan && watched(plan)) return plan;
  if (!san.includes('+')) return null;
  const uncovered = checkers(boardAfter(after, uci), me).some(square => square !== uci.slice(2, 4));
  return uncovered ? { kind: 'discoveredCheck' } : { kind: 'checks' };
}

/**
 * What the reply does, for an error whose fact doesn't name it; `leads` when
 * it says why the move was an error: it takes or forks, or it says what it
 * does and the better move doesn't say what it did.
 */
function threatFact(input: FactInput): { fact: Fact; leads: boolean } | null {
  const { move, facts, them, reply } = input;
  const uci = move.after.best;
  if (!THREATENED.has(move.moveClass) || !uci || !reply) return null;
  const [first, second] = forkedBy(move.position.fen, uci);
  const scene = { uci, before: input.after, after: boardAfter(input.after, uci) };
  const marks = (reason: Reason | null) =>
    withMove(uci, 'attack', reasonMarks(reason, { ...scene, shown: input.after, toMove: them }));
  if (first && second) {
    const drawing = marks({ kind: 'fork', first, second });
    const fact = said(oneOf(facts.allowsFork(reply, first, second), move), 'fork', drawing);
    return { fact, leads: true };
  }
  // Taking back what the move took wins nothing, and says nothing of the error.
  if (move.san.includes('x') && move.uci.slice(2, 4) === uci.slice(2, 4)) return null;
  const reason = replyReason(input, uci);
  return reason && allowedFact(input, reason, marks(reason));
}

// The plies of the opening, where a queen out early gets chased about.
const EARLY_PLIES = 16;

// The queen, just brought out in the opening, chased by the reply: the lesson
// is the queen's, more than the move the reply is.
function earlyQueen({ move, me, after }: FactInput, reason: Reason): boolean {
  const to = parseSquare(move.uci.slice(2, 4));
  const moved = to ? after.get(to) : undefined;
  if (move.position.ply > EARLY_PLIES || moved?.role !== 'queen' || reason.kind !== 'chases')
    return false;
  return reason.piece.role === 'queen' && reason.piece.color === me && !reason.trapped;
}

// The reply as said: first when what it does, or the capture it leads to, says
// why the move was an error; else after the better move, the error named again.
function allowedFact(
  input: FactInput,
  reason: Reason,
  drawing: readonly Mark[] | null,
): { fact: Fact; leads: boolean } | null {
  const { move, facts, them, reply } = input;
  if (earlyQueen(input, reason))
    return { fact: said(oneOf(facts.earlyQueen(reply), move), null, drawing), leads: true };
  const named = facts.why(reason, true);
  // A reply that does nothing the coach can name says nothing of the error,
  // and an answer to the move's check is forced: no news.
  if (named === null) return null;
  // The reply named alone when a move just before said what it does.
  const why = sayOnce(input.told, reason, move.after.best ?? '', named);
  const next =
    reason.kind === 'chases' || reason.kind === 'hitsPinned' ? followThrough(input) : null;
  const leads = reason.kind === 'takes' || next !== null || bestReason(input) === null;
  const played = leads ? null : moveToken(move.san, input.me);
  const allowed = { side: them, reply, why, played, next };
  return { fact: said(oneOf(facts.canPlay(allowed), move), null, drawing), leads };
}

// Whether taking on `square`, on `board`, wins: with check, a piece worth more
// than its taker, or one undefended.
function captureWins(board: Board, [from, square]: [Square, Square], check: boolean): boolean {
  const [taker, taken] = [board.get(from), board.get(square)];
  if (!taker || !taken) return false;
  return (
    check ||
    PIECE_VALUES[taken.role] > PIECE_VALUES[taker.role] ||
    (taken.role !== 'pawn' && !isDefended(board, square, taken.color))
  );
}

/**
 * The capture a chasing reply's line comes to next, as a token: what the
 * tempo was for (see `captureWins`).
 */
function followThrough({ move, after }: FactInput): string | null {
  const plies = move.after.line?.slice(0, 3) ?? [];
  const [reply = '', answer = '', capture = ''] = plies;
  const [from, square] = [parseSquare(capture.slice(0, 2)), parseSquare(capture.slice(2, 4))];
  const next = lineMoves(move.position.fen, plies)[2];
  if (reply !== move.after.best || !next || !from || !square) return null;
  const board = boardAfter(boardAfter(after, reply), answer);
  if (!captureWins(board, [from, square], next.san.includes('+'))) return null;
  return moveToken(next.san, next.color, { base: 'a', ucis: plies });
}

// A mate let in or missed, a punishment missed, a perpetual let in, a piece lost.
function decidingFindings(input: FactInput): Findings | null {
  const { move, best } = input;
  const mate = mateFact(input);
  if (mate !== null) return { fact: mate, followUp: null };
  if (move.moveClass === 'miss' && best) return { fact: missFact(input), followUp: null };
  const perpetual = perpetualLetFact(input);
  if (perpetual !== null) return { fact: perpetual, followUp: bestFact(input) };
  const lost = lostPieceFact(input);
  return lost === null ? null : { fact: lost, followUp: null };
}

/**
 * What an error did. The reply that says why comes first, the better move
 * after it; else the better move, and what the reply does.
 */
export function errorFindings(input: FactInput): Findings {
  const decided = decidingFindings(input);
  if (decided !== null) return decided;
  const gift = giftLetFact(input);
  if (gift !== null) return { fact: gift, followUp: bestFact(input) };
  const gain = bestGainFact(input);
  const { before: threat } = input.threats;
  const loss = lossFact(input, threat !== null && letsThrough(input, threat));
  if (loss !== null) return { fact: loss, followUp: gain ?? bestFact(input) };
  const better = gain ?? bestFact(input);
  const reply = threatFact(input);
  // A pawn grabbed with the queen: the lesson is the grab, the reply what it costs.
  const grab = pawnGrabFact(input);
  if (grab !== null) return { fact: grab, followUp: reply?.fact ?? better };
  if (reply?.leads) return { fact: reply.fact, followUp: better };
  const back = goesBackFact(input);
  if (back !== null) return { fact: back, followUp: better };
  return { fact: better, followUp: reply?.fact ?? shapeOf(input) };
}

// What an error does to the position when nothing it lets in says more.
const shapeOf = (input: FactInput): Fact | null =>
  tradeFact(input, true) ??
  isolatedFact(input, input.me) ??
  badBishopMade(input) ??
  backwardFact(input) ??
  holeFact(input) ??
  passiveRookFact(input) ??
  queenOutFact(input) ??
  pieceTwiceFact(input) ??
  developmentFact(input) ??
  loosensKingFact(input) ??
  kingWalkFact(input) ??
  knightOnRimFact(input);

import {
  attackers,
  type Board,
  type Color,
  parseSquare,
  type Piece,
  type Square,
} from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { forkedBy } from '#page/review/chess/fork.ts';
import { attackerValues, PIECE_VALUES, pieceOn } from '#page/review/chess/material.ts';
import { sanOf } from '#page/review/chess/notation.ts';
import { checkers } from '#page/review/chess/rays.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { bestFact, bestReason, missFact } from './best-fact.ts';
import { takesReason } from './which-one.ts';
import type { FactInput, Findings } from './fact.ts';
import type { Reason } from './idea.ts';
import { bestGainFact, lossFact, mateLine } from './line-facts.ts';
import { reasonMarks, withMove } from './drawing.ts';
import { planOf, watched } from './plan.ts';
import { type Fact, oneOf, said } from './said.ts';
import { hangingMarks, mateMarks } from './tactic-marks.ts';
import { letsThrough } from './threat-facts.ts';

// What an error did: the piece it left, the mate it let in or missed, the
// material it gave, the reply it lets in, the move to play instead.

const THREATENED: ReadonlySet<MoveClass> = new Set<MoveClass>(['mistake', 'blunder']);

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

// A mate the move let in, or missed: a mate in one said as such.
function mateFact(input: FactInput): Fact | null {
  const { move, facts, me, them, sign, best, reply } = input;
  if (mates(move.after, -sign) && !mates(move.before, -sign) && reply) {
    if (Math.abs(mateDistance(move.after)) === 1) {
      const mated = mateDrawing(input.after, move.after.best, me);
      return said(oneOf(facts.matesNow(reply), move), 'mate', mated);
    }
    const line = mateLine(move.after, move.position.fen, 'a');
    const ways = line ? facts.forcesMate(them, line) : facts.canForceMate(them, reply);
    return said(oneOf(ways, move), 'mate');
  }
  if (mates(move.before, sign) && !mates(move.after, sign) && best) {
    const distance = Math.abs(mateDistance(move.before));
    if (distance === 1) {
      const mated = mateDrawing(input.before, move.best, them);
      return said(oneOf(facts.mateInOne(best), move), 'mate', mated);
    }
    const line = mateLine(move.before, move.previousPosition.fen, 'b') ?? best;
    return said(oneOf(facts.wouldForceMate(line, distance), move), 'mate');
  }
  return null;
}

/** What the reply does: what it takes, the plan to watch out for, its check. */
function replyReason({ move, me, them, after }: FactInput, uci: string): Reason | null {
  const taken = pieceOn(after, uci.slice(2, 4));
  if (taken?.color === me) return takesReason(after, uci.slice(2, 4), taken);
  const san = sanOf(move.position.fen, uci);
  const plan = planOf({
    color: them,
    ply: move.ply + 1,
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
  const why = reason && facts.why(reason, true);
  // A reply that does nothing the coach can name says nothing of the error,
  // and an answer to the move's check is forced: no news.
  if (why === null) return null;
  const fact = said(oneOf(facts.canPlay(them, reply, why), move), null, marks(reason));
  return { fact, leads: reason?.kind === 'takes' || bestReason(input) === null };
}

/**
 * What an error did. The reply that says why comes first, the better move
 * after it; else the better move, and what the reply does.
 */
export function errorFindings(input: FactInput): Findings {
  const { move, best } = input;
  const mate = mateFact(input);
  if (mate !== null) return { fact: mate, followUp: null };
  if (move.moveClass === 'miss' && best) return { fact: missFact(input), followUp: null };
  const lost = lostPieceFact(input);
  if (lost !== null) return { fact: lost, followUp: null };
  const gain = bestGainFact(input);
  const { before: threat } = input.threats;
  const loss = lossFact(input, threat !== null && letsThrough(input, threat));
  if (loss !== null) return { fact: loss, followUp: gain ?? bestFact(input) };
  const better = gain ?? bestFact(input);
  const reply = threatFact(input);
  if (reply?.leads) return { fact: reply.fact, followUp: better };
  return { fact: better, followUp: reply?.fact ?? null };
}

import {
  type Board,
  type Color,
  kingSquare,
  parseSquare,
  type Piece,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import type { Mark } from '#shared/board/marks.ts';
import { boardAfter } from '#page/review/chess/line.ts';
import { forkedBy } from '#page/review/chess/fork.ts';
import { pieceOn } from '#page/review/chess/material.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import { sanOf } from '#page/review/chess/notation.ts';
import { PUNISHABLE } from '#page/review/judge/judge.ts';
import type { FactInput } from './fact.ts';
import type { Reason } from './idea.ts';
import { takesReason } from './which-one.ts';
import { bestWins } from './line-facts.ts';
import { doubleThreatOf } from './double-threat.ts';
import { reasonMarks, withMove } from './drawing.ts';
import { leadsToPawnEnding } from './pawn-ending.ts';
import { reasonOf } from './plan.ts';
import { isEndgame } from './structure.ts';
import { type Drawing, drawn, type Fact, oneOf, said } from './said.ts';
import { reasonTopic } from './drawing-topic.ts';
import { netAfterTrade, takeWins } from './swing.ts';
import { sayOnce } from './told.ts';

// The move that was better than the one played, and what it did: the fork it
// made, what it took or won, the plan it followed.

// Win probability an error must lose for a check, or a pawn taken next to the
// king, to be the start of an attack rather than a check or a pawn for its own sake.
const ATTACK_LOSS = 15;

/** Within two squares of each other, as a king walks. */
function near(first: Square, second: Square): boolean {
  const [file, rank] = squareCoords(first);
  const [otherFile, otherRank] = squareCoords(second);
  return Math.max(Math.abs(file - otherFile), Math.abs(rank - otherRank)) <= 2;
}

// What the engine's capture, or check, did: what to take with, where the move
// played took too; the attack on the king; what it took.
// The other piece to take with, by its square when the move played took with one like it.
function takesWith({ move, before }: FactInput, best: string, taker: Piece): Reason {
  const same = pieceOn(before, move.uci.slice(0, 2))?.role === taker.role;
  return same
    ? { kind: 'takesWith', piece: taker, square: squareToken(best.slice(0, 2)) }
    : { kind: 'takesWith', piece: taker };
}

// What the engine's capture comes to: material won, a trade taken back
// evenly, or a sacrifice, which gives more than it takes for now.
function takeOutcome({ move, me, before }: FactInput, best: string): 'wins' | 'trades' | 'gives' {
  const square = parseSquare(best.slice(2, 4));
  if (square === null) return 'wins';
  const line = playLine(move.previousPosition.fen, move.before.line ?? [best]);
  if (takeWins(before, square, me, line)) return 'wins';
  return netAfterTrade(line, me) < 0 ? 'gives' : 'trades';
}

function captureReason(input: FactInput, best: string, san: string): Reason | null {
  const { move, them, before } = input;
  const target = best.slice(2, 4);
  const taken = pieceOn(before, target);
  const taker = pieceOn(before, best.slice(0, 2));
  if (taken?.color === them && taker && move.uci.slice(2, 4) === target)
    return takesWith(input, best, taker);
  const small = !taken || taken.role === 'pawn';
  // A pawn by the king taken and kept is said as the pawn; with check, or given back, it's the attack.
  const near = taken !== undefined && nextToKing(before, target, them);
  const atKing = san.includes('+') || (near && takeOutcome(input, best) !== 'wins');
  if (small && atKing && move.loss >= ATTACK_LOSS)
    return { kind: 'attacksKing', king: { role: 'king', color: them } };
  return taken?.color === them ? takenReason(input, best, taken) : null;
}

// The piece the capture takes, the trade it is, or nothing for a sacrifice,
// whose point is what comes after.
function takenReason(input: FactInput, best: string, taken: Piece): Reason | null {
  const square = parseSquare(best.slice(2, 4));
  if (!square) return null;
  const outcome = takeOutcome(input, best);
  if (outcome === 'trades') return { kind: 'trades', piece: taken, square };
  return outcome === 'wins' ? takesReason(input.before, square, taken) : null;
}

// A capture by `color`'s king, before the endgame, where kings come out and a
// pawn by one is only a pawn.
function nextToKing(board: Board, target: string, color: Color): boolean {
  const king = isEndgame(board) ? null : kingSquare(board, color);
  const square = parseSquare(target);
  return king !== null && square !== null && near(square, king);
}

/** What the engine's move did, if the board shows it. */
export function bestReason(input: FactInput): Reason | null {
  const { move, before } = input;
  const { best } = move;
  const san = sanOf(move.previousPosition.fen, best);
  if (!best || !san) return null;
  const [first, second] = forkedBy(move.previousPosition.fen, best);
  if (first && second) return { kind: 'fork', first, second };
  const target = doubleThreatOf(move);
  if (target) return { kind: 'doubleThreat', target };
  // Trading down to a won pawn ending says more than the capture on the way.
  if (leadsToPawnEnding(input)) return { kind: 'pawnEnding' };
  const capture = captureReason(input, best, san);
  if (capture) return capture;
  if (san.startsWith('O-O')) return { kind: 'castles' };
  // With a mate on the board, the mate is the point, not the plan.
  if ('mate' in move.before) return null;
  const { color, ply } = move;
  return reasonOf({ color, ply, uci: best, san, before, after: boardAfter(before, best) });
}

/** What the coach draws of the reason for the engine's move, on the board after the one played. */
export function bestMarks(input: FactInput, reason: Reason | null): Mark[] | null {
  const { move, before, after, them } = input;
  if (!move.best) return null;
  const scene = { uci: move.best, before, after: boardAfter(before, move.best), shown: after };
  return withMove(move.best, 'defense', reasonMarks(reason, { ...scene, toMove: them }));
}

// What of the engine's move's reason the move played didn't do too: the
// same piece out of danger is no difference.
function beyondPlayed({ move }: FactInput, reason: Reason | null): Reason | null {
  const same = move.best?.slice(0, 2) === move.uci.slice(0, 2);
  if (!same || !reason) return reason;
  if (reason.kind === 'saves') return null;
  return reason.kind === 'both' && reason.first.kind === 'saves' ? reason.second : reason;
}

// Why the engine's move was better, unless a move just before said it.
const toldWhy = (input: FactInput, reason: Reason | null): string | null =>
  reason && sayOnce(input.told, reason, input.move.best ?? '', input.facts.why(reason));

/** What the engine's move did, said after it, and drawn. */
function whyBest(input: FactInput): { why: string | null; drawing: Drawing | null } {
  const reason = bestReason(input);
  const told = beyondPlayed(input, reason);
  const drawing = drawn(reasonTopic(reason), bestMarks(input, reason));
  return { why: toldWhy(input, told), drawing };
}

/** The better move, a fork or a capture when it was one, else what it did. */
export function bestFact(input: FactInput): Fact | null {
  const { move, facts, them, before, best } = input;
  if (!best || !move.best) return null;
  const [first, second] = forkedBy(move.previousPosition.fen, move.best);
  if (first && second) {
    const drawing = bestMarks(input, { kind: 'fork', first, second });
    return said(
      oneOf(facts.missedFork(best, first, second), move),
      'fork',
      drawn('forks', drawing),
    );
  }
  const target = move.best.slice(2, 4);
  const taken = pieceOn(before, target);
  const stronger =
    taken?.color === them && taken.role !== 'pawn' && move.uci.slice(2, 4) !== target;
  if (stronger && takeOutcome(input, move.best) === 'wins')
    return said(oneOf(facts.strongerCapture(best, taken), move));
  const { why, drawing } = whyBest(input);
  return said(
    move.moveClass === 'inaccuracy'
      ? oneOf(facts.morePrecise(best, why), move)
      : oneOf(facts.betterMove(best, why), move),
    null,
    drawing,
  );
}

/** For a good move, the move a little better, and what it did. */
export function littleBetterFact(input: FactInput): Fact | null {
  const { move, facts, best } = input;
  if (!best) return null;
  const { why, drawing } = whyBest(input);
  return said(oneOf(facts.littleMorePrecise(best, why), move), null, drawing);
}

// The error a miss fails to punish: the opponent's last move, or the one before it, the
// punishment under way (judge.ts). What punished it: its fork, the material it won, else
// what it did.
export function missFact(input: FactInput): Fact {
  const { move, facts, them, best } = input;
  if ((move.previousMove?.loss ?? 0) < PUNISHABLE)
    return said(oneOf(facts.unfinishedPunishment(them, best), move));
  const found = bestReason(input);
  // A capture the opponent takes back evenly punishes nothing.
  const reason = found?.kind === 'trades' ? null : found;
  const tactic =
    reason?.kind === 'fork' || reason?.kind === 'doubleThreat' || reason?.kind === 'attacksKing';
  const material = tactic ? null : bestWins(input);
  const why: Reason | null = material === null ? reason : { kind: 'wins', material };
  const text = oneOf(facts.missedPunishment(them, best, toldWhy(input, why)), move);
  const drawing = drawn(reasonTopic(reason), bestMarks(input, reason));
  return said(text, reason?.kind === 'fork' ? 'fork' : null, drawing);
}

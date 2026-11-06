import {
  attackedSquares,
  parseFen,
  parseSquare,
  type Piece,
  PIECE_VALUES,
  type Square,
} from '#shared/chess/index.ts';
import type { Mark } from '#shared/board/marks.ts';
import { pieceOn } from '#page/review/chess/material.ts';
import { legalMoves } from '#page/review/chess/moves.ts';
import { playLine, type Ply } from '#page/review/chess/played-line.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { FactInput } from './fact.ts';
import { drawn, type Fact, oneOf, said } from './said.ts';
import { checkMarks } from './tactic-marks.ts';

// A move slipped in before taking back: the opponent has just taken, the
// retake was there to play, and the move forces instead, a check or a threat
// on a piece worth the taker, the engine's line taking back on the mover's
// next move. A check may put it off longer, each move of the mover's on the
// way a check or a capture too: the opponent never gets the time to save the
// piece.

// The mover's moves the retake may wait, its own included.
const RETAKE_WITHIN = 3;

const forcing = (ply: Ply): boolean => ply.check || ply.captured !== null;

/** The index in `plies` of the mover's retake on `square`, and whether every move before it forces. */
function retakeAt(plies: readonly Ply[], square: string, checks: boolean): number | null {
  for (let i = 1; i < plies.length; i += 2) {
    const own = plies[i];
    const reply = plies[i - 1];
    // The piece that took steps away, or another lands on its square.
    if (!own || !reply || reply.uci.slice(0, 2) === square || reply.uci.slice(2, 4) === square)
      return null;
    if (own.uci.slice(2, 4) === square) return own.captured ? i : null;
    if (!checks || !forcing(own)) return null;
  }
  return null;
}

// The retake was there to play at once: a move slipped in before it, not a recapture set up.
function couldRetake(move: MoveVerdict, back: Ply): boolean {
  const board = parseFen(move.previousPosition.fen).board;
  const [from, to] = [back.uci.slice(0, 2), back.uci.slice(2, 4)];
  return legalMoves(board, back.color).some(([start, end]) => start === from && end === to);
}

// What a move slipped in forces with: a check, or a threat on a piece worth
// the taker at least. Drawn, with the taker left to take back.
function forced(move: MoveVerdict, taker: Piece, square: Square): Mark[] | null {
  const board = parseFen(move.position.fen).board;
  const retaken: Mark = { kind: 'ring', square, tone: 'plan' };
  if (move.san.includes('+')) return [...checkMarks(board, taker.color), retaken];
  const to = parseSquare(move.uci.slice(2, 4));
  const hit = (target: Piece | undefined): boolean =>
    target?.color === taker.color && PIECE_VALUES[target.role] >= PIECE_VALUES[taker.role];
  const threatened = to ? attackedSquares(board, to).filter(at => hit(board.get(at))) : [];
  if (!to || threatened.length === 0) return null;
  const lines = threatened.map((at): Mark => ({ kind: 'link', from: to, to: at, tone: 'attack' }));
  return [...lines, retaken];
}

// The square the opponent just took on, when the move takes nothing: a
// capture's point is what it takes, said by the capture's own fact.
function takenOn({ previousPosition, after, san }: MoveVerdict): string | null {
  const square = previousPosition.san?.includes('x') ? previousPosition.uci?.slice(2, 4) : null;
  return square && after.line && !san.includes('x') ? square : null;
}

export function inBetweenFact({ move, facts }: FactInput): Fact | null {
  const square = takenOn(move);
  if (!square) return null;
  const check = move.san.includes('+');
  const taker = pieceOn(parseFen(move.position.fen).board, square);
  const ucis = (move.after.line ?? []).slice(0, 2 * RETAKE_WITHIN - 2);
  const plies = playLine(move.position.fen, ucis);
  const at = retakeAt(plies, square, check);
  const back = at === null ? undefined : plies[at];
  const taken = parseSquare(square);
  if (at === null || !back || !taker || !taken || back.captured?.role !== taker.role) return null;
  const drawing = couldRetake(move, back) ? forced(move, taker, taken) : null;
  if (!drawing) return null;
  const token = moveToken(back.san, back.color, { base: 'a', ucis: ucis.slice(0, at + 1) });
  return said(
    oneOf(facts.inBetween(token, check, (at + 1) / 2), move),
    null,
    drawn('checks', drawing),
  );
}

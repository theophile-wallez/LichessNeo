import {
  type Color,
  parseSquare,
  type Piece,
  PIECE_VALUES,
  type Square,
} from '#shared/chess/index.ts';
import type { Ply } from './played-line.ts';

// The material a line wins, as the motifs (motifs.ts) read it: the capture
// that wins it, past the trades, and where its target stood along the way.

export interface Move {
  readonly ply: Ply;
  readonly from: Square;
  readonly to: Square;
}

export interface Win {
  readonly moves: readonly Move[];
  readonly winner: Color;
  /** The index of the capture that wins the material. */
  readonly capture: number;
  readonly target: Piece;
  /** Where the target stood before each ply up to its capture, null before it got there. */
  readonly squares: readonly (Square | null)[];
}

function movesOf(plies: readonly Ply[]): Move[] | null {
  const moves: Move[] = [];
  for (const ply of plies) {
    const [from, to] = [parseSquare(ply.uci), parseSquare(ply.uci.slice(2, 4))];
    if (!from || !to) return null;
    moves.push({ ply, from, to });
  }
  return moves;
}

function targetSquares(moves: readonly Move[], capture: number, winner: Color): (Square | null)[] {
  let at: Square | null = moves[capture]?.to ?? null;
  const squares: (Square | null)[] = [at];
  for (let j = capture - 1; j >= 0; j--) {
    const move = moves[j];
    if (at && move?.to === at) at = move.ply.color === winner ? null : move.from;
    squares.unshift(at);
  }
  return squares;
}

/** Taking back a piece that took one worth as much only ends a trade. */
export function retakes(before: Move | undefined, move: Move): boolean {
  const [taken, retaken] = [before?.ply.captured, move.ply.captured];
  if (!before || !taken || !retaken || before.to !== move.to) return false;
  return PIECE_VALUES[taken.role] >= PIECE_VALUES[retaken.role];
}

/** The winner's last capture in the first `upTo` plies that isn't a trade's end, else its last. */
export function winOf(plies: readonly Ply[], winner: Color, upTo: number): Win | null {
  const moves = movesOf(plies);
  if (!moves) return null;
  const takes = (move: Move, i: number): boolean =>
    i < upTo && move.ply.color === winner && move.ply.captured !== null;
  const opening = moves.findLastIndex((move, i) => takes(move, i) && !retakes(moves[i - 1], move));
  const capture = opening >= 0 ? opening : moves.findLastIndex(takes);
  const target = moves[capture]?.ply.captured;
  if (!target) return null;
  return { moves, winner, capture, target, squares: targetSquares(moves, capture, winner) };
}

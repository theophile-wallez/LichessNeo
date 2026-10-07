import { squareAt, squareCoords } from './squares.ts';
import type { Board, Color, Piece, Role, Square } from './types.ts';

type Step = readonly [number, number];

const KNIGHT_JUMPS: readonly Step[] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];
const ORTHOGONAL: readonly Step[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONAL: readonly Step[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * The roles of `by`'s pieces that attack `target`. Pins are ignored, and a
 * slider only counts up to the first piece in its way.
 */
export function attackers(board: Board, target: Square, by: Color): Role[] {
  const [file, rank] = squareCoords(target);
  const at = (fileStep: number, rankStep: number): Piece | undefined => {
    const square = squareAt(file + fileStep, rank + rankStep);
    return square ? board.get(square) : undefined;
  };
  const found: Role[] = [];
  const take = (piece: Piece | undefined, roles: readonly Role[]): void => {
    if (piece?.color === by && roles.includes(piece.role)) found.push(piece.role);
  };
  // A pawn attacks forwards, so its attackers stand on the rank behind the target.
  const behind = by === 'white' ? -1 : 1;
  take(at(-1, behind), ['pawn']);
  take(at(1, behind), ['pawn']);
  for (const [fileStep, rankStep] of KNIGHT_JUMPS) take(at(fileStep, rankStep), ['knight']);
  for (const [fileStep, rankStep] of [...ORTHOGONAL, ...DIAGONAL])
    take(at(fileStep, rankStep), ['king']);
  const slide = (steps: readonly Step[], roles: readonly Role[]): void => {
    for (const [fileStep, rankStep] of steps) {
      for (let k = 1; squareAt(file + fileStep * k, rank + rankStep * k); k++) {
        const piece = at(fileStep * k, rankStep * k);
        if (!piece) continue;
        take(piece, roles);
        break;
      }
    }
  };
  slide(ORTHOGONAL, ['rook', 'queen']);
  slide(DIAGONAL, ['bishop', 'queen']);
  return found;
}

export const isAttacked = (board: Board, target: Square, by: Color): boolean =>
  attackers(board, target, by).length > 0;

/** The squares the piece on `from` attacks, pins ignored; a slider stops at the first piece. */
export function attackedSquares(board: Board, from: Square): Square[] {
  const piece = board.get(from);
  if (!piece) return [];
  const [file, rank] = squareCoords(from);
  const found: Square[] = [];
  const reach = (steps: readonly Step[], slides: boolean): void => {
    for (const [fileStep, rankStep] of steps) {
      for (let k = 1; ; k++) {
        const square = squareAt(file + fileStep * k, rank + rankStep * k);
        if (!square) break;
        found.push(square);
        if (!slides || board.has(square)) break;
      }
    }
  };
  if (piece.role === 'pawn') {
    const ahead = piece.color === 'white' ? 1 : -1;
    reach(
      [
        [-1, ahead],
        [1, ahead],
      ],
      false,
    );
  } else if (piece.role === 'knight') reach(KNIGHT_JUMPS, false);
  else if (piece.role === 'king') reach([...ORTHOGONAL, ...DIAGONAL], false);
  else {
    if (piece.role !== 'bishop') reach(ORTHOGONAL, true);
    if (piece.role !== 'rook') reach(DIAGONAL, true);
  }
  return found;
}

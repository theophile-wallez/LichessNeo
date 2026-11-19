import {
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Piece,
  type Square,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Mark } from '#shared/board/marks.ts';
import { between } from '#page/review/chess/rays.ts';
import type { Plan } from './idea.ts';

// A slider lined up with the other side's king on an open or half-open line
// (no own pawn blocking the ray between them): even behind enemy pawns or
// pieces, that x-ray creates tactical threats as the line opens. A single
// enemy piece between them is already a pin, and a single own piece a
// discovery; a rook on an open file says both together (openFile.king).

const slidesOnLine = (
  piece: Piece,
  [fromFile, fromRank]: readonly [number, number],
  [toFile, toRank]: readonly [number, number],
): boolean => {
  const fileGap = Math.abs(toFile - fromFile);
  const rankGap = Math.abs(toRank - fromRank);
  if (fileGap === 0 || rankGap === 0) return piece.role === 'rook' || piece.role === 'queen';
  return fileGap === rankGap && (piece.role === 'bishop' || piece.role === 'queen');
};

/** Whether `piece` on `square` shares a sliding line with `king`. */
function alignedWith(piece: Piece, square: Square, king: Square): boolean {
  return square !== king && slidesOnLine(piece, squareCoords(square), squareCoords(king));
}

/**
 * A bishop, rook or queen lined up with the other side's king when it wasn't
 * already on that line from `from`, with no own pawn blocking the ray.
 */
export function facesKingOf(
  after: Board,
  [from, to]: readonly [Square, Square],
  color: Color,
): Plan | null {
  const piece = after.get(to);
  const them = opposite(color);
  const king = kingSquare(after, them);
  if (!piece || !king || !alignedWith(piece, to, king)) return null;
  if (alignedWith(piece, from, king)) return null;
  const inBetween = between(to, king).flatMap(square => {
    const there = after.get(square);
    return there ? [there] : [];
  });
  // Without anything between them it would be a check; behind an own pawn the ray is shut.
  if (inBetween.length === 0) return null;
  if (inBetween.some(there => there.color === color && there.role === 'pawn')) return null;
  return { kind: 'facesKing', piece, king: { role: 'king', color: them } };
}

/** The x-ray line from the slider on `to` to the other side's king, ringed. */
export function facesKingMarks(after: Board, to: Square, kingColor: Color): Mark[] | null {
  const king = kingSquare(after, kingColor);
  if (!king) return null;
  return [
    { kind: 'link', from: to, to: king, tone: 'attack' },
    { kind: 'ring', square: king, tone: 'attack' },
  ];
}

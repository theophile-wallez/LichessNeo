import {
  attackedSquares,
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Square,
} from '#shared/chess/index.ts';
import type { Mark, MarkTone } from '#page/board/review-arrows.ts';
import { attackersOn, checkers } from '#page/review/chess/rays.ts';

// What the coach draws of an error's material and mates: the piece left
// hanging between its attackers and defenders, the king a mate nets.

const lineTo =
  (to: Square, tone: MarkTone) =>
  (from: Square): Mark => ({
    kind: 'link',
    from,
    to,
    tone,
  });

/**
 * The piece on `square` ringed, and the line of the piece on `taker` that
 * wins it. Its defenders aren't drawn: they don't save it, and lines on both
 * sides would read as a piece held.
 */
export function hangingMarks(board: Board, square: Square, taker: Square): Mark[] {
  const piece = board.get(square);
  if (!piece) return [];
  const takes = attackersOn(board, square, opposite(piece.color)).includes(taker);
  return [
    ...(takes ? [lineTo(square, 'attack')(taker)] : []),
    { kind: 'ring', square, tone: 'attack' },
  ];
}

/** `color`'s king mated on `board`: its checkers' lines, and its flight squares barred. */
export function mateMarks(board: Board, color: Color): Mark[] {
  const king = kingSquare(board, color);
  if (!king) return [];
  // Without the king, a checker's line reaches the squares behind it too.
  const kingless = new Map(board);
  kingless.delete(king);
  const barred = attackedSquares(board, king).filter(
    square =>
      board.get(square)?.color !== color &&
      attackersOn(kingless, square, opposite(color)).length > 0,
  );
  return [
    ...checkers(board, color).map(lineTo(king, 'attack')),
    ...barred.map((square): Mark => ({ kind: 'barred', square, tone: 'attack' })),
    { kind: 'ring', square: king, tone: 'attack' },
  ];
}

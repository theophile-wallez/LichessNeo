import {
  attackedSquares,
  type Board,
  type Color,
  kingSquare,
  opposite,
  type Square,
} from '#shared/chess/index.ts';
import type { Mark, MarkTone } from '#shared/board/marks.ts';
import { attackersOn, checkers } from '#page/review/chess/rays.ts';
import type { Xray } from '#page/review/chess/xray.ts';

// What the coach draws of an error's material and mates: the piece left
// hanging between its attackers and defenders, a pin, an x-ray, the king a
// mate nets.

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

/** The pinner's line to the piece behind, the pinned piece ringed on it. */
export const pinLine = (pinner: Square, pinned: Square, behind: Square): Mark[] => [
  lineTo(behind, 'attack')(pinner),
  { kind: 'ring', square: pinned, tone: 'attack' },
  { kind: 'ring', square: behind, tone: 'plan' },
];

/**
 * An x-ray: the slider's line to the square it takes back on, through the
 * piece it sees through, ringed.
 */
export const xrayLine = ({ from, through, square }: Xray): Mark[] => [
  lineTo(square, 'defense')(from),
  { kind: 'ring', square: through, tone: 'attack' },
];

/** The lines of the pieces checking `color`'s king, and the king ringed. */
export function checkMarks(board: Board, color: Color): Mark[] {
  const king = kingSquare(board, color);
  if (!king) return [];
  return [
    ...checkers(board, color).map(lineTo(king, 'attack')),
    { kind: 'ring', square: king, tone: 'attack' },
  ];
}

// The pieces that hold a checker right beside the king: the king can't take it.
function holders(board: Board, king: Square, color: Color): Mark[] {
  const beside = checkers(board, color).filter(square =>
    attackedSquares(board, king).includes(square),
  );
  return beside.flatMap(checker =>
    attackersOn(board, checker, opposite(color)).map(holder => lineTo(checker, 'defense')(holder)),
  );
}

/**
 * `color`'s king mated on `board`: its checkers' lines, its flight squares
 * barred, its own pieces that wall it in ringed, and what holds a checker
 * beside it: the pieces that make a named mate.
 */
export function mateMarks(board: Board, color: Color): Mark[] {
  const king = kingSquare(board, color);
  if (!king) return [];
  // Without the king, a checker's line reaches the squares behind it too.
  const kingless = new Map(board);
  kingless.delete(king);
  const covered = (square: Square): boolean =>
    attackersOn(kingless, square, opposite(color)).length > 0;
  const around = attackedSquares(board, king);
  const own = (square: Square): boolean => board.get(square)?.color === color;
  const barred = around.filter(square => !own(square) && covered(square));
  const walls = around.filter(square => own(square) && !covered(square));
  return [
    ...checkers(board, color).map(lineTo(king, 'attack')),
    ...holders(board, king, color),
    ...barred.map((square): Mark => ({ kind: 'barred', square, tone: 'attack' })),
    ...walls.map((square): Mark => ({ kind: 'ring', square, tone: 'plan' })),
    { kind: 'ring', square: king, tone: 'attack' },
  ];
}

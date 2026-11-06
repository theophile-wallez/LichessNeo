import {
  type Board,
  type Color,
  opposite,
  type Square,
  squareAt,
  squareCoords,
} from '#shared/chess/index.ts';
import type { Mark } from '#shared/board/marks.ts';
import { between } from '#page/review/chess/rays.ts';
import { drawingCorner, keySquaresOf, onlyPieces, piecesOf } from './endgame-rules.ts';
import type { Reason } from './idea.ts';
import { oppositionMarks } from './opposition.ts';

// What the coach draws of an ending's rule: the kings in opposition, the key
// squares of the pawn, the corner that draws, the Lucena's bridge, the Vancura
// rook's line.

const pawnOf = (board: Board, color: Color): Square | null =>
  piecesOf(board, color).find(([, role]) => role === 'pawn')?.[0] ?? null;

function keySquareMarks(after: Board, color: Color): Mark[] | null {
  const [pawn] = onlyPieces(after, color, ['pawn']) ?? [];
  return pawn ? [{ kind: 'cells', squares: keySquaresOf(pawn, color), tone: 'plan' }] : null;
}

// The rank the rook lifted to, across to the pawn's file: where it will block the checks.
function bridgeMarks(after: Board, color: Color, rook: Square): Mark[] | null {
  const pawn = pawnOf(after, color);
  const end = pawn ? squareAt(squareCoords(pawn)[0], squareCoords(rook)[1]) : null;
  if (!end) return null;
  return [{ kind: 'run', from: rook, squares: [...between(rook, end), end], tone: 'plan' }];
}

function vancuraMarks(after: Board, color: Color, rook: Square): Mark[] | null {
  const pawn = pawnOf(after, opposite(color));
  if (!pawn) return null;
  return [
    { kind: 'link', from: rook, to: pawn, tone: 'attack' },
    { kind: 'ring', square: pawn, tone: 'attack' },
  ];
}

/** The marks of an ending's rule the move of `color`'s to `to` follows, if any. */
export function endingMarks(reason: Reason, after: Board, color: Color, to: Square): Mark[] | null {
  if (reason.kind === 'opposition' || reason.kind === 'distantOpposition')
    return oppositionMarks(after);
  if (reason.kind === 'keySquare') return keySquareMarks(after, color);
  if (reason.kind === 'bridge') return bridgeMarks(after, color, to);
  if (reason.kind === 'vancura') return vancuraMarks(after, color, to);
  if (reason.kind !== 'cornerDraw') return null;
  const corner = drawingCorner(after, color);
  return corner ? [{ kind: 'cells', squares: [corner], tone: 'defense' }] : null;
}

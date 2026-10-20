import { pieceOf } from '#shared/chessground.ts';
import type { Piece } from '#shared/chess/types.ts';
import { queryAll, setStyleProperty } from '#shared/dom.ts';
import { boxOf, type Box, type Stage } from './stage.ts';

// The board's own pieces, for the intros that move them: they only take a
// `translate` and a `scale` in their stylesheet, beside chessground's
// `transform`, and a delay from here. None on a 3D board, whose pieces stand up
// from their squares.

export interface BoardPiece {
  readonly piece: Piece;
  readonly box: Box;
  /** Its file and rank as the board shows them, from 0 at the top left. */
  readonly x: number;
  readonly y: number;
}

// A board not drawn yet has no size: every piece is on its first file and rank then.
const cellOf = (offset: number, size: number): number =>
  size > 0 ? Math.min(7, Math.max(0, Math.round((offset / size) * 8))) : 0;

/**
 * Times each piece of the board at `delayOf` its place, in milliseconds, and sends it `sideOf`
 * it, -1 or 1, for the intros that bring it from off the board.
 */
export function timePieces(
  stage: Stage,
  delayOf: (piece: BoardPiece) => number,
  sideOf?: (piece: BoardPiece) => number,
): void {
  if (!stage.board.closest('.is2d')) return;
  const { squares } = stage;
  for (const element of queryAll(stage.board, 'piece', HTMLElement)) {
    const piece = pieceOf(element);
    if (!piece) continue;
    const box = boxOf(element);
    const left = box.x - squares.x;
    const top = box.y - squares.y;
    const x = cellOf(left, squares.width);
    const y = cellOf(top, squares.height);
    // Chessground places a piece with a `transform` from the board's corner: its scale must
    // turn on the square it stands on.
    setStyleProperty(
      element,
      '--ln-ext-intro-origin',
      `calc(${left}px + 50%) calc(${top}px + 88%)`,
    );
    const boardPiece = { piece, box, x, y };
    setStyleProperty(element, '--ln-ext-intro-delay', `${delayOf(boardPiece)}ms`);
    if (sideOf) setStyleProperty(element, '--ln-ext-intro-side', String(sideOf(boardPiece)));
    stage.onEnd(() => {
      setStyleProperty(element, '--ln-ext-intro-origin', null);
      setStyleProperty(element, '--ln-ext-intro-delay', null);
      setStyleProperty(element, '--ln-ext-intro-side', null);
    });
  }
}

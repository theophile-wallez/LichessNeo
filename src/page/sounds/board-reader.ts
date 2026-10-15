import type { Board, Color, Piece, Role, Square } from '#shared/chess/types.ts';
import { pieceOf, wrapOrientation } from '#shared/chessground.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { cgKey } from '#page/lichess/chessground.ts';
import { readHighlight } from './choose.ts';

// The main board as chessground draws it: its pieces and highlighted squares.

export interface BoardState {
  readonly pieces: Map<Square, Piece>;
  readonly lastMove: readonly Square[];
}

export const mainBoardWrap = (): HTMLElement | null =>
  queryOne(document, '.main-board .cg-wrap', HTMLElement) ??
  queryOne(document, '.cg-wrap', HTMLElement);

export function boardOrientation(): Color {
  const wrap = mainBoardWrap();
  return wrap ? wrapOrientation(wrap) : 'white';
}

export const mainCgBoard = (): Element | null => mainBoardWrap()?.querySelector('cg-board') ?? null;

const isKeyed = (square: Square | null): square is Square => square !== null;

/** The squares chessground marks with `className` (`current-premove`, `selected`…). */
export const markedSquares = (board: Element, className: string): Square[] =>
  queryAll(board, `square.${className}`, HTMLElement)
    // Chessground hides the marks it no longer needs, keeping their old square, to reuse them.
    .filter(square => square.style.display !== 'none')
    .map(cgKey)
    .filter(isKeyed);

export function readBoard(wrap: Element | null): BoardState | null {
  const board = wrap?.querySelector('cg-board');
  if (!board) return null;
  const pieces = new Map<Square, Piece>();
  for (const element of board.children) {
    if (element.tagName !== 'PIECE') continue;
    const square = cgKey(element);
    const piece = square && pieceOf(element);
    if (square && piece) pieces.set(square, piece);
  }
  return { pieces, lastMove: markedSquares(board, 'last-move') };
}

export interface Landing {
  readonly role: Role;
  readonly color: Color;
  readonly from: Square | null;
  readonly to: Square;
}

/** The last move the board highlights; null without a highlight. */
export function lastLanding(pieces: Board, lastMove: readonly Square[]): Landing | null {
  const first = lastMove[0];
  if (first === undefined) return null;
  const { orig, dest, mover } = readHighlight(pieces, first, lastMove[1] ?? first);
  if (!dest || !mover) return null;
  return { role: mover.role, color: mover.color, from: orig === dest ? null : orig, to: dest };
}

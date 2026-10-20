import { parseFen } from '#shared/chess/fen.ts';
import { checkmate, type Checkmate } from '#shared/chess/mate.ts';
import { cellOf } from '#shared/chess/squares.ts';
import type { Board } from '#shared/chess/types.ts';
import { wrapOrientation } from '#shared/chessground.ts';
import type { MateBadge } from '#shared/mate-badge.ts';
import { readBoard } from '#page/sounds/board-reader.ts';
import type { FinishedGame } from './game-data.ts';

// A game lost by mate ends on the board's mate badge (#shared/mate-badge.ts)
// rather than the kings' badges, shown while the board is on the final position.

export interface FinalMate {
  readonly mate: Checkmate;
  readonly board: Board;
}

/** The mate the game ended on, or null. */
export function finalMate(finished: FinishedGame): FinalMate | null {
  const last = finished.treeParts.at(-1);
  const mate = last ? checkmate(last) : null;
  return last && mate ? { mate, board: parseFen(last.fen).board } : null;
}

const samePieces = (shown: Board, final: Board): boolean =>
  shown.size === final.size &&
  [...final].every(([square, piece]) => {
    const other = shown.get(square);
    return other?.role === piece.role && other.color === piece.color;
  });

export type MateCells = Pick<MateBadge, 'king' | 'by'>;

/** Where the mate's squares are on `wrap`'s board, or null while it shows another position. */
export function mateCells(wrap: Element, { mate, board }: FinalMate): MateCells | null {
  const shown = readBoard(wrap)?.pieces;
  if (!shown || !samePieces(shown, board)) return null;
  const bottom = wrapOrientation(wrap);
  return { king: cellOf(mate.king, bottom), by: mate.by && cellOf(mate.by, bottom) };
}

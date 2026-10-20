import {
  type Board,
  type Color,
  fenTurn,
  isInCheck,
  opposite,
  parseFen,
  type Piece,
  type Role,
  roleOfLetter,
} from '#shared/chess/index.ts';
import { boardAfter, type LineMove } from './line.ts';
import { pieceOn } from './material.ts';
import { sanAfter } from './notation.ts';

// An engine line played out on the board, ply by ply, for the coach to read
// what happens along it: what each move takes, promotes to, or checks.

export interface Ply extends LineMove {
  readonly uci: string;
  /** A check is marked, and a mate as a check: nothing here tells them apart. */
  readonly san: string;
  /** The piece that moves, as it stood before. */
  readonly piece: Piece;
  readonly captured: Piece | null;
  readonly promotion: Role | null;
  readonly check: boolean;
  readonly before: Board;
  readonly after: Board;
}

function capturedOn(board: Board, uci: string, piece: Piece): Piece | null {
  const target = pieceOn(board, uci.slice(2, 4));
  // Lichess and Chess960 castle as the king taking its own rook.
  if (target) return target.color === piece.color ? null : target;
  const enPassant = piece.role === 'pawn' && uci[0] !== uci[2];
  return enPassant ? { role: 'pawn', color: opposite(piece.color) } : null;
}

interface Start {
  readonly board: Board;
  readonly color: Color;
  readonly number: number;
}

/** `ucis` played from `fen`, up to a move the board doesn't allow (a line of another position). */
export function playLine(fen: string, ucis: readonly string[]): Ply[] {
  const number = Number(fen.split(' ')[5]) || 1;
  return playFrom({ board: parseFen(fen).board, color: fenTurn(fen), number }, ucis);
}

/** `ucis` played on from after `ply`. */
export function playOn(ply: Ply, ucis: readonly string[]): Ply[] {
  const number = ply.color === 'black' ? ply.number + 1 : ply.number;
  return playFrom({ board: ply.after, color: opposite(ply.color), number }, ucis);
}

function playFrom(start: Start, ucis: readonly string[]): Ply[] {
  let { board, color, number } = start;
  const plies: Ply[] = [];
  for (const uci of ucis) {
    const piece = pieceOn(board, uci.slice(0, 2));
    if (piece?.color !== color) break;
    const after = boardAfter(board, uci);
    const check = isInCheck(after, opposite(color));
    plies.push({
      uci,
      san: sanAfter(board, uci),
      color,
      number,
      piece,
      captured: capturedOn(board, uci, piece),
      promotion: roleOfLetter(uci.charAt(4)) ?? null,
      check,
      before: board,
      after,
    });
    board = after;
    if (color === 'black') number++;
    color = opposite(color);
  }
  return plies;
}

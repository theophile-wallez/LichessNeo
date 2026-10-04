import {
  type Board,
  parseFen,
  parseSquare,
  ROLE_LETTERS,
  squareCoords,
} from '#shared/chess/index.ts';
import { pieceOn } from './material.ts';

// The review's comments and facts still import the letters from here.
export { colorLetter, ROLE_LETTERS, roleOfLetter } from '#shared/chess/index.ts';

/** A square's file, 0 for a to 7 for h; -1 for no square. */
function fileIndex(name: string): number {
  const square = parseSquare(name);
  return square ? squareCoords(square)[0] : -1;
}

/**
 * A readable move from UCI: piece letter, capture, destination and
 * promotion, without disambiguation or check marks.
 */
export function uciToSan(fen: string, uci: string | null | undefined): string {
  return uci ? sanOn(parseFen(fen).board, uci) : '';
}

/** `uciToSan` on a board already parsed. */
export function sanOn(board: Board, uci: string): string {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const piece = pieceOn(board, from);
  if (!piece) return uci;
  const target = pieceOn(board, to);
  const towardsH = fileIndex(to) > fileIndex(from);
  // Two files over, or onto its own rook (Lichess's and Chess960's notation).
  const castles =
    piece.role === 'king' &&
    (Math.abs(fileIndex(from) - fileIndex(to)) >= 2 ||
      (target?.role === 'rook' && target.color === piece.color));
  if (castles) return towardsH ? 'O-O' : 'O-O-O';
  const capture = target !== undefined || (piece.role === 'pawn' && from[0] !== to[0]);
  const promotion = uci[4] ? `=${uci[4].toUpperCase()}` : '';
  if (piece.role === 'pawn') return `${capture ? `${from[0]}x` : ''}${to}${promotion}`;
  return `${ROLE_LETTERS[piece.role].toUpperCase()}${capture ? 'x' : ''}${to}`;
}

const STANDARD_CASTLING: Readonly<Record<string, string>> = {
  e1h1: 'e1g1',
  e1a1: 'e1c1',
  e8h8: 'e8g8',
  e8a8: 'e8c8',
};

/**
 * Lichess writes castling as king takes rook, Stockfish (outside Chess960)
 * as the king's two-square step: this puts a Lichess move in the engine's terms.
 * `before` is the position it's played from, as a FEN or a board: a rook can go
 * from e1 to h1 too, and the engine refuses `e1g1` for it, then says nothing.
 */
export function normalizeUci(uci: string, before: Board | string, chess960: boolean): string;
export function normalizeUci(
  uci: string | undefined,
  before: Board | string,
  chess960: boolean,
): string | undefined;
export function normalizeUci(
  uci: string | undefined,
  before: Board | string,
  chess960: boolean,
): string | undefined {
  if (!uci || chess960) return uci;
  const castling = STANDARD_CASTLING[uci];
  if (castling === undefined) return uci;
  const board = typeof before === 'string' ? parseFen(before).board : before;
  return pieceOn(board, uci.slice(0, 2))?.role === 'king' ? castling : uci;
}

import {
  attackedSquares,
  type Board,
  isInCheck,
  opposite,
  parseFen,
  parseSquare,
  type Piece,
  ROLE_LETTERS,
  squareCoords,
} from '#shared/chess/index.ts';
import { boardAfter } from './board-after.ts';
import { pieceOn } from './material.ts';

// The review's comments and facts still import the letters from here.
export { colorLetter, ROLE_LETTERS, roleOfLetter } from '#shared/chess/index.ts';

/** A square's file, 0 for a to 7 for h; -1 for no square. */
function fileIndex(name: string): number {
  const square = parseSquare(name);
  return square ? squareCoords(square)[0] : -1;
}

/**
 * A readable move from UCI, as the original wrote it: piece letter, capture,
 * destination and promotion, without disambiguation or check marks.
 */
export function uciToSan(fen: string, uci: string | null | undefined): string {
  return uci ? sanOn(parseFen(fen).board, uci) : '';
}

/** `uciToSan` on a board already parsed. */
export const sanOn = (board: Board, uci: string): string => written(board, uci, false);

/**
 * A move in SAN, as the coach writes it: `uciToSan`'s, with the file or rank
 * that tells it from another piece like it, and the check mark.
 */
export function sanOf(fen: string, uci: string | null | undefined): string {
  return uci ? sanAfter(parseFen(fen).board, uci) : '';
}

/** `sanOf` on a board already parsed. */
export function sanAfter(board: Board, uci: string): string {
  const san = written(board, uci, true);
  const piece = pieceOn(board, uci.slice(0, 2));
  if (!piece) return san;
  return isInCheck(boardAfter(board, uci), opposite(piece.color)) ? `${san}+` : san;
}

// The file, else the rank, else the square of `from`, when another piece like
// the one there could go to `to` too. Pins are ignored: a pinned piece counts.
function disambiguation(board: Board, from: string, to: string): string {
  const [start, end] = [parseSquare(from), parseSquare(to)];
  const piece = start && board.get(start);
  if (!start || !end || !piece || piece.role === 'king') return '';
  const others = [...board]
    .filter(([square, other]) => square !== start && sameKind(other, piece))
    .filter(([square]) => attackedSquares(board, square).includes(end))
    .map(([square]): string => square);
  if (others.length === 0) return '';
  if (others.every(square => square.charAt(0) !== from.charAt(0))) return from.charAt(0);
  if (others.every(square => square.charAt(1) !== from.charAt(1))) return from.charAt(1);
  return from;
}

const sameKind = (first: Piece, second: Piece): boolean =>
  first.role === second.role && first.color === second.color;

// Two files over, or onto its own rook (Lichess's and Chess960's notation).
function castles(board: Board, from: string, to: string, piece: Piece): boolean {
  const target = pieceOn(board, to);
  const ontoRook = target?.role === 'rook' && target.color === piece.color;
  return piece.role === 'king' && (Math.abs(fileIndex(from) - fileIndex(to)) >= 2 || ontoRook);
}

// The move without its check mark; `told` from another piece like it.
function written(board: Board, uci: string, told: boolean): string {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const piece = pieceOn(board, from);
  if (!piece) return uci;
  if (castles(board, from, to, piece)) return fileIndex(to) > fileIndex(from) ? 'O-O' : 'O-O-O';
  const capture = pieceOn(board, to) !== undefined || (piece.role === 'pawn' && from[0] !== to[0]);
  const promotion = uci[4] ? `=${uci[4].toUpperCase()}` : '';
  if (piece.role === 'pawn') return `${capture ? `${from[0]}x` : ''}${to}${promotion}`;
  const which = told ? disambiguation(board, from, to) : '';
  return `${ROLE_LETTERS[piece.role].toUpperCase()}${which}${capture ? 'x' : ''}${to}`;
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

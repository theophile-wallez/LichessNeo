import { attackedSquares, isInCheck } from './attacks.ts';
import { parsePlacement, START_PLACEMENT } from './fen.ts';
import { ROLE_LETTERS, roleOfLetter } from './pieces.ts';
import { parseSquare, squareAt, squareCoords } from './squares.ts';
import { type Board, type Color, opposite, type Piece, type Role, type Square } from './types.ts';

// Plays moves written in SAN on a board, for lines kept as their moves alone
// (a study's chapter): where they lead, and their last move in UCI. The moves
// are trusted to be legal; a move that can't be read or played gives null.

/** A move played: the board after it and the move in UCI. */
export interface PlayedSan {
  readonly board: Board;
  readonly uci: string;
}

const SAN = /^([NBRQK])?([a-h])?([1-8])?x?([a-h][1-8])(?:=?([NBRQ]))?$/;

/** The move without its check, mate or annotation marks; castling with letters. */
const cleanSan = (san: string): string => san.replace(/[+#!?]+$/, '').replaceAll('0', 'O');

function moved(board: Board, from: Square, to: Square, piece: Piece): Map<Square, Piece> {
  const next = new Map(board);
  next.delete(from);
  next.set(to, piece);
  return next;
}

function castle(board: Board, turn: Color, long: boolean): PlayedSan | null {
  const rank = turn === 'white' ? '1' : '8';
  const king = board.get(`e${rank}`);
  const rook = board.get(`${long ? 'a' : 'h'}${rank}`);
  if (king?.role !== 'king' || rook?.role !== 'rook') return null;
  const to: Square = `${long ? 'c' : 'g'}${rank}`;
  const next = moved(board, `e${rank}`, to, king);
  next.delete(`${long ? 'a' : 'h'}${rank}`);
  next.set(`${long ? 'd' : 'f'}${rank}`, rook);
  return { board: next, uci: `e${rank}${to}` };
}

/** The square `steps` ranks behind `square`, from `turn`'s side. */
function behind(square: Square, turn: Color, steps: number): Square | null {
  const [file, rank] = squareCoords(square);
  return squareAt(file, rank - (turn === 'white' ? steps : -steps));
}

/** Where the pawn moving to `to` comes from: a capture names its file. */
function pawnFrom(board: Board, turn: Color, to: Square, file: string | undefined): Square | null {
  const isPawn = (square: Square | null): square is Square =>
    square !== null && board.get(square)?.role === 'pawn' && board.get(square)?.color === turn;
  if (file) {
    const start = parseSquare(`${file}${to[1]}`);
    const from = start ? behind(start, turn, 1) : null;
    return isPawn(from) ? from : null;
  }
  const one = behind(to, turn, 1);
  if (isPawn(one)) return one;
  const two = behind(to, turn, 2);
  return one && !board.has(one) && isPawn(two) ? two : null;
}

/** A piece's move as SAN names it: its role, its square, and the file and rank it's from, if named. */
interface Named {
  readonly role: Role;
  readonly to: Square;
  readonly file: string;
  readonly rank: string;
}

/** The square of the piece that makes the move named, leaving its king safe. */
function pieceFrom(board: Board, turn: Color, { role, to, file, rank }: Named): Square | null {
  const candidates = [...board]
    .filter(([, piece]) => piece.color === turn && piece.role === role)
    .map(([square]) => square)
    .filter(square => (!file || square[0] === file) && (!rank || square[1] === rank))
    .filter(square => attackedSquares(board, square).includes(to));
  const piece = { color: turn, role };
  // Two pieces may reach the square where SAN names one: the other is pinned.
  return candidates.find(from => !isInCheck(moved(board, from, to, piece), turn)) ?? null;
}

function playPawn(board: Board, turn: Color, to: Square, match: RegExpExecArray): PlayedSan | null {
  const [, , file, , , promotion] = match;
  const from = pawnFrom(board, turn, to, file);
  if (!from) return null;
  const role = promotion ? roleOfLetter(promotion) : 'pawn';
  if (!role) return null;
  const next = moved(board, from, to, { color: turn, role });
  // A capture onto an empty square takes en passant: the pawn beside it goes.
  const passed = file && !board.has(to) ? behind(to, turn, 1) : null;
  if (passed) next.delete(passed);
  return { board: next, uci: `${from}${to}${promotion ? ROLE_LETTERS[role] : ''}` };
}

/** Plays `san` for `turn` on `board`; null when it can't be read or played. */
export function playSan(board: Board, turn: Color, san: string): PlayedSan | null {
  const clean = cleanSan(san);
  if (clean === 'O-O' || clean === 'O-O-O') return castle(board, turn, clean === 'O-O-O');
  const match = SAN.exec(clean);
  const to = match?.[4] ? parseSquare(match[4]) : null;
  if (!match || !to) return null;
  const [, letter, file = '', rank = ''] = match;
  if (!letter) return playPawn(board, turn, to, match);
  const role = roleOfLetter(letter);
  const from = role ? pieceFrom(board, turn, { role, to, file, rank }) : null;
  const piece = from ? board.get(from) : undefined;
  if (!from || !piece) return null;
  return { board: moved(board, from, to, piece), uci: `${from}${to}` };
}

/** The board after `moves` from the start, and each of them in UCI; null on one that fails. */
export function playLine(
  moves: readonly string[],
): { board: Board; lastMove: string; ucis: string[] } | null {
  let board: Board = parsePlacement(START_PLACEMENT);
  let turn: Color = 'white';
  const ucis: string[] = [];
  for (const san of moves) {
    const played = playSan(board, turn, san);
    if (!played) return null;
    ({ board } = played);
    ucis.push(played.uci);
    turn = opposite(turn);
  }
  return { board, lastMove: ucis.at(-1) ?? '', ucis };
}

import type { Color } from '#shared/chess/types.ts';
import type { ExplorerData, ExplorerDb } from '#page/lichess/explorer.ts';
import type { Lines } from './settings.ts';

// The opening book practice plays from: what the explorer found for each
// position, how common a move is there, and the other side's reply, picked
// as often as the games play it.

export interface BookMove {
  readonly uci: string;
  readonly san: string;
  readonly games: number;
  /** The mover's score in those games, from 0 to 1 (a draw is half). */
  readonly score: Readonly<Record<Color, number>>;
  /** The opening it reaches, named; '' for none. */
  readonly opening: string;
}

export interface BookPosition {
  /** The games that go on from here: its moves', so that their shares add up to one. */
  readonly games: number;
  /** The most played first. */
  readonly moves: readonly BookMove[];
  readonly opening: string;
}

/** How common the player's move is: the most played, then by its share of the games. */
export type BookKind = 'main' | 'popular' | 'sideline' | 'rare' | 'out';

export interface BookRating {
  readonly kind: BookKind;
  /** The move as the book has it; null out of the book. */
  readonly move: BookMove | null;
  readonly share: number;
  /** The most played move, unless it's the one rated. */
  readonly main: BookMove | null;
  /** The games that go on from the position. */
  readonly total: number;
}

const POPULAR = 0.15;
const SIDELINE = 0.02;
/** A reply this rare isn't played: a line of the book, not a game's whim. */
const REPLY_SHARE = 0.01;
/** Whose games a book is: the explorer's database's, or a book of the line's own, a game a move. */
export type BookDb = ExplorerDb | 'own';

/**
 * Fewer games than this going on from a position, and the book ends there. A
 * player's own games are few: one is already a line they've met.
 */
const LINE_GAMES: Readonly<Record<BookDb, number>> = {
  masters: 5,
  lichess: 20,
  player: 1,
  own: 1,
};

function bookMove(move: ExplorerData['moves'][number]): BookMove {
  const games = move.white + move.draws + move.black;
  const scoreOf = (wins: number): number => (games > 0 ? (wins + move.draws / 2) / games : 0.5);
  return {
    uci: move.uci,
    san: move.san,
    games,
    score: { white: scoreOf(move.white), black: scoreOf(move.black) },
    opening: move.opening?.name ?? '',
  };
}

export function bookPosition(data: ExplorerData): BookPosition {
  const moves = data.moves
    .map(bookMove)
    .filter(move => move.games > 0)
    .toSorted((first, second) => second.games - first.games);
  return {
    games: moves.reduce((games, move) => games + move.games, 0),
    moves,
    opening: data.opening?.name ?? '',
  };
}

export const shareOf = (position: BookPosition, move: BookMove): number =>
  position.games > 0 ? move.games / position.games : 0;

function kindOf(share: number): BookKind {
  if (share >= POPULAR) return 'popular';
  return share >= SIDELINE ? 'sideline' : 'rare';
}

/** The same move, whether or not either notes its check or mate. */
export const sameMove = (one: string, other: string): boolean =>
  one.replace(/[+#]$/, '') === other.replace(/[+#]$/, '');

/** How common the move `san` is in `position`. Moves are matched by their notation, which
 * Lichess's tree and the explorer write alike (castling's UCI differs). */
export function rateMove(position: BookPosition, san: string): BookRating {
  const [top = null] = position.moves;
  const total = position.games;
  const move = position.moves.find(each => sameMove(each.san, san)) ?? null;
  if (!move) return { kind: 'out', move: null, share: 0, main: top, total };
  const share = shareOf(position, move);
  if (move === top) return { kind: 'main', move, share, main: null, total };
  return { kind: kindOf(share), move, share, main: top, total };
}

/** The replies the book plays, the most played first: none once it ends. Its main lines
 * alone are its popular replies, or its most played when none is. */
export function replies(
  position: BookPosition,
  db: BookDb,
  lines: Lines = 'all',
): readonly BookMove[] {
  if (position.games < LINE_GAMES[db]) return [];
  const played = position.moves.filter(move => shareOf(position, move) >= REPLY_SHARE);
  if (lines === 'all') return played;
  const main = played.filter(move => shareOf(position, move) >= POPULAR);
  return main.length > 0 ? main : played.slice(0, 1);
}

/**
 * The reply `roll` (from 0 to 1) picks, each as often as the games play it.
 * Those not met yet go first, so that another round meets another line.
 */
export function pickReply(
  moves: readonly BookMove[],
  roll: number,
  met: (move: BookMove) => boolean = () => false,
): BookMove | null {
  const fresh = moves.filter(move => !met(move));
  const pool = fresh.length > 0 ? fresh : moves;
  const total = pool.reduce((games, move) => games + move.games, 0);
  let left = roll * total;
  for (const move of pool) {
    left -= move.games;
    if (left < 0) return move;
  }
  return pool.at(-1) ?? null;
}

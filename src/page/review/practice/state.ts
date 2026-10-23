import { fenTurn, START_PLACEMENT } from '#shared/chess/fen.ts';
import type { Color } from '#shared/chess/types.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import type { ExplorerSource } from '#page/lichess/explorer.ts';
import { parentPath, pathPrefixes } from '#page/lichess/tree.ts';
import type { BookDb, BookPosition, BookRating } from './book.ts';
import { chapterOf } from './chapters.ts';
import type { Mastery } from './mastery.ts';
import { depthOf } from './progress.ts';
import { AUTO_LENGTH, type PracticeSettings } from './settings.ts';

// One line of practice: where it started, the side the user plays, the book it
// plays from (the explorer's games, or a book of its own: a study's chapter,
// the user's repertoire, a trap), and what it has kept along the way.

/** The book of a line that doesn't play the explorer's games, and what the coach calls it. */
export interface OwnBook {
  readonly kind: 'study' | 'repertoire' | 'trap' | 'card';
  readonly name: string;
  /** Its positions, by `positionKey`. */
  readonly positions: ReadonlyMap<string, BookPosition>;
}

/** The moves to find from one position, and the user's usual move there, to find better than. */
export interface Aims {
  readonly path: string;
  readonly moves: readonly string[];
  readonly habit: string;
}

export interface PracticeState {
  /** The path practice started from: its line is the board's from there. */
  readonly start: string;
  /** The side the user plays. */
  side: Color;
  /** The opening practice started on, named; '' from a position of the user's. */
  readonly opening: string;
  /** What the explorer found, by `positionKey`, in `source`'s games. */
  readonly books: Map<string, BookPosition>;
  source: ExplorerSource | null;
  /** The book of its own the line plays, in the explorer's place. */
  readonly own: OwnBook | null;
  /** The moves to find from one position of the line, whatever the book says. */
  readonly aims: Aims | null;
  /** The user's moves the line goes to, whatever the settings say. */
  readonly length: number | null;
  /** How deep the opening's lines had grown when it started, for a length that grows. */
  readonly depth: number;
  /** How deep they go from the next line on, once this one grew them. */
  grew: number | null;
  /** Whether the explorer was open when practice started: it's left so after. */
  readonly explorerWas: boolean;
  /** The user's move waiting for its reply, and since when (ms). */
  waiting: { readonly path: string; readonly since: number } | null;
  /** The hints asked for on the position at `hintsAt`, and the positions any were asked for on. */
  hints: number;
  hintsAt: string;
  readonly hinted: Set<string>;
  /** The last move the coach refused, taken back for another try. */
  miss: Miss | null;
  /** The moves refused along the line. */
  misses: number;
  /** The refused move on the board, counted once. */
  refused: string | null;
  /** The move on the board that isn't the user's own, while it waits for their choice. */
  deviated: string | null;
  /** The moves the user asked the coach to play, by `moveKey` of their path: not theirs to count. */
  readonly revealed: Set<string>;
  /** The page's settings, which may change along the line. */
  readonly settings: PracticeSettings;
  /** The book's replies played so far, by `moveKey` of their position: others go first. */
  readonly met: Set<string>;
  /** The user's moves found at the first try in a row, and the longest such run. */
  streak: number;
  bestStreak: number;
  /** The user's moves counted, by path, and the positions they missed. */
  readonly scored: Set<string>;
  readonly missedAt: Set<string>;
  /** What the coach cheers, by the path of the move that earned it. */
  readonly cheers: Map<string, Cheer>;
  /** Where the line's end was last handled, once. */
  ended: string | null;
  /** The board's path when last followed, and whether it got there by a move forward. */
  at: string;
  forward: boolean;
}

/** What the coach cheers after a move: the day's goal met, or an opening known better. */
export type Cheer =
  | { readonly kind: 'goal'; readonly days: number }
  | { readonly kind: 'mastery'; readonly name: string; readonly mastery: Mastery };

/** A move from a position, named by its path or its key, as its SAN: whatever path the tree gives it. */
export const moveKey = (from: string, san: string): string => `${from} ${san}`;

/** A position as the books key it: its pieces and the side to move. */
export const positionKey = (fen: string): string => fen.split(' ').slice(0, 2).join(' ');

/** Why a move is refused: rare in the book, worse to the engine, not the move to find, or the user's habit. */
export type Refusal = 'rare' | 'dubious' | 'aim' | 'habit';

/** A move refused, and the tries refused from its position so far. */
export interface Miss {
  readonly played: Played;
  readonly tries: number;
  readonly why: Refusal;
}

/** A move of the user's, and how common it is: null when the position before wasn't looked up. */
export interface Played {
  readonly path: string;
  readonly san: string;
  readonly rating: BookRating | null;
}

export const sanAt = (analysis: Analysis, path: string): string =>
  analysis.nodeAtPath(path).san ?? '';

/** The book's position at `fen`: the line's own book's, else what the explorer found. */
export const bookAt = (practice: PracticeState, fen: string): BookPosition | null =>
  (practice.own?.positions ?? practice.books).get(positionKey(fen)) ?? null;

/** The position before the move to `path`, as the book has it. */
export const bookBefore = (
  practice: PracticeState,
  analysis: Analysis,
  path: string,
): BookPosition | null => bookAt(practice, analysis.nodeAtPath(parentPath(path)).fen);

/** Whose games the book is, for its thresholds: a book of its own has a game a move. */
export const bookDb = (practice: PracticeState): BookDb =>
  practice.own ? 'own' : (practice.source?.db ?? 'masters');

/** A move along practice's line, past where it started. */
export const inLine = (practice: PracticeState, path: string): boolean =>
  path.length > practice.start.length && path.startsWith(practice.start);

/** The moves from the start to `path`, in SAN; null off a line from the standard start. */
export function movesTo(analysis: Analysis, path: string): string[] | null {
  if (!analysis.nodeAtPath('').fen.startsWith(`${START_PLACEMENT} w`)) return null;
  return pathPrefixes(path)
    .filter(each => each !== '')
    .map(each => sanAt(analysis, each));
}

/** The user's moves along the line up to `path`. */
export const yourMoves = (practice: PracticeState, analysis: Analysis, path: string): number =>
  pathPrefixes(path).filter(
    each =>
      inLine(practice, each) &&
      fenTurn(analysis.nodeAtPath(parentPath(each)).fen) === practice.side,
  ).length;

/** The first lines of an opening practiced as deep as it grows, in the user's moves. */
export const FIRST_DEPTH = 4;

/** How many of the user's moves the line goes to; 0 to the book's end. */
export function lineLength(practice: PracticeState): number {
  if (practice.length !== null) return practice.length;
  const { length } = practice.settings;
  return length === AUTO_LENGTH ? practice.depth : length;
}

/** How deep the lines of the opening `name` have grown. */
export const depthFor = (name: string): number => depthOf(chapterOf(name), FIRST_DEPTH);

/** The depths a length that grows goes through, the last to the book's end. */
const DEPTHS = [FIRST_DEPTH, 6, 8, 10, 12, 15, 0];

/** The next depth after `depth`; null past the last. */
export function deeper(depth: number): number | null {
  const at = DEPTHS.indexOf(depth);
  return at < 0 ? null : (DEPTHS[at + 1] ?? null);
}

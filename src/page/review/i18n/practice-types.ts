import type { Color } from '#shared/chess/types.ts';
import type { ExplorerDb } from '#page/lichess/explorer.ts';
import type { BookKind } from '#page/review/practice/book.ts';
import type { Lines } from '#page/review/practice/settings.ts';
import type { PracticeHomeStrings, PracticeModeStrings } from './practice-mode-types.ts';
import type { Ways } from './types.ts';

// What the coach says while the user practices an opening against the
// explorer's games (view/practice-bubble.ts). A move's games go in with the
// position's: each language writes them as a share, or as counts for a
// position few games reached. Most lines come in a few ways, picked by the
// move or the position they're about, so the coach doesn't repeat itself.

/** Whose games the book is: the explorer's database, one player's for the player's. */
export type BookSource =
  | { readonly db: 'masters' | 'lichess' }
  | { readonly db: 'player'; readonly player: string; readonly you: boolean };

/** A move's games, of the games that go on from its position. */
export interface BookCount {
  readonly games: number;
  readonly of: number;
}

/** The errors the coach warns of in a book move: an inaccuracy is the engine's quibble. */
export type BookError = 'mistake' | 'miss' | 'blunder';

export interface PracticeStrings {
  /** The free board's button that starts it. */
  readonly start: string;
  /** The card's title before the first move. */
  readonly side: (side: Color) => string;
  readonly intro: (source: BookSource) => Ways;
  /** The button that changes sides, before the first move. */
  readonly switchSide: (side: Color) => string;
  readonly yourMove: Ways;
  /** The verdict on a move of the book, by how common it is: {m} is the move. */
  readonly kinds: Readonly<Record<Exclude<BookKind, 'out'>, string>>;
  readonly share: (source: BookSource, count: BookCount) => Ways;
  readonly mainIs: (move: string, count: BookCount) => Ways;
  /** A book move the engine finds an error: games aren't always right. */
  readonly doubts: (error: BookError) => string;
  /** The book's reply, played on the board. */
  readonly answers: (side: Color, move: string, count: BookCount) => Ways;
  /** A reply the engine finds an error, for the user to punish. */
  readonly punish: (error: BookError) => Ways;
  /** A move out of the book: {m} is the move. */
  readonly outTitle: string;
  /** A move refused, before it's taken back. */
  readonly refused: Ways;
  /** A book move the engine refused: {m} is the move. */
  readonly dubiousTitle: string;
  readonly refusedDubious: Ways;
  /** The card's title once it's taken back. */
  readonly tryAgain: Ways;
  /** Why it was: no game played it, or few did. */
  readonly missedOut: (source: BookSource, move: string) => Ways;
  readonly missedRare: (source: BookSource, move: string, count: BookCount) => Ways;
  readonly missedDubious: (move: string) => Ways;
  readonly findBook: (source: BookSource) => Ways;
  /** After a few tries, the hints. */
  readonly stuck: Ways;
  /** The book's move, played on request: {m} is the move. */
  readonly revealedTitle: string;
  readonly endTitle: Ways;
  /** The line as long as the settings want. */
  readonly doneTitle: Ways;
  readonly lineDone: Ways;
  /** The user's moves found at the first try in a row: the chip's tip, and the best run. */
  readonly streak: (moves: number) => string;
  readonly bestStreak: (moves: number) => Ways;
  /** The button that goes to the positions to review. */
  readonly review: (count: number) => string;
  readonly end: Ways;
  /** The user's moves in the book, and how many of them were the main move. */
  readonly tally: (inBook: number, main: number) => string;
  /** The moves refused along the line. */
  readonly missesTally: (misses: number) => Ways;
  readonly takeBack: string;
  readonly again: string;
  /** Plays the book's move for the user: short, a button among three. */
  readonly reveal: string;
  /** Hands over to Lichess's practice against the computer. */
  readonly computer: string;
  readonly failed: string;
  readonly modes: PracticeModeStrings;
  /** Each opening's idea, by its English name (i18n/en-ideas.ts). */
  readonly ideas: Readonly<Record<string, string>>;
  readonly page: PracticePageStrings;
}

/** The practice page's own words (view/openings-page.ts). */
export interface PracticePageStrings {
  readonly home: PracticeHomeStrings;
  readonly title: string;
  /** The back button's tip, while practicing: to the page's choices. */
  readonly back: string;
  /** The coach's card over the choices. */
  readonly pick: string;
  readonly pickWhy: string;
  readonly youPlay: string;
  readonly sides: Readonly<Record<Color, string>>;
  /** Whose games the book is, picked. */
  readonly bookLabel: string;
  readonly books: Readonly<Record<ExplorerDb, string>>;
  /** Whether practice keeps to the book's main lines: its replies, and the user's moves. */
  readonly linesLabel: string;
  readonly lines: Readonly<Record<Lines, string>>;
  /** How many of the user's moves a line goes to; 0 to the book's end. */
  readonly lengthLabel: string;
  readonly length: (moves: number) => string;
  /** The same, in the line that sums the choices up. */
  readonly movesSum: (moves: number) => string;
  /** Over the positions missed, due again, and the name of one at the first move. */
  readonly toReview: (count: number) => string;
  readonly firstMove: string;
  /** The copy in the user's Lichess studies: its row's label, to turn it on, its states. */
  readonly syncLabel: string;
  readonly syncOn: string;
  readonly synced: string;
  readonly syncing: string;
  readonly syncFailed: string;
  /** The link to the side's study, and the button that stops the copy. */
  readonly syncOpen: string;
  readonly syncStop: string;
  /** In the line that sums the choices up, while it's on. */
  readonly syncSum: string;
  /** An opening's card: the share of its positions' moves found at the first try. */
  readonly record: (found: number, positions: number) => string;
  /** Practice from the board's position, as it stands. */
  readonly fromHere: string;
  readonly search: string;
  /** Over the side's best known openings. */
  readonly popular: (side: Color) => string;
  readonly found: string;
  readonly noResult: string;
  readonly searchFailed: string;
  /** A move's share of the games, written. */
  readonly share: (share: number) => string;
  /** Over the line played so far. */
  readonly line: string;
  /** A move of the line, by how common it is, for its tip. */
  readonly kindNames: Readonly<Record<BookKind, string>>;
  /** The explorer answers signed-in users only. */
  readonly signedOut: string;
}

import type { SafeHtml } from '#shared/html.ts';
import type { ProfileAxis } from '#page/review/judge/profile.ts';
import type { Theme } from '#page/review/coach/fact.ts';
import type { Color, Piece } from '#shared/chess/index.ts';
import type { CountedClass, MoveClass } from '#page/review/classes/classes.ts';

// What the review says, per language. Moves, pieces and squares go into the
// coach's sentences as [[…]] tokens (comment/tokens.ts), already built.

/** The side the reader played, whom the coach calls "you"; null when they watch the game. */
export type Viewer = Color | null;

/** Explain's engine lines, written out as numbered [[…]] moves. */
export interface LineStrings {
  /** The line from the move that was best. */
  readonly best: (line: string) => string;
  /** The line that punishes an error. */
  readonly allows: (move: string, line: string) => string;
  /** The bubble's button that plays the best line on the board. */
  readonly show: string;
}

/** Retry: the player looks for a better move than the one played. */
export interface RetryStrings {
  readonly button: string;
  readonly prompt: (side: Color) => string;
  readonly checking: string;
  readonly found: (move: string) => string;
  /** Another good move than the engine's. */
  readonly alsoGood: (move: string) => string;
  readonly wrong: (move: string) => string;
  /** The move played in the game, tried again. */
  readonly same: string;
  readonly reveal: string;
  readonly revealed: (best: string) => string;
}

/** What the coach says of the time a move took; times come written ("2 s", "1:24"). */
export interface ClockStrings {
  /** An error played fast, with time on the clock. */
  readonly rushed: (side: Color, spent: string, clock: string) => string;
  /** An error with almost no time left. */
  readonly timeTrouble: (clock: string) => string;
  /** A long think that found a good move. */
  readonly paidOff: (side: Color, spent: string) => string;
  readonly seconds: (seconds: number) => string;
}

/** The coach's brief before the first move. */
export interface BriefStrings {
  /** The game's opening, named. */
  readonly opening: (name: SafeHtml) => SafeHtml;
  /** How many key moments the review found, and the move the game turned on, if one did. */
  readonly moments: (count: number, turning: SafeHtml | null) => SafeHtml;
  /** For a game without a key moment. */
  readonly calm: string;
  readonly start: string;
}

export interface InterfaceStrings {
  readonly review: string;
  readonly start: string;
  /** The closed review's way back to the summary, beside Game Review's. */
  readonly summary: string;
  readonly brief: BriefStrings;
  readonly next: string;
  readonly explain: string;
  readonly best: string;
  readonly analysing: string;
  /** Over the game rating, under a player's accuracy. */
  /**
   * "You played like an [1850] Elo": the words around a player's game
   * rating, null while it's unknown.
   */
  readonly playedLike: (side: Color, elo: number | null) => readonly [string, string];
  /** The summary's sections: the move classes, the phases' radar. */
  readonly moves: string;
  readonly profileTitle: string;
  /** The profile radar's axes: a name, and how its score is worked out. */
  readonly profile: Readonly<Record<ProfileAxis, { readonly name: string; readonly how: string }>>;
  readonly accuracy: string;
  readonly anonymous: string;
  readonly close: string;
  readonly back: string;
  readonly coach: string;
  readonly intro: string;
  readonly engineError: string;
  readonly liveIntro: string;
  readonly thinking: string;
  readonly startPosition: string;
  readonly more: string;
  readonly less: string;
  readonly gameRating: string;
  readonly gameRatingTip: string;
  /** Explain's hint for a move that wasn't best. */
  readonly bestWas: (move: string) => string;
  /** A move's cost bar, by the share of the mover's winning chances it gave away. */
  readonly cost: (percent: number) => string;
  readonly lines: LineStrings;
  readonly retry: RetryStrings;
  /** The bubble's tags: the tactic a move is about. */
  readonly themes: Readonly<Record<Theme, string>>;
  readonly clock: ClockStrings;
}

/** The situations with remarks of their own, besides each class's. */
export type Situation =
  | 'mate'
  | 'allowsMate'
  | 'missedMate'
  | 'mating'
  | 'castle'
  | 'promote'
  | 'check'
  | 'capture'
  | 'badCapture'
  | 'winning'
  | 'losing'
  | 'earlyQueen'
  | 'earlyKing';

export type RemarkPools = Readonly<Record<MoveClass | Situation, readonly string[]>>;

/** Who has an advantage, and which ("a clear advantage"). */
export interface Standing {
  readonly side: Color;
  readonly advantage: string;
}

export interface TrajectorySentences {
  /** The advantages from level 1 to 4 (index 0 unused), then a mate in so many moves. */
  readonly advantages: readonly string[];
  readonly mateIn: (moves: number) => string;
  readonly stillBalanced: readonly string[];
  readonly stillAhead: (standing: Standing) => readonly string[];
  readonly wasBalanced: (after: Standing, forMover: boolean) => string;
  readonly nowBalanced: (before: Standing) => string;
  readonly grows: (side: Color, from: string, to: string) => string;
  readonly shrinks: (side: Color, from: string, to: string) => string;
  readonly swings: (before: Standing, after: Standing) => string;
}

/** A piece lost or won on a square, and the move that takes it. */
export interface PieceWon {
  readonly piece: Piece;
  readonly square: string;
  readonly reply: string;
}

export interface FactSentences {
  readonly checkmate: (king: Color) => string;
  readonly matedIn: (best: string, moves: number) => string;
  readonly heldOutLonger: (best: string) => string;
  readonly canForceMate: (side: Color, reply: string) => string;
  readonly wouldForceMate: (best: string, moves: number) => string;
  readonly missedPunishment: (side: Color, best: string) => string;
  /** A miss in the middle of punishing an error from a move before. */
  readonly unfinishedPunishment: (side: Color, best: string) => string;
  readonly leftUndefended: (lost: PieceWon) => string;
  readonly answersAndWins: (side: Color, lost: PieceWon) => string;
  readonly strongerCapture: (best: string, piece: Piece) => string;
  readonly morePrecise: (best: string) => string;
  readonly betterMove: (best: string) => string;
  readonly punishesAtOnce: (side: Color) => string;
  readonly offered: (piece: Piece, side: Color) => string;
  readonly keepsAdvantage: string;
  readonly holdsPosition: (side: Color) => string;
  readonly promotes: (piece: Piece) => string;
  readonly castles: string;
  readonly takesBack: (square: string) => string;
  readonly winsForFree: (piece: Piece) => string;
  readonly winsMaterial: (won: Piece, given: Piece) => string;
  readonly checkForces: (side: Color) => string;
  readonly littleMorePrecise: (best: string) => string;
  readonly forks: (first: Piece, second: Piece) => string;
  readonly missedFork: (best: string, first: Piece, second: Piece) => string;
  readonly allowsFork: (reply: string, first: Piece, second: Piece) => string;
  /** The reply an error lets in. */
  readonly canPlay: (side: Color, reply: string) => string;
}

export interface ReviewLanguage {
  readonly ui: InterfaceStrings;
  readonly classLabels: Readonly<Record<MoveClass, string>>;
  /** The verdict over the coach's comment; {m} marks the move. */
  readonly classSentences: Readonly<Record<MoveClass, string>>;
  /** "3 Best", "3 meilleurs coups": the counts over the Game Review button. */
  readonly countLabel: (moveClass: CountedClass, count: number) => string;
  /** "Black’s blunders: 2": the summary's count, as its button's label. */
  readonly countTip: (color: Color, moveClass: MoveClass, count: number) => string;
  /** The language's typographic rules, applied to the coach's text. */
  readonly typography: (text: string) => string;
  /** The line naming a book move's opening. */
  readonly openingLine: (name: string) => string;
  readonly remarks: RemarkPools;
  readonly trajectory: TrajectorySentences;
  readonly facts: FactSentences;
}

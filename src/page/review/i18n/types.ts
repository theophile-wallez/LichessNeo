import type { Color, Piece } from '#shared/chess/index.ts';
import type { CountedClass, MoveClass } from '#page/review/classes/classes.ts';
import type { Phase } from '#page/review/rating/phases.ts';

// What the review says, per language. Moves, pieces and squares go into the
// coach's sentences as [[…]] tokens (comment/tokens.ts), already built.

/** Explain's engine lines, written out as numbered [[…]] moves. */
export interface LineStrings {
  /** The line from the move that was best. */
  readonly best: (line: string) => string;
  /** The line that punishes an error. */
  readonly allows: (move: string, line: string) => string;
  /** The bubble's button that plays the best line on the board. */
  readonly show: string;
}

export interface InterfaceStrings {
  readonly review: string;
  readonly start: string;
  readonly next: string;
  readonly explain: string;
  readonly best: string;
  readonly analysing: string;
  readonly players: string;
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
  readonly phases: Readonly<Record<Phase, string>>;
  /** Explain's hint for a move that wasn't best. */
  readonly bestWas: (move: string) => string;
  /** A move's cost bar, by the share of the mover's winning chances it gave away. */
  readonly cost: (percent: number) => string;
  readonly lines: LineStrings;
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

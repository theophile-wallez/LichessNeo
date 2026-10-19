import type { SafeHtml } from '#shared/html.ts';
import type { ProfileAxis } from '#page/review/judge/profile.ts';
import type { Phase } from '#page/review/rating/phases.ts';
import type { Theme } from '#page/review/coach/said.ts';
import type { MotifKind } from '#page/review/chess/motifs.ts';
import type { Color, Piece } from '#shared/chess/index.ts';
import type { MoveClass } from '#page/review/classes/classes.ts';

// What the review says, per language. Moves, pieces and squares go into the
// coach's sentences as [[…]] tokens (comment/tokens.ts), already built.

/** The side the reader played, whom the coach calls "you"; null when they watch the game. */
export type Viewer = Color | null;

/** Explain's engine lines, written out as numbered [[…]] moves. */
interface LineStrings {
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
interface BriefStrings {
  /** The game's opening, named. */
  readonly opening: (name: SafeHtml) => SafeHtml;
  /** How many key moments the review found, and the move the game turned on, if one did. */
  readonly moments: (count: number, turning: SafeHtml | null) => SafeHtml;
  /** For a game without a key moment. */
  readonly calm: string;
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
  /**
   * "You played like an [1850] Elo": the words around a player's game rating, under
   * their accuracy, null while it's unknown.
   */
  readonly playedLike: (side: Color, elo: number | null) => readonly [string, string];
  /** The summary's sections: the move classes, the phases' verdicts, the profile's radar. */
  readonly moves: string;
  readonly phasesTitle: string;
  /** The verdicts' phases (rating/phases.ts): a name, and which moves it holds. */
  readonly phases: Readonly<Record<Phase, { readonly name: string; readonly how: string }>>;
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
  /** The free board's first words, before a move: a line, then what the coach will do. */
  readonly liveIntro: { readonly title: string; readonly sub: string };
  readonly thinking: string;
  readonly startPosition: string;
  readonly more: string;
  readonly less: string;
  /** Explain's hint for a move that wasn't best. */
  readonly bestWas: (move: string) => string;
  /** A move's cost bar, by the share of the mover's winning chances it gave away. */
  readonly cost: (percent: number) => string;
  readonly lines: LineStrings;
  readonly retry: RetryStrings;
  /** The bubble's tags: the tactic a move is about. */
  readonly themes: Readonly<Record<Theme, string>>;
  readonly clock: ClockStrings;
  /** The move-by-move graph's two views. */
  readonly graphViews: { readonly advantage: string; readonly time: string };
  /** The header's button that opens the game's crosstable and export. */
  readonly share: string;
}

/** The situations with remarks of their own, besides each class's. */
type Situation =
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
  | 'earlyKing'
  | 'firstMove';

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
  readonly wasBalanced: (after: Standing, forMover: boolean) => Ways;
  readonly nowBalanced: (before: Standing) => Ways;
  readonly grows: (side: Color, from: string, to: string) => Ways;
  readonly shrinks: (side: Color, from: string, to: string) => Ways;
  readonly swings: (before: Standing, after: Standing) => Ways;
}

/** A piece lost or won on a square, and the move that takes it. */
interface PieceWon {
  readonly piece: Piece;
  readonly square: string;
  readonly reply: string;
}

/** What a side wins: the other side's pieces, for its own it gives (trades left out). */
export interface Material {
  readonly won: readonly Piece[];
  readonly lost: readonly Piece[];
}

/** What names a motif: its kind, its move as a token, and the pieces it hits. */
export type MotifNamer = (kind: MotifKind, move: string, pieces: readonly Piece[]) => string | null;

/** The ways to say the same thing, of which the coach picks one per move. */
export type Ways = readonly [string, ...string[]];

/** What a line wins: the material, its moves as tokens, and how many of the winner's they are. */
export interface LineGain {
  readonly material: string;
  readonly line: string;
  readonly moves: number;
}

/** The facts read off the engine's lines, their moves unnumbered. */
export interface LineFacts {
  /** "a [knight] for a [pawn]", "the exchange"; null when it's too much to say. */
  readonly material: (material: Material) => string | null;
  /** The tactic that wins it, after its move: "Qc7+ forks the king and the rook." */
  readonly motif: MotifNamer;
  /** The mate an error lets in, move by move. */
  readonly forcesMate: (side: Color, line: string) => string;
  /** What an error lets `side` win, and the line that wins it: what `side` threatened, maybe. */
  readonly losesMaterial: (side: Color, gain: LineGain, threatened: boolean) => Ways;
  readonly wouldHaveWon: (side: Color, gain: LineGain) => Ways;
  /** What a move wins along its line, the move first. */
  readonly winsAlong: (gain: LineGain) => Ways;
  /** The threat a move stops, and what it would have won. */
  readonly stopsThreat: (threat: string, material: string) => Ways;
  readonly stopsMate: (line: string) => string;
  readonly stopsLongMate: (moves: number, first: string) => string;
  /** A piece that moves out of the threat's way. */
  readonly escapes: (piece: Piece, threat: string) => Ways;
  /** What a move threatens, were the opponent to pass. */
  readonly threatens: (threat: string, material: string) => Ways;
  readonly threatensMate: (threat: string, moves: number) => string;
}

/** What a quiet move does for the position (coach/plan.ts). */
export interface PlanSentences {
  readonly develops: (piece: Piece) => Ways;
  readonly outpost: (piece: Piece) => Ways;
  /** A rook on a file without pawns, or `halfOpen`, the other side's only. */
  readonly openFile: (halfOpen: boolean) => Ways;
  /** A pawn pushed with nothing to stop it: `made` passed by the push. */
  readonly passedPawn: (made: boolean) => Ways;
  readonly centralKing: Ways;
}

export interface FactSentences extends LineFacts, PlanSentences {
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
  readonly morePrecise: (best: string) => Ways;
  readonly betterMove: (best: string) => Ways;
  readonly punishesAtOnce: (side: Color) => Ways;
  readonly offered: (piece: Piece, side: Color) => string;
  readonly keepsAdvantage: Ways;
  readonly holdsPosition: (side: Color) => Ways;
  readonly promotes: (piece: Piece) => string;
  readonly castles: Ways;
  readonly takesBack: (square: string) => Ways;
  readonly winsForFree: (piece: Piece) => Ways;
  readonly winsMaterial: (won: Piece, given: Piece) => Ways;
  readonly checkForces: (side: Color) => Ways;
  readonly littleMorePrecise: (best: string) => Ways;
  readonly forks: (first: Piece, second: Piece) => string;
  readonly missedFork: (best: string, first: Piece, second: Piece) => string;
  readonly allowsFork: (reply: string, first: Piece, second: Piece) => Ways;
  /** The reply an error lets in. */
  readonly canPlay: (side: Color, reply: string) => Ways;
}

export interface ReviewLanguage {
  readonly ui: InterfaceStrings;
  readonly classLabels: Readonly<Record<MoveClass, string>>;
  /** The verdict over the coach's comment; {m} marks the move. */
  readonly classSentences: Readonly<Record<MoveClass, string>>;
  /** The verdict over a best move that mates, which needn't say it's best. */
  readonly mateSentence: string;
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

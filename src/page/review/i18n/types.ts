import type { SafeHtml } from '#shared/html.ts';
import type { ProfileAxis } from '#page/review/judge/profile.ts';
import type { Phase } from '#page/review/rating/phases.ts';
import type { Reason } from '#page/review/coach/idea.ts';
import type { Theme } from '#page/review/coach/said.ts';
import type { MotifKind } from '#page/review/chess/motifs.ts';
import type { Color, Piece, Square } from '#shared/chess/index.ts';
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
  /** The button asking for a hint, then for the one after it. */
  readonly hint: string;
  readonly another: string;
  /** The first hint: which piece has to move, its square unsaid. */
  readonly hintPiece: (piece: Piece) => string;
  /** The second: the square it stands on, marked on the board too. */
  readonly hintSquare: (square: string) => string;
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
  /** The tactic that comes back in the errors, `yours` the reader's, and how often. */
  readonly theme: (name: string, count: number, yours: boolean) => SafeHtml;
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
  /** Its tooltip as on Chess.com, with the settings' Chess.com ratings on: "1850 on Lichess". */
  readonly lichessRating: (rating: string) => string;
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
  | 'defending'
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
  /** A forced mate come on the board for `side`, in `moves` when sure of them. */
  readonly mates: (side: Color, moves: number | null) => Ways;
  /** The error the game turned on, the brief's. */
  readonly turningPoint: Ways;
}

/** A piece lost or won on a square, and the move that takes it. */
interface PieceWon {
  readonly piece: Piece;
  readonly square: string;
  readonly reply: string;
}

/** The reply an error lets in, and what it does. */
export interface AllowedReply {
  readonly side: Color;
  readonly reply: string;
  readonly why: string | null;
  /** The error, named when the sentence doesn't follow it: after the better move. */
  readonly played: string | null;
  /** The capture the reply's line comes to next, when the reply is the means to it. */
  readonly next: string | null;
}

/** What a side wins: the other side's pieces, for its own it gives (trades left out). */
export interface Material {
  readonly won: readonly Piece[];
  readonly lost: readonly Piece[];
  /** The one piece won's square, as a token, when its side had more than one like it. */
  readonly square?: string | null;
}

/** A piece that can't take, pinned to one worth more, and the moves by which taking loses that one. */
export interface PinnedTake {
  readonly pinned: Piece;
  readonly pinner: Piece;
  readonly behind: Piece;
  /** Where each stands. */
  readonly squares: { readonly pinned: string; readonly pinner: string; readonly behind: string };
  /** The pinned piece's capture, then the pinner's, as tokens. */
  readonly take: string;
  readonly punish: string;
}

/** What names a motif: its kind, its move as a token, and the pieces it hits. */
export type MotifNamer = (kind: MotifKind, move: string, pieces: readonly Piece[]) => Ways | null;

/** The ways to say the same thing, of which the coach picks one per move. */
export type Ways = readonly [string, ...string[]];

/** What a line wins: the material, its moves as tokens, and how many of the winner's they are. */
/** A piece, and its square as a token when its side has more than one like it. */
export interface Named {
  readonly piece: Piece;
  readonly square: string | null;
}

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
  readonly forcesMate: (side: Color, line: string) => Ways;
  /** What an error lets `side` win, and the line that wins it: what `side` threatened, maybe. */
  readonly losesMaterial: (side: Color, gain: LineGain, threatened: boolean) => Ways;
  readonly wouldHaveWon: (side: Color, gain: LineGain) => Ways;
  /** What a move wins along its line, the move first. */
  readonly winsAlong: (gain: LineGain) => Ways;
  /** Where the game goes from here, for a move the coach finds nothing else to say about. */
  readonly continues: (line: string) => Ways;
  /** Where a better move would have led, when the coach can't say its point. */
  readonly betterLine: (line: string) => Ways;
  /** The threat a move stops, and what it would have won. */
  readonly stopsThreat: (threat: string, material: string) => Ways;
  /** A mate stopped, and the piece given up to stop it, if one is. */
  readonly stopsMate: (line: string, cost: Piece | null) => Ways;
  readonly stopsLongMate: (moves: number, first: string, cost: Piece | null) => Ways;
  /** A piece that moves out of the threat's way. */
  readonly escapes: (piece: Piece, threat: string) => Ways;
  /** What a move threatens, were the opponent to pass. */
  readonly threatens: (threat: string, material: string) => Ways;
  readonly threatensMate: (threat: string, moves: number) => Ways;
  /** A capture that threatens mate too. */
  readonly takesAndThreatensMate: (piece: Piece, threat: string, moves: number) => Ways;
}

/** What a quiet move does for the position (coach/plan.ts). */
export interface PlanSentences {
  readonly develops: (piece: Piece) => Ways;
  readonly outpost: (piece: Piece) => Ways;
  /** A rook on a file without pawns, or `halfOpen`, the other side's only; `contested` when the other side's rook or queen is there too. */
  readonly openFile: (halfOpen: boolean, contested: boolean) => Ways;
  readonly doublesRooks: Ways;
  /** `mover` lined up with `partner` on a file, `halfOpen` when the other side has pawns there. */
  readonly fileBattery: (mover: Piece, partner: Piece, halfOpen: boolean) => Ways;
  /** `mover` lined up with `partner` on a diagonal aimed at `target`. */
  readonly diagonalBattery: (mover: Piece, partner: Piece, target: Piece) => Ways;
  readonly seventhRank: Ways;
  readonly connectsRooks: Ways;
  /** A pawn pushed with nothing to stop it: `made` passed by the push. */
  readonly passedPawn: (made: boolean) => Ways;
  readonly centralKing: Ways;
  readonly center: Ways;
  readonly fightsCenter: Ways;
  readonly supportsCenter: Ways;
  /** A piece attacked, which has to move. */
  /** A piece attacked, on `square` when its side has more than one like it. */
  readonly chases: (piece: Piece, square: string | null) => Ways;
  /** A pawn attacked that nothing defends. */
  readonly attacksPawn: (pawn: Piece, square: Square) => Ways;
  readonly pins: (piece: Piece, behind: Piece) => Ways;
  /** The piece moved, out of danger. */
  readonly saves: (piece: Piece) => Ways;
  /** A piece in danger, now defended. */
  readonly guards: (piece: Piece, square: string | null) => Ways;
  readonly centralizes: (piece: Piece) => Ways;
  /** A rook behind its passed pawn. */
  readonly behindPasser: Ways;
  /** A square for the king off the back rank. */
  readonly luft: Ways;
  /** A pawn to the fifth rank. */
  readonly space: Ways;
  /** A king's step into the opposition. */
  readonly opposition: Ways;
  /** A passed pawn out of the square of `king`, which can't catch it. */
  readonly outruns: (king: Piece) => Ways;
  /** `king` stepping into a passed pawn's square, just in time. */
  readonly entersSquare: (king: Piece) => Ways;
  /** `slider` lined up behind `screen` on `target`: a discovery for `screen` to make. */
  readonly discovery: (slider: Piece, screen: Piece, target: Piece) => Ways;
  /**
   * What a move did, said after it: "developing your knight", « sortait ton
   * cavalier »; `now` for a move still to come, « sort ton cavalier ».
   */
  readonly why: (reason: Reason, now?: boolean) => string;
}

export interface FactSentences extends LineFacts, PlanSentences {
  readonly checkmate: (king: Color) => Ways;
  readonly matedIn: (best: string, moves: number) => Ways;
  readonly heldOutLonger: (best: string) => Ways;
  readonly canForceMate: (side: Color, reply: string) => Ways;
  /** A mate in one let in. */
  readonly matesNow: (reply: string) => Ways;
  /** A sure mate under way, and its moves after the move: for its side, then for the side mated. */
  readonly mateFollows: (line: string) => Ways;
  readonly mateUnstoppable: (line: string) => Ways;
  readonly wouldForceMate: (best: string, moves: number) => Ways;
  /** A mate in one missed. */
  readonly mateInOne: (best: string) => Ways;
  /** A miss: `side`'s error, and `best`, which punished it, and what it did. */
  readonly missedPunishment: (side: Color, best: string, why: string | null) => Ways;
  /** A miss in the middle of punishing an error from a move before. */
  readonly unfinishedPunishment: (side: Color, best: string) => Ways;
  readonly leftUndefended: (lost: PieceWon) => Ways;
  readonly answersAndWins: (side: Color, lost: PieceWon) => Ways;
  readonly strongerCapture: (best: string, piece: Piece) => Ways;
  /** The better move, and what it did. */
  readonly morePrecise: (best: string, why: string | null) => Ways;
  readonly betterMove: (best: string, why: string | null) => Ways;
  readonly punishesAtOnce: (side: Color) => Ways;
  readonly offered: (piece: Piece, side: Color) => Ways;
  /** A sacrifice that takes `taken` first: `side` can't safely take `piece` back. */
  readonly offeredFor: (piece: Piece, taken: Piece, side: Color) => Ways;
  /** A sacrifice's piece that can't be taken: its only taker is pinned. */
  readonly offeredPinned: (piece: Named, pinned: Named) => Ways;
  /** A piece whose defender can't take back, as it's pinned: said plainly, with no move. */
  readonly pinnedGuard: (lost: Named, pinned: Named) => Ways;
  /** The pin, square by square, and the moves by which taking loses. */
  readonly pinLine: (pin: PinnedTake) => Ways;
  readonly keepsAdvantage: Ways;
  readonly holdsPosition: (side: Color) => Ways;
  readonly promotes: (piece: Piece) => Ways;
  readonly castles: Ways;
  readonly takesBack: (square: string) => Ways;
  /** A piece taken with nothing taken back, on `square` when the side had more than one. */
  readonly winsForFree: (piece: Piece, square: string | null) => Ways;
  /** A piece taken for one worth less, on `square` when the side had more than one. */
  readonly winsMaterial: (won: Piece, given: Piece, square: string | null) => Ways;
  /** A piece taken, on `square` when there were more, whose worth `side` wins back: said plainly. */
  readonly givenBack: (piece: Piece, square: string | null, side: Color) => Ways;
  /** A piece taken, on `square` when there were more, for which `side` gets play: the score shows no gain. */
  readonly compensation: (piece: Piece, square: string | null, side: Color) => Ways;
  readonly checkForces: (side: Color) => Ways;
  readonly littleMorePrecise: (best: string, why: string | null) => Ways;
  /** An even trade, of `taken`; `ahead` for a side ahead in material. */
  readonly trades: (taken: Piece, ahead: boolean) => Ways;
  readonly forks: (first: Piece, second: Piece) => Ways;
  readonly missedFork: (best: string, first: Piece, second: Piece) => Ways;
  readonly allowsFork: (reply: string, first: Piece, second: Piece) => Ways;
  readonly canPlay: (allowed: AllowedReply) => Ways;
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
  readonly openingLine: (name: string) => Ways;
  /** The side the coach calls "you". */
  readonly viewer: Viewer;
  /** The remarks on `mover`'s moves: the reader's own, or another side's. */
  readonly remarks: (mover: Color) => RemarkPools;
  readonly trajectory: TrajectorySentences;
  readonly facts: FactSentences;
}

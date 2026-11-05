import type { Piece, Square } from '#shared/chess/index.ts';
import type { Aim } from '#page/review/coach/fianchetto.ts';
import type { QuietReason, Reason } from '#page/review/coach/idea.ts';
import type { PassedTrait } from '#page/review/coach/passed-pawns.ts';
import type { Ways } from './types.ts';

// The sentences of a quiet move's plans (coach/plan.ts), and of the reasons a
// better move was played for.

/** The sentences of the plans in `QuietReason`, and their reasons. */
export interface QuietPlanSentences {
  /** The king beside the next square of its passed `pawn` on `square`. */
  readonly escorts: (pawn: Piece, square: Square) => Ways;
  /** The king come in front of the other side's passed `pawn` on `square`. */
  readonly stopsPasser: (pawn: Piece, square: Square) => Ways;
  /** The move clears a `line` for `slider`, a piece of its own. */
  readonly opensLine: (slider: Piece, line: 'file' | 'rank' | 'diagonal') => Ways;
  /** A piece under attack that a pawn now backs up, on `square` when it's one of several. */
  readonly backs: (piece: Piece, square: string | null) => Ways;
  /** A pinned piece or pawn of the other side's, on `square`, attacked once more. */
  readonly hitsPinned: (piece: Piece, square: Square) => Ways;
  /** The queens' trade offered by the side ahead, or `declined` by the side behind. */
  readonly queenTrade: (declined: boolean) => Ways;
  /** The other side's `piece` kept off `square`, where it would have pinned (`pin`) or hit `target`. */
  readonly prevents: (piece: Piece, square: Square, target: Piece, pin: boolean) => Ways;
  /** A pawn of the wing's majority pushed, `mine` against `theirs`. */
  readonly majority: (queenside: boolean, mine: number, theirs: number) => Ways;
  /** The rook cuts the other king off along `file`. */
  readonly cutsOff: (file: string) => Ways;
  /** Every move the other side has gives something up. */
  readonly zugzwang: Ways;
  /** A bishop to the long diagonal, over its knight's pawn. */
  readonly fianchetto: (piece: Piece, aim: Aim | null) => Ways;
  /** A pawn's move that frees `square` for the bishop to step back to. */
  readonly makesRetreat: (piece: Piece, square: Square) => Ways;
  readonly blockades: (piece: Piece, pawn: Square) => Ways;
  /** Kings on opposite wings: the pawn on `file` storms the other king's. */
  readonly storm: (file: string) => Ways;
  /** A pawn break on the chain's pawn on `square`, `base` its base. */
  readonly pawnBreak: (square: Square, base: boolean, king: Square | null) => Ways;
}

/** Why a move was played, for the plans in `QuietReason`, as the language's `why` says it. */
export type QuietWhy = (reason: QuietReason, now: boolean) => string;

/** What a quiet move does for the position (coach/plan.ts). */
export interface PlanSentences extends QuietPlanSentences {
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
  readonly rooksOnSeventh: Ways;
  readonly rookLift: Ways;
  readonly philidor: Ways;
  readonly minorityAttack: Ways;
  readonly connectsRooks: Ways;
  /** A pawn pushed with nothing to stop it: `made` passed by the push, `trait` what makes it strong. */
  readonly passedPawn: (made: boolean, trait: PassedTrait | null) => Ways;
  readonly centralKing: Ways;
  readonly center: Ways;
  readonly fightsCenter: Ways;
  readonly supportsCenter: Ways;
  /** A piece attacked, on `square` when its side has more than one like it. */
  readonly chases: (piece: Piece, square: string | null) => Ways;
  /** A minor piece developed with a hit on `target`, on `square` when it's one of two. */
  readonly developsWithTempo: (piece: Piece, target: Piece, square: string | null) => Ways;
  /** A piece attacked with nowhere safe to go. */
  readonly traps: (piece: Piece, square: string | null) => Ways;
  /** A pawn attacked that nothing defends, or that more attack than defend. */
  readonly attacksPawn: (pawn: Piece, square: Square, outnumbered: boolean) => Ways;
  readonly pins: (piece: Piece, behind: Piece) => Ways;
  /** The piece moved, out of danger. */
  readonly saves: (piece: Piece) => Ways;
  /** A piece in danger, now defended. */
  readonly guards: (piece: Piece, square: string | null) => Ways;
  readonly centralizes: (piece: Piece) => Ways;
  /** A rook behind its passed pawn. */
  readonly behindPasser: Ways;
  readonly blocksPasser: Ways;
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

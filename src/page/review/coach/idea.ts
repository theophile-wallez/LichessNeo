import type { Piece, Square } from '#shared/chess/index.ts';
import type { Aim } from './fianchetto.ts';
import type { PassedTrait } from './passed-pawns.ts';

// What a move does, for the coach to say of the move played (coach/plan.ts),
// or of the move that was better, as the reason it was (coach/best-fact.ts).

/** What a quiet move does for the position. */
export type Plan =
  | { readonly kind: 'develops'; readonly piece: Piece }
  /**
   * A bishop developed to the long diagonal, in front of its knight's pawn
   * pushed one square, and what it meets down the diagonal.
   */
  | { readonly kind: 'fianchetto'; readonly piece: Piece; readonly aim: Aim | null }
  /** A pawn's move that frees `square` for a bishop to step back to. */
  | { readonly kind: 'makesRetreat'; readonly piece: Piece; readonly square: Square }
  /** A knight in front of a passed or an isolated pawn of the other side's, on `pawn`. */
  | { readonly kind: 'blockades'; readonly piece: Piece; readonly pawn: Square }
  | { readonly kind: 'outpost'; readonly piece: Piece }
  /**
   * A rook on a file without pawns of its own, `halfOpen` when the other side
   * has some, `contested` when a rook or queen of the other side's faces it
   * there; the queen's only when contested.
   */
  | { readonly kind: 'openFile'; readonly halfOpen: boolean; readonly contested: boolean }
  | { readonly kind: 'doublesRooks' }
  /** A rook or the queen lined up with `partner`, the other, on a file free of their pawns. */
  | {
      readonly kind: 'fileBattery';
      readonly mover: Piece;
      readonly partner: Piece;
      readonly halfOpen: boolean;
    }
  /** A bishop or the queen lined up with `partner`, the other, on a diagonal at `target`. */
  | {
      readonly kind: 'diagonalBattery';
      readonly mover: Piece;
      readonly partner: Piece;
      readonly target: Piece;
    }
  | { readonly kind: 'seventhRank' }
  /** Both rooks on the seventh rank. */
  | { readonly kind: 'rooksOnSeventh' }
  /** A rook up to the third rank, from where it swings over to the castled king. */
  | { readonly kind: 'rookLift' }
  /** Rook and pawn against rook: the rook on its third rank, the king in front of the pawn. */
  | { readonly kind: 'philidor' }
  /** The b-pawn pushed at a queenside where the other side has a pawn more. */
  | { readonly kind: 'minorityAttack' }
  /** Kings castled on opposite wings: a pawn on `file` storms the other king's. */
  | { readonly kind: 'storm'; readonly file: string }
  /** A pawn pushed to hit a chain's pawn on `square`; `base`, the one no pawn holds. */
  /** A pawn hitting a chain on `square`, its `base` or not; `king` the other king, still home, the break opens the center on. */
  | {
      readonly kind: 'pawnBreak';
      readonly square: Square;
      readonly base: boolean;
      readonly king: Square | null;
    }
  | { readonly kind: 'connectsRooks' }
  /** A pawn pushed with nothing to stop it: `made` passed by the push. */
  | { readonly kind: 'passedPawn'; readonly made: boolean; readonly trait: PassedTrait | null }
  | { readonly kind: 'centralKing' }
  | { readonly kind: 'center' }
  /** A c- or f-pawn to its fourth rank, at the center. */
  | { readonly kind: 'fightsCenter' }
  /** A pawn come to defend a central pawn. */
  | { readonly kind: 'supportsCenter' }
  /**
   * A piece of the other side's newly attacked, worth more than the attacker or
   * undefended (`undefended`); `square`, as a token, when its side has more
   * than one like it, and `by`, the attacker's, when the move opened its line:
   * a discovered attack.
   */
  | {
      readonly kind: 'chases';
      readonly piece: Piece;
      readonly square?: string;
      readonly by?: Square;
      readonly undefended?: true;
      /** With nowhere safe to go. */
      readonly trapped?: true;
    }
  /**
   * A pawn of the other side's on `square`, newly attacked, which nothing
   * defends, or too little: `outnumbered`, it's attacked more than it's defended.
   */
  | {
      readonly kind: 'attacksPawn';
      readonly piece: Piece;
      readonly square: Square;
      readonly outnumbered?: true;
    }
  /** A piece of the other side's newly pinned to `behind`, or `kept` pinned by the piece moved. */
  | { readonly kind: 'pins'; readonly piece: Piece; readonly behind: Piece; readonly kept?: true }
  /** The piece moved, attacked where it stood, safe where it goes. */
  | { readonly kind: 'saves'; readonly piece: Piece }
  /** A piece of the mover's, attacked, now defended by the piece moved. */
  /** A piece defended; `square`, as a token, when its side has more than one like it. */
  | { readonly kind: 'guards'; readonly piece: Piece; readonly square?: string }
  /** A knight to one of the four center squares. */
  | { readonly kind: 'centralizes'; readonly piece: Piece }
  /** A rook behind a passed pawn of its own, on its file. */
  | { readonly kind: 'behindPasser' }
  /** A rook in front of the other side's passed pawn, on its file: the pawn is stopped. */
  | { readonly kind: 'blocksPasser' }
  /** A pawn pushed to give the king on the back rank a square off it. */
  | { readonly kind: 'luft' }
  /** A pawn to the fifth rank, before the endgame. */
  | { readonly kind: 'space' }
  /** A passed pawn on `file` pushed out of the square of `king`, which can't catch it: `made` passed by the push. */
  | {
      readonly kind: 'outruns';
      readonly file: number;
      readonly king: Piece;
      readonly made: boolean;
    }
  /** `slider` lined up behind `screen`, of its own, on `target`: a discovery for `screen` to make. */
  | {
      readonly kind: 'discovery';
      readonly slider: Piece;
      readonly screen: Piece;
      readonly target: Piece;
    }
  /** A king's step into the opposition, in an ending of kings and pawns. */
  | { readonly kind: 'opposition' }
  /** The same, from afar: three or five squares between the kings. */
  | { readonly kind: 'distantOpposition' }
  /** The king of king and pawn against king onto a key square: the pawn queens. */
  | { readonly kind: 'keySquare' }
  /** The king into the corner in front of the other side's rook pawn: a draw. */
  | { readonly kind: 'cornerDraw' }
  /** The rook to its fourth rank in the Lucena position, to block the checks. */
  | { readonly kind: 'bridge' }
  /** The rook beside a rook pawn on its sixth rank: the Vancura defense. */
  | { readonly kind: 'vancura' }
  /** `king` stepping into the square of the passed pawn on `file`, just in time. */
  | { readonly kind: 'entersSquare'; readonly file: number; readonly king: Piece }
  /** The king come beside the square ahead of its own passed `pawn`, on `square`. */
  | { readonly kind: 'escorts'; readonly pawn: Piece; readonly square: Square }
  /** The king come in front of the other side's passed `pawn`, on `square`. */
  | { readonly kind: 'stopsPasser'; readonly pawn: Piece; readonly square: Square }
  /** A slider of the mover's, on `from`, whose `line` the move cleared. */
  | {
      readonly kind: 'opensLine';
      readonly slider: Piece;
      readonly from: Square;
      readonly line: 'file' | 'rank' | 'diagonal';
    }
  /** A piece of the mover's, attacked, that a pawn now backs up; `square` as for `guards`. */
  | { readonly kind: 'backs'; readonly piece: Piece; readonly square?: string }
  /** A piece or pawn of the other side's, pinned already, now attacked more than it's defended. */
  | { readonly kind: 'hitsPinned'; readonly piece: Piece; readonly square: Square }
  /** The queen offered for the other one, ahead in material; or, `declined`, taken out of its reach. */
  | { readonly kind: 'queenTrade'; readonly declined: boolean }
  /** In an ending, every move the other side has gives something up. */
  | { readonly kind: 'zugzwang' }
  /** The other side's `piece` kept off `square`, where it would have pinned (`pin`) or hit `target`. */
  | {
      readonly kind: 'prevents';
      readonly piece: Piece;
      readonly square: Square;
      readonly target: Piece;
      readonly pin: boolean;
    }
  /** A pawn of a wing's majority pushed: `mine` pawns there against `theirs`. */
  | {
      readonly kind: 'majority';
      readonly queenside: boolean;
      readonly mine: number;
      readonly theirs: number;
    }
  /** A rook come to the `file` between the other king and a passed pawn of its own. */
  | { readonly kind: 'cutsOff'; readonly file: string };

/** What the better move did: a plan, or a tactic the board shows. */
export type Reason =
  | Plan
  | { readonly kind: 'fork'; readonly first: Piece; readonly second: Piece }
  /** A threat of mate and one on `target` at once: the mate parried, `target` falls. */
  | { readonly kind: 'doubleThreat'; readonly target: Piece }
  | { readonly kind: 'castles' }
  /** Trades that lead to a won pawn ending. */
  | { readonly kind: 'pawnEnding' }
  /** A capture; `square`, as a token, when the side had more than one piece like it. */
  | { readonly kind: 'takes'; readonly piece: Piece; readonly square?: string }
  /** A capture taken back evenly: `piece` traded off, on `square`. */
  | { readonly kind: 'trades'; readonly piece: Piece; readonly square: Square }
  /**
   * A capture on the square the move played took on too, with `piece` instead;
   * `square`, as a token, the taker's, when the move played took with one like it.
   */
  | { readonly kind: 'takesWith'; readonly piece: Piece; readonly square?: string }
  /** A reply that gives check. */
  | { readonly kind: 'checks' }
  /** A reply whose check is another piece's, uncovered as it moves. */
  | { readonly kind: 'discoveredCheck' }
  /** Material won along the engine's line, written out. */
  | { readonly kind: 'wins'; readonly material: string }
  /** A check, or a sacrifice, worth far more than what it takes: the attack on `king`. */
  | { readonly kind: 'attacksKing'; readonly king: Piece }
  /** A rook or the queen on a file free of its pawns, that `partner` can join next move. */
  | { readonly kind: 'preparesBattery'; readonly partner: Piece; readonly halfOpen: boolean }
  /**
   * Two reasons of one move, said together: a piece defended on the way to a
   * tactic, or a battery made ready.
   */
  | { readonly kind: 'both'; readonly first: Reason; readonly second: Reason };

const PLAIN_KINDS = [
  'doublesRooks',
  'seventhRank',
  'rooksOnSeventh',
  'rookLift',
  'philidor',
  'minorityAttack',
  'connectsRooks',
  'centralKing',
  'center',
  'fightsCenter',
  'supportsCenter',
  'castles',
  'behindPasser',
  'blocksPasser',
  'luft',
  'space',
  'opposition',
  'distantOpposition',
  'keySquare',
  'cornerDraw',
  'bridge',
  'vancura',
  'checks',
  'discoveredCheck',
  'pawnEnding',
] as const;

const PLAIN: ReadonlySet<string> = new Set(PLAIN_KINDS);

/** The reasons that need nothing more to be said. */
export type PlainReason = (typeof PLAIN_KINDS)[number];

/** The reasons about the line a piece moved to: an open file, a battery. */
export type LineReason = Extract<
  Reason,
  { readonly kind: 'openFile' | 'fileBattery' | 'diagonalBattery' | 'preparesBattery' }
>;

const LINE: ReadonlySet<string> = new Set([
  'openFile',
  'fileBattery',
  'diagonalBattery',
  'preparesBattery',
]);

export const isLineReason = (reason: Reason): reason is LineReason => LINE.has(reason.kind);

/**
 * The plans said in sentences of their own (`*-quiet-plans.ts`): the king's
 * walk in an ending, a line opened, a piece backed up, a pinned one piled up
 * on, the queens' trade, a square taken from a piece, a majority pushed, a
 * king cut off, a zugzwang, a fianchetto, a bishop's retreat freed.
 */
export type QuietReason = Extract<
  Reason,
  {
    readonly kind:
      | 'escorts'
      | 'stopsPasser'
      | 'opensLine'
      | 'backs'
      | 'hitsPinned'
      | 'queenTrade'
      | 'prevents'
      | 'majority'
      | 'cutsOff'
      | 'zugzwang'
      | 'fianchetto'
      | 'makesRetreat'
      | 'blockades'
      | 'storm'
      | 'pawnBreak';
  }
>;

const QUIET: ReadonlySet<string> = new Set([
  'escorts',
  'stopsPasser',
  'opensLine',
  'backs',
  'hitsPinned',
  'queenTrade',
  'prevents',
  'majority',
  'cutsOff',
  'zugzwang',
  'fianchetto',
  'makesRetreat',
  'blockades',
  'storm',
  'pawnBreak',
]);

export const isQuietReason = (reason: Reason): reason is QuietReason => QUIET.has(reason.kind);

/** The reason, or plan, of a kind that needs nothing more to be said. */
export const isPlain = <T extends Reason>(reason: T): reason is Extract<T, { kind: PlainReason }> =>
  PLAIN.has(reason.kind);

/** The quiet plans said in `*-square-plans.ts`. */
export type SquarePlan =
  | 'prevents'
  | 'majority'
  | 'cutsOff'
  | 'zugzwang'
  | 'fianchetto'
  | 'makesRetreat'
  | 'blockades'
  | 'storm'
  | 'pawnBreak';
export type SquareReason = Extract<QuietReason, { kind: SquarePlan }>;

const SQUARE_PLANS: ReadonlySet<string> = new Set<SquarePlan>([
  'prevents',
  'majority',
  'cutsOff',
  'zugzwang',
  'fianchetto',
  'makesRetreat',
  'blockades',
  'storm',
  'pawnBreak',
]);

export const isSquarePlan = (reason: QuietReason): reason is SquareReason =>
  SQUARE_PLANS.has(reason.kind);

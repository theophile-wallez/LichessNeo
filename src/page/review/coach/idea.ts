import type { Piece, Square } from '#shared/chess/index.ts';

// What a move does, for the coach to say of the move played (coach/plan.ts),
// or of the move that was better, as the reason it was (coach/best-fact.ts).

/** What a quiet move does for the position. */
export type Plan =
  | { readonly kind: 'develops'; readonly piece: Piece }
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
  | { readonly kind: 'connectsRooks' }
  /** A pawn pushed with nothing to stop it: `made` passed by the push. */
  | { readonly kind: 'passedPawn'; readonly made: boolean }
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
    }
  /** A pawn of the other side's on `square`, newly attacked, which nothing defends. */
  | { readonly kind: 'attacksPawn'; readonly piece: Piece; readonly square: Square }
  /** A piece of the other side's newly pinned to `behind`. */
  | { readonly kind: 'pins'; readonly piece: Piece; readonly behind: Piece }
  /** The piece moved, attacked where it stood, safe where it goes. */
  | { readonly kind: 'saves'; readonly piece: Piece }
  /** A piece of the mover's, attacked, now defended by the piece moved. */
  /** A piece defended; `square`, as a token, when its side has more than one like it. */
  | { readonly kind: 'guards'; readonly piece: Piece; readonly square?: string }
  /** A knight to one of the four center squares. */
  | { readonly kind: 'centralizes'; readonly piece: Piece }
  /** A rook behind a passed pawn of its own, on its file. */
  | { readonly kind: 'behindPasser' }
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
  /** `king` stepping into the square of the passed pawn on `file`, just in time. */
  | { readonly kind: 'entersSquare'; readonly file: number; readonly king: Piece };

/** What the better move did: a plan, or a tactic the board shows. */
export type Reason =
  | Plan
  | { readonly kind: 'fork'; readonly first: Piece; readonly second: Piece }
  /** A threat of mate and one on `target` at once: the mate parried, `target` falls. */
  | { readonly kind: 'doubleThreat'; readonly target: Piece }
  | { readonly kind: 'castles' }
  /** A capture; `square`, as a token, when the side had more than one piece like it. */
  | { readonly kind: 'takes'; readonly piece: Piece; readonly square?: string }
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

const PLAIN: ReadonlySet<string> = new Set([
  'doublesRooks',
  'seventhRank',
  'connectsRooks',
  'centralKing',
  'center',
  'fightsCenter',
  'supportsCenter',
  'castles',
  'behindPasser',
  'luft',
  'space',
  'opposition',
  'checks',
  'discoveredCheck',
]);

/** The reasons that need nothing more to be said. */
export type PlainReason =
  | 'doublesRooks'
  | 'seventhRank'
  | 'connectsRooks'
  | 'centralKing'
  | 'center'
  | 'fightsCenter'
  | 'supportsCenter'
  | 'castles'
  | 'behindPasser'
  | 'luft'
  | 'space'
  | 'opposition'
  | 'checks'
  | 'discoveredCheck';

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

/** The reason, or plan, of a kind that needs nothing more to be said. */
export const isPlain = <T extends Reason>(reason: T): reason is Extract<T, { kind: PlainReason }> =>
  PLAIN.has(reason.kind);

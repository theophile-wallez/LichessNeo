import type { Piece } from '#shared/chess/index.ts';

// What a move does, for the coach to say of the move played (coach/plan.ts),
// or of the move that was better, as the reason it was (coach/best-fact.ts).

/** What a quiet move does for the position. */
export type Plan =
  | { readonly kind: 'develops'; readonly piece: Piece }
  | { readonly kind: 'outpost'; readonly piece: Piece }
  /** A rook on a file without pawns of its own, `halfOpen` when the other side has some. */
  | { readonly kind: 'openFile'; readonly halfOpen: boolean }
  | { readonly kind: 'doublesRooks' }
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
  /** A piece of the other side's newly attacked, worth more than the attacker or undefended. */
  | { readonly kind: 'chases'; readonly piece: Piece }
  /** A piece of the other side's newly pinned to `behind`. */
  | { readonly kind: 'pins'; readonly piece: Piece; readonly behind: Piece }
  /** The piece moved, attacked where it stood, safe where it goes. */
  | { readonly kind: 'saves'; readonly piece: Piece }
  /** A piece of the mover's, attacked, now defended by the piece moved. */
  | { readonly kind: 'guards'; readonly piece: Piece }
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
  | { readonly kind: 'takes'; readonly piece: Piece }
  /** A capture on the square the move played took on too, with `piece` instead. */
  | { readonly kind: 'takesWith'; readonly piece: Piece }
  /** A reply that gives check. */
  | { readonly kind: 'checks' }
  /** Material won along the engine's line, written out. */
  | { readonly kind: 'wins'; readonly material: string }
  /** A check, or a sacrifice, worth far more than what it takes: the attack on `king`. */
  | { readonly kind: 'attacksKing'; readonly king: Piece }
  /** Two plans of one move, said together: a piece defended on the way to a tactic. */
  | { readonly kind: 'both'; readonly first: Plan; readonly second: Plan };

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
  | 'checks';

/** The reason, or plan, of a kind that needs nothing more to be said. */
export const isPlain = <T extends Reason>(reason: T): reason is Extract<T, { kind: PlainReason }> =>
  PLAIN.has(reason.kind);

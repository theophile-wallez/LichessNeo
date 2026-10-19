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
  /** A piece of the other side's newly attacked, worth more than the attacker or undefended. */
  | { readonly kind: 'chases'; readonly piece: Piece }
  /** A piece of the other side's newly pinned to `behind`. */
  | { readonly kind: 'pins'; readonly piece: Piece; readonly behind: Piece };

/** What the better move did: a plan, or a tactic the board shows. */
export type Reason =
  | Plan
  | { readonly kind: 'fork'; readonly first: Piece; readonly second: Piece }
  | { readonly kind: 'castles' }
  | { readonly kind: 'takes'; readonly piece: Piece }
  /** Material won along the engine's line, written out. */
  | { readonly kind: 'wins'; readonly material: string };

const PLAIN: ReadonlySet<string> = new Set([
  'doublesRooks',
  'seventhRank',
  'connectsRooks',
  'centralKing',
  'center',
  'castles',
]);

/** The reasons that need nothing more to be said. */
export type PlainReason =
  | 'doublesRooks'
  | 'seventhRank'
  | 'connectsRooks'
  | 'centralKing'
  | 'center'
  | 'castles';

/** The reason, or plan, of a kind that needs nothing more to be said. */
export const isPlain = <T extends Reason>(reason: T): reason is Extract<T, { kind: PlainReason }> =>
  PLAIN.has(reason.kind);

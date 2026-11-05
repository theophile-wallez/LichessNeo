import type { Color, Piece } from '#shared/chess/index.ts';
import type { MatePattern } from '#page/review/coach/mate-pattern.ts';
import type { Ways } from './types.ts';

// The chess ideas the coach names beside the tactics: castling lost, the
// bishop pair, bad and opposite-colored bishops, the pawns' shape, the
// development, a passive rook.

export interface ConceptSentences {
  /** `side`'s king driven out by a check before it castled, along `line`. */
  readonly losesCastling: (side: Color, line: string) => Ways;
  /** A piece that steps between the checker and its king. */
  readonly blocksCheck: (piece: Piece) => Ways;
  /** `side` comes out of a trade with both bishops, the other with one. */
  readonly winsBishopPair: (side: Color) => Ways;
  /** The move hands `side` the bishop pair. */
  readonly givesBishopPair: (side: Color) => Ways;
  /** The mover's bishop traded off, hemmed in by its own pawns. */
  readonly badBishopOff: Ways;
  /** A pawn's move that hems in one of the mover's bishops. */
  readonly makesBadBishop: Ways;
  /** A trade that leaves bishops of opposite colors alone with the pawns: `ahead`, for the mover. */
  readonly oppositeBishops: (ahead: boolean) => Ways;
  /** After `reply`, `side`'s pawns doubled on `file`. */
  readonly doubledPawns: (side: Color, reply: string, file: string) => Ways;
  /** A pawn pushed from in front of its castled king. */
  readonly loosensKing: Ways;
  /** A fianchetto's `pawn` pushed with no bishop left for the long diagonal: `holes` beside it. */
  readonly fianchettoHoles: (pawn: string, holes: readonly [string, string]) => Ways;
  /** `side`'s fianchetto bishop traded off from in front of its king: `holes` left. */
  readonly fianchettoBishopGone: (side: Color, holes: readonly [string, string]) => Ways;
  /** `side`, down material, checks on and on: a draw. */
  readonly perpetual: (side: Color) => Ways;
  /** `side`'s perpetual check goes on: a must when the other side has `mate` in one otherwise. */
  readonly checksOn: (side: Color, mate: string | null) => Ways;
  /** The king steps out of `side`'s perpetual check, which must go on when the mover has `mate` in one. */
  readonly noEscape: (side: Color, mate: string | null) => Ways;
  /** The position stands a third time: a draw by repetition, and `mate`, a mate in one, never comes. */
  readonly repetition: (mate: string | null) => Ways;
  /** A rook given for `piece`, a knight or a bishop, for the play it brings. */
  readonly exchangeSacrifice: (piece: Piece) => Ways;
  /** A piece lost where it stood that takes something before it goes. */
  readonly desperado: (piece: Piece) => Ways;
  /** The move stalemates the other side: `thrown` a win thrown away, else a draw saved. */
  readonly stalemate: (thrown: boolean) => Ways;
  /** The bishop's sacrifice on h7 with check, the Greek gift, that works. */
  readonly greekGift: (square: string) => Ways;
  /** After an error, the Greek gift `reply` plays. */
  readonly letsGreekGift: (reply: string) => Ways;
  /** The name of a mate, said after it: the back-rank mate, the smothered mate. */
  readonly matePattern: (pattern: MatePattern) => Ways;
  /** After an error by a side that was winning, `side` draws by perpetual check, from `reply`. */
  readonly letsPerpetual: (side: Color, reply: string) => Ways;
  /** A pawn's push that leaves `square` a hole: no pawn of the mover's can hit it again. */
  readonly hole: (square: string) => Ways;
  /** The queen out early in the opening, chased by `reply`. */
  readonly earlyQueen: (reply: string) => Ways;
  /** The queen out in the opening, the minor pieces still home. */
  /** A piece traded off by a side behind in material. */
  readonly tradesWhenBehind: Ways;
  /** The king walked up the board with the other queen on, or off its square, `castling` given up. */
  readonly kingWalk: (castling: boolean) => Ways;
  /** The queen gone to take a wing pawn on `square` in the opening. */
  readonly pawnGrab: (square: string) => Ways;
  /** A knight or a bishop moved a second time in the opening, the others still at home. */
  readonly pieceTwice: (piece: Piece) => Ways;
  readonly queenTooEarly: Ways;
  /** A trade into a won pawn ending. */
  readonly wonPawnEnding: Ways;
  /** A trade into a pawn ending that is no longer won: `lost` when it's lost. */
  readonly lostPawnEnding: (lost: boolean) => Ways;
  /** A knight sent to the edge, on `square`. */
  readonly knightOnRim: (square: string) => Ways;
  /** `side`'s pawn on `square` left with no pawn beside it. */
  readonly isolatedPawn: (side: Color, square: string) => Ways;
  /** The mover's pawn on `square` left behind its neighbors, its next square held. */
  readonly backwardPawn: (square: string) => Ways;
  /** `side` behind in development by `pieces`. */
  readonly behindInDevelopment: (side: Color, pieces: number) => Ways;
  /** The rook sent back to guard the pawn on `square`, attacking nothing. */
  readonly passiveRook: (square: string) => Ways;
}

import { START_FEN } from '#shared/chess/fen.ts';
import { sanOf } from '#page/review/chess/notation.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { takeTheory } from '#page/review/theory/book.ts';
import { playedFen, record } from './played.ts';

// Test support for the coach's opening theory: a small study, taken as the
// page's theory, and moves of its openings judged as the review judges them.

export const AFTER_E4 = playedFen(START_FEN, 'e2e4');
export const AFTER_E5 = playedFen(AFTER_E4, 'e7e5');

/**
 * 1. e4, then 1… e5 with four ways on, the Sicilian, and 1… f6?, a mistake
 * that 2. Qh5+ punishes; 1. d4 is in no chapter.
 */
export const THEORY_PGN = `[Event "First moves"]

1. e4 { The king's pawn. [%csl Gd5] } 1... e5 { The open game, [Nf3] first. [%cal Gg1f3] }
( 1... c5 { The Sicilian. } ) ( 1... f6? { It weakens the king: [Qh5+]. } 2. Qh5+ g6 )
2. Nf3 ( 2. Bc4 ) ( 2. Nc3 ) ( 2. f4 ) *`;

/** Takes the study above as the page's theory. */
export const takeTestTheory = (): void => takeTheory('testtheory', THEORY_PGN);

export interface TestMove {
  /** The position before the move. */
  readonly fen: string;
  readonly uci: string;
  readonly ply: number;
  /** A move of the books, as the masters' explorer says. */
  readonly book?: boolean;
  /** The mover's win chance it gave away, out of 100. */
  readonly loss?: number;
}

/** `uci` played from `fen`, judged from the win chances around it. */
export function theoryMove({ fen, uci, ply, book = false, loss = 0 }: TestMove): MoveVerdict {
  const white = ply % 2 === 1;
  const after = white ? 50 - loss : 50 + loss;
  // A move that gives some away wasn't the engine's: a knight's was, in these openings.
  const knight = white ? 'g1f3' : 'g8f6';
  const best = loss > 0 ? knight : uci;
  return judge({
    previousPosition: { ply: ply - 1, fen },
    position: { ply, fen: playedFen(fen, uci), uci, san: sanOf(fen, uci) },
    before: record(50, [best]),
    after: record(after),
    book,
    chess960: false,
  });
}

import type { Color } from '#shared/chess/types.ts';
import type { BlitzCard } from './blitz.ts';
import type { GameDrill } from './games.ts';
import type { Entry } from './repertoire.ts';
import type { Trap } from './traps.ts';

// Practice's rounds: lines one after the other, each a card, as a mode of the
// page plays them. The daily review asks for one move at each position due,
// the challenge for as many as a minute allows, traps for a game's mistake
// punished, the user's games for a habit of theirs replaced by a better move.

interface Cards<T> {
  readonly cards: readonly T[];
  /** The card on the board. */
  index: number;
  /** The cards played, and those played clean: no miss, hint nor answer. */
  played: number;
  clean: number;
  /** All are played, or the time is up. */
  over: boolean;
}

export interface ReviewRound extends Cards<Entry> {
  readonly kind: 'review';
}

export interface BlitzRound extends Cards<BlitzCard> {
  readonly kind: 'blitz';
  readonly endsAt: number;
  /** The score beat the best, once the time is up. */
  record: boolean;
}

export interface TrapRound extends Cards<Trap> {
  readonly kind: 'trap';
  readonly side: Color;
  readonly opening: string;
}

export interface GamesRound extends Cards<GameDrill> {
  readonly kind: 'games';
}

export type Round = ReviewRound | BlitzRound | TrapRound | GamesRound;

export const cardsOf = <T>(cards: readonly T[]): Cards<T> => ({
  cards,
  index: 0,
  played: 0,
  clean: 0,
  over: cards.length === 0,
});

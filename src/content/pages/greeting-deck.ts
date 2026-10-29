import { z } from 'zod/mini';
import { shuffled } from '#shared/shuffle.ts';

// The home hero's greetings, dealt like a deck of cards: each one once, in a
// shuffled order, before any comes back.

export const GreetingDeckSchema = z.object({
  /** The greetings still to deal, in order. */
  left: z.array(z.int()),
  /** The one dealt last, which a new deck doesn't start with. */
  last: z.nullable(z.int()),
});

export type GreetingDeck = z.infer<typeof GreetingDeckSchema>;

function freshDeck(count: number, last: number | null, random: () => number): number[] {
  const deck = shuffled(
    Array.from({ length: count }, (_, index) => index),
    random,
  );
  // Never the same greeting twice in a row, even from one deck to the next.
  return deck[0] === last ? [...deck.slice(1), last] : deck;
}

/** The next of `count` greetings, and the deck left once it's dealt. */
export function dealGreeting(
  count: number,
  deck: GreetingDeck | null,
  random: () => number,
): { index: number; deck: GreetingDeck } {
  const last = deck?.last ?? null;
  // A deck dealt from a longer list may hold greetings gone since.
  const kept = deck?.left.filter(index => index >= 0 && index < count) ?? [];
  const [index = 0, ...left] = kept.length > 0 ? kept : freshDeck(count, last, random);
  return { index, deck: { left, last: index } };
}

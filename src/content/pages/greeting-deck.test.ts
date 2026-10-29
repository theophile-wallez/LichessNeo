import { describe, expect, it } from 'vitest';
import { dealGreeting, type GreetingDeck } from './greeting-deck.ts';

// A random that keeps the order: every item draws 0, and a stable sort keeps them in place.
const inOrder = (): number => 0;

const dealMany = (count: number, deals: number, random: () => number): number[] => {
  let deck: GreetingDeck | null = null;
  return Array.from({ length: deals }, () => {
    const dealt = dealGreeting(count, deck, random);
    deck = dealt.deck;
    return dealt.index;
  });
};

describe('dealGreeting', () => {
  it('deals every greeting once before dealing one again', () => {
    const dealt = dealMany(16, 48, Math.random);
    for (const round of [0, 16, 32]) {
      expect(new Set(dealt.slice(round, round + 16)).size).toBe(16);
    }
  });

  it('never deals the same greeting twice in a row, from one deck to the next', () => {
    expect(dealGreeting(4, { left: [], last: 0 }, inOrder)).toEqual({
      index: 1,
      deck: { left: [2, 3, 0], last: 1 },
    });
  });

  it('deals what the deck has left, in its order', () => {
    expect(dealGreeting(4, { left: [3, 1], last: 0 }, inOrder).index).toBe(3);
  });

  it('drops greetings a shorter list no longer has', () => {
    expect(dealGreeting(4, { left: [9, 2], last: 0 }, inOrder).index).toBe(2);
    expect(dealGreeting(4, { left: [9], last: 0 }, inOrder).index).toBe(1);
  });
});

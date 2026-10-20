import { describe, expect, it } from 'vitest';
import type { CustomSeek } from '#shared/custom-seek.ts';
import {
  CardPicksSchema,
  customOf,
  customSeeks,
  DEFAULT_PICKS,
  isDefault,
  MAX_CLOCKS,
  MAX_PICKS,
  perfOfCard,
  pickKey,
  pickOf,
  playedBy,
  poolOfSeek,
  seekKey,
  seeksOf,
  type CardPick,
  type CustomCard,
} from './picks.ts';

const BLITZ_POOLS: CustomCard = {
  variant: 'standard',
  rated: true,
  clocks: [
    { minutes: 3, increment: 0 },
    { minutes: 3, increment: 2 },
    { minutes: 5, increment: 0 },
    { minutes: 5, increment: 3 },
  ],
};

const ATOMIC: CustomCard = {
  variant: 'atomic',
  rated: false,
  clocks: [
    { minutes: 1, increment: 0 },
    { minutes: 3, increment: 2 },
  ],
};

const standard = (minutes: number, increment: number, rated = true): CustomSeek => ({
  variant: 'standard',
  minutes,
  increment,
  rated,
});

describe("a card of the player's own", () => {
  it('seeks a game per time control, each told apart by its key', () => {
    const seeks = seeksOf(ATOMIC);
    expect(seeks).toEqual([
      { variant: 'atomic', minutes: 1, increment: 0, rated: false },
      { variant: 'atomic', minutes: 3, increment: 2, rated: false },
    ]);
    expect(seeks.map(seekKey)).toEqual(['atomic/1+0/casual', 'atomic/3+2/casual']);
    expect(pickKey({ custom: ATOMIC })).toBe('atomic/1+0/casual,atomic/3+2/casual');
    expect(pickKey({ speed: 'rapid' })).toBe('rapid');
    expect(customSeeks([{ speed: 'blitz' }, { custom: ATOMIC }])).toEqual(seeks);
  });

  it("counts in its variant's rating, or in Standard its first clock's speed", () => {
    expect(perfOfCard(ATOMIC)).toBe('atomic');
    expect(perfOfCard({ ...ATOMIC, variant: 'standard' })).toBe('bullet');
    expect(
      perfOfCard({ ...ATOMIC, variant: 'standard', clocks: [{ minutes: 0.25, increment: 0 }] }),
    ).toBe('ultraBullet');
  });

  it("is played in Lichess's pool when one plays it: Standard, rated, signed in", () => {
    expect(poolOfSeek(standard(1, 0), true)).toBe('1+0');
    expect(poolOfSeek(standard(15, 10), true)).toBe('15+10');
    expect(poolOfSeek(standard(1, 0), false)).toBeNull();
    expect(poolOfSeek(standard(1, 0, false), true)).toBeNull();
    expect(poolOfSeek(standard(4, 0), true)).toBeNull();
    expect(poolOfSeek({ ...standard(3, 2), variant: 'chess960' }, true)).toBeNull();
  });

  it('is already played by a speed card holding its pool, or a card with the same game', () => {
    expect(playedBy(DEFAULT_PICKS, standard(3, 2))).toBe(true);
    expect(playedBy([{ speed: 'bullet' }], standard(3, 2))).toBe(false);
    expect(playedBy(DEFAULT_PICKS, standard(3, 2, false))).toBe(false);
    expect(playedBy(DEFAULT_PICKS, standard(4, 0))).toBe(false);
    const own: CardPick[] = [{ custom: ATOMIC }];
    expect(playedBy(own, { variant: 'atomic', minutes: 3, increment: 2, rated: false })).toBe(true);
    expect(playedBy(own, { variant: 'atomic', minutes: 3, increment: 2, rated: true })).toBe(false);
  });
});

describe('a card edited', () => {
  it("opens as one of the player's own: a speed's plays Standard, rated, in its pools", () => {
    expect(customOf({ speed: 'blitz' })).toEqual(BLITZ_POOLS);
    expect(customOf({ speed: 'bullet' }).clocks).toEqual([
      { minutes: 1, increment: 0 },
      { minutes: 2, increment: 1 },
    ]);
    expect(customOf({ custom: ATOMIC })).toBe(ATOMIC);
  });

  it("comes back as its speed's card while it plays that speed's pools as they are", () => {
    for (const pick of DEFAULT_PICKS) expect(pickOf(customOf(pick))).toEqual(pick);
    const fewer = { ...BLITZ_POOLS, clocks: BLITZ_POOLS.clocks.slice(0, 3) };
    expect(pickOf(fewer)).toEqual({ custom: fewer });
    const casual = { ...BLITZ_POOLS, rated: false };
    expect(pickOf(casual)).toEqual({ custom: casual });
    const reordered = { ...BLITZ_POOLS, clocks: BLITZ_POOLS.clocks.toReversed() };
    expect(pickOf(reordered)).toEqual({ custom: reordered });
  });
});

describe('the cards picked', () => {
  it("are Lichess's own by default, a card per speed in its order", () => {
    expect(DEFAULT_PICKS).toEqual([
      { speed: 'bullet' },
      { speed: 'blitz' },
      { speed: 'rapid' },
      { speed: 'classical' },
    ]);
    expect(isDefault(DEFAULT_PICKS)).toBe(true);
    expect(isDefault(DEFAULT_PICKS.toReversed())).toBe(false);
    expect(isDefault([...DEFAULT_PICKS, { custom: ATOMIC }])).toBe(false);
  });

  it('are read as stored, or as the defaults when they can’t be', () => {
    const stored: CardPick[] = [{ speed: 'rapid' }, { custom: ATOMIC }];
    expect(CardPicksSchema.parse(stored)).toEqual(stored);
    const tooManyClocks = Array.from({ length: MAX_CLOCKS + 1 }, () => ({
      minutes: 3,
      increment: 0,
    }));
    for (const bad of [
      [],
      'blitz',
      [{ speed: 'correspondence' }],
      [{ custom: { ...ATOMIC, clocks: [] } }],
      [{ custom: { ...ATOMIC, clocks: tooManyClocks } }],
      [{ custom: { ...ATOMIC, clocks: [{ minutes: 0, increment: 0 }] } }],
      Array.from({ length: MAX_PICKS + 1 }, () => ({ speed: 'blitz' })),
    ])
      expect(CardPicksSchema.parse(bad)).toEqual(DEFAULT_PICKS);
  });
});

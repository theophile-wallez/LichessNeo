import { describe, expect, it } from 'vitest';
import { cardsOf, lastPools } from './data.ts';

const line = (speed: string, initial?: number, increment?: number): string =>
  JSON.stringify(initial === undefined ? { speed } : { speed, clock: { initial, increment } });

describe('lastPools', () => {
  it("keeps each speed's newest game played in a pool", () => {
    const games = [
      line('blitz', 180, 2),
      line('blitz', 300, 0),
      line('rapid', 420, 0),
      line('rapid', 600, 5),
      line('correspondence'),
      'not json',
      '',
    ].join('\n');
    expect(lastPools(games)).toEqual({ blitz: '3+2', rapid: '10+5' });
  });
});

const user = {
  perfs: {
    blitz: { games: 25, rating: 1584, prov: true },
    rapid: { games: 78, rating: 1673 },
  },
};

describe('cardsOf', () => {
  it('gives every speed a card, its last 30 ratings and its last pool', () => {
    const points = Array.from({ length: 40 }, (_, i): [number, number, number, number] => [
      2026,
      0,
      i + 1,
      1500 + i,
    ]);
    const cards = cardsOf({
      user,
      history: [
        { name: 'blitz', points: [] },
        { name: 'rapid', points },
      ],
      last: { rapid: '10+0' },
    });
    expect(cards.map(card => card.speed)).toEqual(['bullet', 'blitz', 'rapid', 'classical']);
    expect(cards[0]).toEqual({
      speed: 'bullet',
      games: 0,
      rating: 1500,
      provisional: false,
      history: [],
    });
    // No point written yet: from where every rating starts to the current one.
    expect(cards[1]).toMatchObject({
      games: 25,
      rating: 1584,
      provisional: true,
      history: [1500, 1584],
    });
    // A point a day, the last ones, then the current rating.
    expect(cards[2]?.history).toHaveLength(30);
    expect(cards[2]?.history.at(0)).toBe(1511);
    expect(cards[2]?.history.at(-2)).toBe(1539);
    expect(cards[2]?.history.at(-1)).toBe(1673);
    expect(cards[2]?.last).toBe('10+0');
  });

  it('reads the series by name whatever its case', () => {
    const [, blitz] = cardsOf({
      user,
      history: [
        {
          name: 'Blitz',
          points: [
            [2026, 0, 1, 1520],
            [2026, 0, 2, 1584],
          ],
        },
      ],
      last: {},
    });
    expect(blitz?.history).toEqual([1520, 1584]);
  });

  it('draws a first day from where every rating starts', () => {
    const [, blitz] = cardsOf({
      user,
      history: [{ name: 'blitz', points: [[2026, 9, 9, 1584]] }],
      last: {},
    });
    expect(blitz?.history).toEqual([1500, 1584]);
  });
});

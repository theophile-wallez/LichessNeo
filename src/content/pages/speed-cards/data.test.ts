import { describe, expect, it } from 'vitest';
import { SEEK_PERFS } from '#shared/custom-seek.ts';
import { cardsOf, lastPools, newestPool } from './data.ts';

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

describe('newestPool', () => {
  it('is the pool of the newest game played in one, whatever its speed', () => {
    const games = [
      line('correspondence'),
      line('blitz', 240, 0),
      line('rapid', 600, 0),
      line('blitz', 180, 2),
    ];
    expect(newestPool(games.join('\n'))).toBe('10+0');
    expect(newestPool(line('correspondence'))).toBeUndefined();
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
    expect(cards.map(card => card.perf)).toEqual([...SEEK_PERFS]);
    const [bullet, blitz, rapid] = cards.slice(1);
    expect(bullet).toEqual({
      perf: 'bullet',
      games: 0,
      rating: 1500,
      provisional: false,
      history: [],
    });
    // No point written yet: from where every rating starts to the current one.
    expect(blitz).toMatchObject({
      games: 25,
      rating: 1584,
      provisional: true,
      history: [1500, 1584],
    });
    // A point a day, the last ones, then the current rating.
    expect(rapid?.history).toHaveLength(30);
    expect(rapid?.history.at(0)).toBe(1511);
    expect(rapid?.history.at(-2)).toBe(1539);
    expect(rapid?.history.at(-1)).toBe(1673);
    expect(rapid?.last).toBe('10+0');
  });

  it('reads the series by name whatever its case', () => {
    const [, , blitz] = cardsOf({
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
    const [, , blitz] = cardsOf({
      user,
      history: [{ name: 'blitz', points: [[2026, 9, 9, 1584]] }],
      last: {},
    });
    expect(blitz?.history).toEqual([1500, 1584]);
  });
});

describe("a variant's card", () => {
  it('reads its rating and its series by key, and has no pool', () => {
    const cards = cardsOf({
      user: { perfs: { kingOfTheHill: { games: 4, rating: 1720, prov: true } } },
      history: [{ name: 'kingOfTheHill', points: [[2026, 9, 9, 1700]] }],
      last: { blitz: '3+2' },
    });
    const hill = cards.find(card => card.perf === 'kingOfTheHill');
    expect(hill).toEqual({
      perf: 'kingOfTheHill',
      games: 4,
      rating: 1720,
      provisional: true,
      history: [1700, 1720],
    });
    expect(cards.find(card => card.perf === 'blitz')?.last).toBe('3+2');
  });
});

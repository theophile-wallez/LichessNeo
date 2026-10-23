import { describe, expect, it } from 'vitest';
import { explorerBook } from '#page/review/fixtures/practice.ts';
import { bookPosition, pickReply, rateMove, replies, sameMove, shareOf } from './book.ts';

// 1. e4's replies in the masters' games: 1000 games, the Sicilian in half.
const AFTER_E4 = explorerBook([
  ['e5', 'e7e5', 305],
  ['c5', 'c7c5', 500, 'Sicilian Defense'],
  ['e6', 'e7e6', 150],
  ['g6', 'g7g6', 40],
  ['a6', 'a7a6', 5],
]);

describe('bookPosition', () => {
  it('sorts the moves by their games, leaving out those no game played', () => {
    const book = bookPosition({
      white: 9,
      draws: 9,
      black: 9,
      opening: { eco: 'B00', name: "King's Pawn Game" },
      moves: [
        { uci: 'e7e5', san: 'e5', white: 2, draws: 2, black: 0 },
        { uci: 'c7c5', san: 'c5', white: 1, draws: 2, black: 3, opening: null },
        { uci: 'h7h5', san: 'h5', white: 0, draws: 0, black: 0 },
      ],
    });
    expect(book.moves.map(move => move.san)).toEqual(['c5', 'e5']);
    // The position's own games are left aside: its moves' add up to one.
    expect(book.games).toBe(10);
    expect(book.opening).toBe("King's Pawn Game");
    expect(book.moves[0]?.score).toEqual({ white: 2 / 6, black: 4 / 6 });
    expect(book.moves[1]?.score).toEqual({ white: 3 / 4, black: 1 / 4 });
    expect(book.moves[0]?.opening).toBe('');
  });
});

describe('rateMove', () => {
  it('rates a move by its share of the games', () => {
    expect(rateMove(AFTER_E4, 'c5')).toMatchObject({ kind: 'main', share: 0.5, main: null });
    const popular = rateMove(AFTER_E4, 'e6');
    expect(popular).toMatchObject({ kind: 'popular', share: 0.15, total: 1000 });
    expect(popular.main?.san).toBe('c5');
    expect(rateMove(AFTER_E4, 'g6').kind).toBe('sideline');
    expect(rateMove(AFTER_E4, 'a6').kind).toBe('rare');
  });

  it('rates a move no game played as out of the book', () => {
    const out = rateMove(AFTER_E4, 'h5');
    expect(out).toMatchObject({ kind: 'out', move: null, share: 0, total: 1000 });
    expect(out.main?.san).toBe('c5');
  });

  it('matches a move whether or not it notes its check', () => {
    const book = explorerBook([['Bb5+', 'f1b5', 10]]);
    expect(rateMove(book, 'Bb5').kind).toBe('main');
    expect(sameMove('Qxf7#', 'Qxf7')).toBe(true);
    expect(sameMove('Qxf7', 'Qxf6')).toBe(false);
  });

  it('has no share in a position no game reached', () => {
    const empty = explorerBook([]);
    expect(rateMove(empty, 'e4')).toMatchObject({ kind: 'out', main: null, total: 0 });
    expect(
      shareOf(empty, {
        uci: 'e2e4',
        san: 'e4',
        games: 3,
        score: { white: 0, black: 0 },
        opening: '',
      }),
    ).toBe(0);
  });
});

describe('replies', () => {
  it('plays every move but the rarest, or the main lines alone', () => {
    expect(replies(AFTER_E4, 'masters').map(move => move.san)).toEqual(['c5', 'e5', 'e6', 'g6']);
    expect(replies(AFTER_E4, 'masters', 'main').map(move => move.san)).toEqual(['c5', 'e5', 'e6']);
  });

  it('keeps the most played as the main line when none is popular', () => {
    const spread = explorerBook(
      Array.from({ length: 10 }, (_, i) => [`m${i}`, `a${i}`, 10] as const),
    );
    expect(replies(spread, 'lichess', 'main').map(move => move.san)).toEqual(['m0']);
  });

  it('ends where too few games go on, by whose games they are', () => {
    const few = explorerBook([['e5', 'e7e5', 4]]);
    expect(replies(few, 'masters')).toEqual([]);
    expect(replies(few, 'player').map(move => move.san)).toEqual(['e5']);
    expect(replies(few, 'own')).toHaveLength(1);
    expect(replies(explorerBook([['e5', 'e7e5', 19]]), 'lichess')).toEqual([]);
    expect(replies(explorerBook([['e5', 'e7e5', 20]]), 'lichess')).toHaveLength(1);
  });
});

const metC5 = (move: { san: string }): boolean => move.san === 'c5';

describe('pickReply', () => {
  const moves = replies(AFTER_E4, 'masters');

  it('picks each reply as often as the games play it', () => {
    expect(pickReply(moves, 0)?.san).toBe('c5');
    expect(pickReply(moves, 0.49)?.san).toBe('c5');
    expect(pickReply(moves, 0.51)?.san).toBe('e5');
    expect(pickReply(moves, 0.85)?.san).toBe('e6');
    expect(pickReply(moves, 0.999)?.san).toBe('g6');
    expect(pickReply(moves, 1)?.san).toBe('g6');
  });

  it('picks a reply not met yet first, any once all are', () => {
    expect(pickReply(moves, 0, metC5)?.san).toBe('e5');
    expect(pickReply(moves, 0, () => true)?.san).toBe('c5');
    expect(pickReply([], 0.5)).toBeNull();
  });
});

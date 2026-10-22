import { describe, expect, it } from 'vitest';
import { chesscomRating, chesscomRatingChange } from './convert.ts';
import { lichessRatingIn, lichessRatingOf, restoreRating, swapChange, swapRating } from './swap.ts';

const tip = (rating: string): string => `${rating} on Lichess`;

function element(markup: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = markup;
  const first = holder.firstElementChild;
  if (!(first instanceof HTMLElement)) throw new Error('no element');
  return first;
}

const blitz = (rating: number): string => String(chesscomRating('blitz', rating)?.rating);

describe('a rating swapped for its Chess.com equivalent', () => {
  it('changes only the digits of its own text, keeping its nodes', () => {
    // A game row's player: the name's digits are the link's, the change is its own tag.
    const player = element(
      '<div class="player"><a class="user-link">alex1999</a><br>1500? <good>+8</good></div>',
    );
    const text = player.childNodes[2];
    swapRating(player, 'blitz', tip);
    expect(player.textContent).toBe(`alex1999${blitz(1500)}? +8`);
    expect(player.childNodes[2]).toBe(text);
    expect(player.dataset).toMatchObject({
      lnExtLichessRating: '1500',
      lnExtTip: '1500 on Lichess',
    });
    expect(lichessRatingOf(player)).toBe('1500');
  });

  it('is done once, and again once Lichess writes another rating', () => {
    const rating = element('<span class="rating"> (1500)</span>');
    swapRating(rating, 'blitz', tip);
    swapRating(rating, 'blitz', tip);
    expect(rating.textContent).toBe(` (${blitz(1500)})`);
    rating.textContent = '1620';
    swapRating(rating, 'blitz', tip);
    expect(rating.textContent).toBe(blitz(1620));
    expect(rating.dataset.lnExtLichessRating).toBe('1620');
  });

  it('keeps a rating Chess.com has no pool for', () => {
    const rating = element('<rating>1500</rating>');
    swapRating(rating, null, tip);
    swapRating(rating, 'ultraBullet', tip);
    expect(rating.textContent).toBe('1500');
    expect(rating.dataset.lnExtTip).toBeUndefined();
  });

  it('puts Lichess’s title after its tooltip, and gives everything back', () => {
    const rating = element(
      '<span data-icon="\ue008" title="Blitz rating over 812 games">2102</span>',
    );
    swapRating(rating, 'blitz', tip);
    expect(rating.title).toBe('');
    expect(rating.dataset.lnExtTip).toBe('2102 on Lichess · Blitz rating over 812 games');
    restoreRating(rating);
    expect(rating.textContent).toBe('2102');
    expect(rating.title).toBe('Blitz rating over 812 games');
    expect(Object.keys(rating.dataset)).toEqual(['icon']);
  });

  it('reads a stats page’s decimals as the rating', () => {
    const strong = element('<strong>1500.42</strong>');
    swapRating(strong, 'blitz', tip);
    expect(strong.textContent).toBe(String(chesscomRating('blitz', 1500.42)?.rating));
    restoreRating(strong);
    expect(strong.textContent).toBe('1500.42');
  });
});

// What a blitz change is worth on Chess.com, between these two Lichess ratings.
const blitzChange = (before: number, after: number): string =>
  String(Math.abs(chesscomRatingChange('blitz', { before, after }) ?? 0));

describe('a rating change swapped for its Chess.com equivalent', () => {
  it('spans the rating it was played at and the one it led to, its sign kept', () => {
    const won = element('<good>+28</good>');
    swapChange(won, 'blitz', { rating: 1640, shows: 'before' }, tip);
    expect(won.textContent).toBe(`+${blitzChange(1640, 1668)}`);
    expect(won.dataset.lnExtTip).toBe('+28 on Lichess');
    // Lichess writes a minus sign, not a hyphen.
    const lost = element('<bad>−7</bad>');
    swapChange(lost, 'blitz', { rating: 1724, shows: 'before' }, tip);
    expect(lost.textContent).toBe(`−${blitzChange(1724, 1717)}`);
    expect(lost.dataset.lnExtTip).toBe('−7 on Lichess');
  });

  it('takes its sign from its tag where its text has none, and its span back from today’s rating', () => {
    // A profile's progress: the sign is drawn in CSS, the rating is where it stands now.
    const progress = element('<bad class="rp">7</bad>');
    swapChange(progress, 'blitz', { rating: 2334, shows: 'after' }, tip);
    expect(progress.textContent).toBe(blitzChange(2341, 2334));
    expect(progress.dataset.lnExtTip).toBe('−7 on Lichess');
  });

  it('is done once, keeps a speed Chess.com has no pool for, and gives everything back', () => {
    const change = element('<good>+8</good>');
    swapChange(change, 'blitz', { rating: 1500, shows: 'before' }, tip);
    swapChange(change, 'blitz', { rating: 1500, shows: 'before' }, tip);
    expect(change.textContent).toBe(`+${blitzChange(1500, 1508)}`);
    restoreRating(change);
    expect(change.textContent).toBe('+8');
    expect(Object.keys(change.dataset)).toEqual([]);
    swapChange(change, 'ultraBullet', { rating: 1500, shows: 'before' }, tip);
    expect(change.textContent).toBe('+8');
  });

  it('leaves alone what has no sign: “±0”, or a count beside the rating', () => {
    const even = element('<span>±0</span>');
    const count = element('<span>12 games</span>');
    swapChange(even, 'blitz', { rating: 1500, shows: 'before' }, tip);
    swapChange(count, 'blitz', { rating: 1500, shows: 'before' }, tip);
    expect([even.textContent, count.textContent]).toEqual(['±0', '12 games']);
  });
});

describe('the Lichess rating a change is read from', () => {
  it('is its own text, swapped or not, and not a name’s digits', () => {
    const player = element('<div><a>alex1999</a><br>1500 <good>+8</good></div>');
    expect(lichessRatingIn(player)).toBe(1500);
    swapRating(player, 'blitz', tip);
    expect(lichessRatingIn(player)).toBe(1500);
    expect(lichessRatingIn(element('<span>?</span>'))).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { chesscomRating } from './convert.ts';
import { lichessRatingOf, restoreRating, swapRating } from './swap.ts';

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

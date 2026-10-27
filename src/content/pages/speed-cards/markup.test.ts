import { afterEach, describe, expect, it } from 'vitest';
import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import { queryAll } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import type { Card } from './data.ts';
import { cardsMarkup } from './markup.ts';
import { speedTexts } from './texts.ts';

const CARDS: Card[] = [
  { perf: 'blitz', games: 25, rating: 1584, provisional: false, history: [] },
  { perf: 'bullet', games: 0, rating: 1500, provisional: true, history: [] },
];

function ratings(lichessTip: ((rating: string) => string) | null): (string | undefined)[][] {
  const root = document.createElement('div');
  const picks = [{ speed: 'blitz' }, { speed: 'bullet' }] as const;
  setHtml(
    root,
    cardsMarkup({ picks, cards: CARDS, texts: speedTexts('en'), user: 'eresy', lichessTip }),
  );
  return queryAll(root, '.ln-ext-speed__rating', HTMLElement).map(rating => [
    rating.textContent.trim(),
    rating.dataset.lnExtTip,
  ]);
}

afterEach(() => {
  document.body.className = '';
});

describe('the speed cards’ ratings', () => {
  it('are Lichess’s, or as on Chess.com with the Lichess one in their tooltip', () => {
    expect(ratings(null)).toEqual([
      ['1,584', undefined],
      ['–', undefined],
    ]);
    const equivalent = chesscomRating('blitz', 1584)?.rating ?? 0;
    expect(ratings(rating => `${rating} on Lichess`)).toEqual([
      [equivalent.toLocaleString('en'), '1,584 on Lichess'],
      // No games yet: no rating to give.
      ['–', undefined],
    ]);
  });

  it('are left out, curve and all, with Lichess’s "Show player ratings" off', () => {
    document.body.className = 'no-rating';
    expect(ratings(null)).toEqual([]);
  });
});

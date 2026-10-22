import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Card } from '#content/pages/speed-cards/data.ts';
import { cardsMarkup } from '#content/pages/speed-cards/markup.ts';
import { speedTexts } from '#content/pages/speed-cards/texts.ts';
import { queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';

const CARDS: Card[] = [{ perf: 'blitz', games: 25, rating: 1584, provisional: false, history: [] }];

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

function ratingBox(): CSSStyleDeclaration {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'speed-cards.css'), 'utf8');
  document.head.replaceChildren(style);
  setHtml(
    document.body,
    cardsMarkup({
      picks: [{ speed: 'blitz' }],
      cards: CARDS,
      texts: speedTexts('en'),
      user: 'eresy',
      lichessTip: rating => `${rating} on Lichess`,
    }),
  );
  const rating = queryOne(document, '.ln-ext-speed__rating', HTMLElement);
  if (!rating) throw new Error('no rating');
  return getComputedStyle(rating);
}

describe('a speed card’s rating', () => {
  // Its tooltip is centered on its box (content/ui/tooltip.ts): stretched down the card's
  // column, that put the Lichess rating in the card's middle instead of over the digits.
  it('keeps its box to its digits, for its tooltip', () => {
    expect(ratingBox().width).toBe('fit-content');
  });
});

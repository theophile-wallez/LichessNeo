import { describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml, type SafeHtml } from '#shared/html.ts';
import { actionsMarkup, cardClasses, cardMarkup, CHIP_COUNT } from './card.ts';
import { gameOverTexts } from './texts.ts';

const texts = gameOverTexts();

function render(markup: SafeHtml): HTMLElement {
  const root = document.createElement('div');
  setHtml(root, markup);
  return root;
}

describe('cardMarkup', () => {
  it('heads the card with the result and how it came', () => {
    const root = render(
      cardMarkup({
        quote: null,
        outcome: { result: 'win', reason: 'mate', winner: 'white' },
        texts,
        coachId: 3,
        opponent: '<i>bob</i>',
      }),
    );
    expect(root.querySelector('.cdc-end__card--win .cdc-end__title')?.textContent).toBe(
      'You beat <i>bob</i>!',
    );
    expect(root.querySelectorAll('.cdc-end__counts > .cdc-end__count')).toHaveLength(CHIP_COUNT);
    expect(root.querySelector('.cdc-end__reason')?.textContent).toBe('by checkmate');
    // Only the words and the close button: no tile beside them.
    const head = [...(root.querySelector('.cdc-end__head')?.children ?? [])];
    expect(head.map(child => child.className)).toEqual(['cdc-end__titles', 'cdc-end__close']);
    const avatar = queryOne(root, '.cdc-coach__avatar', HTMLElement);
    expect(avatar?.dataset.cdcCoachId).toBe('3');
    expect(avatar?.querySelector('.cdc-coach__face')).not.toBeNull();
  });

  it('leaves the reason out when the status doesn’t say', () => {
    const root = render(
      cardMarkup({
        quote: null,
        outcome: { result: 'draw', reason: 'draw', winner: null },
        texts,
        coachId: 1,
        opponent: 'bob',
      }),
    );
    expect(root.querySelector('.cdc-end__title')?.textContent).toBe('Draw');
    expect(root.querySelector('.cdc-end__reason')).toBeNull();
  });
});

describe('cardClasses', () => {
  it('counts the best and excellent moves, then the worst error made', () => {
    expect(cardClasses({ best: 26, excellent: 12, miss: 1, inaccuracy: 3 })).toEqual([
      'best',
      'excellent',
      'miss',
    ]);
    expect(cardClasses({ mistake: 1, blunder: 2 })).toEqual(['best', 'excellent', 'blunder']);
  });

  it('shows the finest moves of a game without errors', () => {
    expect(cardClasses({ best: 4, great: 1 })).toEqual(['best', 'excellent', 'great']);
    expect(cardClasses({})).toEqual(['best', 'excellent', 'good']);
  });
});

describe('actionsMarkup', () => {
  it('leads to the review, then offers Lichess’s buttons it found', () => {
    const root = render(
      actionsMarkup(
        { reviewHref: '/abcd1234/white#12', newGame: 'New 5 | 3', rematch: null },
        texts,
      ),
    );
    expect(root.querySelector('a.cdc-end__review')?.getAttribute('href')).toBe(
      '/abcd1234/white#12',
    );
    expect(
      queryAll(root, '.cdc-end__btn', HTMLElement).map(button => button.dataset.cdcEnd),
    ).toEqual(['new-game']);
    const bare = render(actionsMarkup({ reviewHref: '/x', newGame: null, rematch: null }, texts));
    expect(bare.querySelector('.cdc-end__more')).toBeNull();
  });
});

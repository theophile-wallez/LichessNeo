import { describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { setHtml, type SafeHtml } from '#shared/html.ts';
import { cardClasses, cardMarkup, CHIP_COUNT, endCardInput } from './card.ts';
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
      cardMarkup(
        endCardInput({
          outcome: { result: 'win', reason: 'mate', winner: 'white' },
          texts,
          coachId: 3,
          opponent: '<i>bob</i>',
        }),
      ),
    );
    expect(root.querySelector('.lr-ext-end__card--win .lr-ext-end__title')?.textContent).toBe(
      'You beat <i>bob</i>!',
    );
    expect(root.querySelectorAll('.lr-ext-end__counts > .lr-ext-end__count')).toHaveLength(
      CHIP_COUNT,
    );
    expect(root.querySelector('.lr-ext-end__reason')?.textContent).toBe('by checkmate');
    const avatar = queryOne(root, '.lr-ext-coach__avatar', HTMLElement);
    expect(avatar?.dataset.lrExtCoachId).toBe('3');
    expect(avatar?.querySelector('.lr-ext-coach__face')).not.toBeNull();
  });

  it('leaves the reason out when the status doesn’t say', () => {
    const root = render(
      cardMarkup(
        endCardInput({
          outcome: { result: 'draw', reason: 'draw', winner: null },
          texts,
          coachId: 1,
          opponent: 'bob',
        }),
      ),
    );
    expect(root.querySelector('.lr-ext-end__title')?.textContent).toBe('Draw');
    expect(root.querySelector('.lr-ext-end__reason')).toBeNull();
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

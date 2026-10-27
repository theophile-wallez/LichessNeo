import { describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { setHtml, type SafeHtml } from '#shared/html.ts';
import { cardClasses, cardMarkup, CHIP_COUNT, endCardInput, lastCardClass } from './card.ts';
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
    expect(root.querySelector('.ln-ext-end__card--win .ln-ext-end__title')?.textContent).toBe(
      'You beat <i>bob</i>!',
    );
    expect(root.querySelectorAll('.ln-ext-end__counts > .ln-ext-end__count')).toHaveLength(
      CHIP_COUNT,
    );
    expect(root.querySelector('.ln-ext-end__reason')?.textContent).toBe('Victory · by checkmate');
    const avatar = queryOne(root, '.ln-ext-coach__avatar', HTMLElement);
    expect(avatar?.dataset.lnExtCoachId).toBe('3');
    expect(avatar?.querySelector('.ln-ext-coach__face')).not.toBeNull();
  });

  it('names the result alone when the status doesn’t say how it came', () => {
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
    expect(root.querySelector('.ln-ext-end__title')?.textContent).toBe('Draw');
    expect(root.querySelector('.ln-ext-end__reason')?.textContent).toBe('Draw');
  });

  // The stylesheet draws a blank in its place while it's empty (game-end-stats.css).
  it('leaves the accuracy empty until its figure comes', () => {
    const root = render(
      cardMarkup(
        endCardInput({
          outcome: { result: 'win', reason: 'resign', winner: 'white' },
          texts,
          coachId: 1,
          opponent: 'bob',
        }),
      ),
    );
    expect(root.querySelector('.ln-ext-end__accuracy b')?.textContent).toBe('');
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

describe('lastCardClass', () => {
  it('is the class the card ends on, which its folded strip counts', () => {
    expect(lastCardClass({ best: 9, inaccuracy: 2, mistake: 1 })).toBe('mistake');
    expect(lastCardClass({ great: 2, inaccuracy: 1 })).toBe('inaccuracy');
    expect(lastCardClass({ brilliant: 1 })).toBe('brilliant');
    expect(lastCardClass({ best: 3 })).toBe('good');
  });
});

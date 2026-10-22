import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { en } from '#page/review/i18n/en.ts';
import { momentsMarkup, showMoment } from './moments.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

/** The opera game's key moments, drawn in a panel. */
function momentsPanel(): HTMLElement {
  const { session } = judgedGame('opera');
  const review = session.view.review;
  if (!review) throw new Error('no review');
  const panel = document.createElement('div');
  setHtml(panel, momentsMarkup(review, en));
  return panel;
}

/** The plies of the cards marked as the move on the board. */
const marked = (panel: HTMLElement): (string | undefined)[] =>
  queryAll(panel, '.ln-ext-moment--on', HTMLElement).map(card => card.dataset.lnExtPly);

describe('the key moments', () => {
  // The strip's height is its row's room (styles/review/coach.css): drawn only once a card
  // turned up, the coach's card under it slid down as the analysis found the first one.
  it('keep their strip while the analysis has found none', () => {
    const panel = document.createElement('div');
    setHtml(panel, momentsMarkup(null, en));
    expect(panel.querySelectorAll('.ln-ext-moments')).toHaveLength(1);
    expect(panel.querySelectorAll('.ln-ext-moment')).toHaveLength(0);
  });

  it('draw the same cards whatever the move, none marked', () => {
    const panel = momentsPanel();
    expect(panel.querySelectorAll('.ln-ext-moment').length).toBeGreaterThan(1);
    expect(marked(panel)).toEqual([]);
  });

  it('mark the card of the move on the board, and only it', () => {
    const panel = momentsPanel();
    showMoment(panel, 25, 0);
    expect(marked(panel)).toEqual(['25']);
    showMoment(panel, 26, 0);
    expect(marked(panel)).toEqual(['26']);
    // A move without a card leaves none marked.
    showMoment(panel, 13, 0);
    expect(marked(panel)).toEqual([]);
  });
});

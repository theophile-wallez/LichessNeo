import { afterEach, describe, expect, it } from 'vitest';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { renderOpening } from './opening.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
  document.documentElement.className = '';
});

describe('the opening over the move list', () => {
  it('names the game’s opening and its code in the move-by-move review', () => {
    document.body.innerHTML = '<main class="analyse"><div class="analyse__tools"></div></main>';
    const { session, facade } = judgedGame('opera');
    session.view.mode = 'moves';
    session.view.openingEco = 'B90';
    renderOpening(session, facade);
    const { opening } = session.elements;
    expect(opening.parentElement?.className).toBe('analyse__tools');
    expect(opening.querySelector('.ln-ext-opening__eco')?.textContent).toBe('B90');
    expect(opening.title).toBe('Sicilian Defense: Najdorf Variation');
    expect(document.documentElement.classList.contains('ln-ext-opening-on')).toBe(true);
  });

  it('shows nothing for a game its export names no opening for', () => {
    document.body.innerHTML = '<main class="analyse"><div class="analyse__tools"></div></main>';
    const { session, facade } = judgedGame('opera');
    session.view.mode = 'moves';
    session.view.openingName = '';
    renderOpening(session, facade);
    expect(session.elements.opening.childElementCount).toBe(0);
    expect(document.documentElement.classList.contains('ln-ext-opening-on')).toBe(false);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { boardTools, syncBoardTools } from './board-tools.ts';
// The tools as the original added them.
import legacy from './fixtures/legacy-board-tools.json' with { type: 'json' };

const ROUND = legacy.html;

const button = (name: string): HTMLButtonElement | null =>
  queryOne(document, `.ln-ext-board-tools__btn--${name}`, HTMLButtonElement);

// The tools the original added, before the Zen button.
const originalTools = (root: Element | null | undefined): string | undefined => {
  const copy = root?.cloneNode(true);
  if (!(copy instanceof Element)) return undefined;
  copy.querySelector('.ln-ext-board-tools__btn--zen')?.remove();
  return copy.outerHTML;
};

afterEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
  delete document.documentElement.dataset.lnExtFlipLabel;
  vi.unstubAllGlobals();
});

describe('board tools', () => {
  it('adds a cog and a flip button to the game page, as the original did', () => {
    document.body.innerHTML = ROUND;
    document.documentElement.dataset.lnExtFlipLabel = legacy.flipLabel;
    syncBoardTools();
    syncBoardTools();
    expect(originalTools(document.querySelector('.ln-ext-board-tools'))).toBe(legacy.tools);
    document.querySelector('.board-menu-toggle-btn')?.classList.add('active');
    syncBoardTools();
    expect(originalTools(document.querySelector('main')?.lastElementChild)).toBe(legacy.active);
  });

  it('takes the menu’s label from its tooltip once the title has moved there', () => {
    document.body.innerHTML = ROUND.replace('title="Board menu"', 'data-ln-ext-tip="Menu"');
    syncBoardTools();
    expect(button('menu')?.getAttribute('aria-label')).toBe('Menu');
  });

  it('presses Lichess’s keys', () => {
    document.body.innerHTML = ROUND;
    syncBoardTools();
    const keys: string[] = [];
    document.addEventListener('keypress', event => keys.push(event.key));
    button('menu')?.click();
    button('flip')?.click();
    button('zen')?.click();
    expect(keys).toEqual(['h', 'f', 'z']);
  });

  it('names the Zen button as Lichess’s does, and the way out once in Zen', () => {
    vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => `[${name}]` } });
    document.body.innerHTML = `${ROUND}<a id="zentog" class="text"> Zen mode </a>`;
    syncBoardTools();
    expect(button('zen')?.getAttribute('aria-label')).toBe('Zen mode');
    expect(button('zen')?.classList.contains('ln-ext-board-tools__btn--on')).toBe(false);
    document.body.classList.add('zen');
    syncBoardTools();
    expect(button('zen')?.getAttribute('aria-label')).toBe('[zenExit]');
    expect(button('zen')?.classList.contains('ln-ext-board-tools__btn--on')).toBe(true);
  });

  it('comes back when Lichess replaces the page', () => {
    document.body.innerHTML = ROUND;
    syncBoardTools();
    document.body.innerHTML = ROUND;
    syncBoardTools();
    expect(document.querySelectorAll('.ln-ext-board-tools')).toHaveLength(1);
  });

  it('shows the flip button while the pointer is on the board', () => {
    boardTools.start();
    document.body.innerHTML = ROUND;
    syncBoardTools();
    const tools = document.querySelector('.ln-ext-board-tools');
    document
      .querySelector('.cg-wrap')
      ?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tools?.classList.contains('ln-ext-board-tools--hover')).toBe(true);
    document.body.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(tools?.classList.contains('ln-ext-board-tools--hover')).toBe(false);
    tools?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('mouseout', { relatedTarget: null }));
    expect(tools?.classList.contains('ln-ext-board-tools--hover')).toBe(false);
  });
});

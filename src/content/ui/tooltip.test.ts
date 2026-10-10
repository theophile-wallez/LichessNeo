import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rectAt } from '#shared/testing/layout.ts';
import { splitShortcut } from './tooltip-layout.ts';
import { listenForTooltips, Tooltip } from './tooltip.ts';
// The tooltips as the original placed them.
import legacy from './fixtures/legacy-tooltip.json' with { type: 'json' };

interface BoxInput {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}
const shown = (): Element | null => document.querySelector('.lr-ext-tooltip.lr-ext-tooltip--on');

function addButton(
  attrs: string,
  box: BoxInput = legacy.scenarios[0]?.box ?? { top: 0, left: 0, width: 0, height: 0 },
): HTMLElement {
  document.body.insertAdjacentHTML('beforeend', `<main><button ${attrs}></button></main>`);
  const button = document.querySelector('main:last-of-type > button');
  if (!(button instanceof HTMLElement)) throw new Error('no button');
  button.getBoundingClientRect = () => rectAt(box);
  return button;
}

const hover = (target: Element): boolean =>
  target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

const tip = new Tooltip();

// One clock for the whole file: a hide stamped in one test still counts in the next.
beforeAll(() => {
  vi.useFakeTimers();
  listenForTooltips(tip);
});

afterAll(() => vi.useRealTimers());

beforeEach(() => {
  vi.stubGlobal('innerWidth', legacy.viewport.width);
  // The buttons have their own box (addButton); this one is the tooltip's.
  const size = legacy.size;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    rectAt({ top: 0, left: 0, ...size }),
  );
});

afterEach(() => {
  document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  vi.advanceTimersByTime(1000);
  for (const main of document.querySelectorAll('main')) main.remove();
});

describe('tooltips', () => {
  it.each(legacy.scenarios)('places it as the original did: $name', ({ tip, box, html }) => {
    const button = addButton('', box);
    button.dataset.lrExtTip = tip;
    hover(button);
    vi.advanceTimersByTime(250);
    expect(shown()?.outerHTML).toBe(html);
  });

  it('moves the title out of the way, keeping it as the label', () => {
    const button = addButton('title="Resign"');
    hover(button);
    expect(button.outerHTML).toBe('<button data-lr-ext-tip="Resign" aria-label="Resign"></button>');
  });

  it("shows none on the home's start buttons, nor the browser's", () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<main class="lobby"><button class="lobby__start__button" title="Create a custom game"></button></main>',
    );
    const button = document.querySelector('main.lobby > button');
    if (!button) throw new Error('no button');
    hover(button);
    vi.advanceTimersByTime(250);
    expect(shown()).toBeNull();
    expect(button.hasAttribute('title')).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Create a custom game');
  });

  it('waits before the first one, not from one button to the next', () => {
    const first = addButton('title="One"');
    const second = addButton('title="Two"');
    hover(first);
    vi.advanceTimersByTime(249);
    expect(shown()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(shown()?.textContent).toBe('One');
    hover(second);
    vi.advanceTimersByTime(0);
    expect(shown()?.textContent).toBe('Two');
  });

  it('hides when the pointer leaves the window, and on scroll', () => {
    const button = addButton('title="Menu"');
    hover(button);
    vi.advanceTimersByTime(250);
    document.dispatchEvent(new MouseEvent('mouseout', { relatedTarget: null }));
    expect(shown()).toBeNull();
    hover(button);
    vi.advanceTimersByTime(250);
    expect(shown()).not.toBeNull();
    document.dispatchEvent(new Event('scroll'));
    expect(shown()).toBeNull();
  });

  it('hides once Lichess replaces the button', () => {
    const button = addButton('title="Menu"');
    hover(button);
    vi.advanceTimersByTime(250);
    tip.dropDetached();
    expect(shown()).not.toBeNull();
    button.remove();
    tip.dropDetached();
    expect(shown()).toBeNull();
  });

  it('shows a TV channel’s only where its name is hidden', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    document.body.insertAdjacentHTML(
      'beforeend',
      '<main><a class="tv-channel" data-lr-ext-tip="Blitz"></a></main>',
    );
    const channel = document.querySelector('a.tv-channel');
    if (!channel) throw new Error('no channel');
    hover(channel);
    vi.advanceTimersByTime(250);
    expect(shown()).toBeNull();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    hover(channel);
    vi.advanceTimersByTime(250);
    expect(shown()?.textContent).toBe('Blitz');
  });

  it('shows the board editor’s analysis link, at any width', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    document.body.insertAdjacentHTML(
      'beforeend',
      '<main><div class="board-editor__tools"><div class="actions"><a data-lr-ext-tip="Analysis board (a)"></a></div></div><a class="plain" data-lr-ext-tip="Elsewhere"></a></main>',
    );
    const link = document.querySelector('.actions > a');
    const plain = document.querySelector('a.plain');
    if (!link || !plain) throw new Error('no links');
    hover(plain);
    vi.advanceTimersByTime(250);
    expect(shown()).toBeNull();
    hover(link);
    vi.advanceTimersByTime(250);
    expect(shown()?.innerHTML).toBe('Analysis board<kbd>a</kbd>');
  });

  it('shows a chat line’s reply and report in place of their title', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<main><ol class="mchat__messages"><li><action class="flag" title="Report"></action><t>Hi</t></li></ol></main>',
    );
    const report = document.querySelector('action.flag');
    if (!report) throw new Error('no report');
    hover(report);
    expect(report.hasAttribute('title')).toBe(false);
    vi.advanceTimersByTime(250);
    expect(shown()?.textContent).toBe('Report');
  });

  it('splits a shortcut off the label', () => {
    expect(splitShortcut('Flip board (f)')).toEqual({ label: 'Flip board', key: 'f' });
    expect(splitShortcut('(x)')).toEqual({ label: '(x)', key: null });
  });
});

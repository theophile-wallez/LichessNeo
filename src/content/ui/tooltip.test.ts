import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rectAt } from '#shared/testing/layout.ts';
import { evalOf, splitShortcut } from './tooltip-layout.ts';
import { listenForTooltips, Tooltip } from './tooltip.ts';
// The tooltips as the original placed them.
import legacy from './fixtures/legacy-tooltip.json' with { type: 'json' };

interface BoxInput {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}
const shown = (): Element | null => document.querySelector('.ln-ext-tooltip.ln-ext-tooltip--on');
const look = (): string | undefined => {
  const tooltip = shown();
  return tooltip instanceof HTMLElement ? tooltip.dataset.lnExtLook : undefined;
};

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
    button.dataset.lnExtTip = tip;
    hover(button);
    vi.advanceTimersByTime(250);
    expect(shown()?.outerHTML).toBe(html);
  });

  it('moves the title out of the way, keeping it as the label', () => {
    const button = addButton('title="Resign"');
    hover(button);
    expect(button.outerHTML).toBe('<button data-ln-ext-tip="Resign" aria-label="Resign"></button>');
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

  it("shows none on the board menu's flip button, whose key its row shows", () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<main class="round"><div class="board-menu"><section><button class="button" title="Flip board (f)">Flip board</button></section></div></main>',
    );
    const button = document.querySelector('.board-menu button');
    if (!button) throw new Error('no button');
    hover(button);
    vi.advanceTimersByTime(250);
    expect(shown()).toBeNull();
    expect(button.hasAttribute('title')).toBe(false);
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
      '<main><a class="tv-channel" data-ln-ext-tip="Blitz"></a></main>',
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
      '<main><div class="board-editor__tools"><div class="actions"><a data-ln-ext-tip="Analysis board (a)"></a></div></div><a class="plain" data-ln-ext-tip="Elsewhere"></a></main>',
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

  it('shows an opening’s way back, popularity and results in place of their title', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<main class="opening"><h1 class="opening__title"><a href="/opening" title="Openings"></a></h1>' +
        '<a class="opening__next"><span class="opening__next__popularity">' +
        '<span title="Popularity">12%</span></span><span class="result-bar">' +
        '<span class="white" title="White wins">35%</span></span></a></main>',
    );
    for (const [selector, label] of [
      ['h1.opening__title > a', 'Openings'],
      ['.opening__next__popularity > span', 'Popularity'],
      ['.result-bar > span', 'White wins'],
    ] as const) {
      const target = document.querySelector(selector);
      if (!target) throw new Error(`no ${selector}`);
      hover(target);
      expect(target.hasAttribute('title')).toBe(false);
      vi.advanceTimersByTime(250);
      expect(shown()?.textContent).toBe(label);
    }
  });

  it('shows a profile’s award in place of its title, on its link or on its tile', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<main class="page-menu"><div class="user-show"><div class="user-show__header"><div class="trophies">' +
        '<a href="/tournament/marathon" title="Marathon Top 10"><span class="trophy award fire-trophy"></span></a>' +
        '<span class="trophy award icon3d" title="Lichess coach"></span>' +
        '</div></div></div></main>',
    );
    for (const [selector, label] of [
      ['.trophies > a', 'Marathon Top 10'],
      ['.trophies > span', 'Lichess coach'],
    ] as const) {
      const award = document.querySelector(selector);
      if (!award) throw new Error(`no ${selector}`);
      hover(award.firstElementChild ?? award);
      expect(award.hasAttribute('title')).toBe(false);
      vi.advanceTimersByTime(250);
      expect(shown()?.textContent).toBe(label);
    }
  });

  it('shows what each of a theme’s settings in the user menu does, outside the page’s main', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="dasher_app"><div class="ln-ext-src-options">' +
        '<button data-ln-ext-option="wide" data-ln-ext-tip="Most of the board">Wide</button>' +
        '</div></div>',
    );
    const option = document.querySelector('[data-ln-ext-option]');
    if (!option) throw new Error('no option');
    hover(option);
    vi.advanceTimersByTime(250);
    expect(shown()?.textContent).toBe('Most of the board');
    document.getElementById('dasher_app')?.remove();
  });

  it('shows a rating’s Lichess one where it shows as on Chess.com, but in the review', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="powerTip"><span data-ln-ext-lichess-rating="1500" data-ln-ext-tip="1500 on Lichess">1095</span></div>' +
        '<div id="ln-ext-review"><b data-ln-ext-lichess-rating="1850" data-ln-ext-tip="1850 on Lichess">1460</b></div>',
    );
    const [card, review] = document.querySelectorAll('[data-ln-ext-lichess-rating]');
    if (!card || !review) throw new Error('no rating');
    hover(card);
    vi.advanceTimersByTime(250);
    expect(shown()?.textContent).toBe('1500 on Lichess');
    hover(review);
    vi.advanceTimersByTime(250);
    expect(shown()).toBeNull();
    document.getElementById('powerTip')?.remove();
    document.getElementById('ln-ext-review')?.remove();
  });

  it('shows a variation’s move with its eval alone, on glass, and a glyph with its name', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<main class="analyse"><div class="tview2"><interrupt><lines><line><move p="ab">' +
        '<san title="-0.2 · Depth 22">Nf6</san><glyph title="Mistake">?</glyph></move>' +
        '</line></lines></interrupt></div></main>',
    );
    const san = document.querySelector('san');
    const glyph = document.querySelector('glyph');
    if (!san || !glyph) throw new Error('no move');
    hover(san);
    expect(san.getAttribute('aria-label')).toBe('−0.2');
    vi.advanceTimersByTime(250);
    expect(shown()?.textContent).toBe('−0.2');
    expect(look()).toBe('glass');
    hover(glyph);
    vi.advanceTimersByTime(0);
    expect(shown()?.textContent).toBe('Mistake');
    expect(look()).toBeUndefined();
  });

  it('reads the eval off Lichess’s title', () => {
    expect(evalOf('+1.5 · Depth 18')).toBe('+1.5');
    expect(evalOf('-0.2')).toBe('−0.2');
    expect(evalOf('#-3 · Depth 30')).toBe('#−3');
  });

  it('splits a shortcut off the label', () => {
    expect(splitShortcut('Flip board (f)')).toEqual({ label: 'Flip board', key: 'f' });
    expect(splitShortcut('(x)')).toEqual({ label: '(x)', key: null });
  });
});

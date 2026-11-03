import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { OPEN, syncUnderboard, underboard } from './underboard.ts';

// The markup Lichess serves: the analysis menu, open, then what's under the
// board: the free board's FEN and PGN, a game's tabs, a study's toolbar.
const CONTROLS =
  '<div class="analyse__controls"><div class="jumps"></div><button class="fbt active" data-act="menu"></button></div>';
const MENU =
  '<div class="action-menu sub-box"><div class="title">Analysis board</div><div class="inner"><div class="action-menu__tools"><button data-icon="">Flip board</button></div></div></div>';
const TOOLS = `<div class="analyse__tools"><div class="analyse__moves"></div>${MENU}</div>`;
const FIELDS =
  '<div class="copyables"><div class="pair"><label class="name">FEN</label><input class="copyable"></div></div>';
const FREE_BOARD = `<main class="analyse">${TOOLS}${CONTROLS}<div class="analyse__underboard">${FIELDS}</div></main>`;
const GAME = `<main class="analyse">${TOOLS}${CONTROLS}<div class="analyse__underboard"><div class="analyse__underboard__menu"></div><div class="analyse__underboard__panels"><div class="fen-pgn"></div></div></div></main>`;
const STUDY = `<main class="analyse">${TOOLS}${CONTROLS}<div class="analyse__underboard"><div class="study__buttons"></div></div></main>`;

const root = document.documentElement;
const rows = (): HTMLButtonElement[] => queryAll(document, '.ln-ext-menu-fen', HTMLButtonElement);
const closeButton = (): HTMLButtonElement | null =>
  queryOne(document, '.ln-ext-underboard-close', HTMLButtonElement);
const isOpen = (): boolean => root.classList.contains(OPEN);

beforeAll(() => underboard.start());

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => `[${name}]` } });
});

afterEach(() => {
  document.body.innerHTML = '';
  root.classList.toggle(OPEN, false);
});

describe('the free board’s FEN and PGN', () => {
  it('get a row at the end of the analysis menu’s tools, once', () => {
    document.body.innerHTML = FREE_BOARD;
    syncUnderboard();
    syncUnderboard();
    expect(rows()).toHaveLength(1);
    expect(rows()[0]?.parentElement?.className).toBe('action-menu__tools');
    expect(rows()[0]?.textContent).toBe('FEN & PGN');
  });

  it.each([
    ['a game’s analysis, whose parts the review shows', GAME],
    ['a study, whose panel has a tab for its toolbar', STUDY],
  ])('leave out %s', (_name, markup) => {
    document.body.innerHTML = markup;
    syncUnderboard();
    expect(rows()).toHaveLength(0);
    expect(closeButton()).toBeNull();
  });

  it('open from the row, which closes the menu as its button does', () => {
    document.body.innerHTML = FREE_BOARD;
    syncUnderboard();
    const presses: string[] = [];
    for (const type of ['pointerdown', 'pointerup'])
      document.addEventListener(type, event => presses.push(event.type), { once: true });
    rows()[0]?.click();
    expect(isOpen()).toBe(true);
    expect(presses).toEqual(['pointerdown', 'pointerup']);
  });

  it('close from their close button, or Escape', () => {
    document.body.innerHTML = FREE_BOARD;
    syncUnderboard();
    rows()[0]?.click();
    expect(closeButton()?.getAttribute('aria-label')).toBe('[underboardClose]');
    closeButton()?.click();
    expect(isOpen()).toBe(false);
    rows()[0]?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(isOpen()).toBe(false);
  });

  it('close once the page has no fields left', () => {
    document.body.innerHTML = FREE_BOARD;
    syncUnderboard();
    rows()[0]?.click();
    document.body.innerHTML = GAME;
    syncUnderboard();
    expect(isOpen()).toBe(false);
  });

  it('come back when Lichess draws the menu again', () => {
    document.body.innerHTML = FREE_BOARD;
    syncUnderboard();
    document
      .querySelector('.action-menu')
      ?.replaceWith(document.createRange().createContextualFragment(MENU));
    syncUnderboard();
    expect(rows()).toHaveLength(1);
  });
});

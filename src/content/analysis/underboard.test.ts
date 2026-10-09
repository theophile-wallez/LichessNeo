import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { OPEN } from './underboard.ts';

// The markup Lichess serves under the board: the free board's FEN and PGN, a
// game's tabs, a study's toolbar; and a practice drill's goal, which stays.
const CONTROLS =
  '<div class="analyse__controls"><div class="jumps"></div><button class="fbt" data-act="menu"></button></div>';
const TOOLS = '<div class="analyse__tools"><div class="analyse__moves"></div></div>';
const FREE_BOARD = `<main class="analyse">${TOOLS}${CONTROLS}<div class="analyse__underboard"><div class="copyables"><div class="pair"><label class="name">FEN</label><input class="copyable"></div></div></div></main>`;
const GAME = `<main class="analyse">${TOOLS}${CONTROLS}<div class="analyse__underboard"><div class="analyse__underboard__menu"></div><div class="analyse__underboard__panels"><div class="fen-pgn"></div></div></div></main>`;
const STUDY = `<main class="analyse">${TOOLS}${CONTROLS}<div class="analyse__underboard"><div class="study__buttons"></div></div></main>`;
const DRILL = `<main class="analyse">${TOOLS}${CONTROLS}<div class="analyse__underboard"><div class="feedback"></div></div><div class="practice__side"></div></main>`;
const EMPTY = `<main class="analyse">${TOOLS}${CONTROLS}<div class="analyse__underboard"></div></main>`;
const RETRO_BOX = '<div class="retro-box training-box sub-box"></div>';

const root = document.documentElement;
const buttons = (): HTMLButtonElement[] =>
  queryAll(document, '.lr-ext-underboard', HTMLButtonElement);

// A fresh module per test: it remembers whether "Learn from your mistakes" showed.
let syncUnderboard: () => void;

beforeEach(async () => {
  vi.resetModules();
  ({ syncUnderboard } = await import('./underboard.ts'));
});

afterEach(() => {
  document.body.innerHTML = '';
  root.classList.toggle(OPEN, false);
  delete root.dataset.lrExtToolsLabel;
});

describe('the underboard button', () => {
  it.each([
    ['the free board', FREE_BOARD],
    ['a game’s analysis', GAME],
    ['a study', STUDY],
  ])('joins the controls on %s, once', (_name, markup) => {
    document.body.innerHTML = markup;
    syncUnderboard();
    syncUnderboard();
    expect(buttons()).toHaveLength(1);
    expect(buttons()[0]?.parentElement?.className).toBe('analyse__controls');
  });

  it.each([
    ['a practice drill, whose goal shows already', DRILL],
    ['an empty underboard', EMPTY],
  ])('stays out of %s', (_name, markup) => {
    document.body.innerHTML = markup;
    syncUnderboard();
    expect(buttons()).toHaveLength(0);
  });

  it('opens the underboard and closes it again', () => {
    document.body.innerHTML = GAME;
    syncUnderboard();
    buttons()[0]?.click();
    expect(root.classList.contains(OPEN)).toBe(true);
    expect(buttons()[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[0]?.classList.contains('active')).toBe(true);
    buttons()[0]?.click();
    expect(root.classList.contains(OPEN)).toBe(false);
    expect(buttons()[0]?.getAttribute('aria-pressed')).toBe('false');
  });

  it('closes once the page has no underboard left', () => {
    document.body.innerHTML = FREE_BOARD;
    syncUnderboard();
    buttons()[0]?.click();
    document.body.innerHTML = EMPTY;
    syncUnderboard();
    expect(root.classList.contains(OPEN)).toBe(false);
  });

  it('closes when "Learn from your mistakes" starts, and may open again during it', () => {
    document.body.innerHTML = GAME;
    syncUnderboard();
    buttons()[0]?.click();
    document.querySelector('.analyse__tools')?.insertAdjacentHTML('beforeend', RETRO_BOX);
    syncUnderboard();
    expect(root.classList.contains(OPEN)).toBe(false);
    buttons()[0]?.click();
    syncUnderboard();
    expect(root.classList.contains(OPEN)).toBe(true);
  });

  it('takes Lichess’s label once the page world has copied it', () => {
    document.body.innerHTML = GAME;
    syncUnderboard();
    expect(buttons()[0]?.getAttribute('aria-label')).toBe('Tools');
    root.dataset.lrExtToolsLabel = 'Outils';
    syncUnderboard();
    expect(buttons()[0]?.getAttribute('aria-label')).toBe('Outils');
    expect(buttons()[0]?.dataset.lrExtTip).toBe('Outils');
  });

  it('comes back when Lichess redraws the controls', () => {
    document.body.innerHTML = FREE_BOARD;
    syncUnderboard();
    document.body.innerHTML = FREE_BOARD;
    syncUnderboard();
    expect(buttons()).toHaveLength(1);
  });
});

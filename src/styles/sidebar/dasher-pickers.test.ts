import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';

// The user menu's Board panel, Lichess's tab, as lila's ui/dasher/src/board.ts draws it.
const PANEL = (dimension: string): string =>
  `<div id="top"><div id="dasher_app"><div class="sub board ${dimension}" data-ln-ext-view="lichess">` +
  '<div class="head"></div><div class="selector large"></div><div class="zoom"></div>' +
  '<div class="board-opacity"></div><div class="board-brightness"></div>' +
  '<div class="board-contrast"></div><div class="board-hue"></div>' +
  '<button class="text reset"></button><div class="list"></div></div></div></div>';

/** The panel's parts shown, by class, under `board` (`data-ln-ext-board`). */
function shown(board: string | null, dimension = 'd2'): string[] {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'dasher-pickers.css'), 'utf8');
  document.head.replaceChildren(style);
  if (board === null) delete document.documentElement.dataset.lnExtBoard;
  else document.documentElement.dataset.lnExtBoard = board;
  document.body.innerHTML = PANEL(dimension);
  return queryAll(document, '.sub.board > *', HTMLElement)
    .filter(part => getComputedStyle(part).display !== 'none')
    .map(part => part.classList[part.classList.length - 1] ?? '');
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtBoard;
});

describe('the user menu’s board sliders', () => {
  const ALL = ['head', 'large', 'zoom', 'board-opacity', 'board-brightness', 'board-contrast'];

  it('stay on Lichess’s own boards, and on a 3D one', () => {
    expect(shown(null)).toEqual([...ALL, 'board-hue', 'reset', 'list']);
    expect(shown('accent', 'd3')).toEqual([...ALL, 'board-hue', 'reset', 'list']);
  });

  it('go, but the size, on ours and a pack’s, which they’d leave as they are', () => {
    expect(shown('accent')).toEqual(['head', 'large', 'zoom', 'list']);
    expect(shown('pack')).toEqual(['head', 'large', 'zoom', 'list']);
  });
});

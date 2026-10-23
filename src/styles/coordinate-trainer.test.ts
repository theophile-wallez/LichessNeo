import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { cssPixels, splitTracks, type Viewport } from '#shared/testing/css-math.ts';

const SHEETS = ['sidebar/layout.css', 'sidebar/header.css', 'coordinate-trainer.css'];

// Lichess's own variables, its boards' widths as wide as can be, so that ours cap them.
const LICHESS =
  ':root { ---block-gap: 15px; ---main-margin: 0px; ---col2-uniboard-width: 2000px;' +
  ' ---col3-uniboard-width: 2000px; ---col3-uniboard-side-min: 250px; }';

/** Under the board: the files, a gap and the progress bar. */
const UNDER = 12 + 15 + 10;
/** Naming squares adds a gap, the keyboard's row and its two rows of keys. */
const KEYBOARD = 15 + 130;
const PAGE_TOP = 16;

interface Trainer {
  readonly naming?: boolean;
  readonly header?: boolean;
}

interface Grid {
  readonly board: number;
  readonly height: number;
  readonly rowGap: string;
}

/** The trainer's grid at a window size, as a browser would lay it out. */
function gridAt(viewport: Viewport, { naming = false, header = false }: Trainer = {}): Grid {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', viewport.width);
  Reflect.set(window, 'innerHeight', viewport.height);
  const style = document.createElement('style');
  style.textContent = [
    LICHESS,
    ...SHEETS.map(sheet => readFileSync(join(import.meta.dirname, sheet), 'utf8')),
  ].join('\n');
  document.head.replaceChildren(style);
  if (header) document.documentElement.dataset.lnExtSidebar = 'header';
  document.body.innerHTML =
    '<div id="main-wrap"><main id="trainer"><div class="trainer"><div class="side"></div>' +
    '<div class="main-board"></div><div class="table"></div><div class="progress"></div>' +
    `${naming ? '<div class="coordinate-input"></div>' : ''}</div></main></div>`;
  const trainer = queryOne(document, 'main#trainer > .trainer', HTMLElement);
  if (!trainer) throw new Error('no trainer');
  const grid = getComputedStyle(trainer);
  const columns = splitTracks(grid.gridTemplateColumns);
  // The board's column: the first beside the side column, the third once it's on the left.
  const board = columns[viewport.width >= 1260 ? 2 : 0] ?? '';
  return {
    board: cssPixels(board, viewport),
    height: cssPixels(grid.height, viewport),
    rowGap: grid.rowGap,
  };
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  delete document.documentElement.dataset.lnExtSidebar;
});

describe('the coordinate trainer from 1020px', () => {
  it('fits the board and the progress bar under it in the window', () => {
    const { board, height, rowGap } = gridAt({ width: 1200, height: 640 });
    expect(height).toBe(640 - PAGE_TOP);
    expect(board).toBe(640 - 2 * PAGE_TOP - UNDER);
    expect(rowGap).toBe('0');
  });

  it('leaves the keyboard room when naming squares', () => {
    expect(gridAt({ width: 1200, height: 640 }, { naming: true }).board).toBe(
      640 - 2 * PAGE_TOP - UNDER - KEYBOARD,
    );
  });

  it('caps the board by the width the sidebar and the table leave', () => {
    expect(gridAt({ width: 1100, height: 900 }).board).toBe(1100 - 168 - 275);
  });

  it('fits under the header too', () => {
    expect(gridAt({ width: 1200, height: 640 }, { header: true }).board).toBe(
      640 - 56 - 2 * PAGE_TOP - UNDER,
    );
  });

  it('caps the board with the settings on its left', () => {
    expect(gridAt({ width: 1600, height: 900 }).board).toBe(900 - 2 * PAGE_TOP - UNDER);
    expect(gridAt({ width: 1366, height: 1000 }).board).toBe(1366 - 168 - 540);
  });
});

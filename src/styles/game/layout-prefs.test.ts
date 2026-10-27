import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { cssPixels, cssTracks, splitTracks, type Viewport } from '#shared/testing/css-math.ts';

// The game page's grid as Lichess's preferences shape it: the coordinates' strip, a 3D board,
// and the clock on the left.

const STYLES = join(import.meta.dirname, '..');
const SHEETS = [
  'board/pieces.css',
  'sidebar/layout.css',
  'playerbar.css',
  'game/layout.css',
  'game/layout-narrow.css',
];

// happy-dom drops a selector whose `:is()` runs over several lines.
const oneLine = (css: string): string => css.replace(/\s+/g, ' ');

const ROUND =
  '<div id="main-wrap" class="is2d"><main class="round"><div class="round__app">' +
  '<div class="round__app__board main-board"></div>' +
  '<div class="ruser ruser-top"><a class="user-link">someone</a></div>' +
  '<div class="rclock rclock-top"><div class="time">3:00</div></div></div></main></div>';

interface Page {
  readonly viewport: Viewport;
  readonly bodyClass?: string;
  readonly prefs?: string | undefined;
  readonly has?: string;
  readonly dimension?: 'is2d' | 'is3d';
}

function render({ viewport, bodyClass = '', prefs, has = 'round', dimension }: Page): HTMLElement {
  Reflect.set(window, 'innerWidth', viewport.width);
  Reflect.set(window, 'innerHeight', viewport.height);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet => oneLine(readFileSync(join(STYLES, sheet), 'utf8'))).join(
    '\n',
  );
  document.head.replaceChildren(style);
  const root = document.documentElement;
  root.dataset.lnExtHas = has;
  if (prefs === undefined) delete root.dataset.lnExtPrefs;
  else root.dataset.lnExtPrefs = prefs;
  document.body.className = bodyClass;
  document.body.innerHTML = dimension === 'is3d' ? ROUND.replace('is2d', 'is3d') : ROUND;
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) throw new Error('no game');
  return main;
}

afterEach(() => {
  Reflect.set(window, 'innerWidth', 1024);
  Reflect.set(window, 'innerHeight', 768);
  document.head.replaceChildren();
  document.body.innerHTML = '';
  document.body.className = '';
  delete document.documentElement.dataset.lnExtHas;
  delete document.documentElement.dataset.lnExtPrefs;
});

const DESKTOP = { width: 1366, height: 768 };

const strip = (prefs: string | undefined): number =>
  cssPixels(
    getComputedStyle(render({ viewport: DESKTOP, bodyClass: 'coords-in', prefs })).getPropertyValue(
      '--ln-ext-coords-off',
    ),
    DESKTOP,
  );

/** The board's column and its row, in pixels. */
function board(page: Page): { width: number; height: number } {
  const main = getComputedStyle(render(page));
  const [width = 0] = cssTracks(main.gridTemplateColumns, page.viewport);
  const narrow = page.viewport.width < 1020;
  // Desktop: tabs, top bar, board, bottom bar. Narrow: TV, top bar, pocket, board.
  const row = splitTracks(main.gridTemplateRows)[narrow ? 3 : 2] ?? '';
  const height = cssPixels(row, page.viewport);
  return { width, height };
}

describe('the game page’s coordinates strip', () => {
  it('is kept under the board for coordinates outside, even while Lichess swaps them in', () => {
    expect(strip(undefined)).toBeGreaterThan(20);
  });

  it('goes when the user picked them inside the board', () => {
    expect(strip('coords-in')).toBe(0);
  });
});

describe('the board’s row', () => {
  it.each([DESKTOP, { width: 390, height: 844 }])(
    'is as tall as the board is wide, and a 3D board’s 476/512 of it, at %o',
    viewport => {
      const flat = board({ viewport });
      expect(flat.height).toBeCloseTo(flat.width, 3);
      const raised = board({ viewport, dimension: 'is3d' });
      expect(raised.height).toBeCloseTo((raised.width * 476) / 512, 3);
    },
  );

  it('lets a 3D board grow as wide as the window’s height allows it', () => {
    const viewport = { width: 1920, height: 1080 };
    const flat = board({ viewport });
    const raised = board({ viewport, dimension: 'is3d' });
    expect(raised.height).toBeCloseTo(flat.height, 3);
    expect(raised.width).toBeGreaterThan(flat.width);
  });
});

describe('the clock on the left', () => {
  const PHONE = { width: 390, height: 844 };
  const placed = (has: string): string[] => {
    render({ viewport: PHONE, has });
    const bar = queryOne(document, '.ruser', HTMLElement);
    const clock = queryOne(document, '.rclock', HTMLElement);
    if (!bar || !clock) throw new Error('no bar');
    return [getComputedStyle(bar).justifySelf, getComputedStyle(clock).justifySelf];
  };

  it('mirrors a phone’s bars: the clock at the left, the name at the right', () => {
    const [name, clock] = placed('round');
    expect(name).not.toBe('end');
    expect(clock).toBe('end');
    expect(placed('round round-swap-clock')).toEqual(['end', 'start']);
  });
});

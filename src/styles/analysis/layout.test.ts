import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { cssPixels } from '#shared/testing/css-math.ts';

// The player bars' room on a game's analysis board. It has to be reserved from the first
// paint: the board is sized from it, so a bar that only counts once our own bars are in had
// the board drawn 112px too tall, then shrink a moment later.

const SHEETS = ['layout.css', 'layout-narrow.css'];

// happy-dom drops a selector whose `:is()` runs over several lines, which is how the
// formatter writes these. Neither sheet holds a string, so the whitespace can go.
const oneLine = (css: string): string => css.replace(/\s+/g, ' ');

/** The page, with the game info Lichess serves it with, under the flags `has` names. */
function render(has: string, width: number): HTMLElement {
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet =>
    oneLine(readFileSync(join(import.meta.dirname, sheet), 'utf8')),
  ).join('\n');
  document.head.append(style);
  document.documentElement.dataset['lnExtHas'] = has;
  document.body.innerHTML =
    '<main class="analyse"><div class="analyse__board"><div class="cg-wrap">' +
    '<cg-container></cg-container></div></div><div class="eval-gauge"></div>' +
    '<div class="game__meta"><div class="game__meta__players"></div></div></main>';
  const main = queryOne(document, 'main.analyse', HTMLElement);
  if (!main) throw new Error('no analysis page');
  return main;
}

const bar = (has: string, width = 1280): string =>
  getComputedStyle(render(has, width)).getPropertyValue('--ln-ext-bar');

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  Reflect.deleteProperty(document.documentElement.dataset, 'lnExtHas');
});

describe('the analysis board’s player bars', () => {
  it('take their room from Lichess’s own game info, before our bars are in', () => {
    expect(bar('analyse analyse-game')).toBe('56px');
  });

  it('keep it once our bars are in', () => {
    expect(bar('analyse analyse-game analyse-players analyse-captured')).toBe('56px');
  });

  it('take none on a board without players', () => {
    expect(bar('analyse')).toBe('0px');
  });

  it('stay thin for the captured pieces of a board that is not a game', () => {
    expect(bar('analyse analyse-captured')).toBe('28px');
  });

  it('are not thinned by the captured pieces of a game', () => {
    expect(bar('analyse analyse-game analyse-captured')).toBe('56px');
  });

  it('leave a practice lesson alone', () => {
    expect(bar('analyse analyse-game practice')).toBe('0px');
  });

  it('take the same room on a phone', () => {
    expect(bar('analyse analyse-game', 390)).toBe('56px');
    expect(bar('analyse', 390)).toBe('0px');
  });
});

/** How Lichess's eval gauge is displayed at `width`. */
function gauge(width: number): string {
  render('analyse', width);
  const element = queryOne(document, '.eval-gauge', HTMLElement);
  if (!element) throw new Error('no gauge');
  return getComputedStyle(element).display;
}

describe('Lichess’s eval gauge', () => {
  it('stands beside the board on a desktop', () => {
    expect(gauge(1280)).not.toBe('none');
  });

  it('is hidden where the board takes the column, not laid over its a-file', () => {
    expect(gauge(1019)).toBe('none');
    expect(gauge(820)).toBe('none');
  });
});

const styled = (selector: string): CSSStyleDeclaration => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
};

describe('a 3D board’s room for its pieces', () => {
  const VIEWPORT = { width: 1366, height: 768 };
  const RISE = (0.091 * 464.5) / 512;

  /** A game's analysis with its clocks, the board 3D or flat. */
  function game(dimension: 'is2d' | 'is3d', width = VIEWPORT.width): HTMLElement {
    Reflect.set(window, 'innerWidth', width);
    Reflect.set(window, 'innerHeight', VIEWPORT.height);
    const style = document.createElement('style');
    style.textContent = ['../board/pieces.css', ...SHEETS]
      .map(sheet => oneLine(readFileSync(join(import.meta.dirname, sheet), 'utf8')))
      .join('\n');
    document.head.append(style);
    document.documentElement.dataset['lnExtHas'] = 'analyse analyse-game analyse-clock';
    document.body.innerHTML =
      `<div id="main-wrap" class="${dimension}"><main class="analyse">` +
      '<div class="analyse__board main-board"><div class="analyse__player_strip top"></div>' +
      '</div></main></div>';
    const main = queryOne(document, 'main.analyse', HTMLElement);
    if (!main) throw new Error('no analysis page');
    return main;
  }

  const pixels = (value: string): number => cssPixels(value, VIEWPORT);
  afterEach(() => {
    Reflect.set(window, 'innerWidth', 1024);
    Reflect.set(window, 'innerHeight', 768);
  });

  it('sets the board under the top bar by as much as its far rank stands above it', () => {
    const board = pixels(getComputedStyle(game('is3d')).getPropertyValue('--ln-ext-board'));
    expect(pixels(styled('.analyse__board').marginTop) - 56).toBeCloseTo(board * RISE, 3);
    game('is2d');
    expect(pixels(styled('.analyse__board').marginTop)).toBe(56);
  });

  // The clock hangs from the board: it went down with it, into the pieces' room.
  it('keeps the top clock in its bar', () => {
    const board = pixels(getComputedStyle(game('is3d')).getPropertyValue('--ln-ext-board'));
    const bottom = styled('.analyse__player_strip').bottom.replace('100%', '0px');
    expect(pixels(bottom)).toBeCloseTo(board * RISE, 3);
  });

  // Below 1020px the room is the top bar's row, not a margin as on the pages Lichess lays out.
  it('takes the room once on a phone', () => {
    game('is3d', 390);
    expect(pixels(styled('.analyse__board').marginTop)).toBe(0);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own highlights (ui/lib/css/theme/board/_chessground.scss) and its blindfold rule
// (ui/lib/css/chess/_blindfold.scss).
const LICHESS_RULES =
  'cg-board square.last-move { background-color: rgba(155, 199, 0, 0.41); }' +
  'cg-board square.check { background-image: radial-gradient(red, transparent); }' +
  '.blindfold.main-board .check { background-image: none; }';

interface Square {
  readonly classes: string;
  /** `data-ln-ext-board`: one of ours, a pack's, or none for Lichess's. */
  readonly board: string | null;
  readonly blindfold?: boolean;
  readonly dimension?: 'is2d' | 'is3d';
}

function square({
  classes,
  board,
  blindfold = false,
  dimension = 'is2d',
}: Square): CSSStyleDeclaration {
  const style = document.createElement('style');
  style.textContent = LICHESS_RULES + readFileSync(join(import.meta.dirname, 'pieces.css'), 'utf8');
  document.head.replaceChildren(style);
  if (board === null) delete document.documentElement.dataset.lnExtBoard;
  else document.documentElement.dataset.lnExtBoard = board;
  document.body.innerHTML =
    `<div id="main-wrap" class="${dimension}">` +
    `<div class="main-board${blindfold ? ' blindfold' : ''}"><div class="cg-wrap">` +
    `<cg-container><cg-board><square class="${classes}"></square></cg-board></cg-container>` +
    '</div></div></div>';
  const element = queryOne(document, 'square', HTMLElement);
  if (!element) throw new Error('no square');
  return getComputedStyle(element);
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtBoard;
});

const LICHESS_YELLOW = 'rgba(155, 199, 0, 0.41)';

describe('the board’s highlights', () => {
  it('are Lichess’s own on its boards, ours on ours and a pack’s', () => {
    expect(square({ classes: 'last-move', board: null }).backgroundColor).toBe(LICHESS_YELLOW);
    expect(square({ classes: 'last-move', board: 'accent' }).backgroundColor).not.toBe(
      LICHESS_YELLOW,
    );
    expect(square({ classes: 'last-move', board: 'pack' }).backgroundColor).not.toBe(
      LICHESS_YELLOW,
    );
  });

  it('leave a 3D board, which ours don’t draw, to Lichess', () => {
    const style = square({ classes: 'last-move', board: 'accent', dimension: 'is3d' });
    expect(style.backgroundColor).toBe(LICHESS_YELLOW);
  });

  it('show no check in a blindfold game, as Lichess has it', () => {
    expect(square({ classes: 'check', board: 'accent' }).backgroundImage).toMatch(/gradient/);
    expect(square({ classes: 'check', board: 'accent', blindfold: true }).backgroundImage).toBe(
      'none',
    );
  });
});

const blend = (options: Square): string => square(options).mixBlendMode;

describe('the move hints', () => {
  it('take the square’s hue on our two-tone boards', () => {
    for (const board of ['accent', 'custom', 'flat']) {
      expect(blend({ classes: 'move-dest', board })).toBe('luminosity');
      expect(blend({ classes: 'premove-dest oc', board })).toBe('luminosity');
    }
  });

  it('keep their color on boards whose squares we don’t know, and over a highlight', () => {
    expect(blend({ classes: 'move-dest', board: null })).not.toBe('luminosity');
    expect(blend({ classes: 'move-dest', board: 'pack' })).not.toBe('luminosity');
    expect(blend({ classes: 'move-dest', board: 'accent', dimension: 'is3d' })).not.toBe(
      'luminosity',
    );
    expect(blend({ classes: 'move-dest last-move', board: 'accent' })).not.toBe('luminosity');
  });
});

function filtersOf(markup: string, tinted: boolean): string[] {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'pieces.css'), 'utf8');
  document.head.replaceChildren(style);
  if (tinted) document.documentElement.dataset.lnExtBlackPieces = '';
  else delete document.documentElement.dataset.lnExtBlackPieces;
  document.body.innerHTML = markup;
  return [...document.body.children].map(element => getComputedStyle(element).filter);
}

const tinted = (filters: string[]): boolean[] =>
  filters.map(filter => filter.includes('#ln-ext-black-pieces'));

const PIECES =
  '<piece class="black knight"></piece><piece class="white knight"></piece>' +
  '<i class="ln-ext-pc ln-ext-pc-bq"></i><i class="ln-ext-pc ln-ext-pc-wq"></i>';

describe('the black pieces’ color', () => {
  afterEach(() => {
    delete document.documentElement.dataset.lnExtBlackPieces;
  });

  it('filters the black pieces only, the board’s and ours, once a color is picked', () => {
    expect(tinted(filtersOf(PIECES, true))).toEqual([true, false, true, false]);
    expect(tinted(filtersOf(PIECES, false))).toEqual([false, false, false, false]);
  });
});

const styled = (selector: string): CSSStyleDeclaration => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
};

describe('a 3D board', () => {
  // Lichess's 3D sheet draws every piece from its box's corner, `cover` (lila's board-3d.scss).
  const LICHESS_3D = 'piece { background-size: cover; background-position: 0 0; }';

  function render(dimension: 'is2d' | 'is3d', markup: string): void {
    const style = document.createElement('style');
    style.textContent = LICHESS_3D + readFileSync(join(import.meta.dirname, 'pieces.css'), 'utf8');
    document.head.replaceChildren(style);
    document.body.innerHTML = `<div id="main-wrap" class="${dimension}">${markup}</div>`;
  }

  const TILE = '<div class="no-square"><piece class="king white"></piece></div>';

  // Staunton's pictures are square, the piece left of their middle: in a square tile, `cover`
  // from the corner set it off to the left. A box shaped like the board's centres it.
  it('draws a piece off the board in a box shaped like the board’s, in its tile’s middle', () => {
    render('is3d', TILE);
    const piece = styled('piece');
    expect(piece.paddingLeft).toBe(piece.paddingRight);
    expect(piece.paddingLeft).not.toMatch(/^(0(px)?)?$/);
    expect(piece.backgroundOrigin).toBe('content-box');
    expect(piece.backgroundRepeat).toBe('no-repeat');
  });

  it('leaves a flat piece off the board as Lichess draws it', () => {
    render('is2d', TILE);
    expect(styled('piece').paddingLeft).toMatch(/^(0(px)?)?$/);
  });

  // Chessground stacks its pieces up to z-index 10: outside the board they covered a game's end.
  it('keeps its pieces’ stacking inside it', () => {
    render('is3d', '<div class="main-board"></div>');
    expect(styled('.main-board').isolation).toBe('isolate');
    render('is2d', '<div class="main-board"></div>');
    expect(styled('.main-board').isolation).not.toBe('isolate');
  });

  // Learn and the coordinate trainer put the board at the window's top edge, heads cut off.
  it('takes its pieces’ room over it where Lichess’s grid places it, but in the editor', () => {
    render('is3d', '<div class="learn"><div class="main-board"></div></div>');
    expect(styled('.main-board').marginTop).toContain('100%');
    render('is3d', '<div class="board-editor"><div class="main-board"></div></div>');
    expect(styled('.main-board').marginTop).not.toContain('100%');
  });
});

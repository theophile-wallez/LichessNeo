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

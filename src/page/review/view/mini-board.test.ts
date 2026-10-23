import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { copyBoardBackground, miniBoard, type MiniPosition } from './mini-board.ts';

// A little still board: its pieces and last move on the squares, turned the
// way asked, over the board's own background.

/** 1. e4: the pawn on e4, its move lit. */
const AFTER_E4: MiniPosition = {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  lastMove: 'e2e4',
};

function drawn(position: MiniPosition, orientation: 'white' | 'black'): HTMLElement {
  const host = document.createElement('div');
  setHtml(host, miniBoard(position, orientation));
  return host;
}

const at = (element: Element): string =>
  (element.getAttribute('style') ?? '').replaceAll(/\s/g, '');

afterEach(() => {
  document.body.replaceChildren();
});

describe('a little board', () => {
  it('sets each piece on its square, from White’s side', () => {
    const board = drawn(AFTER_E4, 'white');
    const pieces = queryAll(board, '.ln-ext-pc', HTMLElement);
    expect(pieces).toHaveLength(32);
    const pawn = pieces.find(piece => at(piece) === '--x:4;--y:4');
    expect(pawn?.className).toBe('ln-ext-pc ln-ext-pc-wp');
    expect(queryAll(board, '.ln-ext-mini__lit', HTMLElement).map(at)).toEqual([
      '--x:4;--y:6',
      '--x:4;--y:4',
    ]);
  });

  it('turns around for Black', () => {
    const board = drawn(AFTER_E4, 'black');
    expect(queryAll(board, '.ln-ext-mini__lit', HTMLElement).map(at)).toEqual([
      '--x:3;--y:1',
      '--x:3;--y:3',
    ]);
  });

  it('lights nothing at the start, and reads a placement alone', () => {
    const board = drawn({ fen: '8/8/8/8/8/8/8/K6k', lastMove: null }, 'white');
    expect(board.querySelectorAll('.ln-ext-mini__lit')).toHaveLength(0);
    expect(queryAll(board, '.ln-ext-pc', HTMLElement).map(at)).toEqual([
      '--x:0;--y:7',
      '--x:7;--y:7',
    ]);
  });

  it('takes the board’s background, texture blend and all', () => {
    setHtml(document.body, html`<div class="is2d"><cg-board></cg-board></div>`);
    const values: Record<string, string> = {
      'background-image': 'url("wood.webp")',
      'background-size': 'cover',
      'background-position': '10% 20%',
      'background-blend-mode': 'multiply',
    };
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      Object.assign(document.createElement('div').style, {
        getPropertyValue: (property: string) => values[property] ?? '',
      }),
    );
    const mini = drawn(AFTER_E4, 'white').firstElementChild;
    if (!(mini instanceof HTMLElement)) throw new Error('no board drawn');
    copyBoardBackground([mini]);
    expect(Object.keys(values).map(property => mini.style.getPropertyValue(property))).toEqual(
      Object.values(values),
    );
  });
});

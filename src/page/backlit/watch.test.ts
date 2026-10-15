import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePlacement } from '#shared/chess/fen.ts';
import type { Square } from '#shared/chess/types.ts';
import { createCustomElement } from '#shared/dom.ts';
import { addSquare, renderBoard } from '#page/sounds/fixtures/boards.ts';
import { type Arrival, watchMoves } from './watch.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

interface Shown {
  readonly placement: string;
  readonly lastMove: readonly Square[];
  /** Chessground's check mark, wherever Lichess left it. */
  readonly check?: Square;
  /** The piece still sliding there. */
  readonly sliding?: Square;
}

/** Redraws the board in place, as chessground does after a move. */
function show(board: Element, { placement, lastMove, check, sliding }: Shown): void {
  board.replaceChildren();
  for (const [key, piece] of parsePlacement(placement)) {
    const className = `${piece.color} ${piece.role}${key === sliding ? ' anim' : ''}`;
    board.append(Object.assign(createCustomElement('piece', { className }), { cgKey: key }));
  }
  for (const key of lastMove) addSquare(board, 'last-move', key);
  if (check) addSquare(board, 'check', check);
}

/** Lets the observer's callback run, then the frame it reads the board in. */
async function nextFrame(): Promise<void> {
  await Promise.resolve();
  vi.advanceTimersToNextFrame();
}

let arrivals: Arrival[];
let stop: () => void;

function watch(placement = START): Element {
  const board = renderBoard({ placement, orientation: 'white' });
  arrivals = [];
  stop = watchMoves(board, arrival => arrivals.push(arrival));
  return board;
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'],
  });
});

afterEach(() => {
  stop();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('the backlit board’s moves', () => {
  it('reports a move once the board shows it, and not a redraw of it', async () => {
    const board = watch();
    const moved = {
      placement: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
      lastMove: ['e2', 'e4'],
    } as const;
    show(board, moved);
    await nextFrame();
    expect(arrivals).toEqual([
      { role: 'pawn', color: 'white', from: 'e2', to: 'e4', strong: false, check: null },
    ]);
    show(board, moved);
    await nextFrame();
    expect(arrivals).toHaveLength(1);
  });

  it('makes a capture and a promotion strong', async () => {
    const board = watch('4k3/1P6/8/3p4/4P3/8/8/4K3');
    show(board, { placement: '4k3/1P6/8/3P4/8/8/8/4K3', lastMove: ['e4', 'd5'] });
    await nextFrame();
    show(board, { placement: '4k3/1P6/3P4/8/8/8/8/4K3', lastMove: ['d5', 'd6'] });
    await nextFrame();
    show(board, { placement: '1N2k3/8/3P4/8/8/8/8/4K3', lastMove: ['b7', 'b8'] });
    await nextFrame();
    expect(arrivals.map(({ strong }) => strong)).toEqual([true, false, true]);
  });

  it('reads a check off the position, not off the mark Lichess leaves behind', async () => {
    const board = watch('4k3/8/8/8/8/8/8/R3K3');
    show(board, { placement: 'R3k3/8/8/8/8/8/8/4K3', lastMove: ['a1', 'a8'], check: 'e8' });
    await nextFrame();
    // The king steps away; Lichess's game and TV pages keep the mark on e8.
    show(board, { placement: 'R7/5k2/8/8/8/8/8/4K3', lastMove: ['e8', 'f7'], check: 'e8' });
    await nextFrame();
    show(board, { placement: '8/R4k2/8/8/8/8/8/4K3', lastMove: ['a8', 'a7'], check: 'e8' });
    await nextFrame();
    expect(arrivals.map(({ check }) => check)).toEqual(['e8', null, 'f7']);
  });

  it('waits for a sliding piece to land, at most as long as a slide takes', async () => {
    const board = watch();
    const placement = 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R';
    show(board, { placement, lastMove: ['g1', 'f3'], sliding: 'f3' });
    await nextFrame();
    expect(arrivals).toEqual([]);
    board.querySelector('piece.anim')?.classList.remove('anim');
    await nextFrame();
    expect(arrivals.map(({ to }) => to)).toEqual(['f3']);
    show(board, {
      placement: 'rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R',
      lastMove: ['g8', 'f6'],
      sliding: 'f6',
    });
    await nextFrame();
    vi.advanceTimersByTime(800);
    expect(arrivals.map(({ to }) => to)).toEqual(['f3', 'f6']);
  });

  it('lights the move shown, not the marks chessground hid to reuse', async () => {
    const board = watch('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
    show(board, {
      placement: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R',
      lastMove: ['g1', 'f3'],
    });
    // The marks of 1…e5, hidden ahead of the new ones with their old squares.
    const hidden = (['e7', 'e5'] as const).map(key => {
      const mark = Object.assign(createCustomElement('square', { className: 'last-move' }), {
        cgKey: key,
      });
      mark.style.display = 'none';
      return mark;
    });
    board.prepend(...hidden);
    await nextFrame();
    expect(arrivals.map(({ from, to }) => `${from}${to}`)).toEqual(['g1f3']);
  });

  it('stops once told', async () => {
    const board = watch();
    stop();
    show(board, {
      placement: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR',
      lastMove: ['e2', 'e4'],
    });
    await nextFrame();
    expect(arrivals).toEqual([]);
  });
});

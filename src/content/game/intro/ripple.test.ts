import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { ripple } from './ripple.ts';
import type { Stage } from './stage.ts';

const playWave = vi.hoisted(() =>
  vi.fn<
    (findBoard: () => HTMLElement | null, plan: unknown, signal?: AbortSignal) => Promise<void>
  >(() => Promise.resolve()),
);

vi.mock('#content/board-wave/load.ts', () => ({ loadWave: () => Promise.resolve(playWave) }));

afterEach(() => {
  playWave.mockClear();
  document.body.innerHTML = '';
});

/** A stage over the board, whose undos the test runs as the intro ends. */
function stageOver(board: HTMLElement, undos: (() => void)[]): Stage {
  const box = { x: 0, y: 0, width: 400, height: 400 };
  const side = {
    bar: board,
    avatar: box,
    player: {
      name: '',
      user: undefined,
      title: undefined,
      rating: undefined,
      flag: undefined,
      computer: false,
    },
    color: 'white' as const,
  };
  return {
    root: document.body,
    board,
    squares: box,
    over: document.createElement('div'),
    top: side,
    bottom: { ...side, color: 'black' },
    setup: { icon: undefined, parts: [] },
    onEnd: undo => undos.push(undo),
  };
}

describe('the ripple', () => {
  it('runs the board’s wave up from the player’s side, and stops it as the intro ends', async () => {
    document.body.innerHTML =
      '<div class="cg-wrap"><cg-container><cg-board></cg-board></cg-container></div>';
    const wrap = document.querySelector<HTMLElement>('.cg-wrap');
    const board = document.querySelector<HTMLElement>('cg-board');
    if (!wrap || !board) throw new Error('no board');
    const undos: (() => void)[] = [];
    ripple.play(stageOver(board, undos));
    await flush();
    const [findBoard, plan, signal] = playWave.mock.calls[0] ?? [];
    expect(findBoard?.()).toBe(wrap);
    expect(plan).toMatchObject({ type: 'vertical' });
    expect(signal?.aborted).toBe(false);
    for (const undo of undos) undo();
    expect(signal?.aborted).toBe(true);
    // The board gone, the wave has nothing to follow.
    wrap.remove();
    expect(findBoard?.()).toBeNull();
  });
});

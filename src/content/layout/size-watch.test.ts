import { describe, expect, it, vi } from 'vitest';
import { fakeLayout } from '#shared/testing/layout.ts';
import { createSizeWatch } from './size-watch.ts';

describe('createSizeWatch', () => {
  it('measures on new elements and after a resize only', () => {
    const layout = fakeLayout(() => 0);
    const measure = vi.fn<() => void>();
    const board = document.createElement('div');
    const wrapper = document.createElement('div');
    const watch = createSizeWatch(measure);
    watch.watch([board, wrapper]);
    expect(measure).toHaveBeenCalledTimes(1);
    watch.watch([board, wrapper]);
    expect(measure).toHaveBeenCalledTimes(1);
    layout.resize();
    expect(measure).toHaveBeenCalledTimes(2);
    // Lichess drew a new board.
    watch.watch([document.createElement('div'), wrapper]);
    expect(measure).toHaveBeenCalledTimes(3);
    watch.watch([wrapper]);
    expect(measure).toHaveBeenCalledTimes(4);
    watch.watch([wrapper]);
    expect(measure).toHaveBeenCalledTimes(4);
  });
});

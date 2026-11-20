import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { afterBoardWave } from './after-wave.ts';

/** Whether it has let the analysis through, once the promises have run. */
async function letThrough(): Promise<() => boolean> {
  let through = false;
  void (async () => {
    await afterBoardWave();
    through = true;
  })();
  await flush();
  return () => through;
}

const addWave = (): HTMLElement => {
  const layer = document.createElement('div');
  layer.className = 'ln-ext-board-wave';
  document.body.append(layer);
  return layer;
};

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('the game’s analysis, after the board’s wave', () => {
  it('goes at once with no wave', async () => {
    expect((await letThrough())()).toBe(true);
  });

  it('waits for the wave’s layer to go', async () => {
    const layer = addWave();
    const through = await letThrough();
    expect(through()).toBe(false);
    document.body.append(document.createElement('div'));
    await flush();
    expect(through()).toBe(false);
    layer.remove();
    await flush();
    expect(through()).toBe(true);
  });

  it('waits no longer than a wave lasts', async () => {
    vi.useFakeTimers();
    addWave();
    let through = false;
    void (async () => {
      await afterBoardWave();
      through = true;
    })();
    await vi.advanceTimersByTimeAsync(5999);
    expect(through).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(through).toBe(true);
  });
});

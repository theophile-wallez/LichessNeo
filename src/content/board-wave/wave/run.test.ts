import { afterEach, describe, expect, it, vi } from 'vitest';
import { startPlan } from '#content/board-wave/plan.ts';
import type * as Run from './run.ts';

// WebGL isn't in happy-dom: the renderer is a stand-in that counts what's made of it.
const renderers = vi.hoisted(() => {
  class FakeRenderer {
    static made: FakeRenderer[] = [];
    readonly canvas = document.createElement('canvas');
    readonly maxTextureSize = 4096;
    lost = false;
    parked = 0;
    disposed = false;
    static create(): FakeRenderer {
      const renderer = new FakeRenderer();
      FakeRenderer.made.push(renderer);
      return renderer;
    }
    setArea(): void {}
    setPicture(): void {}
    render(): void {}
    park(): void {
      this.parked++;
    }
    dispose(): void {
      this.disposed = true;
    }
  }
  return FakeRenderer;
});

vi.mock('./renderer.ts', () => ({ WaveRenderer: renderers }));
vi.mock('./capture/snapshot.ts', () => ({ snapshot: () => Promise.resolve(null) }));

// The renderer it keeps is the module's: each test has a fresh one.
const loadRun = async (): Promise<typeof Run> => {
  vi.resetModules();
  return import('./run.ts');
};

afterEach(() => {
  renderers.made.splice(0);
  document.body.innerHTML = '';
});

/** A wave over a board, stopped at its first frame. */
async function playOnce({ playWave }: typeof Run): Promise<void> {
  const board = document.createElement('div');
  document.body.append(board);
  const stop = new AbortController();
  const played = playWave(() => board, startPlan(null), stop.signal);
  stop.abort();
  await played;
}

describe('the wave’s renderer', () => {
  it('is compiled once, ahead, and kept from one wave to the next', async () => {
    const run = await loadRun();
    run.warmWave();
    await playOnce(run);
    await playOnce(run);
    expect(renderers.made).toHaveLength(1);
    expect(renderers.made[0]?.parked).toBe(3);
    expect(renderers.made[0]?.disposed).toBe(false);
    expect(document.querySelector('.ln-ext-board-wave')).toBeNull();
  });

  it('is made anew once the GPU has lost it', async () => {
    const run = await loadRun();
    run.warmWave();
    const lost = renderers.made[0];
    if (lost) lost.lost = true;
    await playOnce(run);
    expect(renderers.made).toHaveLength(2);
    expect(lost?.disposed).toBe(true);
  });
});

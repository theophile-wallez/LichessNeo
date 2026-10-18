import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  // The loop's tasks live in the module: each test imports a fresh copy.
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setInterval'] });
});

afterEach(() => {
  vi.useRealTimers();
  setHidden(false);
});

function setHidden(hidden: boolean): void {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

const fail = (): void => {
  throw new Error('no');
};

describe('sync loop', () => {
  it('runs the tasks in registration order, four times a second', async () => {
    const { onEveryTick, startSyncLoop } = await import('./sync-loop.ts');
    const ran: string[] = [];
    onEveryTick('first', () => ran.push('first'));
    onEveryTick('second', () => ran.push('second'));
    startSyncLoop();
    expect(ran).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(ran).toEqual(Array.from({ length: 4 }, () => ['first', 'second']).flat());
  });

  it('keeps running the others when one throws, and reports it once', async () => {
    const { onEveryTick, startSyncLoop } = await import('./sync-loop.ts');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ran: string[] = [];
    onEveryTick('first', () => ran.push('first'));
    onEveryTick('broken', fail);
    onEveryTick('last', () => ran.push('last'));
    startSyncLoop();
    vi.advanceTimersByTime(750);
    expect(ran).toEqual(['first', 'last', 'first', 'last', 'first', 'last']);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('[LichessNeo] broken failed', expect.any(Error));
  });

  it('reports each broken task on its own', async () => {
    const { onEveryTick, startSyncLoop } = await import('./sync-loop.ts');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    onEveryTick('one', fail);
    onEveryTick('two', fail);
    startSyncLoop();
    vi.advanceTimersByTime(500);
    expect(error).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenNthCalledWith(1, '[LichessNeo] one failed', expect.any(Error));
    expect(error).toHaveBeenNthCalledWith(2, '[LichessNeo] two failed', expect.any(Error));
  });

  it('rests while the tab is hidden, and catches up as it shows', async () => {
    const { onEveryTick, startSyncLoop } = await import('./sync-loop.ts');
    let runs = 0;
    onEveryTick('count', () => {
      runs++;
    });
    startSyncLoop();
    setHidden(true);
    vi.advanceTimersByTime(1000);
    expect(runs).toBe(0);
    setHidden(false);
    expect(runs).toBe(1);
    vi.advanceTimersByTime(250);
    expect(runs).toBe(2);
  });
});

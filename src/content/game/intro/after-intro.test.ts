import { afterEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { afterIntro, introComing, introOver, introStarted } from './after-intro.ts';

/** Whether what waits for the intro from now has been let through. */
function waiting(): () => boolean {
  let through = false;
  void (async () => {
    await afterIntro();
    through = true;
  })();
  return () => through;
}

async function letThrough(): Promise<() => boolean> {
  const through = waiting();
  await flush();
  return through;
}

afterEach(() => {
  introOver();
  vi.useRealTimers();
});

describe('what waits for the game’s intro', () => {
  it('goes at once when none is coming', async () => {
    expect((await letThrough())()).toBe(true);
  });

  it('waits while one is coming or playing, and goes once it is over', async () => {
    introComing();
    const through = await letThrough();
    expect(through()).toBe(false);
    introStarted();
    await flush();
    expect(through()).toBe(false);
    introOver();
    await flush();
    expect(through()).toBe(true);
  });

  it('stops waiting for an intro that never starts, but not for one that plays', async () => {
    vi.useFakeTimers();
    introComing();
    const through = waiting();
    await vi.advanceTimersByTimeAsync(3999);
    expect(through()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(through()).toBe(true);

    introComing();
    introStarted();
    const playing = waiting();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(playing()).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { coachesMove } from './load.ts';

// chrome.storage.sync, as the settings read it, answering only when the test says so.
let answer: (settings: unknown) => void = () => {};
const getURL = vi.fn<(path: string) => string>((path: string) => `chrome-extension://id/${path}`);

beforeEach(() => {
  vi.stubGlobal('chrome', {
    runtime: { id: 'test', getURL },
    storage: {
      sync: {
        get: (key: string) =>
          new Promise(resolve => (answer = settings => resolve({ [key]: settings }))),
      },
      onChanged: { addListener: () => {} },
    },
  });
});

afterEach(() => {
  localStorage.clear();
});

describe('coachesMove', () => {
  it('follows the switch last kept, then the settings once read', async () => {
    localStorage.setItem('lr-ext-coach-options', '{"motion":false,"analysis":true}');
    expect(coachesMove()).toBe(false);
    answer({ coachMotion: true });
    await flush();
    expect(coachesMove()).toBe(true);
  });
});

describe('loadMascots', () => {
  it('doesn’t load the mascots’ bundle while the coaches are kept still', async () => {
    localStorage.setItem('lr-ext-coach-options', '{"motion":false,"analysis":true}');
    // Settings not read yet: the switch last kept says.
    vi.resetModules();
    const fresh = await import('./load.ts');
    await expect(fresh.loadMascots()).resolves.toBeNull();
    expect(getURL).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Feature } from '#shared/features.ts';
import { trackListeners } from '#shared/testing/listeners.ts';
// What the original script sent and reloaded, on the same clock.
import legacy from './fixtures/legacy.json' with { type: 'json' };

type Scenario = (typeof legacy.scenarios)[number];
interface OddScenario {
  readonly name: string;
  readonly manifest: object;
  readonly answer: unknown;
  readonly release?: boolean;
}

/** The feature as a build with `LN_EXT_DEV_BUILD` set so would have it: the module reads it once. */
async function devReloadFor(devBuild: boolean): Promise<Feature> {
  vi.stubGlobal('LN_EXT_DEV_BUILD', devBuild);
  vi.resetModules();
  const { devReload } = await import('./reload.ts');
  return devReload;
}

function setVisibility(state: string): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

let removeListeners = (): void => {};
beforeEach(() => {
  removeListeners = trackListeners(document, window);
  vi.useFakeTimers({ now: 0 });
});
afterEach(() => {
  removeListeners();
  vi.useRealTimers();
  setVisibility('visible');
});

interface Entry {
  readonly at: number;
  readonly event: string;
  readonly message?: unknown;
}

async function play(scenario: Scenario | OddScenario): Promise<Entry[]> {
  const log: Entry[] = [];
  const runtime = {
    id: 'orphaned' in scenario ? undefined : 'abc',
    getManifest: () => scenario.manifest,
    sendMessage: (message: unknown) => {
      log.push({ at: Date.now(), event: 'send', message });
      if ('reject' in scenario) return Promise.reject(new Error('no receiver'));
      return Promise.resolve('answer' in scenario ? scenario.answer : undefined);
    },
  };
  vi.stubGlobal('chrome', { runtime });
  // The original told a store install by its update_url; a release build now.
  const release = 'update_url' in scenario.manifest || ('release' in scenario && scenario.release);
  vi.stubGlobal('location', { reload: () => log.push({ at: Date.now(), event: 'reload' }) });
  setVisibility('hidden' in scenario ? 'hidden' : 'visible');

  (await devReloadFor(!release)).start();
  await vi.advanceTimersByTimeAsync(10);
  window.dispatchEvent(new Event('focus'));
  await vi.advanceTimersByTimeAsync(10);
  if ('orphanAfter' in scenario) {
    await vi.advanceTimersByTimeAsync(scenario.orphanAfter);
    runtime.id = undefined;
    log.push({ at: Date.now(), event: 'orphaned' });
  }
  await vi.advanceTimersByTimeAsync(1000);
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.advanceTimersByTimeAsync(10);
  return log;
}

describe('devReload', () => {
  it.each(legacy.scenarios)('$name: as the original', async scenario => {
    expect(await play(scenario)).toEqual(scenario.log);
  });

  it('takes only a yes for a reload (the original took any truthy answer)', async () => {
    const log = await play({ name: 'odd answer', manifest: {}, answer: { reload: 'yes' } });
    expect(log.filter(entry => entry.event === 'reload')).toEqual([]);
    expect(log.filter(entry => entry.event === 'send')).toHaveLength(3);
  });

  it('checks once when focus and visibilitychange come together', async () => {
    let sends = 0;
    // The worker takes a while to hash the files.
    const sendMessage = async (): Promise<unknown> => {
      sends += 1;
      await new Promise(resolve => setTimeout(resolve, 50));
      return { reload: false };
    };
    vi.stubGlobal('chrome', { runtime: { id: 'abc', getManifest: () => ({}), sendMessage } });
    (await devReloadFor(true)).start();
    await vi.advanceTimersByTimeAsync(100);
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(100);
    expect(sends).toBe(2);
  });

  it('never checks in a release build', async () => {
    const log = await play({
      name: 'release',
      manifest: {},
      answer: { reload: true },
      release: true,
    });
    expect(log).toEqual([]);
  });

  it('reloads a move link on its move, after Lichess dropped its hash', async () => {
    const address = { pathname: '/game/abcdefgh/white', search: '', hash: '#31' };
    const reloaded: string[] = [];
    // Lichess drops the hash through `history`, which a reload then reads.
    vi.stubGlobal('location', {
      pathname: address.pathname,
      search: address.search,
      reload: () => reloaded.push(`${address.pathname}${address.search}${address.hash}`),
      get hash() {
        return address.hash;
      },
    });
    vi.stubGlobal('history', {
      state: null,
      replaceState: (_state: unknown, _unused: string, url: string) => {
        address.hash = new URL(url, 'https://lichess.org').hash;
      },
    });
    const runtime: {
      id: string | undefined;
      getManifest: () => object;
      sendMessage: () => Promise<unknown>;
    } = {
      id: 'abc',
      getManifest: () => ({}),
      sendMessage: async () => ({ reload: true }),
    };
    vi.stubGlobal('chrome', { runtime });
    (await devReloadFor(true)).start();
    address.hash = '';
    await vi.advanceTimersByTimeAsync(10);
    runtime.id = undefined;
    await vi.advanceTimersByTimeAsync(1000);
    expect(reloaded).toEqual(['/game/abcdefgh/white#31']);
  });
});

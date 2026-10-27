import { afterEach, describe, expect, it, vi } from 'vitest';
import { restoreReadyState, setReadyState } from '#shared/testing/ready-state.ts';
import { flush } from '#shared/testing/timers.ts';
import { initDataPrefs } from './lichess-prefs.ts';

const round = (pref: unknown): string => JSON.stringify({ data: { game: {}, pref } });
const analysis = (pref: unknown): string => JSON.stringify({ cfg: { data: { pref } } });

afterEach(() => {
  restoreReadyState();
  document.body.className = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtPrefs;
});

describe('the preferences in a page’s init data', () => {
  it('reads "Material difference" off where Lichess leaves it out, as it does a false one', () => {
    expect(initDataPrefs(round({ animationDuration: 250 }))).toEqual(['no-captured']);
    expect(initDataPrefs(round({ showCaptured: false, animationDuration: 250 }))).toEqual([
      'no-captured',
    ]);
    expect(initDataPrefs(round({ showCaptured: true, animationDuration: 250 }))).toEqual([]);
  });

  it('reads a game whose pieces Lichess doesn’t animate', () => {
    expect(initDataPrefs(round({ showCaptured: true, animationDuration: 0 }))).toEqual([
      'no-animation',
    ]);
  });

  it('reads an analysis board’s, in its cfg', () => {
    expect(initDataPrefs(analysis({ showCaptured: false, animationDuration: 0 }))).toEqual([
      'no-captured',
      'no-animation',
    ]);
  });

  it('knows nothing of a watcher Lichess sends no prefs for, nor of another page', () => {
    expect(initDataPrefs(round(null))).toEqual([]);
    expect(initDataPrefs(JSON.stringify({ data: { game: {} } }))).toEqual([]);
    expect(initDataPrefs(JSON.stringify({ i18n: {} }))).toEqual([]);
    expect(initDataPrefs('not json')).toEqual([]);
    expect(initDataPrefs(null)).toEqual([]);
  });
});

async function startWhileParsing(): Promise<void> {
  vi.resetModules();
  const { lichessPrefs } = await import('./lichess-prefs.ts');
  setReadyState('loading');
  lichessPrefs.start();
}

describe('lichessPrefs', () => {
  it('copies an inside pick of the coordinates from the body the server sent', async () => {
    document.body.className = 'coords-in playing';
    await startWhileParsing();
    // Lichess swaps the classes later, while its eval gauge shows: the pick stays.
    document.body.className = 'coords-out playing';
    expect(document.documentElement.dataset.lnExtPrefs).toBe('coords-in');
  });

  it('marks nothing for coordinates outside', async () => {
    document.body.className = 'coords-out';
    await startWhileParsing();
    expect(document.documentElement.dataset.lnExtPrefs).toBeUndefined();
  });

  it('adds the init data’s words once the page is parsed', async () => {
    document.body.className = 'coords-in';
    await startWhileParsing();
    const data = document.createElement('script');
    data.id = 'page-init-data';
    data.textContent = round({ animationDuration: 0 });
    document.body.append(data);
    await flush();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(document.documentElement.dataset.lnExtPrefs).toBe('coords-in no-captured no-animation');
  });
});

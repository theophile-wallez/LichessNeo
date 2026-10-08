import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { SessionKey } from '#shared/storage.ts';
import { flush } from '#shared/testing/timers.ts';
import { INTRO_MS, prepareIntro, syncIntro } from './index.ts';

const GAME_ID = 'abcd1234';

const initData = (spectator: boolean): string =>
  JSON.stringify({
    data: {
      game: { id: GAME_ID, status: { name: 'started' }, turns: 0 },
      player: { color: 'black', spectator },
    },
  });

// The game page as Lichess serves it, seen from Black.
const ROUND =
  '<main class="round"><div class="round__app">' +
  '<div class="round__app__board main-board"><div class="cg-wrap orientation-black">' +
  '<cg-container><cg-board></cg-board></cg-container></div></div>' +
  '<div class="ruser-top ruser user-link"><a class="user-link" href="/@/alice">alice</a><rating>1500</rating></div>' +
  '<div class="ruser-bottom ruser user-link"><name>Anonymous</name></div>' +
  '</div></main>';

const decoding: (() => void)[] = [];
const decoded = (): void => {
  for (const resolve of decoding.splice(0)) resolve();
};

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal('chrome', {
    runtime: { getURL: (path: string) => `chrome-extension://id/${path}` },
  });
  // The swords' image, decoded when the test says so.
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      decode = (): Promise<void> =>
        new Promise(resolve => {
          decoding.push(resolve);
        });
    },
  );
  document.body.innerHTML = ROUND;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const main = (): HTMLElement | null => queryOne(document, 'main.round', HTMLElement);
const intro = (): Element | null => document.querySelector('main.round > .cdc-intro');

describe('the game intro', () => {
  it('drops once its images are decoded, faces the players, and leaves on time', async () => {
    prepareIntro(initData(false));
    syncIntro();
    expect(intro()).toBeNull();
    decoded();
    await flush();
    vi.useFakeTimers();
    syncIntro();
    expect(intro()?.querySelector('.cdc-intro__card--top .cdc-intro__username')?.textContent).toBe(
      'alice',
    );
    expect(
      intro()?.querySelector('.cdc-intro__card--bottom .cdc-intro__username')?.textContent,
    ).toBe('Anonymous');
    expect(main()?.dataset.cdcIntro).toBe('');
    expect(main()?.style.getPropertyValue('--cdc-intro-board')).toMatch(
      /^url\("data:image\/svg\+xml,%3Csvg%20/,
    );
    expect(main()?.style.getPropertyValue('--cdc-intro-swords')).toBe(
      "url('chrome-extension://id/img/hugeicons/swords--ffc689.svg')",
    );
    expect(sessionStorage.getItem(SessionKey.gameIntro(GAME_ID))).toBe('1');
    vi.advanceTimersByTime(INTRO_MS);
    expect(intro()).toBeNull();
    expect(main()?.dataset.cdcIntro).toBeUndefined();
    expect(main()?.style.getPropertyValue('--cdc-intro-board')).toBe('');
    expect(main()?.style.getPropertyValue('--cdc-intro-swords')).toBe('');
    // Once only.
    syncIntro();
    expect(intro()).toBeNull();
  });

  it('plays once per game, even across reloads', async () => {
    sessionStorage.setItem(SessionKey.gameIntro(GAME_ID), '1');
    prepareIntro(initData(false));
    decoded();
    await flush();
    syncIntro();
    expect(intro()).toBeNull();
  });

  it('leaves spectators alone', async () => {
    prepareIntro(initData(true));
    decoded();
    await flush();
    syncIntro();
    expect(intro()).toBeNull();
  });

  it('waits for the tab to be seen', async () => {
    prepareIntro(initData(false));
    decoded();
    await flush();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    syncIntro();
    expect(intro()).toBeNull();
    visibility.mockReturnValue('visible');
    syncIntro();
    expect(intro()).not.toBeNull();
  });
});

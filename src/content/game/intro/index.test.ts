import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { SessionKey } from '#shared/storage.ts';
import { flush } from '#shared/testing/timers.ts';
import { FACEOFF_MS } from './faceoff.ts';
import { prepareIntro, syncIntro } from './index.ts';

// The intro the settings pick, and whether they're read yet.
const settings = vi.hoisted(() => ({ gameIntro: 'faceoff', read: true }));

vi.mock('#content/settings/settings.ts', () => ({
  currentSettings: () => settings,
  settingsRead: () => settings.read,
}));

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
    i18n: { getMessage: (name: string) => name },
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
  Object.assign(settings, { gameIntro: 'faceoff', read: true });
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const main = (): HTMLElement | null => queryOne(document, 'main.round', HTMLElement);
const intro = (): Element | null => document.querySelector('main.round > .ln-ext-intro');

describe('the game intro', () => {
  it('drops once its images are decoded, faces the players, and leaves on time', async () => {
    prepareIntro(initData(false));
    syncIntro();
    expect(intro()).toBeNull();
    decoded();
    await flush();
    vi.useFakeTimers();
    syncIntro();
    expect(
      intro()?.querySelector('.ln-ext-intro__card--top .ln-ext-intro__username')?.textContent,
    ).toBe('alice');
    expect(
      intro()?.querySelector('.ln-ext-intro__card--bottom .ln-ext-intro__username')?.textContent,
    ).toBe('Anonymous');
    expect(main()?.dataset.lnExtIntro).toBe('faceoff');
    expect(main()?.style.getPropertyValue('--ln-ext-intro-board')).toMatch(
      /^url\("data:image\/svg\+xml,%3Csvg%20/,
    );
    expect(main()?.style.getPropertyValue('--ln-ext-intro-swords')).toBe(
      "url('chrome-extension://id/img/hugeicons/swords--ffc689.svg')",
    );
    expect(sessionStorage.getItem(SessionKey.gameIntro(GAME_ID))).toBe('1');
    vi.advanceTimersByTime(FACEOFF_MS);
    expect(intro()).toBeNull();
    expect(main()?.dataset.lnExtIntro).toBeUndefined();
    expect(main()?.style.getPropertyValue('--ln-ext-intro-board')).toBe('');
    expect(main()?.style.getPropertyValue('--ln-ext-intro-swords')).toBe('');
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

  it('plays the intro the settings pick, once they are read', async () => {
    Object.assign(settings, { gameIntro: 'ticket', read: false });
    prepareIntro(initData(false));
    decoded();
    await flush();
    vi.useFakeTimers();
    syncIntro();
    expect(document.querySelector('.ln-ext-intro-fx')).toBeNull();
    settings.read = true;
    syncIntro();
    expect(queryOne(document, '.ln-ext-intro-fx', HTMLElement)?.dataset.lnExtIntro).toBe('ticket');
    expect(main()?.dataset.lnExtIntro).toBe('ticket');
    expect(document.querySelector('.ln-ext-intro-ticket__who b')?.textContent).toBe('alice');
    vi.runAllTimers();
    expect(document.querySelector('.ln-ext-intro-fx')).toBeNull();
    expect(main()?.dataset.lnExtIntro).toBeUndefined();
  });

  it('plays none when the settings say so, nor later', async () => {
    settings.gameIntro = 'off';
    prepareIntro(initData(false));
    decoded();
    await flush();
    syncIntro();
    settings.gameIntro = 'salute';
    syncIntro();
    expect(document.querySelector('.ln-ext-intro-fx, .ln-ext-intro')).toBeNull();
    expect(sessionStorage.getItem(SessionKey.gameIntro(GAME_ID))).toBeNull();
  });

  it('keeps the face-off to our desktop layout, but not the others', async () => {
    const narrow = vi.spyOn(window, 'matchMedia').mockReturnValue(
      Object.assign(new EventTarget(), {
        matches: false,
        media: '',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
      }),
    );
    prepareIntro(initData(false));
    decoded();
    await flush();
    syncIntro();
    expect(intro()).toBeNull();
    sessionStorage.clear();
    settings.gameIntro = 'salute';
    prepareIntro(initData(false));
    decoded();
    await flush();
    syncIntro();
    expect(document.querySelector('.ln-ext-intro-fx')).not.toBeNull();
    narrow.mockRestore();
  });
});

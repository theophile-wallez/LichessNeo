import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's Play section, and the home's lobby with its tabs (pools, lobby, correspondence).
const NAV = `<nav id="topnav"><section><a href="/">Play</a><div role="group">
  <a href="/?any#hook">Create lobby game</a><a href="/tournament">Arena tournaments</a>
</div></section></nav>`;
const LOBBY = `<main class="lobby"><div class="lobby__app"><div class="tabs-horiz">
  <button>Quick pairing</button><button>Lobby</button><button>Correspondence</button>
</div></div></main>`;

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => `[${name}]` } });
  vi.spyOn(window, 'scrollTo').mockReturnValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
});

// Imported first: happy-dom fires a hashchange after replaceState, which the last test's
// listener would answer, dropping the hash, while the import is still on its way.
async function start(path: string, markup: string): Promise<void> {
  const { lobbyLink } = await import('./lobby-link.ts');
  history.replaceState(null, '', path);
  document.body.innerHTML = markup;
  lobbyLink.start();
}

const lobbyLink = (): HTMLAnchorElement | null =>
  queryOne(document, '#topnav div a', HTMLAnchorElement);

describe('the nav’s Lobby', () => {
  it('stands for Lichess’s Create lobby game, and leads to the home’s lobby', async () => {
    await start('/tv', NAV);
    expect(lobbyLink()?.getAttribute('href')).toBe('/#lobby');
    expect(lobbyLink()?.textContent).toBe('[navLobby]');
  });

  // The home opens at its top, as any page does: a lobby scrolled to hid the quick pairing.
  it('opens the home on its lobby tab, without the hash, at its top', async () => {
    localStorage.setItem('lobby.tab:-', 'seeks');
    localStorage.setItem('lobby.tab:eresy', 'pools');
    await start('/#lobby', NAV + LOBBY);
    expect(localStorage.getItem('lobby.tab:-')).toBe('real_time');
    expect(localStorage.getItem('lobby.tab:eresy')).toBe('real_time');
    expect(location.hash).toBe('');
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('switches the home to its lobby tab when followed there, and goes back to its top', async () => {
    await start('/', `${NAV}<div id="main-wrap">${LOBBY}</div>`);
    const picked = vi.fn<(event: Event) => void>();
    document.querySelectorAll('.tabs-horiz button')[1]?.addEventListener('click', picked);
    const mainWrap = queryOne(document, '#main-wrap', HTMLElement);
    if (!mainWrap) throw new Error('no #main-wrap');
    const mainScrolls = vi.spyOn(mainWrap, 'scrollTo').mockReturnValue(undefined);
    history.replaceState(null, '', '/#lobby');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(picked).toHaveBeenCalledOnce();
    expect(location.hash).toBe('');
    // On desktop #main-wrap scrolls, below 1020px the window.
    expect(mainScrolls.mock.calls).toEqual([[{ top: 0, behavior: 'smooth' }]]);
    expect(vi.mocked(window.scrollTo).mock.calls).toEqual([[{ top: 0, behavior: 'smooth' }]]);
  });

  it('leaves the stored tab alone on any other way to the home', async () => {
    localStorage.setItem('lobby.tab:-', 'seeks');
    await start('/', NAV);
    expect(localStorage.getItem('lobby.tab:-')).toBe('seeks');
  });
});

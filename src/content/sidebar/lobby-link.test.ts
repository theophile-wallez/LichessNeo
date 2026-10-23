import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// The sync loop's tasks, run by hand.
const ticks = vi.hoisted((): (() => void)[] => []);
vi.mock('#content/sync-loop.ts', () => ({
  onEveryTick: (_name: string, run: () => void) => ticks.push(run),
}));

// Lichess's Play section, and the home's lobby with its tabs (pools, lobby, correspondence).
const NAV = `<nav id="topnav"><section><a href="/">Play</a><div role="group">
  <a href="/?any#hook">Create lobby game</a><a href="/tournament">Arena tournaments</a>
</div></section></nav>`;
const LOBBY = `<main class="lobby"><div class="lobby__app"><div class="tabs-horiz">
  <button>Quick pairing</button><button>Lobby</button><button>Correspondence</button>
</div></div></main>`;

const scrolls = vi.fn<(options?: boolean | ScrollIntoViewOptions) => void>();

beforeEach(() => {
  vi.resetModules();
  ticks.length = 0;
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => `[${name}]` } });
  Element.prototype.scrollIntoView = scrolls;
});

afterEach(() => {
  vi.unstubAllGlobals();
  scrolls.mockClear();
  localStorage.clear();
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
});

async function start(path: string, markup: string): Promise<void> {
  history.replaceState(null, '', path);
  document.body.innerHTML = markup;
  const { lobbyLink } = await import('./lobby-link.ts');
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

  it('opens the home on its lobby tab, without the hash, scrolled to it once drawn', async () => {
    localStorage.setItem('lobby.tab:-', 'seeks');
    localStorage.setItem('lobby.tab:eresy', 'pools');
    await start('/#lobby', NAV);
    expect(localStorage.getItem('lobby.tab:-')).toBe('real_time');
    expect(localStorage.getItem('lobby.tab:eresy')).toBe('real_time');
    expect(location.hash).toBe('');
    for (const tick of ticks) tick();
    expect(scrolls).not.toHaveBeenCalled();
    document.body.insertAdjacentHTML('beforeend', LOBBY);
    for (const tick of ticks) tick();
    for (const tick of ticks) tick();
    expect(scrolls.mock.calls).toEqual([[{ block: 'start', behavior: 'instant' }]]);
  });

  it('switches the home to its lobby tab when followed there', async () => {
    await start('/', NAV + LOBBY);
    const picked = vi.fn<(event: Event) => void>();
    document.querySelectorAll('.tabs-horiz button')[1]?.addEventListener('click', picked);
    history.replaceState(null, '', '/#lobby');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(picked).toHaveBeenCalledOnce();
    expect(location.hash).toBe('');
    expect(scrolls.mock.calls).toEqual([[{ block: 'start', behavior: 'smooth' }]]);
  });

  it('leaves the stored tab alone on any other way to the home', async () => {
    localStorage.setItem('lobby.tab:-', 'seeks');
    await start('/', NAV);
    expect(localStorage.getItem('lobby.tab:-')).toBe('seeks');
    expect(ticks).toEqual([]);
  });
});

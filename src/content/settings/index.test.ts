import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { syncSettings } from './index.ts';

// IndexedDB isn't in happy-dom, nor WebGL: the packs' store and the mascots' bundle are mocked.
vi.mock('#content/packs/store.ts', () => ({
  readPack: vi.fn<(id: string) => Promise<Pack | null>>(() => Promise.resolve(null)),
  readPacks: vi.fn<() => Promise<Pack[]>>(() => Promise.resolve([])),
  writePack: vi.fn<(pack: Pack) => Promise<void>>(() => Promise.resolve()),
  deletePack: vi.fn<(id: string) => Promise<void>>(() => Promise.resolve()),
}));
vi.mock('#content/coach/load.ts', () => ({ loadMascots: () => Promise.resolve(null) }));

// The cards' markup names its messages as their modules load.
const i18n = vi.hoisted(() => {
  const messages = { getMessage: (name: string): string => name };
  vi.stubGlobal('chrome', { i18n: messages });
  return messages;
});

// An account page as lila serves it: its menu, then its content.
const accountPage = (classes = 'account page-menu'): string =>
  `<div id="main-wrap"><main class="${classes}">` +
  '<nav class="page-menu__menu subnav"><div class="subnav__inner">' +
  '<a class="active" href="/account/profile">Profile</a><div class="sep"></div>' +
  '<a href="/account/preferences/display">Display</a></div></nav>' +
  '<div class="page-menu__content box"><h1 class="box__top">Edit profile</h1></div>' +
  '</main></div>';

beforeEach(() => {
  vi.stubGlobal('chrome', {
    i18n,
    runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test/${path}` },
    storage: {
      sync: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
      onChanged: { addListener: () => {} },
    },
  });
  vi.stubGlobal('requestIdleCallback', (callback: () => void) => setTimeout(callback, 0));
  vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  document.body.innerHTML = accountPage();
});

afterEach(() => {
  history.replaceState(null, '', '/');
  document.body.innerHTML = '';
  localStorage.clear();
});

const open = (hash: string): void => {
  history.replaceState(null, '', `/account/profile${hash}`);
  syncSettings();
};

const main = (): HTMLElement | null => queryOne(document, 'main', HTMLElement);
const shownPages = (): (string | undefined)[] =>
  queryAll(document, '.ln-ext-settings__page', HTMLElement)
    .filter(page => !page.hidden)
    .map(page => page.dataset.lnExtPage);

describe('the extension’s settings on the account pages', () => {
  it('adds its links and its section once, closed on Lichess’s own page', () => {
    open('');
    syncSettings();
    expect(queryAll(document, '.ln-ext-settings-link', HTMLElement)).toHaveLength(1);
    expect(queryAll(document, 'main > .ln-ext-settings', HTMLElement)).toHaveLength(1);
    expect(main()?.dataset.lnExtSettings).toBeUndefined();
    expect(shownPages()).toEqual([]);
    expect(queryOne(document, '.subnav a.active', HTMLElement)?.getAttribute('href')).toBe(
      '/account/profile',
    );
  });

  it('opens the page its hash names, and marks it in the menu', () => {
    open('#ln-ext-extension/board');
    expect(main()?.dataset.lnExtSettings).toBe('');
    expect(shownPages()).toEqual(['board']);
    expect(
      queryAll(document, '.subnav a.active', HTMLElement).map(link => link.dataset.lnExtPage),
    ).toEqual(['board']);
    open('#ln-ext-extension');
    expect(shownPages()).toEqual(['appearance']);
    open('#something-else');
    expect(main()?.dataset.lnExtSettings).toBeUndefined();
    expect(shownPages()).toEqual([]);
  });

  it('opens each page at its top, and leaves the scroll alone on the next ticks', () => {
    const wrap = document.getElementById('main-wrap');
    if (!wrap) throw new Error('no #main-wrap');
    wrap.scrollTop = 400;
    open('#ln-ext-extension/board');
    expect(wrap.scrollTop).toBe(0);
    wrap.scrollTop = 120;
    syncSettings();
    expect(wrap.scrollTop).toBe(120);
    open('#ln-ext-extension/play');
    expect(wrap.scrollTop).toBe(0);
  });

  it('leads to the Packs card on the board’s page, once per visit of its link', () => {
    const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    open('#ln-ext-extension/board');
    expect(scrolled).not.toHaveBeenCalled();
    open('#ln-ext-extension/packs');
    expect(shownPages()).toEqual(['board']);
    expect(scrolled.mock.contexts).toEqual([queryOne(document, '.ln-ext-packs', HTMLElement)]);
    syncSettings();
    expect(scrolled).toHaveBeenCalledOnce();
  });

  it('builds them again on the next account page, and stays off the DGT board’s', () => {
    open('#ln-ext-extension/profile');
    document.body.innerHTML = accountPage();
    syncSettings();
    expect(queryAll(document, 'main > .ln-ext-settings', HTMLElement)).toHaveLength(1);
    expect(shownPages()).toEqual(['profile']);
    document.body.innerHTML = accountPage('account page-menu dgt');
    syncSettings();
    expect(queryOne(document, '.ln-ext-settings-link', HTMLElement)).toBeNull();
    expect(queryOne(document, '.ln-ext-settings', HTMLElement)).toBeNull();
  });
});

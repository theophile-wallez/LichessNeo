import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { addLinks, menuReady, showMenu } from './menu.ts';

// The account pages' menu as lila serves it, on the profile's page.
const MENU =
  '<nav class="page-menu__menu subnav"><div class="subnav__inner">' +
  '<a class="active" href="/account/profile">Profile</a>' +
  '<a href="/account/passwd">Password</a>' +
  '<div class="sep"></div>' +
  '<a href="/account/preferences/display">Display</a>' +
  '<a href="/account/preferences/game-display">Game display</a>' +
  '</div></nav>';

function menu(markup = MENU): HTMLElement {
  document.body.innerHTML = markup;
  const found = queryOne(document, '.subnav', HTMLElement);
  if (!found) throw new Error('no menu');
  return found;
}

const hrefs = (root: HTMLElement): (string | null)[] =>
  queryAll(root, 'a', HTMLElement).map(link => link.getAttribute('href'));
const active = (root: HTMLElement): (string | null)[] =>
  queryAll(root, 'a.active', HTMLElement).map(link => link.getAttribute('href'));

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => name } });
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('the settings’ menu links', () => {
  it('wait for Display while the menu parses', () => {
    expect(
      menuReady(menu('<nav class="subnav"><a href="/account/profile">P</a></nav>'), true),
    ).toBe(false);
    expect(menuReady(menu(), true)).toBe(true);
    expect(menuReady(menu('<nav class="subnav"></nav>'), false)).toBe(true);
  });

  it('go over Display, the section’s link and one per page, in their own group', () => {
    const nav = menu();
    const link = addLinks(nav);
    expect(link.getAttribute('href')).toBe('/account/profile#ln-ext-extension');
    expect(link.textContent).toBe('settingsLink');
    expect(hrefs(nav)).toEqual([
      '/account/profile',
      '/account/passwd',
      '/account/profile#ln-ext-extension',
      '#ln-ext-extension',
      '#ln-ext-extension/board',
      '#ln-ext-extension/profile',
      '#ln-ext-extension/play',
      '#ln-ext-extension/experimental',
      '#ln-ext-extension/backup',
      '#ln-ext-extension/support',
      '/account/preferences/display',
      '/account/preferences/game-display',
    ]);
    expect(
      queryAll(nav, '.ln-ext-settings-sublink', HTMLElement).map(sub => sub.textContent),
    ).toEqual([
      'settingsPageAppearance',
      'settingsPageBoard',
      'settingsPageProfile',
      'settingsPagePlay',
      'settingsPageExperimental',
      'settingsPageBackup',
      'settingsPageSupport',
    ]);
    expect(queryOne(nav, '.ln-ext-settings-sep + a', HTMLElement)?.textContent).toBe('Display');
  });

  it('go at the end of the links when the menu has no Display', () => {
    const nav = menu(
      '<nav class="subnav"><div class="subnav__inner"><a href="/x">X</a></div></nav>',
    );
    addLinks(nav);
    const inner = queryOne(nav, '.subnav__inner', HTMLElement);
    expect(inner?.firstElementChild?.getAttribute('href')).toBe('/x');
    expect(inner?.lastElementChild?.classList.contains('ln-ext-settings-sep')).toBe(true);
  });

  it('mark the page shown, and give Lichess’s page its mark back once closed', () => {
    const nav = menu();
    const link = addLinks(nav);
    showMenu(nav, 'board');
    expect(link.dataset.lnExtOpen).toBe('');
    expect(active(nav)).toEqual(['#ln-ext-extension/board']);
    showMenu(nav, 'play');
    expect(active(nav)).toEqual(['#ln-ext-extension/play']);
    showMenu(nav, null);
    expect(link.dataset.lnExtOpen).toBeUndefined();
    expect(active(nav)).toEqual(['/account/profile']);
  });
});

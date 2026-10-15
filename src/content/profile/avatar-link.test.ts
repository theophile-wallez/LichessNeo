import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { syncAvatarLink } from './avatar-link.ts';

// A profile's header as Lichess serves it, cut to what the link reads.
const PROFILE = (name: string): string =>
  '<main class="page-menu"><div class="user-show"><div class="box__top user-show__header">' +
  `<h1 class="user-link offline"><span class="user-link" data-href="/@/${name}">${name}</span></h1>` +
  '</div></div></main>';

const links = (): HTMLAnchorElement[] =>
  queryAll(document, '.user-show__header > a.lr-ext-avatar-edit', HTMLAnchorElement);

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string) => `[${name}]` } });
  document.body.dataset.user = 'eresy';
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

describe('syncAvatarLink', () => {
  it('links the user’s own avatar to the settings’ profile page, once', () => {
    document.body.innerHTML = PROFILE('Eresy');
    syncAvatarLink();
    syncAvatarLink();
    const [link, ...more] = links();
    expect(more).toEqual([]);
    expect(link?.getAttribute('href')).toBe('/account/profile#lr-ext-extension/profile');
    expect([link?.title, link?.getAttribute('aria-label')]).toEqual([
      '[avatarEdit]',
      '[avatarEdit]',
    ]);
    expect(link?.querySelector('svg')).not.toBeNull();
  });

  it('adds no link to another player’s profile, nor signed out', () => {
    document.body.innerHTML = PROFILE('Hikaru');
    syncAvatarLink();
    expect(links()).toEqual([]);
    document.body.innerHTML = PROFILE('Eresy');
    delete document.body.dataset.user;
    syncAvatarLink();
    expect(links()).toEqual([]);
  });

  it('drops the link as the header turns to another player', () => {
    document.body.innerHTML = PROFILE('Eresy');
    syncAvatarLink();
    const name = queryOne(document, 'h1 [data-href]', HTMLElement);
    if (name) name.dataset.href = '/@/Hikaru';
    syncAvatarLink();
    expect(links()).toEqual([]);
  });
});

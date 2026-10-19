import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { buildInterfacePage } from './interface-page.ts';

// chrome.storage.sync, as the settings read and write it, starting with the sounds off.
const synced = new Map<string, unknown>([['ln-ext-settings', { uiSounds: false }]]);

beforeEach(() => {
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (name: string) => name },
    runtime: { id: 'test' },
    storage: {
      sync: {
        get: (key: string) => Promise.resolve({ [key]: synced.get(key) }),
        set: (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) synced.set(key, value);
          return Promise.resolve();
        },
      },
      onChanged: { addListener: () => {} },
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  delete document.body.dataset.user;
});

const row = (page: HTMLElement, key: string): HTMLElement | null =>
  queryOne(page, `[data-ln-ext-setting='${key}']`, HTMLElement);
const switchOf = (page: HTMLElement): HTMLButtonElement | null =>
  queryOne(page, "[data-ln-ext-setting='uiSounds'] .ln-ext-switch", HTMLButtonElement);
const storedSettings = (): unknown => synced.get('ln-ext-settings');
const SELECT = "[data-ln-ext-setting='gameIntro'] .ln-ext-setting__select";
const PLAY = '.ln-ext-intro-preview__play';

describe('the settings’ Interface page', () => {
  it('shows the stored settings once read, and flips a switch', async () => {
    const page = buildInterfacePage();
    await flush();
    expect(switchOf(page)?.getAttribute('aria-checked')).toBe('false');
    expect(row(page, 'uiSounds')?.dataset.lnExtOn).toBeUndefined();
    switchOf(page)?.click();
    expect(storedSettings()).toMatchObject({ uiSounds: true });
    expect(switchOf(page)?.getAttribute('aria-checked')).toBe('true');
    expect(row(page, 'uiSounds')?.dataset.lnExtOn).toBe('');
  });

  it('keeps the rating the sidebar shows, from its menu', async () => {
    const page = buildInterfacePage();
    await flush();
    const select = queryOne(
      page,
      "[data-ln-ext-setting='sidebarRating'] .ln-ext-setting__select",
      HTMLSelectElement,
    );
    if (!select) throw new Error('no menu');
    select.value = 'blitz';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ sidebarRating: 'blitz' });
  });

  it('leaves the settings alone on a click beside the switch', async () => {
    const page = buildInterfacePage();
    await flush();
    const before = storedSettings();
    queryOne(page, "[data-ln-ext-setting='uiSounds'] .ln-ext-setting__title", HTMLElement)?.click();
    expect(storedSettings()).toBe(before);
  });

  it('offers no animation first and the salute by default, and plays the one picked', async () => {
    document.body.dataset.user = 'eresy';
    document.body.innerHTML = '<a id="user_tag">Eresy</a>';
    const page = buildInterfacePage();
    document.body.append(page);
    await flush();
    const select = queryOne(page, SELECT, HTMLSelectElement);
    if (!select) throw new Error('no menu');
    expect([...select.options].map(option => option.value)).toEqual([
      'off',
      'salute',
      'setup',
      'ticket',
      'camps',
      'credits',
      'faceoff',
    ]);
    expect(select.value).toBe('salute');
    expect(page.querySelector('.ln-ext-intro-preview__bar--bottom b')?.textContent).toBe('Eresy');
    vi.useFakeTimers();
    select.value = 'ticket';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ gameIntro: 'ticket' });
    const scene = queryOne(page, '.ln-ext-intro-preview__scene', HTMLElement);
    expect(scene?.dataset.lnExtIntro).toBe('ticket');
    expect(scene?.querySelector(':scope > .ln-ext-intro-fx--inline')).not.toBeNull();
    // The button plays it again from its start.
    queryOne(page, PLAY, HTMLButtonElement)?.click();
    expect(scene?.querySelectorAll('.ln-ext-intro-fx')).toHaveLength(1);
    vi.runAllTimers();
    expect(scene?.dataset.lnExtIntro).toBeUndefined();
    expect(scene?.querySelector('.ln-ext-intro-fx')).toBeNull();
  });

  it('greys the intro’s card and its button out with no animation picked', async () => {
    const page = buildInterfacePage();
    await flush();
    const select = queryOne(page, SELECT, HTMLSelectElement);
    if (!select) throw new Error('no menu');
    select.value = 'off';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ gameIntro: 'off' });
    expect(row(page, 'gameIntro')?.dataset.lnExtOn).toBeUndefined();
    expect(queryOne(page, PLAY, HTMLButtonElement)?.disabled).toBe(true);
    expect(page.querySelector('.ln-ext-intro-fx')).toBeNull();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { buildInterfacePage } from './interface-page.ts';

// chrome.storage.sync, as the settings read and write it, starting with the sounds off.
const synced = new Map<string, unknown>([['lr-ext-settings', { uiSounds: false }]]);

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
  document.body.innerHTML = '';
});

const row = (page: HTMLElement, key: string): HTMLElement | null =>
  queryOne(page, `[data-lr-ext-setting='${key}']`, HTMLElement);
const switchOf = (page: HTMLElement): HTMLButtonElement | null =>
  queryOne(page, "[data-lr-ext-setting='uiSounds'] .lr-ext-switch", HTMLButtonElement);
const storedSettings = (): unknown => synced.get('lr-ext-settings');

describe('the settings’ Interface page', () => {
  it('shows the stored settings once read, and flips a switch', async () => {
    const page = buildInterfacePage();
    await flush();
    expect(switchOf(page)?.getAttribute('aria-checked')).toBe('false');
    expect(row(page, 'uiSounds')?.dataset.lrExtOn).toBeUndefined();
    switchOf(page)?.click();
    expect(storedSettings()).toMatchObject({ uiSounds: true });
    expect(switchOf(page)?.getAttribute('aria-checked')).toBe('true');
    expect(row(page, 'uiSounds')?.dataset.lrExtOn).toBe('');
  });

  it('keeps the rating the sidebar shows, from its menu', async () => {
    const page = buildInterfacePage();
    await flush();
    const select = queryOne(page, '.lr-ext-setting__select', HTMLSelectElement);
    if (!select) throw new Error('no menu');
    select.value = 'blitz';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ sidebarRating: 'blitz' });
  });

  it('leaves the settings alone on a click beside the switch', async () => {
    const page = buildInterfacePage();
    await flush();
    const before = storedSettings();
    queryOne(page, "[data-lr-ext-setting='uiSounds'] .lr-ext-setting__title", HTMLElement)?.click();
    expect(storedSettings()).toBe(before);
  });
});

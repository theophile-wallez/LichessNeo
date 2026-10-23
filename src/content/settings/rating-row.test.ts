import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { buildRatingRow } from './rating-row.ts';

// chrome.storage.sync, as the settings read and write it.
const synced = new Map<string, unknown>();

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

const storedSettings = (): unknown => synced.get('ln-ext-settings');

describe('the settings’ sidebar rating', () => {
  it('keeps the rating the sidebar shows, from its menu', async () => {
    const page = buildRatingRow();
    await flush();
    const select = queryOne(
      page,
      "[data-ln-ext-setting='sidebarRating'] .ln-ext-setting__select",
      HTMLSelectElement,
    );
    if (!select) throw new Error('no menu');
    expect([...select.options].map(option => option.value)).toEqual([
      'hidden',
      'mostPlayed',
      'ultraBullet',
      'bullet',
      'blitz',
      'rapid',
      'classical',
      'correspondence',
    ]);
    select.value = 'blitz';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ sidebarRating: 'blitz' });
    select.value = 'hidden';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ sidebarRating: 'hidden' });
  });
  it('draws each rating’s option with its icon, a speed’s glyph in its color', async () => {
    const page = buildRatingRow();
    await flush();
    const icon = (value: string): HTMLElement | null =>
      queryOne(page, `option[value='${value}'] .ln-ext-setting__option-icon`, HTMLElement);
    expect(icon('hidden')?.dataset.lnExtPick).toBe('hidden');
    expect(icon('hidden')?.querySelector('svg')).not.toBeNull();
    expect(icon('mostPlayed')?.querySelector('svg')).not.toBeNull();
    expect(icon('rapid')?.dataset.lnExtSpeed).toBe('rapid');
    expect(icon('rapid')?.style.getPropertyValue('--ln-ext-speed-color')).not.toBe('');
    expect(queryOne(page, "option[value='rapid'] span:last-child", HTMLElement)?.textContent).toBe(
      'speedRapid',
    );
  });
});

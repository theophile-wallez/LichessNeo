import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { buildNavigationRow } from './navigation-row.ts';

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

describe('the settings’ navigation', () => {
  it('puts the nav where it’s picked, a sidebar by default', async () => {
    const page = buildNavigationRow();
    await flush();
    const picks = queryAll(page, '.ln-ext-nav-pick', HTMLButtonElement);
    const checked = (): (string | undefined)[] =>
      picks
        .filter(pick => pick.getAttribute('aria-checked') === 'true')
        .map(pick => pick.dataset.lnExtNavigation);
    expect(picks.map(pick => pick.dataset.lnExtNavigation)).toEqual([
      'sidebar',
      'unfolded',
      'rail',
      'header',
    ]);
    expect(checked()).toEqual(['sidebar']);
    picks[3]
      ?.querySelector('.ln-ext-nav-pick__name')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(storedSettings()).toMatchObject({ navigation: 'header' });
    expect(checked()).toEqual(['header']);
  });
});

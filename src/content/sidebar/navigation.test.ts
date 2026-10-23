import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';

// chrome.storage.sync, as the settings read and write it.
const synced = new Map<string, unknown>();

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('chrome', {
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
  synced.clear();
  localStorage.clear();
  delete document.documentElement.dataset.lnExtSidebar;
});

/** Starts the feature afresh, with the settings module's state of a new page. */
async function start(): Promise<void> {
  const { navigation } = await import('./navigation.ts');
  navigation.start();
}

const shape = (): string | undefined => document.documentElement.dataset.lnExtSidebar;

describe('the nav’s place', () => {
  it('shows the sidebar unfolded by default', async () => {
    await start();
    await flush();
    expect(shape()).toBeUndefined();
  });

  it('shows the page’s copy at once, before the settings are read', async () => {
    localStorage.setItem('ln-ext-navigation', 'header');
    synced.set('ln-ext-settings', { navigation: 'header' });
    await start();
    expect(shape()).toBe('header');
  });

  it('folds the sidebar to its icons', async () => {
    localStorage.setItem('ln-ext-sidebar-collapsed', '1');
    await start();
    expect(shape()).toBe('collapsed');
  });

  it('shows the unfolded sidebar, or the folded one when it was folded', async () => {
    localStorage.setItem('ln-ext-navigation', 'unfolded');
    synced.set('ln-ext-settings', { navigation: 'unfolded' });
    await start();
    await flush();
    expect(shape()).toBe('unfolded');
    localStorage.setItem('ln-ext-sidebar-collapsed', '1');
    const { showNavigation } = await import('./navigation.ts');
    showNavigation();
    expect(shape()).toBe('collapsed');
  });

  it('shows the rail with the folded sidebar’s rules, folded or not', async () => {
    localStorage.setItem('ln-ext-navigation', 'rail');
    synced.set('ln-ext-settings', { navigation: 'rail' });
    await start();
    await flush();
    expect(shape()).toBe('collapsed rail');
    localStorage.setItem('ln-ext-sidebar-collapsed', '1');
    const { showNavigation } = await import('./navigation.ts');
    showNavigation();
    expect(shape()).toBe('collapsed rail');
  });

  it('shows the header whether the sidebar was folded or not', async () => {
    localStorage.setItem('ln-ext-sidebar-collapsed', '1');
    localStorage.setItem('ln-ext-navigation', 'header');
    synced.set('ln-ext-settings', { navigation: 'header' });
    await start();
    await flush();
    expect(shape()).toBe('header');
  });

  it('follows the settings, keeping their pick for the next page', async () => {
    const scrolls = vi.fn<() => void>();
    document.addEventListener('scroll', scrolls);
    synced.set('ln-ext-settings', { navigation: 'header' });
    await start();
    await flush();
    expect(shape()).toBe('header');
    expect(localStorage.getItem('ln-ext-navigation')).toBe('header');
    // Chessground keeps the board's old bounds until a scroll clears them.
    expect(scrolls).toHaveBeenCalledOnce();

    const { saveSetting } = await import('#content/settings/settings.ts');
    await saveSetting('navigation', 'sidebar');
    expect(shape()).toBeUndefined();
    expect(localStorage.getItem('ln-ext-navigation')).toBe('sidebar');
    document.removeEventListener('scroll', scrolls);
  });

  it('leaves the page alone when the settings change something else', async () => {
    const scrolls = vi.fn<() => void>();
    document.addEventListener('scroll', scrolls);
    await start();
    await flush();
    const { saveSetting } = await import('#content/settings/settings.ts');
    await saveSetting('uiSounds', false);
    expect(scrolls).not.toHaveBeenCalled();
    document.removeEventListener('scroll', scrolls);
  });
});

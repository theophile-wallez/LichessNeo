import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';

// chrome.storage.sync, as the settings read and write it.
const synced = new Map<string, unknown>();

beforeEach(() => {
  vi.resetModules();
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
  synced.clear();
  delete document.documentElement.dataset.lnExtReviewRating;
});

async function start(): Promise<void> {
  const { reviewRating } = await import('./index.ts');
  reviewRating.start();
  await flush();
}

const ratingShown = (): boolean => document.documentElement.dataset.lnExtReviewRating !== undefined;

describe('the review’s estimated rating', () => {
  it('stays hidden by default', async () => {
    await start();
    expect(ratingShown()).toBe(false);
  });

  it('shows once switched on', async () => {
    synced.set('ln-ext-settings', { reviewRating: true });
    await start();
    expect(ratingShown()).toBe(true);
  });

  it('follows the switch as it changes', async () => {
    synced.set('ln-ext-settings', { reviewRating: true });
    await start();
    expect(ratingShown()).toBe(true);
    const { saveSetting } = await import('#content/settings/settings.ts');
    await saveSetting('reviewRating', false);
    await flush();
    expect(ratingShown()).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { queryOne } from '#shared/dom.ts';
import { DEFAULT_REVIEW_ENGINE } from '#shared/review-engine/options.ts';
import { trackListeners } from '#shared/testing/listeners.ts';

// chrome.storage.sync's settings and writes, and its change events, as another tab would send.
let stored: unknown = {};
const writes: unknown[] = [];
let changed: (settings: unknown) => void = () => {};
let untrack: () => void = () => {};

beforeEach(() => {
  stored = { reviewEngine: { ...DEFAULT_REVIEW_ENGINE, depth: 20 } };
  writes.length = 0;
  untrack = trackListeners(window);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (name: string) => name },
    runtime: { id: 'test' },
    storage: {
      sync: {
        get: (key: string) => Promise.resolve({ [key]: stored }),
        set: (items: Record<string, unknown>) => {
          writes.push(Object.values(items)[0]);
          return Promise.resolve();
        },
      },
      onChanged: {
        addListener: (listener: (changes: unknown, area: string) => void) => {
          changed = settings => listener({ 'ln-ext-settings': { newValue: settings } }, 'sync');
        },
      },
    },
  });
});

afterEach(() => {
  untrack();
  vi.useRealTimers();
  localStorage.clear();
  document.documentElement.lang = '';
});

/** The card, as a fresh content script builds it, before its settings are read. */
async function unread(): Promise<HTMLElement> {
  vi.resetModules();
  const { buildEngineCard } = await import('./engine-card.ts');
  return buildEngineCard();
}

/** The card once its settings are read. */
async function card(): Promise<HTMLElement> {
  const built = await unread();
  await vi.advanceTimersByTimeAsync(0);
  return built;
}

const depthOf = (built: HTMLElement): string | undefined =>
  queryOne(built, '[data-ln-ext-bind="depth"]', HTMLElement)?.textContent;

const SavedSchema = z.object({ reviewEngine: z.object({ depth: z.number() }) });

describe('the settings’ Debrief engine card', () => {
  it('shows the settings kept, and follows them as another tab changes them', async () => {
    const built = await unread();
    expect(depthOf(built)).toBe('16');
    await vi.advanceTimersByTimeAsync(0);
    expect(depthOf(built)).toBe('20');
    expect(queryOne(built, '[data-ln-ext-bind="tier"]', HTMLElement)?.textContent).toBe('Deep');
    changed({ reviewEngine: { ...DEFAULT_REVIEW_ENGINE, depth: 24 } });
    expect(depthOf(built)).toBe('24');
  });

  it('saves a pick once it rests, and tells the page at once', async () => {
    const built = await card();
    const posted = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    queryOne(built, '[data-ln-ext-stop="12"]', HTMLElement)?.click();
    expect(depthOf(built)).toBe('12');
    expect(posted).toHaveBeenCalledWith(
      { type: 'ln-ext:review-engine', options: { ...DEFAULT_REVIEW_ENGINE, depth: 12 } },
      location.origin,
    );
    expect(writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(400);
    expect(writes.map(settings => SavedSchema.parse(settings).reviewEngine.depth)).toEqual([12]);
  });

  it('speaks Lichess’s language, whatever the browser’s', async () => {
    document.documentElement.lang = 'fr';
    const built = await card();
    expect(queryOne(built, '[data-ln-ext-bind="tier"]', HTMLElement)?.textContent).toBe(
      'Approfondi',
    );
  });
});

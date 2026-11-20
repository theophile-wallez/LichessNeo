import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { DEFAULT_REVIEW_ENGINE, type ReviewEngine } from '#shared/review-engine/options.ts';
import { trackListeners } from '#shared/testing/listeners.ts';

const at = (depth: number): ReviewEngine => ({ ...DEFAULT_REVIEW_ENGINE, depth });

// chrome.storage.sync's settings, its writes, and its change events, as another tab would send.
let stored: unknown = {};
const writes: unknown[] = [];
let changed: (settings: unknown) => void = () => {};
// Set to hold the next write until a test lets it end.
let held: (() => void)[] | null = null;
// Each test starts a content script of its own: the ones before stop hearing the page.
let untrack: () => void = () => {};

beforeEach(() => {
  untrack = trackListeners(window);
  stored = {};
  writes.length = 0;
  held = null;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('chrome', {
    runtime: { id: 'test' },
    storage: {
      sync: {
        get: (key: string) => Promise.resolve({ [key]: stored }),
        set: (items: Record<string, unknown>) => {
          stored = Object.values(items)[0];
          writes.push(stored);
          const wait = held;
          return wait ? new Promise<void>(resolve => wait.push(resolve)) : Promise.resolve();
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
});

// What the page world hears (#shared/protocol.ts).
const TellSchema = z.object({ type: z.literal('ln-ext:review-engine'), options: z.unknown() });

function listenToPage(): () => unknown[] {
  const posted = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  return () =>
    posted.mock.calls.flatMap(([data]) => TellSchema.safeParse(data).data?.options ?? []);
}

/** A fresh content script, its feature started and its settings read. */
async function started() {
  vi.resetModules();
  const feature = await import('./index.ts');
  feature.reviewEngine.start();
  await vi.advanceTimersByTimeAsync(0);
  return feature;
}

const kept = (): unknown => JSON.parse(localStorage.getItem('ln-ext-review-engine') ?? 'null');
const savedDepths = (): unknown[] =>
  writes.map(
    settings =>
      z.object({ reviewEngine: z.object({ depth: z.number() }) }).parse(settings).reviewEngine
        .depth,
  );

describe('the Debrief’s engine settings in the content script', () => {
  it('tell the page the settings read, and keep them for the page’s next start', async () => {
    const told = listenToPage();
    stored = { reviewEngine: at(20) };
    await started();
    expect(told()).toEqual([at(20)]);
    expect(kept()).toEqual(at(20));
  });

  it('tell the page nothing when they’re as it last had them', async () => {
    const told = listenToPage();
    localStorage.setItem('ln-ext-review-engine', JSON.stringify(at(20)));
    stored = { reviewEngine: at(20) };
    await started();
    expect(told()).toEqual([]);
  });

  it('save a dragged depth once it rests, the page told at each step', async () => {
    const { saveReviewEngine } = await started();
    const told = listenToPage();
    for (const depth of [17, 18, 19]) {
      saveReviewEngine(at(depth));
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(told()).toEqual([at(17), at(18), at(19)]);
    expect(writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(300);
    expect(savedDepths()).toEqual([19]);
    expect(kept()).toEqual(at(19));
  });

  it('save the popover’s pick without telling the page back', async () => {
    await started();
    const told = listenToPage();
    const pick = { type: 'ln-ext:review-engine-pick', options: at(24) };
    window.dispatchEvent(new MessageEvent('message', { data: pick, source: window }));
    expect(kept()).toEqual(at(24));
    await vi.advanceTimersByTimeAsync(400);
    expect(savedDepths()).toEqual([24]);
    expect(told()).toEqual([]);
  });

  it('let no echo of the settings undo a pick not saved yet, then follow another tab’s', async () => {
    const { saveReviewEngine } = await started();
    const told = listenToPage();
    saveReviewEngine(at(20));
    changed({ reviewEngine: at(16) });
    await vi.advanceTimersByTimeAsync(400);
    expect(told()).toEqual([at(20)]);
    changed({ reviewEngine: at(12) });
    expect(told()).toEqual([at(20), at(12)]);
  });

  it('let a save that ends after a later pick leave that pick waiting', async () => {
    const { saveReviewEngine } = await started();
    const told = listenToPage();
    held = [];
    const writing = held;
    saveReviewEngine(at(20));
    await vi.advanceTimersByTimeAsync(400);
    saveReviewEngine(at(24));
    for (const resolve of writing) resolve();
    await vi.advanceTimersByTimeAsync(0);
    // The first save's echo, while the second is still to be written.
    changed({ reviewEngine: at(20) });
    expect(told()).toEqual([at(20), at(24)]);
  });
});

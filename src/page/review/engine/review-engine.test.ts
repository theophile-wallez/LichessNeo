import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_REVIEW_ENGINE, type ReviewEngine } from '#shared/review-engine/options.ts';

// The module keeps the settings for the page: each test takes a fresh copy.
async function fresh() {
  vi.resetModules();
  return import('./review-engine.ts');
}

const DEEP: ReviewEngine = { ...DEFAULT_REVIEW_ENGINE, depth: 20, engine: 'full', hash: 64 };

const receive = (data: unknown): void => {
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
};

afterEach(() => {
  localStorage.clear();
});

describe('the Debrief’s engine settings in the page world', () => {
  it('start as the content script last kept them, a field out of range at its default', async () => {
    localStorage.setItem('ln-ext-review-engine', JSON.stringify({ ...DEEP, threads: 99 }));
    const { reviewEngine } = await fresh();
    expect(reviewEngine()).toEqual({ ...DEEP, threads: 1 });
  });

  it('are the defaults when none were kept', async () => {
    const { reviewEngine } = await fresh();
    expect(reviewEngine()).toEqual(DEFAULT_REVIEW_ENGINE);
  });

  it('follow the content script as they change, and tell the review', async () => {
    const { reviewEngine, onReviewEngineChange } = await fresh();
    const heard: ReviewEngine[] = [];
    onReviewEngineChange(options => heard.push(options));
    receive({ type: 'ln-ext:review-engine', options: DEEP });
    receive({ type: 'ln-ext:review-engine', options: 'deep' });
    expect(reviewEngine()).toEqual(DEEP);
    expect(heard).toEqual([DEEP]);
  });

  it('take the popover’s pick at once, and hand it to the content script to keep', async () => {
    const posted = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
    const { reviewEngine, onReviewEngineChange, pickReviewEngine } = await fresh();
    const heard: ReviewEngine[] = [];
    onReviewEngineChange(options => heard.push(options));
    pickReviewEngine(DEEP);
    expect(reviewEngine()).toEqual(DEEP);
    expect(heard).toEqual([DEEP]);
    expect(posted.mock.calls.map((call): unknown => call[0])).toEqual([
      { type: 'ln-ext:review-engine-pick', options: DEEP },
    ]);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { centerInScroller } from '#shared/dom.ts';
import { startSyncLoop } from '#content/sync-loop.ts';
import { practiceSteps } from './steps.ts';

// happy-dom lays nothing out: the list's scrolling is set by hand, and the centering watched.
vi.mock(import('#shared/dom.ts'), async importOriginal => ({
  ...(await importOriginal()),
  centerInScroller: vi.fn<(element: HTMLElement) => void>(),
}));

const TICK_MS = 250;

beforeAll(() => {
  vi.useFakeTimers();
  practiceSteps.start();
  startSyncLoop();
});

afterAll(() => {
  vi.useRealTimers();
});

function showLesson(scrolls: boolean): HTMLElement {
  document.body.innerHTML =
    '<main class="analyse"><aside class="practice__side"><div class="practice__side__chapters">' +
    '<a class="ps__chapter active" data-id="a1"><h3>Back-Rank Mate #1</h3></a>' +
    '<a class="ps__chapter" data-id="b2"><h3>Hook Mate #1</h3></a></div></aside></main>';
  const list = document.querySelector('.practice__side__chapters');
  if (!(list instanceof HTMLElement)) throw new Error('no list');
  Object.defineProperty(list, 'clientHeight', { value: 100 });
  Object.defineProperty(list, 'scrollHeight', { value: scrolls ? 300 : 100 });
  return list;
}

beforeEach(() => {
  vi.mocked(centerInScroller).mockClear();
});

describe('a practice lesson’s steps', () => {
  it('bring the exercise on show into view once, and again when it changes', () => {
    const list = showLesson(true);
    const [first, second] = list.children;
    vi.advanceTimersByTime(TICK_MS * 3);
    expect(centerInScroller).toHaveBeenCalledTimes(1);
    expect(centerInScroller).toHaveBeenLastCalledWith(first);
    first?.classList.remove('active');
    second?.classList.add('active');
    vi.advanceTimersByTime(TICK_MS);
    expect(centerInScroller).toHaveBeenCalledTimes(2);
    expect(centerInScroller).toHaveBeenLastCalledWith(second);
  });

  it('leave the page where it is when the list doesn’t scroll', () => {
    showLesson(false);
    vi.advanceTimersByTime(TICK_MS * 2);
    expect(centerInScroller).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderBoard } from '#page/sounds/fixtures/boards.ts';
import { backlit } from './index.ts';

const root = document.documentElement;
const canvas = (): Element | null => document.querySelector('cg-container > canvas.lr-ext-backlit');

/** Lets the observers' callbacks run, then the frame they look for a board in. */
async function nextFrame(): Promise<void> {
  await Promise.resolve();
  vi.advanceTimersToNextFrame();
}

// Once, as the page script starts it: it then follows <html>'s attribute.
beforeAll(() => backlit.start());

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  document.body.classList.add('is2d');
});

afterEach(() => {
  delete root.dataset.lrExtBacklit;
  vi.useRealTimers();
  document.body.replaceChildren();
  document.body.classList.remove('is2d');
});

describe('the backlit board', () => {
  it('lights the main board only while a backlit board is shown', async () => {
    renderBoard({ placement: '8/8/8/8/8/8/8/8', orientation: 'white' });
    await nextFrame();
    expect(canvas()).toBeNull();
    root.dataset.lrExtBacklit = 'accent short captures';
    await nextFrame();
    expect(canvas()).not.toBeNull();
    delete root.dataset.lrExtBacklit;
    await nextFrame();
    expect(canvas()).toBeNull();
  });

  it('moves to the next board once the one it lit is gone', async () => {
    root.dataset.lrExtBacklit = 'accent short captures';
    await nextFrame();
    const first = renderBoard({ placement: '8/8/8/8/8/8/8/8', orientation: 'white' });
    await nextFrame();
    expect(canvas()?.parentElement).toBe(first.parentElement);
    const next = renderBoard({ placement: '8/8/8/8/8/8/8/8', orientation: 'black' });
    await nextFrame();
    expect(canvas()?.parentElement).toBe(next.parentElement);
    expect(document.querySelectorAll('canvas')).toHaveLength(1);
  });
});

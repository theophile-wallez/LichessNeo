import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackListeners } from '#shared/testing/listeners.ts';

// The module reads the window's width once, as it loads: each test loads it at its own.
async function startAt(width: number): Promise<void> {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(min-width: 1020px)' && width >= 1020,
  }));
  vi.resetModules();
  const { mainScroll } = await import('./main-scroll.ts');
  mainScroll.start();
}

const scrollDocument = (y: number): void => {
  window.scrollTo(0, y);
  document.dispatchEvent(new Event('scroll'));
};

let untrack: () => void;

beforeEach(() => {
  untrack = trackListeners(document);
  document.body.innerHTML = '<div id="main-wrap"><main></main></div>';
});

afterEach(() => {
  untrack();
  window.scrollTo(0, 0);
  document.body.innerHTML = '';
});

describe('mainScroll', () => {
  it('passes #main-wrap’s scroll on to the window, for Lichess’s endless lists', async () => {
    await startAt(1366);
    const heard = vi.fn<() => void>();
    window.addEventListener('scroll', heard);
    document.getElementById('main-wrap')?.dispatchEvent(new Event('scroll'));
    window.removeEventListener('scroll', heard);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('puts the document back at its top as an anchor scrolls it, on desktop', async () => {
    await startAt(1366);
    scrollDocument(40);
    expect(window.scrollY).toBe(0);
  });

  it('lets the document scroll below 1020px, where it is what scrolls', async () => {
    await startAt(1019);
    scrollDocument(40);
    expect(window.scrollY).toBe(40);
  });
});

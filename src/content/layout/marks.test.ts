import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { setReadyState } from '#shared/testing/ready-state.ts';
import { flush } from '#shared/testing/timers.ts';
import { marks, syncMarks } from './marks.ts';
// What the original script marked on the same pages.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const navOf = (): string | undefined =>
  queryOne(document, '.subnav', HTMLElement)?.dataset['lnExtNav'];

// A mark the original didn't set: the page's side menu, on its <main> (static-pages.css).
const withoutNewMarks = (markup: string): string =>
  markup.replaceAll(/ data-ln-ext-menu="[^"]*"/g, '');

/** Lets the observer's callback run, then the frame it asks for. */
async function nextFrame(): Promise<void> {
  await Promise.resolve();
  await new Promise(resolve => requestAnimationFrame(resolve));
}

afterEach(() => {
  setReadyState('complete');
  document.body.innerHTML = '';
});

describe('syncMarks', () => {
  it.each(legacy.marks)('marks $page as the original did', ({ page, marked }) => {
    document.body.innerHTML = page;
    syncMarks();
    expect(withoutNewMarks(document.body.innerHTML)).toBe(marked);
  });

  it('names the side menu on its page', () => {
    document.body.innerHTML =
      '<main class="page-menu"><aside class="subnav"><a href="/faq">FAQ</a><a href="/thanks">Thanks</a></aside></main>';
    syncMarks();
    expect(queryOne(document, 'main', HTMLElement)?.dataset['lnExtMenu']).toBe('about');
  });

  it('writes nothing when the marks are already right', () => {
    document.body.innerHTML = legacy.marks[0]?.marked ?? '';
    syncMarks();
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { attributes: true, subtree: true });
    syncMarks();
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });
});

describe('marks', () => {
  it('marks what arrives while the page parses, then stops watching', async () => {
    setReadyState('loading');
    marks.start();
    document.body.innerHTML = '<nav class="subnav"><a href="/player/bots">Bots</a></nav>';
    await nextFrame();
    expect(navOf()).toBe('bots');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    document.body.innerHTML = '<nav class="subnav"><a href="/thanks">Thanks</a></nav>';
    await nextFrame();
    expect(navOf()).toBeUndefined();
  });

  it('marks once a frame while the page parses, however many chunks come in', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      frames.push(callback),
    );
    const lookups = vi.spyOn(document, 'querySelectorAll');
    syncMarks();
    const perSync = lookups.mock.calls.length;
    expect(perSync).toBeGreaterThan(0);
    lookups.mockClear();
    setReadyState('loading');
    marks.start();
    for (const name of ['a', 'b', 'c']) {
      document.body.append(document.createElement(name));
      await flush();
    }
    for (const frame of frames.splice(0)) frame(0);
    expect(lookups).toHaveBeenCalledTimes(perSync);
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('marks a parsed page at once', () => {
    document.body.innerHTML = '<nav class="subnav"><a href="/thanks">Thanks</a></nav>';
    const spy = vi.spyOn(document, 'addEventListener');
    marks.start();
    expect(navOf()).toBe('about');
    expect(spy).not.toHaveBeenCalled();
  });
});

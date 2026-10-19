import { describe, expect, it } from 'vitest';
import { rectBetween } from '#shared/testing/layout.ts';
import { squaresInset, watchBoardInset } from './board-inset.ts';
import { watchControlsHeight } from './controls-height.ts';
// What the original script measured on the same pages.
import legacy from './fixtures/legacy-measures.json' with { type: 'json' };

interface Edges {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

function measureAs(selector: string, edges: Edges): void {
  const element = document.querySelector(selector);
  if (element) element.getBoundingClientRect = () => rectBetween(edges);
}

const mainStyle = (): string | null =>
  document.querySelector('main')?.getAttribute('style') ?? null;

describe('squaresInset', () => {
  it('rounds each side to whole pixels, never below zero', () => {
    const wrapper = { top: 0, right: 100, bottom: 100, left: 0 };
    expect(squaresInset({ top: 3.5, right: 96.5, bottom: 97.49, left: 2.51 }, wrapper)).toEqual({
      t: 4,
      r: 4,
      b: 3,
      l: 3,
    });
    expect(squaresInset({ top: -2, right: 104, bottom: 101, left: -1 }, wrapper)).toEqual({
      t: 0,
      r: 0,
      b: 0,
      l: 0,
    });
  });
});

describe('watchBoardInset', () => {
  it.each(legacy.insets)('sets what the original set', ({ page, container, wrap, style }) => {
    document.body.innerHTML = page;
    measureAs('cg-container', container);
    measureAs('.cg-wrap', wrap);
    watchBoardInset()();
    expect(mainStyle()).toBe(style);
  });

  it.each(legacy.noBoard)('leaves $page alone', ({ page, style }) => {
    document.body.innerHTML = page;
    watchBoardInset()();
    expect(mainStyle()).toBe(style);
  });
});

describe('watchControlsHeight', () => {
  it.each(legacy.heights)('sets $height as the original did', ({ page, height, style }) => {
    document.body.innerHTML = page;
    measureAs('.rcontrols, .analyse__controls', { top: 0, left: 0, right: 10, bottom: height });
    watchControlsHeight()();
    expect(mainStyle()).toBe(style);
  });

  it.each(legacy.noControls)('handles $page as the original did', ({ page, style }) => {
    document.body.innerHTML = page;
    watchControlsHeight()();
    expect(mainStyle()).toBe(style);
  });

  it('writes nothing while the height stays', () => {
    document.body.innerHTML = '<main class="analyse"><div class="analyse__controls"></div></main>';
    measureAs('.analyse__controls', { top: 0, left: 0, right: 10, bottom: 40 });
    const tick = watchControlsHeight();
    tick();
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { attributes: true, subtree: true });
    tick();
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';

type MockAnimate = (
  target: unknown,
  keyframes: unknown,
  options?: { onUpdate?: (progress: number) => void },
) => Promise<void>;

vi.mock('motion', () => ({
  animate: vi.fn<MockAnimate>((target, _keyframes, options) => {
    if (typeof target === 'number') options?.onUpdate?.(1);
    return Promise.resolve();
  }),
  scroll: vi.fn<() => () => void>(() => () => undefined),
}));

import { playHeroCascade } from './hero-3d.ts';

function buildHeroStage(): { stage: HTMLElement; demo: HTMLElement; pickers: HTMLElement } {
  setHtml(
    document.body,
    html`<div class="demo-stage">
      <div class="demo">
        <nav class="demo-rail"></nav>
        <div class="demo-app">
          <div class="demo-play">
            <div class="demo-player" data-player="black"></div>
            <div class="demo-boardrow"></div>
            <div class="demo-player" data-player="white"></div>
          </div>
          <div class="demo-panel">
            <div class="demo-tabs"></div>
            <div class="demo-graph"></div>
            <div class="demo-moments"></div>
            <div class="demo-card"></div>
            <div class="ln-ext-review__nav"></div>
            <div class="demo-moves"></div>
            <div class="demo-controls"></div>
          </div>
        </div>
      </div>
      <div class="demo-pickers"></div>
    </div>`,
  );
  const stage = queryOne(document, '.demo-stage', HTMLElement);
  const demo = queryOne(document, '.demo', HTMLElement);
  const pickers = queryOne(document, '.demo-pickers', HTMLElement);
  if (!stage || !demo || !pickers) throw new Error('missing hero stage');
  return { stage, demo, pickers };
}

beforeEach(() => {
  document.body.replaceChildren();
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
});

describe('the hero window’s 3D cascade', () => {
  it('cleans up assembly state and leaves every layer flush once landed', async () => {
    const { stage, demo } = buildHeroStage();
    await playHeroCascade(stage, demo, 0);

    expect(demo.dataset.assembling).toBeUndefined();
    const card = queryOne(demo, '.demo-card', HTMLElement);
    expect(card?.dataset.layer).toBeUndefined();
    expect(card?.style.getPropertyValue('--drop-z')).toBe('');
    expect(card?.style.getPropertyValue('--drop-y')).toBe('');
    expect(card?.style.getPropertyValue('--air')).toBe('');
    expect(card?.style.opacity).toBe('');
  });

  it('keeps the hero pickers hidden at the top and reveals them once scrolled past 90px', async () => {
    const { stage, demo, pickers } = buildHeroStage();
    await playHeroCascade(stage, demo, 0);

    expect(pickers.dataset.shown).toBeUndefined();

    Object.defineProperty(window, 'scrollY', { value: 120, writable: true, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(pickers.dataset.shown).toBe('');

    Object.defineProperty(window, 'scrollY', { value: 40, writable: true, configurable: true });
    window.dispatchEvent(new Event('scroll'));
    expect(pickers.dataset.shown).toBeUndefined();
  });
});

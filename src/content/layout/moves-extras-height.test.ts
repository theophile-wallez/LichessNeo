import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type FakeLayout, fakeLayout, rectBetween } from '#shared/testing/layout.ts';
import { watchMovesExtras } from './moves-extras-height.ts';

const GAME =
  '<main class="round"><div class="round__app"><div id="voice-bar"></div></div><div class="round__underboard"><div class="crosstable"><povs></povs></div></div></main>';

function measureAs(selector: string, height: number): void {
  const element = document.querySelector(selector);
  if (element)
    element.getBoundingClientRect = () =>
      rectBetween({ top: 0, left: 0, right: 10, bottom: height });
}

const main = (): HTMLElement | null => document.querySelector('main');

let layout: FakeLayout;
let tick: () => void;

beforeEach(() => {
  layout = fakeLayout(() => 0);
  tick = watchMovesExtras();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('watchMovesExtras', () => {
  it('measures the voice bar and the crosstable, to the pixel above', () => {
    document.body.innerHTML = GAME;
    measureAs('#voice-bar', 38.4);
    measureAs('.crosstable', 61);
    tick();
    expect(main()?.style.getPropertyValue('--lr-ext-voice-h')).toBe('39px');
    expect(main()?.style.getPropertyValue('--lr-ext-crosstable-h')).toBe('61px');
  });

  it('follows a crosstable that grows, and drops what Lichess removed', () => {
    document.body.innerHTML = GAME;
    measureAs('.crosstable', 58);
    tick();
    measureAs('.crosstable', 80);
    layout.resize();
    document.querySelector('#voice-bar')?.remove();
    tick();
    expect(main()?.style.getPropertyValue('--lr-ext-crosstable-h')).toBe('80px');
    expect(main()?.style.getPropertyValue('--lr-ext-voice-h')).toBe('');
  });

  it('measures the filled crosstable, not the empty one Lichess leaves at a game end', () => {
    document.body.innerHTML =
      '<main class="round"><div class="round__underboard"><div class="crosstable"></div><div class="crosstable"><povs></povs></div></div></main>';
    const [empty, filled] = document.querySelectorAll('.crosstable');
    if (empty)
      empty.getBoundingClientRect = () => rectBetween({ top: 0, left: 0, right: 10, bottom: 17 });
    if (filled)
      filled.getBoundingClientRect = () => rectBetween({ top: 0, left: 0, right: 10, bottom: 60 });
    tick();
    expect(main()?.style.getPropertyValue('--lr-ext-crosstable-h')).toBe('60px');
  });

  it('writes nothing while the heights stay', () => {
    document.body.innerHTML = GAME;
    measureAs('#voice-bar', 39);
    measureAs('.crosstable', 58);
    tick();
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { attributes: true, subtree: true });
    layout.resize();
    tick();
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it('reads the layout only after a resize', () => {
    document.body.innerHTML = GAME;
    measureAs('.crosstable', 58);
    tick();
    measureAs('.crosstable', 80);
    tick();
    expect(main()?.style.getPropertyValue('--lr-ext-crosstable-h')).toBe('58px');
    layout.resize();
    tick();
    expect(main()?.style.getPropertyValue('--lr-ext-crosstable-h')).toBe('80px');
  });

  it('leaves other pages alone', () => {
    document.body.innerHTML = '<main class="analyse"><div class="crosstable"></div></main>';
    tick();
    expect(main()?.getAttribute('style')).toBeNull();
  });
});

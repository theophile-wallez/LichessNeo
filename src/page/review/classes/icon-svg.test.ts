import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keepCoachOptions } from '#shared/coach.ts';
import type * as IconSvg from './icon-svg.ts';

// The icons are read once, from the switches the content script kept: each test
// loads the module afresh.
const iconSvg = async (): Promise<typeof IconSvg> => {
  vi.resetModules();
  return import('./icon-svg.ts');
};

const OPTIONS = { motion: true, analysis: true, board: true, hidden: [] };

// The content script telling of the switches (#shared/protocol.ts).
const tell = (options: object): void => {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: 'ln-ext:coach-options', options },
      source: window,
    }),
  );
};
// A dot is a filled path, unscaled: the icons are scaled from Hugeicons' grid.
const dotCount = (svg: string): number =>
  svg.match(/<path fill="#[0-9a-f]+" stroke="none"/g)?.length ?? 0;

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('the class icons’ style', () => {
  it('draws the good tiers as icons by default', async () => {
    const { classSvg } = await iconSvg();
    for (const moveClass of ['best', 'excellent', 'good'] as const)
      expect(dotCount(classSvg(moveClass).value)).toBe(0);
  });

  it('draws three, two and one dots once the settings pick them', async () => {
    keepCoachOptions({ ...OPTIONS, dots: true });
    const { classSvg } = await iconSvg();
    expect(dotCount(classSvg('best').value)).toBe(3);
    expect(dotCount(classSvg('excellent').value)).toBe(2);
    expect(dotCount(classSvg('good').value)).toBe(1);
    // The annotated classes keep their symbols.
    expect(dotCount(classSvg('blunder').value)).toBe(0);
  });

  it('follows the settings as they change, and redraws only then', async () => {
    const { classSvg, followClassDots } = await iconSvg();
    const redraw = vi.fn<() => void>();
    const stop = followClassDots(redraw);
    expect(dotCount(classSvg('best').value)).toBe(0);
    tell({ ...OPTIONS, dots: true });
    expect(redraw).toHaveBeenCalledTimes(1);
    expect(dotCount(classSvg('best').value)).toBe(3);
    tell({ ...OPTIONS, analysis: false, dots: true });
    expect(redraw).toHaveBeenCalledTimes(1);
    stop();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { setBeating } from './wave-beat.ts';

const bar = (): HTMLElement => document.body.appendChild(document.createElement('span'));
const timing = (element: HTMLElement) => element.getAnimations()[0]?.effect?.getTiming();

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('setBeating', () => {
  it('starts a bar beating for as long as its sound plays, one after another', () => {
    const [first, second] = [bar(), bar()];
    if (!first || !second) throw new Error('No bars');
    setBeating(first, true, 0);
    setBeating(second, true, 1);
    setBeating(first, true, 0);
    expect(first.getAnimations()).toHaveLength(1);
    expect(timing(first)).toMatchObject({ iterations: Infinity, delay: 0 });
    expect(timing(second)?.delay).toBeGreaterThan(0);
  });

  it('lets it finish the beat under way once its sound ends', () => {
    const element = bar();
    setBeating(element, false, 0);
    expect(element.getAnimations()).toHaveLength(0);
    setBeating(element, true, 0);
    const effect = element.getAnimations()[0]?.effect;
    if (!effect) throw new Error('No beat');
    // happy-dom keeps no time: the fourth beat under way, as a browser would say.
    vi.spyOn(effect, 'getComputedTiming').mockReturnValue({ currentIteration: 3 });
    setBeating(element, false, 0);
    expect(timing(element)?.iterations).toBe(4);
    // Beating again starts a beat of its own.
    setBeating(element, true, 0);
    expect(element.getAnimations().map(beat => beat.effect?.getTiming().iterations)).toContain(
      Infinity,
    );
  });
});

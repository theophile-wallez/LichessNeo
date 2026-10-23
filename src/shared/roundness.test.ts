import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_ROUNDNESS, showRoundness, shownRoundness } from './roundness.ts';

afterEach(() => {
  document.documentElement.removeAttribute('style');
});

describe('Lichess’s Roundness on the page', () => {
  it('reads the radius Lichess writes on <html>', () => {
    document.documentElement.setAttribute('style', '---ui-roundness:3px;---bg-opacity:50;');
    expect(shownRoundness()).toBe(3);
  });

  it('falls back to Lichess’s default when it writes none, or one out of its slider', () => {
    expect(shownRoundness()).toBe(DEFAULT_ROUNDNESS);
    showRoundness(40);
    expect(shownRoundness()).toBe(DEFAULT_ROUNDNESS);
  });

  it('writes the radius as Lichess’s slider does, keeping what else is there', () => {
    document.documentElement.setAttribute('style', '---bg-opacity:50;');
    showRoundness(0);
    expect(document.documentElement.style.getPropertyValue('---ui-roundness')).toBe('0px');
    expect(document.documentElement.style.getPropertyValue('---bg-opacity')).toBe('50');
    expect(shownRoundness()).toBe(0);
  });
});

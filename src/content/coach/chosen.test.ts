import { afterEach, describe, expect, it, vi } from 'vitest';
import { chosenCoach } from './chosen.ts';

afterEach(() => {
  delete document.documentElement.dataset.lnExtCoach;
  localStorage.clear();
});

describe('chosenCoach', () => {
  it('is the coach picked at boot', () => {
    document.documentElement.dataset.lnExtCoach = '8';
    localStorage.setItem('ln-ext-coach', '2');
    expect(chosenCoach()).toBe(8);
  });

  it('is the stored one, or one picked at random, before the boot picks it', () => {
    localStorage.setItem('ln-ext-coach', '2');
    expect(chosenCoach()).toBe(2);
    localStorage.clear();
    document.documentElement.dataset.lnExtCoach = 'x';
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(chosenCoach()).toBe(1);
  });
});

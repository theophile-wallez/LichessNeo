import { afterEach, describe, expect, it, vi } from 'vitest';
import { chosenCoach } from './chosen.ts';

afterEach(() => {
  delete document.documentElement.dataset.lrExtCoach;
  localStorage.clear();
});

describe('chosenCoach', () => {
  it('is the coach picked at boot', () => {
    document.documentElement.dataset.lrExtCoach = '8';
    localStorage.setItem('lr-ext-coach', '2');
    expect(chosenCoach()).toBe(8);
  });

  it('is the stored one, or one picked at random, before the boot picks it', () => {
    localStorage.setItem('lr-ext-coach', '2');
    expect(chosenCoach()).toBe(2);
    localStorage.clear();
    document.documentElement.dataset.lrExtCoach = 'x';
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(chosenCoach()).toBe(1);
  });
});

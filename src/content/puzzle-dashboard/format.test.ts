import { afterEach, describe, expect, it } from 'vitest';
import { days, sign, signed, trainHref } from './format.ts';
import { pageDays } from './index.ts';

afterEach(() => {
  document.documentElement.lang = '';
});

describe('a gap', () => {
  it('carries its sign, a true minus below zero', () => {
    expect(signed(250)).toBe('+250');
    expect(signed(-1250)).toBe('−1,250');
    expect(signed(0.4)).toBe('±0');
    expect([sign(30), sign(-30), sign(-0.2)]).toEqual(['up', 'down', 'even']);
  });
});

describe('a period', () => {
  it('reads in the page’s language', () => {
    document.documentElement.lang = 'fr-FR';
    // Intl puts a no-break space between them.
    expect(days(30).replace(/\s/g, ' ')).toBe('30 jours');
    expect(days(1).replace(/\s/g, ' ')).toBe('1 jour');
  });
});

describe('the dashboard’s address', () => {
  it('gives its period, 30 days without one, and nothing on another page', () => {
    expect(pageDays('/training/dashboard/7/dashboard')).toBe(7);
    expect(pageDays('/fr/training/dashboard/90/dashboard')).toBe(90);
    expect(pageDays('/training/dashboard')).toBe(30);
    expect(pageDays('/training/dashboard/30/improvementAreas')).toBeNull();
    expect(pageDays('/training/themes')).toBeNull();
  });

  it('leads a theme to its puzzles', () => {
    expect(trainHref('defensiveMove')).toBe('/training/defensiveMove');
  });
});

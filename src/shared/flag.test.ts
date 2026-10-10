import { afterEach, describe, expect, it } from 'vitest';
import { flagImageUrl } from './flag.ts';

afterEach(() => {
  for (const key of Object.keys(document.body.dataset)) delete document.body.dataset[key];
});

describe('flagImageUrl', () => {
  it('points at Lichess’s image of the flag, under its assets’ version', () => {
    document.body.dataset.assetUrl = 'https://lichess1.org';
    document.body.dataset.assetVersion = 'Is5wNi';
    expect(flagImageUrl('FR')).toBe('https://lichess1.org/assets/_Is5wNi/flags/FR.webp');
  });

  it('takes its regions and its own flags', () => {
    expect(['GB-SCT', 'PT-20', '_united-nations'].map(flagImageUrl)).toEqual([
      '/assets/flags/GB-SCT.webp',
      '/assets/flags/PT-20.webp',
      '/assets/flags/_united-nations.webp',
    ]);
  });

  it('has none for no code, or one that isn’t Lichess’s', () => {
    expect(['', 'fr', 'FRA', '../x', '_a"b'].map(flagImageUrl)).toEqual(Array(5).fill(undefined));
    expect(flagImageUrl(undefined)).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { parseRatingChange } from './rating-change.ts';

describe('parseRatingChange', () => {
  it('adds a gain to the rating before the puzzle', () => {
    expect(parseRatingChange('1511 +12')).toEqual({ rating: 1523, diff: 12 });
  });

  it("takes Lichess's minus sign, or a hyphen, as a loss", () => {
    expect(parseRatingChange('1511 −8')).toEqual({ rating: 1503, diff: -8 });
    expect(parseRatingChange(' 1511-8 ')).toEqual({ rating: 1503, diff: -8 });
  });

  it('gives nothing while the card shows no change', () => {
    expect(parseRatingChange('2177')).toBeNull();
    expect(parseRatingChange('1511 +0')).toBeNull();
    expect(parseRatingChange('Your puzzle rating will not change.')).toBeNull();
  });
});

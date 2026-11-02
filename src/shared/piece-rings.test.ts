import { describe, expect, it } from 'vitest';
import { hasRings } from './piece-rings.ts';

describe('hasRings', () => {
  it('tells the sets that draw rings from the others and from none', () => {
    expect(hasRings('pebble')).toBe(true);
    expect(hasRings('mochi')).toBe(false);
    expect(hasRings(undefined)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { poolOfLink, rangeKey, waited } from './pool-link.ts';

describe('a "New opponent" link', () => {
  it('names its pool, and the opponent it avoids', () => {
    expect(poolOfLink('https://lichess.org/#pool/2+1/pandemicbirb')).toEqual({
      id: '2+1',
      blocking: 'pandemicbirb',
    });
    expect(poolOfLink('https://lichess.org/#pool/10+0')).toEqual({ id: '10+0' });
  });

  it('is none of the other links', () => {
    expect(poolOfLink('https://lichess.org/?hook_like=abcd1234')).toBeNull();
    expect(poolOfLink('https://lichess.org/abcd1234/white#12')).toBeNull();
  });

  it("finds the player's range where the lobby keeps it", () => {
    expect(rangeKey('Eresy', '3+2')).toBe('lobby-pool-range.Eresy.3+2');
  });
});

describe('the wait', () => {
  it('reads as a clock', () => {
    expect([0, 7, 59, 83, 600].map(waited)).toEqual(['0:00', '0:07', '0:59', '1:23', '10:00']);
  });
});

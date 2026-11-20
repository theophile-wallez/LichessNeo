import { describe, expect, it } from 'vitest';
import { DEFAULT_REVIEW_ENGINE } from '#shared/review-engine/options.ts';
import { deepSearch, FULL_SEARCH, stockfishScript } from './settings.ts';

const at = (depth: number, cap = 0) => deepSearch({ ...DEFAULT_REVIEW_ENGINE, depth, cap });

describe('deepSearch', () => {
  it('searches the default depth as the review always did', () => {
    expect(at(16)).toEqual(FULL_SEARCH);
  });

  it('gives each ply past it a third more time, and a shallower search no less', () => {
    expect(at(17)).toEqual({ depth: 17, movetime: 6750 });
    expect(at(20)).toEqual({ depth: 20, movetime: 16_608 });
    expect(at(12)).toEqual({ depth: 12, movetime: 5000 });
  });

  it('holds a position to the time limit picked, whatever the depth', () => {
    expect(at(24, 2)).toEqual({ depth: 24, movetime: 2000 });
    expect(at(12, 30)).toEqual({ depth: 12, movetime: 30_000 });
  });
});

describe('stockfishScript', () => {
  it('takes Lichess’s full network build for the full engine, relaxed SIMD or not', () => {
    expect(stockfishScript(false, 'full')).toBe('sf_19.js');
    expect(stockfishScript(true, 'full')).toBe('sf_19_relaxed-simd.js');
    expect(stockfishScript(true, 'light')).toBe('sf_19_smallnet_relaxed-simd.js');
  });
});

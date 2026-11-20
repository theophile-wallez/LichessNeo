import { beforeEach, describe, expect, it } from 'vitest';
import { StorageKey } from '#shared/storage.ts';
import {
  covers,
  DEFAULT_REVIEW_ENGINE,
  hueOf,
  isDefault,
  keepReviewEngine,
  keptReviewEngine,
  ReviewEngineSchema,
  tierOf,
} from './options.ts';

beforeEach(() => {
  localStorage.clear();
});

describe('covers', () => {
  it('takes records as deep or deeper, on the same engine', () => {
    expect(covers({ depth: 16, engine: 'light' }, { depth: 16, engine: 'light' })).toBe(true);
    expect(covers({ depth: 20, engine: 'light' }, { depth: 16, engine: 'light' })).toBe(true);
    expect(covers({ depth: 15, engine: 'light' }, { depth: 16, engine: 'light' })).toBe(false);
  });

  it("lets the full engine's records do for the light one, not the other way", () => {
    expect(covers({ depth: 16, engine: 'full' }, { depth: 16, engine: 'light' })).toBe(true);
    expect(covers({ depth: 24, engine: 'light' }, { depth: 16, engine: 'full' })).toBe(false);
  });
});

describe('tiers', () => {
  it('names the depths offered, and any other one custom', () => {
    expect([12, 16, 20, 24].map(tierOf)).toEqual(['fast', 'standard', 'deep', 'max']);
    expect([8, 21, 40].map(tierOf)).toEqual(['custom', 'custom', 'custom']);
  });

  it("gives each its hue, orange for the user's own", () => {
    expect(hueOf('fast')).toBe('cyan');
    expect(hueOf('max')).toBe('pink');
    expect(hueOf('custom')).toBe('orange');
  });
});

const depthOf = (depth: unknown): number => ReviewEngineSchema.parse({ depth }).depth;

describe('ReviewEngineSchema', () => {
  it('starts at depth 16 on the light engine, the cores left to the device', () => {
    expect(DEFAULT_REVIEW_ENGINE).toEqual({
      depth: 16,
      cap: 0,
      engine: 'light',
      cores: null,
      threads: 1,
      hash: 16,
    });
    expect(isDefault(DEFAULT_REVIEW_ENGINE)).toBe(true);
    expect(isDefault({ ...DEFAULT_REVIEW_ENGINE, cores: 2 })).toBe(false);
  });

  it('keeps a depth from 8 to 40, whole', () => {
    expect([8, 21, 40].map(depthOf)).toEqual([8, 21, 40]);
    expect([7, 41, 16.5, '20'].map(depthOf)).toEqual([16, 16, 16, 16]);
  });

  it('puts back each field out of what is offered, keeping the rest', () => {
    const parsed = ReviewEngineSchema.parse({
      depth: 22,
      cap: 3,
      engine: 'nnue',
      cores: 0,
      threads: 9,
      hash: 48,
    });
    expect(parsed).toEqual({ ...DEFAULT_REVIEW_ENGINE, depth: 22 });
    expect(ReviewEngineSchema.parse({ cap: 10, engine: 'full', cores: 4, hash: 256 })).toEqual({
      ...DEFAULT_REVIEW_ENGINE,
      cap: 10,
      engine: 'full',
      cores: 4,
      hash: 256,
    });
  });
});

describe('keptReviewEngine', () => {
  it('gives back the settings kept', () => {
    const settings = { depth: 24, cap: 5, engine: 'full', cores: 3, threads: 2, hash: 64 } as const;
    keepReviewEngine(settings);
    expect(keptReviewEngine()).toEqual(settings);
  });

  it('starts at the defaults, and mends what was kept wrong', () => {
    expect(keptReviewEngine()).toEqual(DEFAULT_REVIEW_ENGINE);
    localStorage.setItem(StorageKey.reviewEngine, 'not json');
    expect(keptReviewEngine()).toEqual(DEFAULT_REVIEW_ENGINE);
    localStorage.setItem(StorageKey.reviewEngine, JSON.stringify({ depth: 99, engine: 'full' }));
    expect(keptReviewEngine()).toEqual({ ...DEFAULT_REVIEW_ENGINE, engine: 'full' });
  });
});

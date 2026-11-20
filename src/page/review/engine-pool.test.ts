import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_REVIEW_ENGINE, type ReviewEngine } from '#shared/review-engine/options.ts';
import { pickReviewEngine } from './engine/review-engine.ts';
import { engineCount } from './engine-pool.ts';

function device(cores: number, memory: number | undefined): void {
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(cores);
  Object.defineProperty(navigator, 'deviceMemory', { value: memory, configurable: true });
}

/** The engines the page runs once `options` are picked. */
function pick(options: Partial<ReviewEngine>): number {
  pickReviewEngine({ ...DEFAULT_REVIEW_ENGINE, ...options });
  return engineCount();
}

describe('engineCount', () => {
  afterEach(() => {
    pickReviewEngine(DEFAULT_REVIEW_ENGINE);
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'deviceMemory');
  });

  it('runs an engine per core but one, up to three', () => {
    device(2, 8);
    expect(engineCount()).toBe(1);
    device(16, 8);
    expect(engineCount()).toBe(3);
  });

  it('runs fewer on a device short of memory', () => {
    device(16, 4);
    expect(engineCount()).toBe(2);
    device(16, 2);
    expect(engineCount()).toBe(1);
    device(16, 0.5);
    expect(engineCount()).toBe(1);
  });

  it('runs two at most when the browser doesn’t tell the memory', () => {
    device(16, undefined);
    expect(engineCount()).toBe(2);
  });

  it('runs the engines the settings pick: their cores, each with its threads', () => {
    device(8, 8);
    expect(pick({ cores: 6, threads: 2 })).toBe(3);
    expect(pick({ cores: 5, threads: 1 })).toBe(5);
    // The full network weighs more: 8 GB keep two.
    expect(pick({ engine: 'full' })).toBe(2);
    // Never more cores than the device has.
    expect(pick({ cores: 32 })).toBe(8);
  });
});

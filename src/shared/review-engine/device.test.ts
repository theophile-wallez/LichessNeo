import { describe, expect, it } from 'vitest';
import { stubDevice } from '#shared/testing/device.ts';
import { coresOf, deviceMemory, engineCount, suggestedCores } from './device.ts';
import { DEFAULT_REVIEW_ENGINE } from './options.ts';

describe('suggestedCores', () => {
  it('leaves a core to the page, and takes three at most', () => {
    stubDevice(2, 8);
    expect(suggestedCores('light')).toBe(1);
    stubDevice(4, 8);
    expect(suggestedCores('light')).toBe(3);
    stubDevice(16, 8);
    expect(suggestedCores('light')).toBe(3);
  });

  it('takes fewer on a device short of memory, the full engine fewer still', () => {
    stubDevice(16, 4);
    expect(suggestedCores('light')).toBe(2);
    expect(suggestedCores('full')).toBe(1);
    stubDevice(16, 0.5);
    expect(suggestedCores('light')).toBe(1);
  });

  it("takes few when the browser doesn't tell the memory", () => {
    stubDevice(16, null);
    expect(deviceMemory()).toBeNull();
    expect(suggestedCores('light')).toBe(2);
    expect(suggestedCores('full')).toBe(1);
  });
});

describe('coresOf', () => {
  it("takes the cores picked, never more than the device's", () => {
    stubDevice(4, 8);
    expect(coresOf({ ...DEFAULT_REVIEW_ENGINE, cores: 2 })).toBe(2);
    expect(coresOf({ ...DEFAULT_REVIEW_ENGINE, cores: 12 })).toBe(4);
    expect(coresOf(DEFAULT_REVIEW_ENGINE)).toBe(3);
  });
});

describe('engineCount', () => {
  it('makes an engine of each group of threads, one at least', () => {
    stubDevice(8, 8);
    expect(engineCount({ ...DEFAULT_REVIEW_ENGINE, cores: 6 })).toBe(6);
    expect(engineCount({ ...DEFAULT_REVIEW_ENGINE, cores: 6, threads: 4 })).toBe(1);
    expect(engineCount({ ...DEFAULT_REVIEW_ENGINE, cores: 2, threads: 4 })).toBe(1);
  });
});

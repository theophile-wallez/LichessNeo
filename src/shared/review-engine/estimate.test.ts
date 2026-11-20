import { beforeEach, describe, expect, it } from 'vitest';
import { stubDevice } from '#shared/testing/device.ts';
import { nearly } from '#shared/testing/numbers.ts';
import { durationRange, gameSeconds, positionSeconds, recordSearch } from './estimate.ts';
import { DEFAULT_REVIEW_ENGINE, MAX_DEPTH, MIN_DEPTH, type ReviewEngine } from './options.ts';

const LIGHT: ReviewEngine = DEFAULT_REVIEW_ENGINE;
const FULL: ReviewEngine = { ...DEFAULT_REVIEW_ENGINE, engine: 'full' };

const depths = Array.from({ length: MAX_DEPTH - MIN_DEPTH + 1 }, (_, i) => MIN_DEPTH + i);

// Spaces as Intl writes them differ by language (a narrow no-break one in French).
const plain = (text: string): string => text.replaceAll(/\s/gu, ' ');

beforeEach(() => {
  localStorage.clear();
});

describe('positionSeconds', () => {
  it('takes the times measured, and goes between them and past them by steps', () => {
    expect(positionSeconds(LIGHT)).toEqual(nearly(0.611));
    expect(positionSeconds(LIGHT, 17)).toEqual(nearly(Math.sqrt(0.611 * 1.157)));
    expect(positionSeconds(LIGHT, 10)).toEqual(nearly(0.115 / 1.518 ** 2));
    expect(positionSeconds(FULL, 22)).toEqual(nearly(3.547 * 1.42 ** 2));
  });

  it('grows with the depth, and is longer on the full engine', () => {
    for (const engine of [LIGHT, FULL]) {
      const times = depths.map(depth => positionSeconds(engine, depth));
      expect(times.every((time, i) => i === 0 || time > (times[i - 1] ?? 0))).toBe(true);
    }
    for (const depth of depths)
      expect(positionSeconds(FULL, depth)).toBeGreaterThan(positionSeconds(LIGHT, depth));
  });

  it('costs a little more per thread, and stops at the time limit', () => {
    expect(positionSeconds({ ...LIGHT, threads: 4 })).toEqual(nearly(0.611 * 1.36));
    expect(positionSeconds({ ...LIGHT, cap: 2 }, 30)).toBe(2);
    expect(positionSeconds({ ...LIGHT, cap: 2 })).toEqual(nearly(0.611));
  });
});

describe('recordSearch', () => {
  it("moves the engine's pace a step towards the device's", () => {
    recordSearch(LIGHT, 16, 0.611 * 2);
    expect(positionSeconds(LIGHT)).toEqual(nearly(0.611 * 1.05));
    expect(positionSeconds(FULL, 16)).toEqual(nearly(0.801));
  });

  it('learns nothing from a search that took no time', () => {
    recordSearch(LIGHT, 16, 0);
    expect(positionSeconds(LIGHT)).toEqual(nearly(0.611));
  });
});

describe('gameSeconds', () => {
  it("shares the game's searched positions between the engines", () => {
    stubDevice(8, 8);
    // Three engines, the most suggested.
    expect(gameSeconds(LIGHT, 40)).toEqual(nearly((40 * 0.85 * 0.611) / 3));
    expect(gameSeconds({ ...LIGHT, cores: 1 }, 40)).toEqual(nearly(40 * 0.85 * 0.611));
  });
});

describe('durationRange', () => {
  it('gives seconds by fives, in the language asked', () => {
    expect(plain(durationRange(10, 'en'))).toBe('5–15 sec');
    expect(plain(durationRange(10, 'fr'))).toBe('5–15 s');
  });

  it('gives minutes and hours by halves', () => {
    expect(plain(durationRange(100, 'en'))).toBe('1–2.5 min');
    expect(plain(durationRange(100, 'fr'))).toBe('1–2,5 min');
    expect(plain(durationRange(10_000, 'en'))).toBe('2–4 hr');
  });

  it('gives one figure when both ends round alike', () => {
    expect(plain(durationRange(3, 'en'))).toBe('≈ 5 sec');
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import type { Analysed } from '#shared/review-engine/options.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import {
  cacheProgress,
  cacheRecords,
  cacheThreats,
  dropCachedRecords,
  readCachedRecords,
  readCachedThreats,
} from './cache.ts';

const STANDARD: Analysed = { depth: 16, engine: 'light' };
const DEEP_FULL: Analysed = { depth: 20, engine: 'full' };

const RECORD: PositionRecord = {
  cp: 20,
  whiteWinChance: 51.8,
  secondLineWinChance: 50,
  best: 'e2e4',
};
const WRITTEN = '{"cp":20,"wp":51.8,"wp2":50,"best":"e2e4"}';

const KEY = 'ln-ext-review:abcdefgh:2:v3';
const PROGRESS_KEY = 'ln-ext-review-progress:abcdefgh:2:v3';

const found = (wanted: Analysed) => readCachedRecords('abcdefgh', 2, wanted);

beforeEach(() => {
  localStorage.clear();
});

describe('the cache’s records, by what they were found with', () => {
  it('keep the depth and engine of a game analysed past the defaults', () => {
    cacheRecords({
      gameId: 'abcdefgh',
      positions: 2,
      records: [RECORD, RECORD],
      analysed: DEEP_FULL,
    });
    expect(localStorage.getItem(KEY)).toBe(
      `{"analysed":{"depth":20,"engine":"full"},"records":[${WRITTEN},${WRITTEN}]}`,
    );
    expect(found(STANDARD)).toEqual({ analysed: DEEP_FULL, records: [RECORD, RECORD] });
    expect(found({ depth: 20, engine: 'light' })?.analysed).toEqual(DEEP_FULL);
    expect(found({ depth: 24, engine: 'full' })).toBeNull();
  });

  it('don’t do for the full engine when the light one found them, however deep', () => {
    cacheRecords({
      gameId: 'abcdefgh',
      positions: 2,
      records: [RECORD, RECORD],
      analysed: { depth: 24, engine: 'light' },
    });
    expect(found({ depth: 12, engine: 'full' })).toBeNull();
    expect(found({ depth: 12, engine: 'light' })?.records).toEqual([RECORD, RECORD]);
  });

  it('are written as before at the defaults, and an older copy’s read as found with them', () => {
    cacheRecords({
      gameId: 'abcdefgh',
      positions: 2,
      records: [RECORD, RECORD],
      analysed: STANDARD,
    });
    expect(localStorage.getItem(KEY)).toBe(`[${WRITTEN},${WRITTEN}]`);
    expect(found(STANDARD)?.analysed).toEqual(STANDARD);
    expect(found({ depth: 18, engine: 'light' })).toBeNull();
  });

  it('keep the progress’ depth and engine too, holes included', () => {
    const analysed: Analysed = { depth: 20, engine: 'light' };
    cacheProgress({ gameId: 'abcdefgh', positions: 2, records: [RECORD], analysed });
    expect(localStorage.getItem(PROGRESS_KEY)).toBe(
      `{"analysed":{"depth":20,"engine":"light"},"records":[${WRITTEN},null]}`,
    );
    expect(found({ depth: 12, engine: 'light' })).toEqual({
      analysed,
      records: [RECORD, undefined],
    });
    expect(found({ depth: 22, engine: 'light' })).toBeNull();
  });

  it('go when dropped, finished or not, the game’s threats kept', () => {
    cacheRecords({
      gameId: 'abcdefgh',
      positions: 2,
      records: [RECORD, RECORD],
      analysed: STANDARD,
    });
    cacheProgress({ gameId: 'abcdefgh', positions: 2, records: [RECORD], analysed: DEEP_FULL });
    cacheThreats('abcdefgh', [RECORD, RECORD]);
    dropCachedRecords('abcdefgh', 2);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
    expect(found(STANDARD)).toBeNull();
    expect(readCachedThreats('abcdefgh', 2)).toEqual([RECORD, RECORD]);
  });
});

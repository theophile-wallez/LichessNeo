import { beforeEach, describe, expect, it } from 'vitest';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { cacheProgress, cacheRecords, readCachedRecords } from './cache.ts';

const RECORD: PositionRecord = {
  cp: 20,
  whiteWinChance: 51.8,
  secondLineWinChance: 50,
  best: 'e2e4',
};

const reviewKeys = (): string[] =>
  Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '')
    .filter(key => key.startsWith('ln-ext-review'))
    .toSorted();

describe('the cache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads back an unfinished analysis, holes included', () => {
    cacheProgress('abcdefgh', 3, [RECORD, undefined, RECORD]);
    expect(readCachedRecords('abcdefgh', 3)).toEqual([RECORD, undefined, RECORD]);
    expect(readCachedRecords('abcdefgh', 4)).toBeNull();
  });

  it('drops the progress once the analysis is complete', () => {
    cacheProgress('abcdefgh', 2, [RECORD]);
    cacheRecords('abcdefgh', 2, [RECORD, RECORD]);
    expect(reviewKeys()).toEqual(['ln-ext-review-index', 'ln-ext-review:abcdefgh:2:v1']);
    expect(readCachedRecords('abcdefgh', 2)).toEqual([RECORD, RECORD]);
  });

  it('keeps the games opened last, and drops another version’s', () => {
    localStorage.setItem('ln-ext-review:oldgame1:2:v0', '[]');
    localStorage.setItem(
      'ln-ext-review:kept0001:1:v1',
      '[{"cp":0,"wp":50,"wp2":null,"best":null}]',
    );
    for (let i = 0; i < 200; i++) cacheRecords(`game${String(i).padStart(4, '0')}`, 1, [RECORD]);
    expect(readCachedRecords('kept0001', 1)).toBeNull();
    expect(localStorage.getItem('ln-ext-review:oldgame1:2:v0')).toBeNull();
    // Opening a game makes it the last one dropped.
    readCachedRecords('game0000', 1);
    cacheRecords('another1', 1, [RECORD]);
    expect(readCachedRecords('game0000', 1)).toEqual([RECORD]);
    expect(readCachedRecords('game0001', 1)).toBeNull();
    expect(reviewKeys()).toHaveLength(201);
  });
});

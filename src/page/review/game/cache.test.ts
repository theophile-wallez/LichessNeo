import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Analysed } from '#shared/review-engine/options.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import {
  type CachedThreat,
  cacheProgress,
  cacheRecords,
  cacheThreats,
  readCachedRecords,
  readCachedThreats,
} from './cache.ts';

const STANDARD: Analysed = { depth: 16, engine: 'light' };

const game = (gameId: string, positions: number, records: (PositionRecord | undefined)[]) => ({
  gameId,
  positions,
  records,
  analysed: STANDARD,
});

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
    cacheProgress(game('abcdefgh', 3, [RECORD, undefined, RECORD]));
    expect(readCachedRecords('abcdefgh', 3, STANDARD)?.records ?? null).toEqual([
      RECORD,
      undefined,
      RECORD,
    ]);
    expect(readCachedRecords('abcdefgh', 4, STANDARD)?.records ?? null).toBeNull();
  });

  it('drops the progress once the analysis is complete', () => {
    cacheProgress(game('abcdefgh', 2, [RECORD]));
    cacheRecords(game('abcdefgh', 2, [RECORD, RECORD]));
    expect(reviewKeys()).toEqual(['ln-ext-review-index', 'ln-ext-review:abcdefgh:2:v3']);
    expect(readCachedRecords('abcdefgh', 2, STANDARD)?.records ?? null).toEqual([RECORD, RECORD]);
  });

  it('keeps the games opened last, and drops another version’s', () => {
    localStorage.setItem('ln-ext-review:oldgame1:2:v0', '[]');
    localStorage.setItem(
      'ln-ext-review:kept0001:1:v3',
      '[{"cp":0,"wp":50,"wp2":null,"best":null}]',
    );
    for (let i = 0; i < 200; i++)
      cacheRecords(game(`game${String(i).padStart(4, '0')}`, 1, [RECORD]));
    expect(readCachedRecords('kept0001', 1, STANDARD)?.records ?? null).toBeNull();
    expect(localStorage.getItem('ln-ext-review:oldgame1:2:v0')).toBeNull();
    // Opening a game makes it the last one dropped.
    readCachedRecords('game0000', 1, STANDARD);
    cacheRecords(game('another1', 1, [RECORD]));
    expect(readCachedRecords('game0000', 1, STANDARD)?.records ?? null).toEqual([RECORD]);
    expect(readCachedRecords('game0001', 1, STANDARD)?.records ?? null).toBeNull();
    expect(reviewKeys()).toHaveLength(201);
  });

  it('drops the games an older version indexed', () => {
    localStorage.setItem('ln-ext-review:oldgame1:2:v1', '[]');
    localStorage.setItem('ln-ext-review-index', '["ln-ext-review:oldgame1:2:v1"]');
    cacheRecords(game('abcdefgh', 1, [RECORD]));
    expect(reviewKeys()).toEqual(['ln-ext-review-index', 'ln-ext-review:abcdefgh:1:v3']);
    expect(localStorage.getItem('ln-ext-review-index')).toBe('["ln-ext-review:abcdefgh:1:v3"]');
  });

  it('keeps a game’s threats by position: a record, none, or not searched yet', () => {
    const threats: CachedThreat[] = [RECORD, false, null];
    cacheThreats('abcdefgh', threats);
    expect(localStorage.getItem('ln-ext-review-threats:abcdefgh:3:v3')).toBe(
      '[{"cp":20,"wp":51.8,"wp2":50,"best":"e2e4"},false,null]',
    );
    expect(readCachedThreats('abcdefgh', 3)).toEqual(threats);
    expect(readCachedThreats('abcdefgh', 4)).toEqual([]);
    // An entry that doesn't cover every position is read as none.
    localStorage.setItem('ln-ext-review-threats:abcdefgh:4:v3', '[false,null]');
    expect(readCachedThreats('abcdefgh', 4)).toEqual([]);
  });

  it('drops a game’s threats with its records', () => {
    cacheRecords(game('game0000', 1, [RECORD]));
    cacheThreats('game0000', [RECORD]);
    cacheThreats('another1', [RECORD]);
    for (let i = 1; i <= 200; i++)
      cacheRecords(game(`game${String(i).padStart(4, '0')}`, 1, [RECORD]));
    expect(readCachedRecords('game0000', 1, STANDARD)?.records ?? null).toBeNull();
    expect(readCachedThreats('game0000', 1)).toEqual([]);
    expect(readCachedThreats('another1', 1)).toEqual([RECORD]);
  });
});

describe('an older version’s threats', () => {
  it('are dropped once a page, though no index lists them', async () => {
    localStorage.clear();
    localStorage.setItem('ln-ext-review-threats:oldgame1:3:v2', '[false,null,false]');
    localStorage.setItem('ln-ext-review-threats:abcdefgh:3:v3', '[false,null,false]');
    // A page's first look at the cache: the module as it loads.
    vi.resetModules();
    const cache = await import('./cache.ts');
    cache.cacheRecords(game('abcdefgh', 1, [RECORD]));
    expect(localStorage.getItem('ln-ext-review-threats:oldgame1:3:v2')).toBeNull();
    expect(localStorage.getItem('ln-ext-review-threats:abcdefgh:3:v3')).not.toBeNull();
  });
});

import { z } from 'zod/mini';
import {
  readStoredJson,
  removeStored,
  StorageKey,
  storedKeys,
  writeStoredJson,
} from '#shared/storage.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { StoredRecordCodec, StoredRecordSchema } from '#page/review/evaluation/stored.ts';
import { prefixed } from '#shared/prefix.ts';

// Each game's records at full depth: kept once its analysis is complete, so
// opening the game again shows its review at once, and kept as they come in
// under another key, so a reload doesn't start the analysis over. It's
// Lichess's storage too: only the games analysed last are kept.

/** Bump to drop every cached review, when the records' meaning changes (2: with their lines, 3: longer). */
const CACHE_VERSION = 3;
/** Cached games kept, finished or not. */
const MAX_GAMES = 200;

const CachedSchema = z.array(StoredRecordCodec);
// A position without a record is written as null.
const WrittenSchema = z.array(z.optional(StoredRecordCodec));
const ProgressSchema = z.array(z.nullable(StoredRecordCodec));
const IndexSchema = z.array(z.string());

const threatsKey = (gameId: string, positions: number): string =>
  StorageKey.reviewThreats(gameId, positions, CACHE_VERSION);
const cacheKey = (gameId: string, positions: number): string =>
  StorageKey.reviewCache(gameId, positions, CACHE_VERSION);
const progressKey = (gameId: string, positions: number): string =>
  StorageKey.reviewProgress(gameId, positions, CACHE_VERSION);

const isCurrent = (key: string): boolean => key.endsWith(`:v${CACHE_VERSION}`);

// The threats of an older version: they're in no index, so they're looked for
// once a page.
let threatsSwept = false;

function sweepThreats(): void {
  if (threatsSwept) return;
  threatsSwept = true;
  for (const key of storedKeys(`${prefixed('review-threats')}:`))
    if (!isCurrent(key)) removeStored(key);
}

/** The index as stored, or, the first time, built from the caches already there. */
function readIndex(): string[] {
  sweepThreats();
  const index = readStoredJson(StorageKey.reviewIndex, IndexSchema);
  if (index) {
    for (const key of index.filter(key => !isCurrent(key))) removeStored(key);
    return index.filter(isCurrent);
  }
  const cached = [
    ...storedKeys(`${prefixed('review')}:`),
    ...storedKeys(`${prefixed('review-progress')}:`),
  ];
  for (const key of cached.filter(key => !isCurrent(key))) removeStored(key);
  return cached.filter(isCurrent);
}

// A game's threats go with its records, under the same game and positions.
function dropGame(key: string): void {
  removeStored(key);
  const [, gameId, positions] = key.split(':');
  if (gameId && positions) removeStored(threatsKey(gameId, Number(positions)));
}

/** Marks `key` as opened last, dropping `dropped` and the games past the cap. */
function remember(key: string, dropped?: string): void {
  try {
    const index = readIndex().filter(known => known !== key && known !== dropped);
    index.push(key);
    for (const old of index.splice(0, Math.max(0, index.length - MAX_GAMES))) dropGame(old);
    writeStoredJson(StorageKey.reviewIndex, index);
  } catch {
    // A blocked storage: nothing is cached anyway.
  }
}

/** The game's records: all of them once its analysis is complete, else those found so far. */
export function readCachedRecords(
  gameId: string,
  positions: number,
): (PositionRecord | undefined)[] | null {
  const key = cacheKey(gameId, positions);
  const records = readStoredJson(key, CachedSchema);
  if (records?.length === positions) {
    remember(key);
    return records;
  }
  const progress = readStoredJson(progressKey(gameId, positions), ProgressSchema);
  if (progress?.length !== positions) return null;
  remember(progressKey(gameId, positions));
  return progress.map(record => record ?? undefined);
}

/** Keeps the records found so far of a game whose analysis isn't complete. */
export function cacheProgress(
  gameId: string,
  positions: number,
  records: readonly (PositionRecord | undefined)[],
): void {
  const key = progressKey(gameId, positions);
  const written = Array.from({ length: positions }, (_, i) => records[i]);
  writeStoredJson(key, z.encode(WrittenSchema, written));
  remember(key);
}

/** Keeps a game's records once its analysis is complete. */
export function cacheRecords(
  gameId: string,
  positions: number,
  records: readonly (PositionRecord | undefined)[],
): void {
  const progress = progressKey(gameId, positions);
  removeStored(progress);
  writeStoredJson(cacheKey(gameId, positions), z.encode(WrittenSchema, [...records]));
  remember(cacheKey(gameId, positions), progress);
}

// By position: the threat with the other side to move, false when there's none
// worth reading (or nothing to search), null when it isn't searched yet.
const ThreatsSchema = z.array(z.union([z.literal(false), z.null(), StoredRecordSchema]));

export type CachedThreat = PositionRecord | false | null;

/** The threats searched around a game's positions, by position. */
export function readCachedThreats(gameId: string, positions: number): CachedThreat[] {
  const stored = readStoredJson(threatsKey(gameId, positions), ThreatsSchema);
  if (stored?.length !== positions) return [];
  return stored.map(entry => (entry ? z.decode(StoredRecordCodec, entry) : entry));
}

/** Keeps the threats searched so far around a game's positions. */
export function cacheThreats(gameId: string, threats: readonly CachedThreat[]): void {
  const written = threats.map(entry => (entry ? z.encode(StoredRecordCodec, entry) : entry));
  writeStoredJson(threatsKey(gameId, threats.length), written);
}

import { engineCount } from '#shared/review-engine/device.ts';
import { recordSearch } from '#shared/review-engine/estimate.ts';
import type { Analysed } from '#shared/review-engine/options.ts';
import type { EnginePool } from '#page/review/engine/pool.ts';
import { uciPosition } from '#page/review/engine/position.ts';
import { toRecord } from '#page/review/engine/record.ts';
import { deepSearch, QUICK_SEARCH } from '#page/review/engine/settings.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { cacheProgress, cacheRecords, readCachedRecords } from './cache.ts';
import { lookUpCloud } from './cloud-lookup.ts';
import { isComplete, type RecordsRun, type RecordsWork, takeDeep } from './records.ts';
import { pause } from './wait.ts';

// The game's records: the cache or the cloud where they can, the engines for
// the rest, then the cache again, under the key the review reads.

export interface Job {
  readonly index: number;
  readonly deep: boolean;
}

interface JobInput {
  readonly work: RecordsWork;
  /** Positions someone waits on, in order. */
  readonly urgent: readonly number[];
  /** A quick pass over the game before the full depth. */
  readonly draft: boolean;
}

// Deep searches between two saves of the analysis's progress.
const PROGRESS_EVERY = 8;

// The cloud looks up the opening one position at a time. The engine skips the
// position it's looking up and the next few, which it will reach soon.
const CLOUD_AHEAD = 3;

/**
 * The next position for an engine: the urgent ones first, at full depth;
 * then, for a draft, a quick pass over the game; then the rest at full
 * depth, from the start.
 */
export function nextJob({ work, urgent, draft }: JobInput): Job | null {
  const { nodes, deep, rough, cloudAt, pending } = work;
  const index = urgent.find(i => i >= 0 && i < nodes.length && !deep[i] && !pending.has(i));
  if (index !== undefined) return { index, deep: true };
  // Another engine's position, or one the cloud will answer soon.
  const taken = (i: number): boolean =>
    pending.has(i) || (i >= cloudAt && i <= cloudAt + CLOUD_AHEAD);
  if (draft)
    for (let i = 0; i < nodes.length; i++)
      if (!deep[i] && !rough[i] && !taken(i)) return { index: i, deep: false };
  for (let i = 0; i < nodes.length; i++) if (!deep[i] && !taken(i)) return { index: i, deep: true };
  return null;
}

async function search(run: RecordsRun, pool: EnginePool, job: Job): Promise<PositionRecord> {
  const { work, options } = run;
  work.pending.add(job.index);
  try {
    const fen = work.nodes[job.index]?.fen ?? '';
    const limits = job.deep ? deepSearch(options) : QUICK_SEARCH;
    const started = performance.now();
    const result = await pool.analyse({
      position: uciPosition(work.nodes.slice(0, job.index + 1), run.chess960),
      limits,
    });
    const seconds = (performance.now() - started) / 1000;
    // The device's pace, for the times the settings show; a search cut short says nothing of it.
    if (job.deep && seconds * 1000 < limits.movetime * 0.95)
      recordSearch(options, limits.depth, seconds);
    return toRecord(fen, result);
  } finally {
    work.pending.delete(job.index);
  }
}

const analysedBy = ({ options }: RecordsRun): Analysed => ({
  depth: options.depth,
  engine: options.engine,
});

const cached = (run: RecordsRun) => ({
  gameId: run.gameId,
  positions: run.work.nodes.length,
  records: run.work.deep,
  analysed: analysedBy(run),
});

/** One of the engines' loops: as many run as the pool has engines. */
async function runWorker(run: RecordsRun, pool: EnginePool): Promise<void> {
  const { work } = run;
  for (;;) {
    await run.whenFree();
    if (run.stopped?.() || run.superseded?.()) return;
    const job = nextJob({ work, urgent: run.urgent?.() ?? [], draft: run.draft });
    if (!job) {
      if (isComplete(work)) return;
      // Nothing left for this engine: the cloud or the other engines have the rest.
      await pause(100);
      continue;
    }
    const record = await search(run, pool, job);
    // Started over: what this run found goes.
    if (run.superseded?.()) return;
    if (job.deep) {
      takeDeep(run, job.index, record);
      if (++work.searched % PROGRESS_EVERY === 0) cacheProgress(cached(run));
    } else work.rough[job.index] = record;
    run.onChange?.();
  }
}

// One loop per engine the page will have: while some still boot, their
// loops' searches wait in the pool for the engines already up.
function runEngines(run: RecordsRun, pool: EnginePool): Promise<void[]> {
  return Promise.all(Array.from({ length: engineCount(run.options) }, () => runWorker(run, pool)));
}

/** Takes the records cached for the game: whether they were all there. */
function takeCached(run: RecordsRun): boolean {
  const { gameId, work } = run;
  const found = readCachedRecords(gameId, work.nodes.length, analysedBy(run));
  for (const [i, record] of (found?.records ?? []).entries()) if (record) takeDeep(run, i, record);
  if (isComplete(work)) work.analysed = found?.analysed ?? analysedBy(run);
  return isComplete(work);
}

/** Boots the engines and searches on them: the pool, or null when they failed. */
async function searchAll(run: RecordsRun): Promise<EnginePool | null> {
  let pool: EnginePool;
  try {
    pool = await run.engines();
  } catch (error) {
    if (!run.superseded?.()) run.onFailure('engine boot failed', error);
    return null;
  }
  try {
    await runEngines(run, pool);
  } catch (error) {
    // An analysis started over ends the engines this one searched on.
    if (!run.superseded?.()) run.onFailure('engine failed', error);
    return null;
  }
  return pool;
}

/**
 * Finds every position's full-depth record, starting from those cached. The
 * engines' pool once all are in and cached; null when the cache had them
 * all (no engine booted), when the engines failed, or when the run stopped.
 */
export async function analyseRecords(run: RecordsRun): Promise<EnginePool | null> {
  const { work } = run;
  const complete = takeCached(run);
  run.onChange?.();
  if (complete || run.stopped?.()) return null;
  if (!run.chess960) void lookUpCloud(run);
  const pool = await searchAll(run);
  if (!pool || run.superseded?.()) return null;
  if (!isComplete(work)) {
    cacheProgress(cached(run));
    return null;
  }
  work.analysed = analysedBy(run);
  cacheRecords(cached(run));
  return pool;
}

import type { EnginePool } from '#page/review/engine/pool.ts';
import type { PathPosition } from '#page/review/engine/position.ts';
import type { Analysed, ReviewEngine } from '#shared/review-engine/options.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';

// The game's analysis as a page runs it: the analysis page for its review,
// the game page, once the game is over, for the review to come
// (page/game-over/precompute.ts). The page gives the game, its engines and
// when to work; the analysis fills in the records.

/**
 * The records as they come in, by position index. `deep` is what verdicts
 * are made from (the engine at full depth, or the cloud); `rough` stands in
 * on the graph until then (the quick pass, or the game's server analysis).
 */
export interface RecordsWork {
  /** The game's mainline: its start, then one position per move. */
  readonly nodes: readonly PathPosition[];
  readonly deep: (PositionRecord | undefined)[];
  readonly rough: (PositionRecord | undefined)[];
  /** The position the cloud is looking up, Infinity once it's done. */
  cloudAt: number;
  /** The positions the engines are searching. */
  readonly pending: Set<number>;
  /** The positions whose full-depth record came from the cloud. */
  readonly cloud: Set<number>;
  /** Full-depth searches done, for saving the progress now and then. */
  searched: number;
  /** What the full-depth records were found with, once they're all in. */
  analysed: Analysed | null;
}

export const newRecordsWork = (nodes: readonly PathPosition[]): RecordsWork => ({
  nodes,
  deep: [],
  rough: [],
  cloudAt: Infinity,
  pending: new Set(),
  cloud: new Set(),
  searched: 0,
  analysed: null,
});

export interface RecordsRun {
  readonly gameId: string;
  readonly chess960: boolean;
  /** The depth, engine and cores the settings pick, as the run started. */
  readonly options: ReviewEngine;
  readonly work: RecordsWork;
  /** The page's engines, booted on the first call. */
  readonly engines: () => Promise<EnginePool>;
  /** Resolves once the analysis may use the processor. */
  readonly whenFree: () => Promise<void>;
  /** A quick pass over the game before the full depth, for the graph's first draft. */
  readonly draft: boolean;
  /** Positions someone waits on, searched at full depth before the others. */
  readonly urgent?: () => readonly number[];
  /** A full-depth record just taken into `work.deep`. */
  readonly onDeep?: (index: number, record: PositionRecord) => void;
  /** Some record came in. */
  readonly onChange?: () => void;
  readonly onFailure: (what: string, error: unknown) => void;
  /** The page moved on: the analysis stops, its progress saved. */
  readonly stopped?: () => boolean;
  /** The analysis started over (the settings changed): this run stops, its finds dropped. */
  readonly superseded?: () => boolean;
}

/** Takes a full-depth record, unless the position has one: a judged move stays as it is. */
export function takeDeep(run: RecordsRun, index: number, record: PositionRecord): void {
  const { work } = run;
  if (work.deep[index]) return;
  work.deep[index] = record;
  run.onDeep?.(index, record);
}

/** Every position has its full-depth record. */
export const isComplete = (work: RecordsWork): boolean =>
  work.nodes.every((_, i) => work.deep[i] !== undefined);

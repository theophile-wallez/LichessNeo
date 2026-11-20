import { z } from 'zod/mini';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';

// How deep the Debrief searches, and on which engines: picked in the settings
// or in the review's popover, kept in the settings (content/settings) and here
// too, for the page world, which can't read them.

export const MIN_DEPTH = 8;
export const MAX_DEPTH = 40;
/** The slider's and the curve's end: past it, the depth is picked by steps. */
export const CURVE_DEPTH = 28;
export const DEFAULT_DEPTH = 16;
export const MAX_THREADS = 8;

/** Lichess's Stockfish 19 with its 1 MB network, or its full 94 MB one. */
export const EngineKindSchema = z.enum(['light', 'full']);
export type EngineKind = z.infer<typeof EngineKindSchema>;

/** The table sizes offered, in MB. */
export const HASHES = [16, 32, 64, 128, 256] as const;
/** The time limits per position offered, in seconds; 0 for none. */
export const CAPS = [0, 2, 5, 10, 30] as const;

const pick = <T extends number>(values: readonly T[], fallback: T) =>
  z.catch(z.number().check(z.refine(value => values.some(known => known === value))), fallback);

export const ReviewEngineSchema = z.object({
  depth: z.catch(z.int().check(z.minimum(MIN_DEPTH), z.maximum(MAX_DEPTH)), DEFAULT_DEPTH),
  /** Seconds a position may take at most; 0, the depth alone. */
  cap: pick(CAPS, 0),
  engine: z.catch(EngineKindSchema, 'light'),
  /** The cores the analysis takes; null, as many as the device suggests. */
  cores: z.catch(z.nullable(z.int().check(z.minimum(1), z.maximum(64))), null),
  threads: z.catch(z.int().check(z.minimum(1), z.maximum(MAX_THREADS)), 1),
  hash: pick(HASHES, 16),
});

export type ReviewEngine = z.infer<typeof ReviewEngineSchema>;

export const DEFAULT_REVIEW_ENGINE: ReviewEngine = ReviewEngineSchema.parse({});

/** What a game's records were found with. */
export const AnalysedSchema = z.object({ depth: z.int(), engine: EngineKindSchema });
export type Analysed = z.infer<typeof AnalysedSchema>;

/** Records found with `analysed` do for `wanted`: as deep, and the same engine or the full one. */
export const covers = (analysed: Analysed, wanted: Analysed): boolean =>
  analysed.depth >= wanted.depth &&
  (analysed.engine === wanted.engine || analysed.engine === 'full');

/** The levels offered, by their depth; any other depth is the user's own. */
export const TIERS = [
  { id: 'fast', depth: 12, hue: 'cyan' },
  { id: 'standard', depth: 16, hue: 'blue' },
  { id: 'deep', depth: 20, hue: 'purple' },
  { id: 'max', depth: 24, hue: 'pink' },
] as const;

export type TierId = (typeof TIERS)[number]['id'] | 'custom';

export const tierOf = (depth: number): TierId =>
  TIERS.find(tier => tier.depth === depth)?.id ?? 'custom';

export const hueOf = (tier: TierId): string =>
  TIERS.find(known => known.id === tier)?.hue ?? 'orange';

const SETTINGS_KEYS = ['depth', 'cap', 'engine', 'cores', 'threads', 'hash'] as const;

export const isDefault = (options: ReviewEngine): boolean =>
  SETTINGS_KEYS.every(key => options[key] === DEFAULT_REVIEW_ENGINE[key]);

/** The settings as last kept, for the page world and before the settings are read. */
export const keptReviewEngine = (): ReviewEngine =>
  readStoredJson(StorageKey.reviewEngine, ReviewEngineSchema) ?? DEFAULT_REVIEW_ENGINE;

export function keepReviewEngine(options: ReviewEngine): void {
  writeStoredJson(StorageKey.reviewEngine, options);
}

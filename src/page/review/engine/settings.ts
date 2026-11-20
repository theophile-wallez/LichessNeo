import type { EngineKind, ReviewEngine } from '#shared/review-engine/options.ts';

// Lichess's own Stockfish builds, the ones its analysis board runs, and how
// deep the review searches.

export const STOCKFISH_BUILD = { root: 'npm/stockfish-web', script: 'sf_19_smallnet.js' };

// The full network's build, the one Lichess's analysis offers as "Stockfish 19 · 94MB".
const SCRIPTS: Record<EngineKind, string> = { light: STOCKFISH_BUILD.script, full: 'sf_19.js' };

/**
 * The build's script for this browser. Where relaxed SIMD runs, Lichess ships
 * the same engine built with it: same lines, about a quarter faster.
 */
export const stockfishScript = (relaxedSimd: boolean, engine: EngineKind = 'light'): string =>
  relaxedSimd ? SCRIPTS[engine].replace(/\.js$/, '_relaxed-simd.js') : SCRIPTS[engine];

export interface SearchLimits {
  readonly depth: number;
  readonly movetime: number;
}

// `movetime` only caps a search gone long: on one thread, the depth usually
// comes in well under half a second. Capped sooner, a third of the positions
// fell short of it.

/** What verdicts are made from. */
export const FULL_SEARCH: SearchLimits = { depth: 16, movetime: 5000 };

// Each ply past the default depth takes about a third longer.
const PLY_COST = 1.35;

/** The game's searches at the depth the settings pick, capped as they say, else as long as it takes. */
export function deepSearch({ depth, cap }: ReviewEngine): SearchLimits {
  if (cap > 0) return { depth, movetime: cap * 1000 };
  const extra = Math.max(0, depth - FULL_SEARCH.depth);
  return { depth, movetime: Math.round(FULL_SEARCH.movetime * PLY_COST ** extra) };
}

/** The graph's first draft: enough to show the game's trend within seconds. */
export const QUICK_SEARCH: SearchLimits = { depth: 12, movetime: 1000 };

/** The game over's quick look, on the game page: counts in seconds, never cached. */
export const GAME_OVER_SEARCH: SearchLimits = { depth: 10, movetime: 250 };

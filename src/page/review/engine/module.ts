import { z } from 'zod/mini';
import { createGuard } from '#shared/guards.ts';
import type { EngineKind } from '#shared/review-engine/options.ts';

// What a stockfish-web build exports, and how the review sets it up: the page's
// engines and the site demo's recording (scripts/site/record-demo.ts) alike.

const FactorySchema = z.object({
  default: z.function({ input: [z.unknown()], output: z.unknown() }),
});

const StockfishModuleSchema = z.object({
  uci: z.function({ input: [z.string()], output: z.unknown() }),
  getRecommendedNnue: z.function({ input: [z.number()], output: z.unknown() }),
  setNnueBuffer: z.function({ input: [z.instanceof(Uint8Array), z.number()], output: z.unknown() }),
});

export type StockfishModule = z.infer<typeof StockfishModuleSchema>;

export const isFactory = createGuard(FactorySchema);
export const isStockfishModule = createGuard(StockfishModuleSchema);

/** Lichess's own sizes for each build, in 64 KB pages. */
export const INITIAL_PAGES: Record<EngineKind, number> = { light: 1536, full: 2560 };

/** The networks the build asks for, in its order. */
export function networkNames(module: StockfishModule): string[] {
  const names: string[] = [];
  for (let i = 0; ; i++) {
    const name = module.getRecommendedNnue(i);
    if (typeof name !== 'string' || name === '') return names;
    names.push(name);
  }
}

export interface ModuleSetup {
  readonly threads: number;
  readonly hash: number;
  readonly chess960: boolean;
}

/** Starts the engine as the review runs it: two lines, its table and threads as given. */
export function setUp(module: StockfishModule, { threads, hash, chess960 }: ModuleSetup): void {
  module.uci('uci');
  // One thread each unless picked: at a fixed depth more threads search wider,
  // not sooner, so the page runs several engines instead.
  module.uci(`setoption name Threads value ${threads}`);
  // Each search starts from an empty table: a small one does as well, and
  // weighs less with several engines on the page.
  module.uci(`setoption name Hash value ${hash}`);
  module.uci('setoption name MultiPV value 2');
  if (chess960) module.uci('setoption name UCI_Chess960 value true');
}

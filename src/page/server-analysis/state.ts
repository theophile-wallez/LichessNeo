import { z } from 'zod/mini';
import type { Color } from '#shared/chess/types.ts';

// Where a game's server analysis stands, from what Lichess's page holds: its
// request's form, the chart its script puts in the form's place, and the
// scores the analysis brings to each position of the mainline as it runs.

const SideSchema = z.object({
  inaccuracy: z.number(),
  mistake: z.number(),
  blunder: z.number(),
  acpl: z.number(),
  // Older analyses have none.
  accuracy: z.optional(z.number()),
});

/** What `ctrl.data.analysis` says of each side, once the analysis is in. */
export const AnalysisDataSchema = z.object({
  analysis: z.object({ white: SideSchema, black: SideSchema }),
});

export type SideSummary = z.infer<typeof SideSchema>;
export type AnalysisSummary = Readonly<Record<Color, SideSummary>>;

export interface PageAnalysis {
  /** Lichess offers to make one: its form is there. */
  readonly requestable: boolean;
  /** Lichess's chart took the form's place, or the analysis' data came in. */
  readonly started: boolean;
  /** Every position of the mainline has its score (`hasFullComputerAnalysis`). */
  readonly full: boolean;
  /** The mainline's positions, and how many have their score. */
  readonly positions: number;
  readonly scored: number;
  readonly summary: AnalysisSummary | null;
}

export type ServerAnalysis =
  | { readonly kind: 'none' }
  | { readonly kind: 'request' }
  | { readonly kind: 'running'; readonly share: number }
  | { readonly kind: 'done'; readonly summary: AnalysisSummary | null };

export function serverAnalysis(page: PageAnalysis): ServerAnalysis {
  if (page.full) return { kind: 'done', summary: page.summary };
  if (page.started || page.summary)
    return { kind: 'running', share: page.positions > 0 ? page.scored / page.positions : 0 };
  return page.requestable ? { kind: 'request' } : { kind: 'none' };
}

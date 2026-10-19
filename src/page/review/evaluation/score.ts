import { z } from 'zod/mini';
import type { Color } from '#shared/chess/index.ts';
import { clamp } from '#shared/math.ts';

/** An engine score: centipawns, or moves to mate (0: the side to move is mated). */
export type Score = { readonly cp: number } | { readonly mate: number };

const RecordFields = {
  // White's win probability, 0 to 100.
  whiteWinChance: z.number(),
  // The same for the engine's second line, when it had one.
  secondLineWinChance: z.nullable(z.number()),
  // The engine's best move, in its own notation.
  best: z.nullable(z.string()),
  // Its line from here, the best move first, cut to LINE_PLIES; caches written
  // before lines were kept have none.
  line: z.optional(z.array(z.string())),
};

/** The plies of a line a record keeps: enough for the trades and tactics the coach reads off it. */
export const LINE_PLIES = 8;

/** What the review knows of a position, from White's view (the cache's format is stored.ts). */
export const PositionRecordSchema = z.union([
  z.object({ cp: z.number(), ...RecordFields }),
  z.object({ mate: z.number(), ...RecordFields }),
]);
export type PositionRecord = z.infer<typeof PositionRecordSchema>;

/** A win probability from White's view, turned to `color`'s. */
export const forColor = (whiteWin: number, color: Color): number =>
  color === 'white' ? whiteWin : 100 - whiteWin;

/** Lichess's accuracy of a move, from the win probability it lost. */
export const moveAccuracy = (loss: number): number =>
  clamp(103.1668 * Math.exp(-0.04354 * loss) - 3.1669, 0, 100);

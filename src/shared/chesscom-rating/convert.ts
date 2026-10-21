import { z } from 'zod/mini';
import modelData from './model.json' with { type: 'json' };

// What a Lichess rating would be on Chess.com: no formula turns one into the
// other (the two pools started and drifted apart), so it's read off players
// with an account on both. model.json is data/conversion.json of the study
// that fits it, github.com/theophile-wallez/lichess-chesscom-ratings.

const SpeedSchema = z.enum(['bullet', 'blitz', 'rapid', 'classical', 'correspondence']);

/** Each row: a Lichess rating, the Chess.com one, and half the middle half's range around it. */
const RowSchema = z.tuple([z.number(), z.number(), z.number()]);

const ModelSchema = z.object({
  fitted: z.string(),
  speeds: z.partialRecord(SpeedSchema, z.array(RowSchema).check(z.minLength(2))),
});

export type ConversionModel = z.infer<typeof ModelSchema>;

/** Chess.com's floor. */
const LOWEST = 100;

export interface ChesscomRating {
  rating: number;
  /** Half the range the middle half of players at that rating sit in. */
  spread: number;
}

let model: ConversionModel | null = null;

/** The shipped model, parsed the first time it's needed (convert.test.ts parses it too). */
export function conversionModel(): ConversionModel {
  model ??= ModelSchema.parse(modelData);
  return model;
}

/**
 * The Chess.com rating of a Lichess player of this speed and rating, or null
 * for a speed Chess.com has no pool for. Past the table's ends it goes on at
 * the end's slope: few players are there to say otherwise.
 */
export function chesscomRating(
  speed: string,
  rating: number,
  from = conversionModel(),
): ChesscomRating | null {
  const parsed = SpeedSchema.safeParse(speed);
  const rows = parsed.success ? from.speeds[parsed.data] : undefined;
  if (!rows) return null;
  // The two rows around the rating, or the two at the nearest end.
  const above = rows.findIndex(row => row[0] >= rating);
  const i = Math.min(rows.length - 1, Math.max(1, above < 0 ? rows.length - 1 : above));
  const low = rows[i - 1];
  const high = rows[i];
  if (!low || !high) return null;
  const share = (rating - low[0]) / (high[0] - low[0]);
  const inside = Math.min(1, Math.max(0, share));
  return {
    rating: Math.max(LOWEST, Math.round(low[1] + share * (high[1] - low[1]))),
    spread: Math.round(low[2] + inside * (high[2] - low[2])),
  };
}

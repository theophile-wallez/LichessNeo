import { z } from 'zod/mini';
import modelData from './model.json' with { type: 'json' };

// The game rating's model, fitted on Lichess's own games by
// tools/game-rating/fit.py, which writes model.json.

const SpeedSchema = z.enum(['bullet', 'blitz', 'rapid', 'classical']);
export type Speed = z.infer<typeof SpeedSchema>;

/** The model's phase keys: opening, tactics, strategy, endgame. */
const PhaseKeySchema = z.enum(['o', 't', 's', 'e']);
export type PhaseKey = z.infer<typeof PhaseKeySchema>;

// Per context (4 phases × lost / level / winning), per loss band past the
// best one: the logit's intercept, slope and curvature over the rating.
const CONTEXTS = 12;
const BANDS = 6;
const CoefficientsSchema = z.tuple([z.number(), z.number(), z.number()]);

const RatingModelSchema = z.object({
  // The rated population's mean and deviation.
  pop: z.record(SpeedSchema, z.tuple([z.number(), z.number()])),
  // How far one game's level strays from the player's rating.
  tau: z.record(SpeedSchema, z.number()),
  // A phase's verdict, from best to mistake: how far above the player's rating it played.
  cuts: z.record(PhaseKeySchema, z.array(z.number())),
  theta: z.record(
    SpeedSchema,
    z.array(z.array(CoefficientsSchema).check(z.length(BANDS - 1))).check(z.length(CONTEXTS)),
  ),
});

export type RatingModel = z.infer<typeof RatingModelSchema>;

let model: RatingModel | null = null;

/**
 * The model, parsed the first time it's needed. A malformed model.json would
 * stop the whole review, which is why rating.test.ts parses the shipped one.
 */
export function ratingModel(): RatingModel {
  model ??= RatingModelSchema.parse(modelData);
  return model;
}

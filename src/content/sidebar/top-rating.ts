import { z } from 'zod/mini';

// A player's ratings, from Lichess's public user API (`/api/user/<name>`):
// the sidebar shows one beside their name, the most played speed's unless the
// settings pick another.

/** The speeds a player's games count in (not puzzles, Storm or Racer), in Lichess's order. */
export const SPEEDS = [
  'ultraBullet',
  'bullet',
  'blitz',
  'rapid',
  'classical',
  'correspondence',
] as const;

export type Speed = (typeof SPEEDS)[number];

const PerfSchema = z.object({
  games: z.number(),
  rating: z.number(),
  prov: z.optional(z.boolean()),
});

const optionalPerf = z.optional(PerfSchema);

export const UserSchema = z.object({
  perfs: z.object({
    ultraBullet: optionalPerf,
    bullet: optionalPerf,
    blitz: optionalPerf,
    rapid: optionalPerf,
    classical: optionalPerf,
    correspondence: optionalPerf,
  }),
});

export const TopRatingSchema = z.object({
  speed: z.enum(SPEEDS),
  rating: z.number(),
  provisional: z.boolean(),
});

export type TopRating = z.infer<typeof TopRatingSchema>;

/** Each speed the player has a rating in, played or not. */
export const RatingsSchema = z.partialRecord(
  z.enum(SPEEDS),
  z.object({ rating: z.number(), provisional: z.boolean() }),
);

export type Ratings = z.infer<typeof RatingsSchema>;

/** What the sidebar shows: none, the most played speed's rating, or one speed's. */
export const RatingPickSchema = z.enum(['hidden', 'mostPlayed', ...SPEEDS]);

export type RatingPick = z.infer<typeof RatingPickSchema>;

/** A rating as the sidebar writes it, "1500?" when provisional. */
export const ratingLabel = (rating: number, provisional: boolean): string =>
  `${Math.round(rating)}${provisional ? '?' : ''}`;

/** The speed with the most games, the first on a tie; null before any game. */
export function topRating({ perfs }: z.infer<typeof UserSchema>): TopRating | null {
  let best: TopRating | null = null;
  let mostGames = 0;
  for (const speed of SPEEDS) {
    const perf = perfs[speed];
    if (!perf || perf.games <= mostGames) continue;
    mostGames = perf.games;
    best = { speed, rating: perf.rating, provisional: perf.prov === true };
  }
  return best;
}

export function ratingsOf({ perfs }: z.infer<typeof UserSchema>): Ratings {
  const ratings: Ratings = {};
  for (const speed of SPEEDS) {
    const perf = perfs[speed];
    if (perf) ratings[speed] = { rating: perf.rating, provisional: perf.prov === true };
  }
  return ratings;
}

/** Where Glicko starts a player, as Lichess shows a speed they never played: "1500?". */
const UNPLAYED: NonNullable<Ratings[Speed]> = { rating: 1500, provisional: true };

/**
 * The rating picked, null if hidden. A speed the player never played is at Lichess's start (its
 * API leaves out UltraBullet then); one kept before the other speeds were, the most played.
 */
export function pickedRating(
  top: TopRating | null,
  ratings: Ratings | undefined,
  pick: RatingPick,
): TopRating | null {
  if (pick === 'hidden') return null;
  if (pick === 'mostPlayed' || !ratings) return top;
  return { speed: pick, ...(ratings[pick] ?? UNPLAYED) };
}

import { z } from 'zod/mini';

// A player's most played speed, from Lichess's public user API
// (`/api/user/<name>`): what the sidebar shows beside their name.

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

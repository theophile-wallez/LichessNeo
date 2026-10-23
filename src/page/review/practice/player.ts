import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';

// The signed-in user's ratings, from Lichess's public user API: their games'
// (the most played of blitz, rapid and classical), for Lichess's players of
// their level, and their puzzles', for traps of their level. Asked once a visit.

const PerfSchema = z.optional(z.object({ games: z.number(), rating: z.number() }));

const UserSchema = z.object({
  perfs: z.object({
    blitz: PerfSchema,
    rapid: PerfSchema,
    classical: PerfSchema,
    puzzle: PerfSchema,
  }),
});

export interface PlayerRatings {
  readonly games: number | null;
  readonly puzzles: number | null;
}

let asked: Promise<PlayerRatings | null> | null = null;
let known: PlayerRatings | null = null;

async function fetchRatings(user: string): Promise<PlayerRatings | null> {
  const response = await fetch(`/api/user/${encodeURIComponent(user)}`);
  if (!response.ok) return null;
  const perfs = parseJson(await response.text(), UserSchema)?.perfs;
  if (!perfs) return null;
  const played = [perfs.blitz, perfs.rapid, perfs.classical]
    .filter(perf => perf !== undefined && perf.games > 0)
    .toSorted((first, second) => (second?.games ?? 0) - (first?.games ?? 0));
  return { games: played[0]?.rating ?? null, puzzles: perfs.puzzle?.rating ?? null };
}

/** The user's ratings once Lichess has given them; asks for them the first time, `then` called once in. */
export function playerRatings(then: () => void): PlayerRatings | null {
  const user = document.body.dataset.user;
  if (known || !user) return known;
  asked ??= fetchRatings(user)
    .then(ratings => {
      known = ratings;
      then();
      return ratings;
    })
    .catch(() => null);
  return null;
}

/** Lichess's rating groups, each from its rating to the next one's. */
const GROUPS = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];

/** The groups of a player rated `rating`: their own, and the one above, players to learn from. */
export function levelGroups(rating: number): number[] {
  const own = GROUPS.findLastIndex(group => group <= rating);
  return GROUPS.slice(Math.max(own, 0), Math.max(own, 0) + 2);
}

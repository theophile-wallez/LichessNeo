import { z } from 'zod/mini';
import type { Glicko } from './glicko.ts';
import type { RatedGame, RatedPlayer } from './round.ts';

// The round data's ratings are whole, but Lichess rounds down the rating that
// results, so its fraction can make the change a point more: a user's perf
// statistics give it to the hundredth.

const PerfStatSchema = z.object({
  perf: z.object({ glicko: z.object({ rating: z.number(), deviation: z.number() }) }),
});

/** A user's rating and deviation in `perf`, the rating to the hundredth. */
export async function exactGlicko(user: string, perf: string): Promise<Glicko | null> {
  try {
    const url = `/api/user/${encodeURIComponent(user)}/perf/${encodeURIComponent(perf)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const parsed = PerfStatSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.perf.glicko : null;
  } catch {
    return null;
  }
}

async function exactPlayer(player: RatedPlayer, perf: string): Promise<RatedPlayer> {
  const glicko = await exactGlicko(player.user, perf);
  // Another rating than the page's is from a game finished since: the page's is the one at stake.
  if (!glicko || Math.trunc(glicko.rating) !== player.glicko.rating) return player;
  return { ...player, glicko };
}

/** The game with its players' ratings to the hundredth, where Lichess gives them. */
export async function withExactRatings(game: RatedGame): Promise<RatedGame> {
  const [white, black] = await Promise.all([
    exactPlayer(game.players.white, game.perf),
    exactPlayer(game.players.black, game.perf),
  ]);
  return { ...game, players: { white, black } };
}

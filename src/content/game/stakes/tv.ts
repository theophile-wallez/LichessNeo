import { z } from 'zod/mini';
import { exactGlicko } from './exact.ts';
import type { RatedGame, RatedPlayer } from './round.ts';

// A game TV shows: TV swaps them without a reload, so the page's init data
// only has the first. Its export names the players, their stats give the
// rating and deviation at stake.

const ExportPlayerSchema = z.object({
  user: z.optional(
    z.object({ id: z.string().check(z.minLength(1)), title: z.optional(z.string()) }),
  ),
  rating: z.optional(z.number()),
});

const ExportSchema = z.object({
  id: z.string(),
  rated: z.boolean(),
  perf: z.string(),
  variant: z.string(),
  status: z.string(),
  players: z.object({ white: ExportPlayerSchema, black: ExportPlayerSchema }),
});

type ExportPlayer = z.infer<typeof ExportPlayerSchema>;

/** TV's pages: a channel's, or a user's (`/@/<name>/tv`). */
export const TV_PAGE = /^\/(?:tv(?:\/[\w-]+)?|@\/[\w-]+\/tv)\/?$/;

export type GameExport = z.infer<typeof ExportSchema>;

async function readExport(id: string): Promise<GameExport | null> {
  try {
    const url = `/game/export/${id}?moves=false&clocks=false&evals=false&opening=false`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const parsed = ExportSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function ratedPlayer(player: ExportPlayer, perf: string): Promise<RatedPlayer | null> {
  const { user, rating } = player;
  if (!user || rating === undefined) return null;
  const stats = await exactGlicko(user.id, perf);
  if (!stats) return null;
  // Stats a game behind, or ahead: the game's whole rating then, a point off at most.
  const glicko =
    Math.trunc(stats.rating) === rating ? stats : { rating, deviation: stats.deviation };
  return { user: user.id, glicko, bot: user.title === 'BOT' };
}

/** The game `game` exports, if it's rated, between two users, and still being played. */
export async function exportedGame(game: GameExport): Promise<RatedGame | null> {
  if (!game.rated || game.status !== 'started') return null;
  const [white, black] = await Promise.all([
    ratedPlayer(game.players.white, game.perf),
    ratedPlayer(game.players.black, game.perf),
  ]);
  if (!white || !black) return null;
  return {
    id: game.id,
    perf: game.perf,
    variant: game.variant,
    players: { white, black },
    own: null,
  };
}

/** The game `id` that TV shows, if its stakes can be told. */
export async function tvGame(id: string): Promise<RatedGame | null> {
  const game = await readExport(id);
  return game ? exportedGame(game) : null;
}

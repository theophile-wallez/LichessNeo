import { z } from 'zod/mini';
import { COLORS, type Color } from '#shared/chess/types.ts';
import { parseJson } from '#shared/json.ts';
import type { Glicko } from './glicko.ts';

// A rated game in play, as the game page's init data has it: each user's
// rating and deviation in the game's perf, both whole numbers there.

const PlayerSchema = z.object({
  color: z.enum(COLORS),
  spectator: z.optional(z.boolean()),
  user: z.optional(
    z.object({
      id: z.string().check(z.minLength(1)),
      title: z.optional(z.string()),
      perfs: z.record(z.string(), z.object({ rating: z.number(), rd: z.number() })),
    }),
  ),
});

const RoundSchema = z.object({
  data: z.object({
    game: z.object({
      id: z.string().check(z.minLength(1)),
      rated: z.boolean(),
      perf: z.string(),
      variant: z.object({ key: z.string() }),
      status: z.object({ name: z.enum(['created', 'started']) }),
    }),
    player: PlayerSchema,
    opponent: PlayerSchema,
  }),
});

export interface RatedPlayer {
  readonly user: string;
  readonly glicko: Glicko;
  readonly bot: boolean;
}

export interface RatedGame {
  readonly id: string;
  readonly perf: string;
  readonly variant: string;
  readonly players: Readonly<Record<Color, RatedPlayer>>;
  /** The side the page's user plays, or null when they watch. */
  readonly own: Color | null;
}

function ratedPlayer(player: z.infer<typeof PlayerSchema>, perf: string): RatedPlayer | null {
  const user = player.user;
  const rated = user?.perfs[perf];
  if (!user || !rated) return null;
  return {
    user: user.id,
    glicko: { rating: rated.rating, deviation: rated.rd },
    bot: user.title === 'BOT',
  };
}

/** The game `initData` opens, if it's rated, between two users, and still being played. */
export function ratedGame(initData: string | null): RatedGame | null {
  const round = parseJson(initData, RoundSchema);
  if (!round?.data.game.rated) return null;
  const { game, player, opponent } = round.data;
  const first = ratedPlayer(player, game.perf);
  const second = ratedPlayer(opponent, game.perf);
  if (!first || !second) return null;
  return {
    id: game.id,
    perf: game.perf,
    variant: game.variant.key,
    players:
      player.color === 'white' ? { white: first, black: second } : { white: second, black: first },
    own: player.spectator === true ? null : player.color,
  };
}

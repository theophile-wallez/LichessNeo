import { z } from 'zod/mini';
import { COLORS, type Color } from './chess/types.ts';
import { parseJson } from './json.ts';

// The game page's init data: whether a game has just begun, for the start
// sound (page/sounds) and the players' intro (content/game/intro), and whether
// its player is in it, for the game over (page/game-over), shown on a game
// that ends as on one opened once over.

const RoundInitSchema = z.object({
  data: z.object({
    game: z.object({
      id: z.string().check(z.minLength(1)),
      status: z.object({ name: z.enum(['created', 'started']) }),
      turns: z.optional(z.number()),
    }),
    player: z.object({ spectator: z.optional(z.boolean()) }),
  }),
});

/** The id of the game the page opens, if the player is in it and it has just begun. */
export function freshGameId(initData: string | null): string | null {
  const round = parseJson(initData, RoundInitSchema);
  if (!round) return null;
  const { game, player } = round.data;
  // At most one move in: Black may open the game after White's first.
  return !player.spectator && (game.turns ?? 0) <= 1 ? game.id : null;
}

const PlayedGameSchema = z.object({
  data: z.object({
    game: z.object({
      id: z.string().check(z.minLength(1)),
      status: z.object({ name: z.string() }),
    }),
    player: z.object({ color: z.enum(COLORS), spectator: z.optional(z.boolean()) }),
  }),
});

export interface PlayedGame {
  readonly gameId: string;
  readonly color: Color;
  /** Still on as the page opened: its end is yet to come, and to be watched. */
  readonly live: boolean;
}

const UNDER_WAY: ReadonlySet<string> = new Set(['created', 'started']);

/** The game the page opens and the player's color, if they play in it, over or not. */
export function playedGame(initData: string | null): PlayedGame | null {
  const round = parseJson(initData, PlayedGameSchema);
  if (!round || round.data.player.spectator) return null;
  const { game, player } = round.data;
  return { gameId: game.id, color: player.color, live: UNDER_WAY.has(game.status.name) };
}

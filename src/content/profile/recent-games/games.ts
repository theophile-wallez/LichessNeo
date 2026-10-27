import { z } from 'zod/mini';
import { opposite, type Color } from '#shared/chess/types.ts';
import { parseJson } from '#shared/json.ts';
import { moveSquares, type BoardState } from '#shared/still-board.ts';
import type { Clock } from '#shared/time-control.ts';

// The profile's last games, from Lichess's game export
// (`/api/games/user/<name>`, one game a line), as the player saw them: from
// their side, against whom, and how it went.

const PlayerSchema = z.object({
  user: z.optional(z.object({ name: z.string(), id: z.string(), title: z.optional(z.string()) })),
  rating: z.optional(z.number()),
  ratingDiff: z.optional(z.number()),
  aiLevel: z.optional(z.number()),
});

const ExportedGameSchema = z.object({
  id: z.string(),
  speed: z.string(),
  lastMoveAt: z.number(),
  status: z.string(),
  players: z.object({ white: PlayerSchema, black: PlayerSchema }),
  winner: z.optional(z.enum(['white', 'black'])),
  clock: z.optional(z.object({ initial: z.number(), increment: z.number() })),
  daysPerTurn: z.optional(z.number()),
  lastFen: z.optional(z.string()),
  lastMove: z.optional(z.string()),
});

type ExportedGame = z.infer<typeof ExportedGameSchema>;

export type Outcome = 'win' | 'loss' | 'draw';

export interface Opponent {
  /** Their name; none for Stockfish or an anonymous player. */
  readonly name: string | undefined;
  readonly title: string | undefined;
  readonly rating: number | undefined;
  readonly aiLevel: number | undefined;
}

export interface RecentGame {
  /** The game's page, from the player's side. */
  readonly href: string;
  readonly board: BoardState;
  readonly opponent: Opponent;
  readonly outcome: Outcome;
  /** What the game did to the player's rating; none in a casual one. */
  readonly ratingDiff: number | undefined;
  readonly speed: string;
  readonly clock: Clock | undefined;
  readonly daysPerTurn: number | undefined;
  readonly playedAt: number;
}

// How many the section shows.
export const RECENT_GAMES = 5;

// Games that never got going, which Lichess's own list leaves out too.
const UNPLAYED = new Set(['created', 'started', 'aborted', 'noStart']);

function outcomeOf(winner: Color | undefined, color: Color): Outcome {
  if (!winner) return 'draw';
  return winner === color ? 'win' : 'loss';
}

function opponentOf({ user, rating, aiLevel }: z.infer<typeof PlayerSchema>): Opponent {
  return { name: user?.name, title: user?.title, rating, aiLevel };
}

/** The game as `userId` played it; null if they didn't, or it was never played. */
export function recentGame(game: ExportedGame, userId: string): RecentGame | null {
  const { players } = game;
  let color: Color | null = null;
  if (players.white.user?.id === userId) color = 'white';
  else if (players.black.user?.id === userId) color = 'black';
  if (!color || !game.lastFen || UNPLAYED.has(game.status)) return null;
  return {
    href: color === 'white' ? `/game/${game.id}` : `/game/${game.id}/black`,
    board: { fen: game.lastFen, orientation: color, lastMove: moveSquares(game.lastMove ?? '') },
    opponent: opponentOf(players[opposite(color)]),
    outcome: outcomeOf(game.winner, color),
    ratingDiff: players[color].ratingDiff,
    speed: game.speed,
    clock: game.clock,
    daysPerTurn: game.daysPerTurn,
    playedAt: game.lastMoveAt,
  };
}

/** The export's lines as the player's games, newest first, at most `RECENT_GAMES`. */
export function recentGames(lines: string, userName: string): RecentGame[] {
  const userId = userName.toLowerCase();
  return lines
    .split('\n')
    .flatMap(line => {
      const game = parseJson(line, ExportedGameSchema);
      return (game && recentGame(game, userId)) ?? [];
    })
    .slice(0, RECENT_GAMES);
}

import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import type { SeekRequest } from './lobby-seek.ts';
import { poolOfLink } from './pool-link.ts';

// What a game's "New opponent" seeks. Lichess's is a button (lila's
// ui/round/src/view/button.ts) that leaves for `/#pool/<clock>/<opponent>` after
// a pool game and for `/?hook_like=<id>` after a lobby one: the game's data says
// which. Ours, after other games, is a link to `/?hook_like=<id>`
// (content/game/new-game.ts). Each has the address Lichess would go to, to fall
// back on.

export interface NextGame {
  readonly request: SeekRequest;
  readonly fallback: string;
}

/** The game's data, as the round's and the analysis' controllers both have it. */
export const GameSeekDataSchema = z.object({
  game: z.object({ id: z.string().check(z.minLength(1)), source: z.optional(z.string()) }),
  clock: z.optional(z.nullable(z.object({ initial: z.number(), increment: z.number() }))),
  opponent: z.optional(z.object({ user: z.optional(z.object({ id: z.string() })) })),
});

type GameSeekData = z.infer<typeof GameSeekDataSchema>;

const RoundSchema = z.object({ data: GameSeekDataSchema });

const like = (gameId: string): NextGame => ({
  request: { kind: 'like', gameId },
  fallback: `/?hook_like=${gameId}`,
});

/**
 * What Lichess's button seeks after the game in the page's init data. Pools are for the signed
 * in: Lichess seeks an anonymous player's in the lobby, like the game.
 */
export function nextGameOf(initData: string | null, signedIn: boolean): NextGame | null {
  const round = parseJson(initData, RoundSchema);
  return round ? lichessNextGame(round.data, signedIn) : null;
}

function lichessNextGame(
  { game, clock, opponent }: GameSeekData,
  signedIn: boolean,
): NextGame | null {
  if (game.source === 'lobby' || (game.source === 'pool' && !signedIn)) return like(game.id);
  if (game.source !== 'pool' || !clock) return null;
  const id = `${clock.initial / 60}+${clock.increment}`;
  const blocking = opponent?.user?.id;
  const member = blocking === undefined ? { id } : { id, blocking };
  return {
    request: { kind: 'pool', member },
    fallback: `/#pool/${id}${blocking === undefined ? '' : `/${blocking}`}`,
  };
}

/**
 * What a new game like this one seeks, from its analysis: as Lichess's button would after it,
 * else a lobby seek like it, as our "New 10 min" does (content/game/new-game.ts). A game
 * without a clock has none.
 */
export function nextGameAfter(data: GameSeekData, signedIn: boolean): NextGame | null {
  if (!data.clock) return null;
  return lichessNextGame(data, signedIn) ?? like(data.game.id);
}

/** What a link to a next game seeks: a pool's, or a lobby seek like a game. */
export function nextGameOfLink(href: string, signedIn: boolean): NextGame | null {
  const member = poolOfLink(href);
  if (member && signedIn) return { request: { kind: 'pool', member }, fallback: href };
  const gameId = URL.canParse(href) ? new URL(href).searchParams.get('hook_like') : null;
  return gameId ? { request: { kind: 'like', gameId }, fallback: href } : null;
}

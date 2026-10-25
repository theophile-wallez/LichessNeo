import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import type { Entry } from './entries.ts';

// Players whose names start with what's typed, as Lichess's own search box asks for
// them: those the user follows first.

const PlayersSchema = z.object({
  result: z.array(
    z.object({
      name: z.string(),
      title: z.optional(z.string()),
      online: z.optional(z.boolean()),
    }),
  ),
});

// Lichess answers from 3 characters; a name is word characters and hyphens.
const MIN_TERM = 3;
const NAME = /^[\w-]{2,30}$/;

export const asksPlayers = (query: string): boolean =>
  query.trim().length >= MIN_TERM && NAME.test(query.trim());

/** The players Lichess finds for `query`; none if it can't say. */
export async function fetchPlayers(query: string, signal: AbortSignal): Promise<Entry[]> {
  const term = encodeURIComponent(query.trim());
  const response = await fetch(`/api/player/autocomplete?term=${term}&object=1&friend=1`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) return [];
  const players = parseJson(await response.text(), PlayersSchema)?.result ?? [];
  return players.map(player => ({
    group: 'players',
    label: player.name,
    title: player.title,
    online: player.online ?? false,
    href: `/@/${player.name}`,
    icon: { kind: 'avatar', user: player.name },
  }));
}

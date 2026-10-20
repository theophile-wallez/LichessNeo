import { z } from 'zod/mini';
import {
  CustomSeekSchema,
  perfOfSeek,
  speedOfClock,
  type CustomSeek,
} from '#shared/custom-seek.ts';
import { parseJson } from '#shared/json.ts';
import {
  DEFAULT_PICKS,
  pickKey,
  playedBy,
  seeksOf,
  type CardPick,
  type CustomCard,
} from '#content/pages/speed-cards/picks.ts';

// The cards the settings suggest: from the games the player has played the most
// lately (`/api/games/user/<name>`, one game a line), a card of their own for
// each rating and mode, with its three most played time controls, unless the
// cards already play them all; and the default cards they took off.

const RECENT_GAMES = 200;
// Fewer games than this of a rating and mode are one-offs rather than a habit.
const MIN_GAMES = 3;
const MAX_SUGGESTIONS = 6;
// A suggestion's time controls, the most played.
const SUGGESTED_CLOCKS = 3;

const GameSchema = z.object({
  variant: z.string(),
  rated: z.boolean(),
  source: z.optional(z.string()),
  clock: z.optional(z.object({ initial: z.number(), increment: z.number() })),
});

export interface Suggestion {
  readonly pick: CardPick;
  /** How many of the recent games it plays. */
  readonly games: number;
}

// The recent games a seek could play: real-time, against people.
function recentSeeks(ndjson: string): CustomSeek[] {
  return ndjson.split('\n').flatMap(line => {
    const game = parseJson(line, GameSchema);
    if (!game?.clock || game.source === 'ai') return [];
    const seek = CustomSeekSchema.safeParse({
      variant: game.variant,
      minutes: game.clock.initial / 60,
      increment: game.clock.increment,
      rated: game.rated,
    });
    return seek.success ? [seek.data] : [];
  });
}

const mostFirst = <T>(groups: Map<string, T[]>): T[][] =>
  [...groups.values()].toSorted((first, second) => second.length - first.length);

// A rating's games in a mode make a card, its time controls the most played first.
function cardOf([first, ...others]: readonly CustomSeek[]): CustomCard | null {
  if (!first) return null;
  const byClock = Map.groupBy([first, ...others], seek => `${seek.minutes}+${seek.increment}`);
  const clocks = mostFirst(byClock)
    .slice(0, SUGGESTED_CLOCKS)
    .flatMap(([seek]) => (seek ? [{ minutes: seek.minutes, increment: seek.increment }] : []));
  return { variant: first.variant, rated: first.rated, clocks };
}

/** The suggestions for `picks`, from the recent games' lines, most played first. */
export function suggestionsOf(ndjson: string, picks: readonly CardPick[]): Suggestion[] {
  const seeks = recentSeeks(ndjson);
  const keys = new Set(picks.map(pickKey));
  const missing = DEFAULT_PICKS.filter(pick => !keys.has(pickKey(pick)));
  // A card whose games the home, or a default card put back, already plays all would add nothing.
  const offered = [...picks, ...missing];
  const byMode = Map.groupBy(seeks, seek => `${perfOfSeek(seek)}/${seek.rated}`);
  const played = mostFirst(byMode).flatMap(games => {
    const custom = games.length >= MIN_GAMES ? cardOf(games) : null;
    const adds = custom && seeksOf(custom).some(seek => !playedBy(offered, seek));
    return custom && adds ? [{ pick: { custom }, games: games.length }] : [];
  });
  const defaults = missing.map(pick => ({
    pick,
    games: seeks.filter(
      seek =>
        'speed' in pick &&
        seek.variant === 'standard' &&
        speedOfClock(seek.minutes, seek.increment) === pick.speed,
    ).length,
  }));
  return [...played.slice(0, MAX_SUGGESTIONS), ...defaults].toSorted(
    (first, second) => second.games - first.games,
  );
}

/** The player's recent games, as lines; empty if Lichess didn't answer. */
export async function recentGames(user: string): Promise<string> {
  const name = encodeURIComponent(user);
  const query = `max=${RECENT_GAMES}&moves=false&tags=false&opening=false`;
  try {
    const response = await fetch(`/api/games/user/${name}?${query}`, {
      headers: { Accept: 'application/x-ndjson' },
    });
    return response.ok ? await response.text() : '';
  } catch {
    return '';
  }
}

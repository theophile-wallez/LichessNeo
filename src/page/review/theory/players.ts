import type { Analysis } from '#page/lichess/analysis.ts';
import { type ExplorerData, ExplorerDataSchema } from '#page/lichess/explorer.ts';
import { parseJson } from '#shared/json.ts';
import { positionKey } from './study.ts';

// What Lichess's players around a rating play in a position: the explorer's
// Lichess database, asked as its tab asks it, the session's cookies with it
// (signed out, it answers nothing). The coach reads it to tell a classic
// mistake, one players at that level often make there.

/** The explorer's rating groups, each from its rating to the next. */
const GROUPS = [400, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500];

/** Club players, for a mover without a rating (the free board's). */
const CLUB = [1200, 1400, 1600, 1800, 2000];

/** What the players played in a position, and whether they were the mover's level or any club player. */
export interface PlayersAt {
  readonly data: ExplorerData;
  readonly rated: boolean;
}

/** The group `rating` falls in and the one nearest it: some 400 points of players. */
export function groupsAround(rating: number | undefined): readonly number[] {
  if (rating === undefined) return CLUB;
  const index = Math.max(
    0,
    GROUPS.findLastIndex(group => group <= rating),
  );
  const own = GROUPS[index] ?? 400;
  const next = GROUPS[index + 1];
  const previous = GROUPS[index - 1];
  // In the upper half of its group, the next one is nearer; past 2500 there is none.
  const upper = next !== undefined && rating - own >= (next - own) / 2;
  const other = upper ? next : (previous ?? next);
  return other === undefined ? [own] : [Math.min(own, other), Math.max(own, other)];
}

/** After a failed lookup, the next waits this long: the page renders every 150 ms. */
export const RETRY_MS = 30_000;

const found = new Map<string, PlayersAt>();
const asked = new Set<string>();
const retryAt = new Map<string, number>();

// The same position asked for other ratings (another game's mover) has another answer.
const lookupKey = (fen: string, rating: number | undefined): string =>
  `${positionKey(fen)}|${groupsAround(rating).join(',')}`;

/** What the players around `rating` played in the position `fen`, once looked up. */
export const playersAt = (fen: string, rating: number | undefined): PlayersAt | null =>
  found.get(lookupKey(fen, rating)) ?? null;

async function read(
  endpoint: string,
  fen: string,
  groups: readonly number[],
): Promise<ExplorerData | null> {
  const url = new URL('./lichess', endpoint.endsWith('/') ? endpoint : `${endpoint}/`);
  url.searchParams.set('variant', 'standard');
  url.searchParams.set('speeds', 'blitz,rapid,classical');
  url.searchParams.set('ratings', groups.join(','));
  url.searchParams.set('fen', fen);
  url.searchParams.set('topGames', '0');
  url.searchParams.set('recentGames', '0');
  url.searchParams.set('source', 'analysis');
  try {
    const response = await fetch(url.href, { cache: 'default', credentials: 'include' });
    if (!response.ok) return null;
    // An answer is ndjson, read in parts as it's found: the last line holds it all.
    const [last] = (await response.text()).trim().split('\n').slice(-1);
    return parseJson(last ?? '', ExplorerDataSchema);
  } catch {
    return null;
  }
}

async function lookUp(
  endpoint: string,
  fen: string,
  rating: number | undefined,
  loaded: () => void,
): Promise<void> {
  const key = lookupKey(fen, rating);
  const data = await read(endpoint, fen, groupsAround(rating));
  if (!data) {
    asked.delete(key);
    retryAt.set(key, Date.now() + RETRY_MS);
    return;
  }
  found.set(key, { data, rated: rating !== undefined });
  loaded();
}

/** Looks up what the players around `rating` play in the position `fen`, once, then calls `loaded`. */
export function askPlayers(
  analysis: Analysis,
  fen: string,
  rating: number | undefined,
  loaded: () => void,
): void {
  const explorer = analysis.explorer;
  const endpoint = explorer?.endpoint;
  const key = lookupKey(fen, rating);
  if (asked.has(key) || (retryAt.get(key) ?? 0) > Date.now() || !endpoint || !explorer.signedIn)
    return;
  asked.add(key);
  void lookUp(endpoint, fen, rating, loaded);
}

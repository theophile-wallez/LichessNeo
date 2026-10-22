import { z } from 'zod/mini';
import { HistorySchema } from '#shared/rating-history.ts';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import { keepAccountRating } from '#content/sidebar/account-rating.ts';
import { CardSchema, cardsOf, CardUserSchema, lastPools, newestPool, type Card } from './data.ts';
import { CARD_SPEEDS, type CardSpeed } from './pools.ts';

// The signed-in player's cards, kept so the home draws them at once, then
// asked of Lichess again on each visit, as games change them: at most every
// 30s, for a page reloaded in a row.

const MAX_AGE_MS = 30 * 1000;

const KeptSchema = z.object({
  user: z.string(),
  at: z.number(),
  cards: z.array(CardSchema),
  /** The pool of the player's most recent game in one, whatever its speed. */
  last: z.optional(z.string()),
});

interface Kept {
  readonly cards: Card[];
  /** The pool last played, if any. */
  readonly last?: string;
  /** Due to be asked again. */
  readonly stale: boolean;
}

/** The kept cards of `user`, the pool they last played, and whether they're due again. */
export function keptCards(user: string): Kept | null {
  const kept = readStoredJson(StorageKey.speedCards, KeptSchema);
  if (kept?.user !== user) return null;
  const stale = Date.now() - kept.at >= MAX_AGE_MS;
  return kept.last === undefined
    ? { cards: kept.cards, stale }
    : { cards: kept.cards, last: kept.last, stale };
}

async function json<T>(url: string, schema: z.ZodMiniType<T>): Promise<T | null> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const parsed = schema.safeParse(await response.json());
  return parsed.success ? parsed.data : null;
}

async function lastGames(user: string): Promise<string> {
  const speeds = CARD_SPEEDS.join(',');
  const response = await fetch(
    `/api/games/user/${user}?max=20&perfType=${speeds}&moves=false&tags=false&opening=false`,
    { headers: { Accept: 'application/x-ndjson' } },
  );
  return response.ok ? response.text() : '';
}

/** Asks Lichess for the cards, and keeps them; null if it couldn't answer. */
export async function fetchCards(user: string): Promise<Card[] | null> {
  const name = encodeURIComponent(user);
  const [profile, history, games] = await Promise.all([
    json(`/api/user/${name}`, CardUserSchema),
    json(`/api/user/${name}/rating-history`, HistorySchema),
    lastGames(name),
  ]);
  if (!profile) return null;
  // The sidebar's rating, fresh too.
  keepAccountRating(user, profile);
  const cards = cardsOf({ user: profile, history: history ?? [], last: lastPools(games) });
  const last = newestPool(games);
  writeStoredJson(StorageKey.speedCards, { user, at: Date.now(), cards, ...(last && { last }) });
  return cards;
}

/** Keeps the pool just joined as the last, and its speed's, before Lichess's export knows it. */
export function keepLastPool(user: string, speed: CardSpeed, pool: string): Card[] | null {
  const kept = readStoredJson(StorageKey.speedCards, KeptSchema);
  if (kept?.user !== user) return null;
  for (const card of kept.cards) if (card.perf === speed) card.last = pool;
  writeStoredJson(StorageKey.speedCards, { ...kept, last: pool });
  return kept.cards;
}

/** Has the kept cards asked for again on the next visit, still drawn until the answer comes. */
export function markCardsStale(): void {
  const kept = readStoredJson(StorageKey.speedCards, KeptSchema);
  if (kept) writeStoredJson(StorageKey.speedCards, { ...kept, at: 0 });
}

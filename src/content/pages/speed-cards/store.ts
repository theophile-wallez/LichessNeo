import { z } from 'zod/mini';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import { keepAccountRating } from '#content/sidebar/account-rating.ts';
import { UserSchema } from '#content/sidebar/top-rating.ts';
import { CardSchema, cardsOf, HistorySchema, lastPools, type Card } from './data.ts';
import { CARD_SPEEDS, type CardSpeed } from './pools.ts';

// The signed-in player's cards, kept so the home draws them at once, then
// asked of Lichess again on each visit, as games change them: at most every
// 30s, for a page reloaded in a row.

const MAX_AGE_MS = 30 * 1000;

const KeptSchema = z.object({ user: z.string(), at: z.number(), cards: z.array(CardSchema) });

/** The kept cards of `user`, and whether they're due to be asked again. */
export function keptCards(
  user: string,
): { readonly cards: Card[]; readonly stale: boolean } | null {
  const kept = readStoredJson(StorageKey.speedCards, KeptSchema);
  if (kept?.user !== user) return null;
  return { cards: kept.cards, stale: Date.now() - kept.at >= MAX_AGE_MS };
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
    json(`/api/user/${name}`, UserSchema),
    json(`/api/user/${name}/rating-history`, HistorySchema),
    lastGames(name),
  ]);
  if (!profile) return null;
  // The sidebar's rating, fresh too.
  keepAccountRating(user, profile);
  const cards = cardsOf({ user: profile, history: history ?? [], last: lastPools(games) });
  writeStoredJson(StorageKey.speedCards, { user, at: Date.now(), cards });
  return cards;
}

/** Keeps the pool just joined as its speed's last, before Lichess's export knows it. */
export function keepLastPool(user: string, speed: CardSpeed, pool: string): Card[] | null {
  const kept = readStoredJson(StorageKey.speedCards, KeptSchema);
  if (kept?.user !== user) return null;
  for (const card of kept.cards) if (card.speed === speed) card.last = pool;
  writeStoredJson(StorageKey.speedCards, kept);
  return kept.cards;
}

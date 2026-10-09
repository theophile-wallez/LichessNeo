import { z } from 'zod/mini';
import { onDomReady, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import { topRating, TopRatingSchema, UserSchema, type TopRating } from './top-rating.ts';

// Signed in, the sidebar shows the rating of the player's most played speed
// beside their name, in place of Lichess's avatar glyph
// (styles/sidebar/donate-and-buttons.css). The last one is kept, and put on
// <html> from document_start, so it's there with the sidebar's first frame;
// Lichess is asked again once it's an hour old.

const MAX_AGE_MS = 60 * 60 * 1000;

const CachedSchema = z.object({ user: z.string(), at: z.number(), top: TopRatingSchema });

const label = (top: TopRating): string => `${Math.round(top.rating)}${top.provisional ? '?' : ''}`;

function show(top: TopRating | null): void {
  const root = document.documentElement;
  setData(root, 'cdcAccountPerf', top?.speed ?? null);
  // A CSS string, for the tag's `content`.
  setStyleProperty(root, '--cdc-account-rating', top ? JSON.stringify(label(top)) : null);
}

async function fetchTopRating(user: string): Promise<TopRating | null> {
  const response = await fetch(`/api/user/${encodeURIComponent(user)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const parsed = UserSchema.safeParse(await response.json());
  return parsed.success ? topRating(parsed.data) : null;
}

async function refresh(cached: z.infer<typeof CachedSchema> | null): Promise<void> {
  const user = document.body.dataset.user;
  // Signed out, or another account than the one kept.
  if (!user || !document.getElementById('user_tag')) return show(null);
  const mine = cached?.user === user ? cached : null;
  if (!mine) show(null);
  if (mine && Date.now() - mine.at < MAX_AGE_MS) return;
  // Offline, or Lichess busy: the kept rating stays.
  const top = await fetchTopRating(user).catch(() => null);
  if (!top) return;
  writeStoredJson(StorageKey.accountRating, { user, at: Date.now(), top });
  show(top);
}

export const accountRating: Feature = {
  name: 'account rating',
  start: () => {
    const cached = readStoredJson(StorageKey.accountRating, CachedSchema);
    if (cached) show(cached.top);
    onDomReady(() => void refresh(cached));
  },
};

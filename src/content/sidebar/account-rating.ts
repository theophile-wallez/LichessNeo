import { z } from 'zod/mini';
import { onDomReady, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readStoredJson, StorageKey, writeStoredJson } from '#shared/storage.ts';
import {
  ratingLabel,
  RatingsSchema,
  SPEEDS,
  speedRatings,
  topRating,
  TopRatingSchema,
  UserSchema,
  type Ratings,
  type TopRating,
} from './top-rating.ts';

// Signed in, the player's ratings: the most played speed's beside their name in
// the sidebar, in place of Lichess's avatar glyph
// (styles/sidebar/donate-and-buttons.css), and each speed's over its quick
// pairing buttons (styles/home/quick-pairing.css). The last ones are kept, and
// put on <html> from document_start, so they're there with the page's first
// frame; Lichess is asked again once they're an hour old.

const MAX_AGE_MS = 60 * 60 * 1000;

const KeptSchema = z.object({
  user: z.string(),
  at: z.number(),
  top: TopRatingSchema,
  ratings: RatingsSchema,
});

interface Shown {
  readonly top: TopRating;
  readonly ratings: Ratings;
}

// CSS strings, for `content`.
function show(shown: Shown | null): void {
  const root = document.documentElement;
  const top = shown?.top;
  setData(root, 'cdcAccountPerf', top?.speed ?? null);
  const label = top ? ratingLabel(top.rating, top.provisional) : null;
  setStyleProperty(root, '--cdc-account-rating', label === null ? null : JSON.stringify(label));
  for (const speed of SPEEDS) {
    const rating = shown?.ratings[speed];
    setStyleProperty(root, `--cdc-rating-${speed}`, rating ? JSON.stringify(rating) : null);
  }
}

async function fetchRatings(user: string): Promise<Shown | null> {
  const response = await fetch(`/api/user/${encodeURIComponent(user)}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  const parsed = UserSchema.safeParse(await response.json());
  if (!parsed.success) return null;
  const top = topRating(parsed.data);
  return top ? { top, ratings: speedRatings(parsed.data) } : null;
}

async function refresh(kept: z.infer<typeof KeptSchema> | null): Promise<void> {
  const user = document.body.dataset.user;
  // Signed out, or another account than the one kept.
  if (!user || !document.getElementById('user_tag')) return show(null);
  const mine = kept?.user === user ? kept : null;
  if (!mine) show(null);
  if (mine && Date.now() - mine.at < MAX_AGE_MS) return;
  // Offline, or Lichess busy: the kept ratings stay.
  const fetched = await fetchRatings(user).catch(() => null);
  if (!fetched) return;
  writeStoredJson(StorageKey.accountRating, { user, at: Date.now(), ...fetched });
  show(fetched);
}

export const accountRating: Feature = {
  name: 'account rating',
  start: () => {
    const kept = readStoredJson(StorageKey.accountRating, KeptSchema);
    if (kept) show(kept);
    onDomReady(() => void refresh(kept));
  },
};

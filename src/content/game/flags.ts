import { z } from 'zod/mini';
import { queryAll, setDataText } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { flagEmoji } from './flag-emoji.ts';

// Country flags in the player bars (styles/playerbar.css). The round data has
// no country, so it comes from the players' profiles: `/api/users` takes a
// batch of names. Snabbdom draws the bars, so the flag is an attribute that CSS
// shows, set again whenever a bar is redrawn.

// The names' links, so that the flag can come between the name and its flair.
const BARS = [
  'main.round .ruser > a.user-link',
  'main.analyse > .lr-ext-player > a.user-link',
  'main.round .game__meta__players a.user-link',
].join(', ');

const UsersSchema = z.array(
  z.object({
    id: z.string(),
    profile: z.optional(z.object({ flag: z.optional(z.string()) })),
  }),
);

type Users = z.infer<typeof UsersSchema>;

// A failed request (offline, or a 429 when Lichess rate-limits) is tried again
// later, waiting twice as long after each failure in a row.
const FIRST_RETRY_MS = 10_000;
const MAX_RETRY_MS = 300_000;

/** The users, or null when the request failed and is worth trying again. */
async function fetchUsers(names: readonly string[]): Promise<Users | null> {
  try {
    const response = await fetch('/api/users', { method: 'POST', body: names.join(',') });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const result = UsersSchema.safeParse(body);
    // An answer we can't read won't read better next time.
    return result.success ? result.data : [];
  } catch {
    return null;
  }
}

function userName(bar: HTMLElement): string | undefined {
  const link = bar.matches('a') ? bar : bar.querySelector('a.user-link');
  return link instanceof HTMLAnchorElement
    ? link.pathname.split('/').pop()?.toLowerCase()
    : undefined;
}

/** A sync task marking each bar with its player's flag, fetched once per name. */
export function createFlagsSync(): () => void {
  // A name maps to null while its flag loads, then to its emoji or ''.
  const flags = new Map<string, string | null>();
  let retryMs = FIRST_RETRY_MS;
  let retryAt = 0;

  async function load(names: readonly string[]): Promise<void> {
    for (const name of names) flags.set(name, null);
    const users = await fetchUsers(names);
    if (users === null) {
      for (const name of names) flags.delete(name);
      retryAt = Date.now() + retryMs;
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
      return;
    }
    retryMs = FIRST_RETRY_MS;
    for (const name of names) flags.set(name, '');
    for (const user of users) flags.set(user.id, flagEmoji(user.profile?.flag));
  }

  return () => {
    const bars = queryAll(document, BARS, HTMLElement);
    const names = bars.map(userName);
    const missing = names.filter(
      (name): name is string => name !== undefined && name !== '' && !flags.has(name),
    );
    if (missing.length > 0 && Date.now() >= retryAt) void load(missing);
    for (const [i, bar] of bars.entries()) {
      const name = names[i];
      const flag = name === undefined ? undefined : flags.get(name);
      setDataText(bar, 'lrExtFlag', flag ?? '');
    }
  };
}

export const countryFlags: Feature = {
  name: 'country flags',
  start: () => onEveryTick('country flags', createFlagsSync()),
};

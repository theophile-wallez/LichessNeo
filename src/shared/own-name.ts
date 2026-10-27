import { z } from 'zod/mini';
import { isSignedInUser } from './own-avatar.ts';
import { onStoredElsewhere, readStored, removeStored, StorageKey, writeStored } from './storage.ts';

// The name the signed-in user picked in the settings to see in place of their
// own, as Lichess's usernames go: only their browser shows it, as with their
// avatar (own-avatar.ts). Kept in the page's storage, which both worlds read.

export const MAX_NAME_LENGTH = 30;

// No control characters: it's shown as text, and nothing else.
export const OwnNameSchema = z
  .string()
  .check(z.minLength(1), z.maxLength(MAX_NAME_LENGTH), z.regex(/^[^\p{Cc}]+$/u));

let cached: { readonly name: string | null } | null = null;
const listeners = new Set<(name: string | null) => void>();

function readOwn(): string | null {
  try {
    return readStored(StorageKey.name, OwnNameSchema);
  } catch {
    return null;
  }
}

/** The user's name for themselves, read once, then again as another tab changes it. */
export function ownName(): string | null {
  if (cached) return cached.name;
  cached = { name: readOwn() };
  onStoredElsewhere([StorageKey.name], () => {
    cached = { name: readOwn() };
    for (const listener of listeners) listener(cached.name);
  });
  return cached.name;
}

/** The name as typed, trimmed, if it can be kept; null for none or one it can't. */
export function cleanName(text: string): string | null {
  const name = text.trim();
  return OwnNameSchema.safeParse(name).success ? name : null;
}

/** Keeps `name` for every page, or goes back to the user's own for null. */
export function keepOwnName(name: string | null): void {
  if (name === null) removeStored(StorageKey.name);
  else writeStored(StorageKey.name, name);
  cached = { name };
  for (const listener of listeners) listener(name);
}

/** Calls `listener` with the name each time it changes, in this tab or another. */
export function onOwnName(listener: (name: string | null) => void): void {
  ownName();
  listeners.add(listener);
}

/** The name to show for `user`: the one they picked here if it's theirs, else `name`. */
export const shownName = (user: string, name = user): string =>
  (isSignedInUser(user) ? ownName() : null) ?? name;

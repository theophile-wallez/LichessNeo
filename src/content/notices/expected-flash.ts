import { z } from 'zod/mini';
import { readStored, removeStored, SessionKey, writeStored } from '#shared/storage.ts';

// What the success flash of the page a form loads says in our toast, for a form whose feature
// knows what it did ("You joined the team", where Lichess says "Success"). Kept in the tab's session
// across the load, for the next page only, which takes it, flash or not: Lichess may send
// elsewhere than the form's page (leaving a team leads to the user's teams).

/** Called as the form is sent. */
export function expectFlash(title: string): void {
  writeStored(SessionKey.expectedFlash, title, 'session');
}

/** The title expected on this page, at most once. A blocked storage expects none. */
export function takeExpectedFlash(): string | null {
  let title;
  try {
    title = readStored(SessionKey.expectedFlash, z.string(), 'session');
  } catch {
    return null;
  }
  if (title !== null) removeStored(SessionKey.expectedFlash, 'session');
  return title;
}

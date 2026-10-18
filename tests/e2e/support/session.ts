import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import type { BrowserContext, Page } from '@playwright/test';
import { launchWithExtension, type LaunchOptions } from './extension.ts';

// A signed-in Lichess, for one-off checks of what only an account shows (the
// header's buttons, the speed cards' numbers, the account menu). It's a
// Chromium profile kept outside the repo, signed in once by hand with
// `pnpm lichess:login`; its cookies are a live session, so it never goes in
// the repo, and no test that CI runs needs it.

/** Where the signed-in profile lives (`LN_EXT_LICHESS_PROFILE` to move it). */
export const SESSION_PROFILE = path.resolve(
  process.env['LN_EXT_LICHESS_PROFILE'] ?? path.join(homedir(), '.lichess-neo', 'chromium-profile'),
);

export const hasSession = (): boolean => existsSync(SESSION_PROFILE);

/**
 * The extension in the signed-in profile. One browser at a time: Chromium
 * locks a profile while it's open.
 */
export function launchSignedIn(
  options: Omit<LaunchOptions, 'userDataDir'>,
): Promise<BrowserContext> {
  if (!hasSession()) throw new Error('No Lichess session: run `pnpm lichess:login` first.');
  return launchWithExtension({ ...options, userDataDir: SESSION_PROFILE });
}

/** The signed-in user's id on this page, or null signed out. */
export const signedInUser = (page: Page): Promise<string | null> =>
  page.evaluate(() =>
    document.getElementById('user_tag') ? (document.body.dataset['user'] ?? null) : null,
  );

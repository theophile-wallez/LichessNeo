// What a preview build shows at the top of every Lichess page: the draft's
// name, and the page to review it on, which the badge links to.

import type { Claimant } from './claims.ts';

const LICHESS = 'https://lichess.org';

/**
 * What a preview is named: the name given, or `main` for the main checkout's
 * build, what was shipped. Null when a draft has none.
 */
export function previewName(given: string | undefined, claimant: Claimant): string | null {
  const name = given?.trim() ?? '';
  if (name !== '') return name;
  return claimant.worktree === claimant.mainCheckout ? 'main' : null;
}

/**
 * The page to review a preview on, as a full lichess.org address: a path
 * (`/analysis`) or a lichess.org URL. Anything else throws, as the badge
 * would lead off Lichess or run a `javascript:` link.
 */
export function previewUrl(given: string): string {
  const url = new URL(given.trim(), LICHESS);
  if (url.origin !== LICHESS) throw new Error(`not a lichess.org page: ${given}`);
  return url.href;
}

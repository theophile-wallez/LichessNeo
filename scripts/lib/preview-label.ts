// What a preview build shows at the top of every Lichess page: the draft's
// name, and the pages to review it on, which the badge links to.

import type { PreviewLink } from '#shared/build-mode.ts';
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

const isPage = (text: string): boolean => text.startsWith('/') || text.startsWith('http');

/**
 * A page to review a preview on, given as `[label=]page`: a path (`/analysis`)
 * or a lichess.org URL, labeled by its path when unnamed. Anything off
 * lichess.org throws, as the badge would lead off Lichess or run a
 * `javascript:` link.
 */
export function previewLink(given: string): PreviewLink {
  const text = given.trim();
  const split = text.indexOf('=');
  // A page's query has its own `=`: a label is only what comes before a page.
  const labeled = split > 0 && !isPage(text) && isPage(text.slice(split + 1).trim());
  const page = labeled ? text.slice(split + 1).trim() : text;
  const url = new URL(page, LICHESS);
  if (url.origin !== LICHESS) throw new Error(`not a lichess.org page: ${given}`);
  const label = labeled ? text.slice(0, split).trim() : url.href.slice(LICHESS.length);
  return { label, href: url.href };
}

/**
 * The pages to review a preview on, read by previewLink. A draft must give
 * some, for the user to reach them in a click, unless it shows on every page
 * alike; null when it gives none. The main checkout's build needs none.
 */
export function previewLinks(
  given: readonly string[],
  { everywhere, claimant }: { readonly everywhere: boolean; readonly claimant: Claimant },
): PreviewLink[] | null {
  if (given.length === 0 && !everywhere && claimant.worktree !== claimant.mainCheckout) return null;
  return given.map(previewLink);
}

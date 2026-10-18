import { queryAll } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Lichess doesn't mark the sidebar's link to the page shown: this gives it
// aria-current, for screen readers (the rows only light up on hover). The link
// whose path is the longest start of the page's is the one; the home link only
// for the home page. Lichess navigates some pages in place, hence the tick.

const LINKS = '#topnav section a[href], #ln-ext-donate';

/** The path without a language prefix (/fr/training), which some of Lichess's pages carry. */
export const canonicalPath = (path: string): string =>
  path.replace(/^\/[a-z]{2}(?:-[A-Z]{2})?(?=\/)/, '');

/** How well a link's path matches the page's: its length, or -1 if it doesn't. */
export function matchLength(linkPath: string, pagePath: string): number {
  if (linkPath === '/') return pagePath === '/' ? 1 : -1;
  const matches = pagePath === linkPath || pagePath.startsWith(`${linkPath}/`);
  return matches ? linkPath.length : -1;
}

function bestLink(pagePath: string): HTMLAnchorElement | null {
  let best: HTMLAnchorElement | null = null;
  let bestLength = -1;
  for (const link of queryAll(document, LINKS, HTMLAnchorElement)) {
    if (link.origin !== location.origin) continue;
    const length = matchLength(canonicalPath(link.pathname), pagePath);
    if (length > bestLength) {
      best = link;
      bestLength = length;
    }
  }
  return best;
}

let shownFor = '';

function markCurrent(): void {
  const path = canonicalPath(location.pathname);
  if (path === shownFor || !document.getElementById('topnav')) return;
  shownFor = path;
  const link = bestLink(path);
  for (const each of queryAll(document, LINKS, HTMLAnchorElement)) {
    if (each === link) each.setAttribute('aria-current', 'page');
    else each.removeAttribute('aria-current');
  }
}

export const currentSection: Feature = {
  name: 'current-link',
  start: () => onEveryTick('current-link', markCurrent),
};

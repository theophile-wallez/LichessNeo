import BookOpen01Icon from '@hugeicons/core-free-icons/BookOpen01Icon';
import { createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { html, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { PRACTICE_HASH } from '#shared/practice-page.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// An opening's page (/opening/<name>) links to its line on the free board,
// with the explorer open. Beside that link, ours opens the same line on the
// practice page, to practice it against the explorer's games
// (page/review/view/openings-page.ts).

const LINK = 'ln-ext-opening-practice';

/** The free board's practice link for the explorer's `href`, or null for another link. */
export function practiceHref(href: string): string | null {
  const at = href.indexOf('#');
  const path = at < 0 ? href : href.slice(0, at);
  return path.includes('/analysis/') ? path + PRACTICE_HASH : null;
}

export function syncOpeningPractice(): void {
  const explorer = queryOne(
    document,
    "main.opening .opening__intro a[href$='#explorer']",
    HTMLElement,
  );
  if (!explorer) return;
  const href = practiceHref(explorer.getAttribute('href') ?? '');
  const next = explorer.nextElementSibling;
  if (next instanceof HTMLAnchorElement && next.classList.contains(LINK)) {
    if (href && next.getAttribute('href') !== href) next.setAttribute('href', href);
    return;
  }
  if (!href) return;
  const link = createElement('a', { className: `button text ${LINK}`, attrs: { href } });
  setHtml(link, html`${hugeicon(BookOpen01Icon)}<span>${message('openingPractice')}</span>`);
  explorer.after(link);
}

export const openingPractice: Feature = {
  name: 'opening-practice',
  start: () => onEveryTick('opening-practice', syncOpeningPractice),
};

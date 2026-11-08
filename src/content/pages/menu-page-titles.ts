import { createElement, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Two pages with a side menu have no title: the blog's topics and the current games. Every
// page that scrolls pins its title (AGENTS.md, "Only the content scrolls"), so they get one,
// the open link's label: Lichess's own words, in the user's language. Their stylesheets
// start it with the link's picture (pages/menu-titles.css, tv-games.css) and pin it. Both
// pages are server-rendered, so adding to them is safe.

interface UntitledPage {
  /** Where the title goes, first. */
  readonly content: string;
  /** The open link's label. */
  readonly label: string;
}

const PAGES: readonly UntitledPage[] = [
  { content: 'main.page-menu > .ublog-index', label: 'main.page-menu > .subnav a.active' },
  { content: 'main.tv-games > .now-playing', label: 'main.tv-games .subnav a.active strong' },
];

/** Gives each untitled page its open link's label as a title; a page with one is left be. */
export function syncMenuPageTitles(): void {
  for (const page of PAGES) {
    const content = queryOne(document, page.content, HTMLElement);
    if (!content || content.querySelector(':scope > .box__top')) continue;
    const label = queryOne(document, page.label, HTMLElement)?.textContent.trim();
    if (!label) continue;
    const top = createElement('div', { className: 'box__top ln-ext-menu-page-title' });
    top.append(createElement('h1', { text: label }));
    content.prepend(top);
  }
}

export const menuPageTitles: Feature = {
  name: 'menu page titles',
  start: () => onEveryTick('menu page titles', syncMenuPageTitles),
};

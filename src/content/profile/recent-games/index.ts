import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { profileName } from '#content/profile/user.ts';
import { fetchRecentGames } from '#content/recent-games/fetch.ts';
import { recentGamesMarkup } from './view.ts';

// The profile's last games, a row of cards over its activity. The games tab
// lists them already, so they show on the activity's only.

// "See all" opens the games tab as the tab itself does: Lichess loads the list in place,
// without a page load, and the page scrolls down to it.
function openGamesTab(event: MouseEvent, tabs: HTMLElement): void {
  const tab = queryOne(tabs, 'a.to-games', HTMLAnchorElement);
  if (!tab) return;
  event.preventDefault();
  tab.click();
  tabs.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// How many the section shows.
const SHOWN = 5;

async function addRecentGames(tabs: HTMLElement, name: string): Promise<void> {
  const games = await fetchRecentGames(name, SHOWN);
  if (games.length === 0) return;
  const section = createElement('section', { className: 'ln-ext-recent' });
  setHtml(section, recentGamesMarkup(games, `/@/${encodeURIComponent(name)}/all`, Date.now()));
  queryOne(section, '.ln-ext-recent__all', HTMLAnchorElement)?.addEventListener('click', event =>
    openGamesTab(event, tabs),
  );
  tabs.before(section);
}

export function syncRecentGames(): void {
  const tabs = queryOne(document, '.user-show > .angles:not([data-ln-ext-recent])', HTMLElement);
  if (!tabs) return;
  setData(tabs, 'lnExtRecent', '');
  const name = profileName();
  const activity = queryOne(document, '.user-show > .angle-content > .activity', HTMLElement);
  if (name && activity) void addRecentGames(tabs, name);
}

export const profileRecentGames: Feature = {
  name: 'recent games',
  start: () => onEveryTick('recent games', syncRecentGames),
};

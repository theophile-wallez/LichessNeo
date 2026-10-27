import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { profileName } from '#content/profile/user.ts';
import { RECENT_GAMES, recentGames } from './games.ts';
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

// A few more than shown, for the aborted ones left out.
const ASKED = RECENT_GAMES + 5;

async function exportedGames(name: string): Promise<string | null> {
  const query = `max=${ASKED}&moves=false&tags=false&opening=false&lastFen=true`;
  try {
    const response = await fetch(`/api/games/user/${encodeURIComponent(name)}?${query}`, {
      headers: { Accept: 'application/x-ndjson' },
    });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

async function addRecentGames(tabs: HTMLElement, name: string): Promise<void> {
  const lines = await exportedGames(name);
  const games = lines === null ? [] : recentGames(lines, name);
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

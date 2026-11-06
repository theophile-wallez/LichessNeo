import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { fetchRecentGames } from '#content/recent-games/fetch.ts';
import { EVERY_SPEED, homeGamesMarkup } from './view.ts';

// The signed-in user's last games on the home, before Lichess's news, in a list
// that scrolls beside the puzzle of the day (styles/home/games.css).

const SHOWN = 20;

function signedInUser(): string | undefined {
  return document.getElementById('user_tag') ? document.body.dataset.user : undefined;
}

// A filter keeps the rows of its speed; the list goes back to its top.
function pickSpeed(section: HTMLElement, filter: HTMLButtonElement): void {
  const speed = filter.dataset.lnExtSpeed ?? EVERY_SPEED;
  for (const button of queryAll(section, '.ln-ext-home-games__filters > button', HTMLElement))
    button.classList.toggle('active', button === filter);
  for (const row of queryAll(section, '.ln-ext-home-games__row', HTMLElement))
    row.hidden = speed !== EVERY_SPEED && row.dataset.lnExtSpeed !== speed;
  queryOne(section, '.ln-ext-home-games__list', HTMLElement)?.scrollTo({ top: 0 });
}

async function addHomeGames(lobby: HTMLElement, user: string): Promise<void> {
  const games = await fetchRecentGames(user, SHOWN);
  if (games.length === 0 || !lobby.isConnected) return;
  const section = createElement('section', { className: 'ln-ext-home-games' });
  setHtml(section, homeGamesMarkup(games, `/@/${encodeURIComponent(user)}/all`, Date.now()));
  section.addEventListener('click', event => {
    const filter = closestTo(
      event.target,
      '.ln-ext-home-games__filters > button',
      HTMLButtonElement,
    );
    if (filter) pickSpeed(section, filter);
  });
  const news = queryOne(lobby, ':scope > .lobby__feed', HTMLElement);
  if (news) news.before(section);
  else lobby.append(section);
}

export function syncHomeGames(): void {
  const lobby = queryOne(document, 'main.lobby:not([data-ln-ext-games])', HTMLElement);
  if (!lobby) return;
  setData(lobby, 'lnExtGames', '');
  const user = signedInUser();
  if (user) void addHomeGames(lobby, user);
}

export const homeGames: Feature = {
  name: 'home games',
  start: () => onEveryTick('home games', syncHomeGames),
};

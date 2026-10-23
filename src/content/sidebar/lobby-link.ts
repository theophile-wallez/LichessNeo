import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { storedKeys, writeStored } from '#shared/storage.ts';
import { openLobbyTab } from '#content/pages/speed-cards/lobby-pools.ts';
import { message } from '#content/platform/runtime.ts';

// The Play section's "Create lobby game" (`/?any#hook`) opens Lichess's game setup over
// the home. Ours is "Lobby", and leads to the home's lobby tab through `/#lobby`, which
// Lichess ignores: from another page, the home's kept tab (`lobby.tab:<user>`) is set to
// the lobby's before Lichess boots; on the home, its tab is clicked and the page goes back
// to its top. Either way the home shows from its top, not scrolled to the lobby.

const HASH = '#lobby';
const LOBBY_TAB = 'real_time';

const atLobbyLink = (): boolean => location.pathname === '/' && location.hash === HASH;

const dropHash = (): void =>
  history.replaceState(history.state, '', `${location.pathname}${location.search}`);

function relabel(): void {
  const link = queryOne(document, "#topnav a[href$='#hook']", HTMLAnchorElement);
  if (!link) return;
  link.setAttribute('href', `/${HASH}`);
  link.textContent = message('navLobby');
}

// On desktop the page scrolls in #main-wrap, below 1020px the window.
function scrollToTop(): void {
  document.getElementById('main-wrap')?.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function onHashChange(): void {
  if (!atLobbyLink()) return;
  openLobbyTab();
  dropHash();
  scrollToTop();
}

export const lobbyLink: Feature = {
  name: 'lobby-link',
  start: () => {
    if (atLobbyLink()) {
      for (const key of storedKeys('lobby.tab:')) writeStored(key, LOBBY_TAB);
      dropHash();
    }
    syncWhileParsing(relabel);
    window.addEventListener('hashchange', onHashChange);
  },
};

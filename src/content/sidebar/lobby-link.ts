import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { storedKeys, writeStored } from '#shared/storage.ts';
import { openLobbyTab } from '#content/pages/speed-cards/lobby-pools.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The Play section's "Create lobby game" (`/?any#hook`) opens Lichess's game setup over
// the home. Ours is "Lobby", and leads to the home's lobby tab through `/#lobby`, which
// Lichess ignores: from another page, the home's kept tab (`lobby.tab:<user>`) is set to
// the lobby's before Lichess boots; on the home, its tab is clicked. Either way the page
// scrolls to it, once Lichess has drawn it.

const HASH = '#lobby';
const LOBBY_TAB = 'real_time';

// How to scroll to the lobby once it's drawn: at once on arriving, smoothly on the home.
let pendingScroll: ScrollBehavior | null = null;

const atLobbyLink = (): boolean => location.pathname === '/' && location.hash === HASH;

const dropHash = (): void =>
  history.replaceState(history.state, '', `${location.pathname}${location.search}`);

function relabel(): void {
  const link = queryOne(document, "#topnav a[href$='#hook']", HTMLAnchorElement);
  if (!link) return;
  link.setAttribute('href', `/${HASH}`);
  link.textContent = message('navLobby');
}

function scrollToLobby(): void {
  if (!pendingScroll) return;
  const lobby = queryOne(document, 'main.lobby .lobby__app', HTMLElement);
  if (!lobby?.querySelector(':scope > .tabs-horiz')) return;
  lobby.scrollIntoView({ block: 'start', behavior: pendingScroll });
  pendingScroll = null;
}

function onHashChange(): void {
  if (!atLobbyLink()) return;
  openLobbyTab();
  dropHash();
  pendingScroll = 'smooth';
  scrollToLobby();
}

export const lobbyLink: Feature = {
  name: 'lobby-link',
  start: () => {
    if (atLobbyLink()) {
      for (const key of storedKeys('lobby.tab:')) writeStored(key, LOBBY_TAB);
      dropHash();
      pendingScroll = 'instant';
      onEveryTick('lobby-link', scrollToLobby);
    }
    syncWhileParsing(relabel);
    window.addEventListener('hashchange', onHashChange);
  },
};

import type { CustomSeek } from '#shared/custom-seek.ts';
import type { Feature } from '#shared/features.ts';
import { onCustomSeek, postCustomSeekState } from '#shared/protocol.ts';
import { openGame, socketUrl } from './connection.ts';
import { setupUrl } from './hook-post.ts';
import { seekNextGame, type LobbySeek } from './lobby-seek.ts';

// The game a home card of the player's own seeks (content/pages/speed-cards):
// a lobby seek on a socket of ours, as a game's "New opponent" makes one, so it
// takes a click rather than the game setup. If it fails, the setup opens with
// the game filled in.

let seeking: LobbySeek | null = null;

function stop(): void {
  seeking?.cancel();
  seeking = null;
  postCustomSeekState(false);
}

function start(seek: CustomSeek): void {
  seeking?.cancel();
  const url = socketUrl();
  if (!url) return location.assign(setupUrl(seek));
  seeking = seekNextGame({
    url,
    request: { kind: 'hook', seek },
    onOpen: () => {},
    onPaired: openGame,
    onFailed: () => {
      seeking = null;
      postCustomSeekState(false);
      location.assign(setupUrl(seek));
    },
  });
  postCustomSeekState(true);
}

export const customSeek: Feature = {
  name: 'custom seek',
  start: () => {
    onCustomSeek(seek => (seek ? start(seek) : stop()));
    // Leaving the page cancels the seek, as the lobby does.
    window.addEventListener('pagehide', () => seeking?.cancel());
  },
};

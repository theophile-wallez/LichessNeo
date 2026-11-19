import { onDomReady } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { pollUntil } from '#shared/poll.ts';
import { loadCssKey } from '#page/lichess/assets.ts';

// The home's game setup (create a game, challenge a friend, play the computer)
// waits on two stylesheets before it shows: `bits.dialog` and `lobby.setup`,
// fetched on the first click, and the second released when the dialog closes,
// so every opening fetched it again. Loaded once the page is idle, they're
// held for good (Lichess counts their users), and the dialog opens at once.

const SHEETS = ['bits.dialog', 'lobby.setup'] as const;

const IDLE_TIMEOUT_MS = 2500;
const ASSET_POLL_MS = 200;
const ASSET_GIVE_UP_MS = 15_000;

// `loadCssKey` fails only before `site.asset` is set, so on the first sheet.
const loadSheets = (): true | null => (SHEETS.every(key => loadCssKey(key)) ? true : null);

function warmUp(): void {
  if (!document.querySelector('main.lobby')) return;
  pollUntil(loadSheets, () => undefined, {
    intervalMs: ASSET_POLL_MS,
    giveUpMs: ASSET_GIVE_UP_MS,
  });
}

export const setupWarmup: Feature = {
  name: 'setup warmup',
  start: () =>
    onDomReady(() => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(warmUp, { timeout: IDLE_TIMEOUT_MS });
      } else {
        setTimeout(warmUp, IDLE_TIMEOUT_MS);
      }
    }),
};

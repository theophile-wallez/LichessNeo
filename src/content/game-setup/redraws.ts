import { queryOne } from '#shared/dom.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Lichess draws the game setup when a click opens it, and anew on some picks: what
// goes in it goes in before it's painted, not on the next tick, so Lichess's own
// controls never show.

const OPENING_FRAMES = 12;
const syncs: (() => void)[] = [];
const redraws = new MutationObserver(() => syncAll());
let watched: Element | null = null;

/** Follows the open setup's redraws, and only them. */
function watch(): void {
  const dialog = queryOne(document, 'dialog .game-setup', HTMLElement)?.closest('dialog') ?? null;
  if (dialog === watched) return;
  redraws.disconnect();
  watched = dialog;
  if (dialog) redraws.observe(dialog, { childList: true, subtree: true });
}

function syncAll(): void {
  for (const sync of syncs) sync();
  watch();
}

/** The frames after a click, until a setup opens or a few have gone by. */
function syncAfterClick(frames: number): void {
  requestAnimationFrame(() => {
    syncAll();
    if (!watched && frames > 1) syncAfterClick(frames - 1);
  });
}

/** Runs `sync` as a setup opens, on each of its redraws, and on every tick. */
export function followSetup(name: string, sync: () => void): void {
  if (syncs.length === 0) {
    document.addEventListener('click', () => syncAfterClick(OPENING_FRAMES), {
      capture: true,
      passive: true,
    });
  }
  syncs.push(sync);
  onEveryTick(name, () => {
    sync();
    watch();
  });
}

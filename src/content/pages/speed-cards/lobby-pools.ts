import { queryAll, queryOne } from '#shared/dom.ts';
import { storedKeys, writeStored } from '#shared/storage.ts';

// Lichess's quick pairing, driven through its own lobby: the cards replace its
// pools tab (hidden, styles/home/speed-cards.css), so a card's button opens
// that tab, clicks the pool there and goes back to the tab that was open.
// Signed in, joining a pool keeps Lichess on that tab; while it seeks from
// another tab, it makes the pools tab glow (lila's ui/lobby/src/view/tabs.ts).

// The pools tab comes first, but bots have none: theirs is then the only tab.
function tabs(): HTMLButtonElement[] {
  return queryAll(document, 'main.lobby .lobby__app > .tabs-horiz > button', HTMLButtonElement);
}

const poolsTab = (): HTMLButtonElement | null => {
  const [first, second] = tabs();
  return first && second ? first : null;
};

const poolsShown = (): boolean =>
  queryOne(document, 'main.lobby .lobby__app-pools', HTMLElement) !== null;

/** Lichess's quick pairing tab text, the cards' heading; null before the lobby is drawn. */
export const quickPairingName = (): string | null => poolsTab()?.textContent.trim() ?? null;

/** The pool Lichess seeks a game in, if it shows it (its pools tab open). */
export const shownSeekingPool = (): string | null =>
  queryOne(document, 'main.lobby .lpool.active[data-id]', HTMLElement)?.dataset.id ?? null;

/** Whether Lichess is seeking a game in a pool from another tab than the pools'. */
export const seekingElsewhere = (): boolean => poolsTab()?.classList.contains('glowing') ?? false;

// Lichess may draw on the next frame: a few frames, then give up.
async function nextPool(id: string): Promise<HTMLElement | null> {
  for (let frame = 0; frame < 10; frame++) {
    const pool = queryOne(document, `main.lobby .lpool[data-id="${id}"]`, HTMLElement);
    if (pool) return pool;
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  return null;
}

let driving = false;

/** Whether a card is clicking through Lichess's tabs, which then mustn't be switched. */
export const isDriving = (): boolean => driving;

/** Opens the lobby's tab, the second. */
export function openLobbyTab(): void {
  tabs()[1]?.click();
}

/** Leaves the pools tab for the lobby's, unless a card is using it. */
export function leavePoolsTab(): void {
  if (driving || !poolsShown()) return;
  tabs()[1]?.click();
}

/** Clicks Lichess's pool: it joins it, or leaves it if it's already seeking there. */
export async function clickPool(id: string): Promise<void> {
  const tab = poolsTab();
  if (!tab || driving) return;
  driving = true;
  try {
    const back = tabs().find(button => button.classList.contains('active') && button !== tab);
    if (!poolsShown()) tab.click();
    (await nextPool(id))?.click();
    // Signed out, Lichess makes a seek and opens the lobby itself.
    if (poolsShown()) (back ?? tabs()[1])?.click();
  } finally {
    driving = false;
  }
}

/** Opens Lichess's game setup, as its "Create a game" button does. */
export function openCustomGame(): void {
  queryOne(document, 'main.lobby .lobby__start__button--hook', HTMLElement)?.click();
}

/**
 * A game's "New opponent" opens /#pool/<id>, and Lichess's lobby then switches to its pools
 * tab while it's still being built: from another tab (the cards leave it for the lobby's),
 * that redraw throws and the lobby never shows. So its stored tab (`lobby.tab:<user>`) goes
 * back to the pools one first, at document_start.
 */
export function keepPoolsTabForPoolLink(): void {
  if (!location.hash.startsWith('#pool/')) return;
  for (const key of storedKeys('lobby.tab:')) writeStored(key, 'pools');
}

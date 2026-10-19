import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Lichess scrolls the analysis's move list to the move on the board only when
// that move changes. The list's height changes under it, as the engine's lines
// come and go and the Game Review's panel opens or closes, which can leave the
// move out of sight: each time the list is resized, it's brought back in view.

const MOVES = 'main.analyse .analyse__moves';

/** Scrolls `list` so its active move shows, centered, if it's out of view. */
function revealActive(list: HTMLElement): void {
  const active = queryOne(list, 'move.active', HTMLElement);
  if (!active || active.offsetParent !== list) return;
  const top = active.offsetTop;
  const bottom = top + active.offsetHeight;
  if (top >= list.scrollTop && bottom <= list.scrollTop + list.clientHeight) return;
  list.scrollTop = top - (list.clientHeight - active.offsetHeight) / 2;
}

const resized = new ResizeObserver(entries => {
  for (const { target } of entries) if (target instanceof HTMLElement) revealActive(target);
});
let watched: HTMLElement | null = null;

function sync(): void {
  const list = queryOne(document, MOVES, HTMLElement);
  if (list === watched) return;
  if (watched) resized.unobserve(watched);
  if (list) resized.observe(list);
  watched = list;
}

export const activeMove: Feature = {
  name: 'active move',
  start: () => onEveryTick('active move', sync),
};

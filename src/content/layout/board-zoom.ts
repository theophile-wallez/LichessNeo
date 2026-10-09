import { z } from 'zod/mini';
import { closestTo, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readStored, removeStored, StorageKey, writeStored } from '#shared/storage.ts';

// The board takes all the room the game, analysis or puzzle layout gives it,
// unless the user resizes it (styles/board/pieces.css). Lichess's own zoom pref
// may date from its old layout, so we ignore it: a drag on the board's handle
// starts from our size, and the `---zoom` it sets on <body> is copied to
// `--lr-ext-zoom` and stored under our own key. Dragging back to full size removes the key.

const FULL = 100;

// A missing key means no zoom, not the 0 that coercing null would give.
const StoredZoomSchema = z.pipe(z.string(), z.coerce.number());

function setZoom(zoom: number): void {
  setStyleProperty(document.documentElement, '--lr-ext-zoom', zoom >= FULL ? null : String(zoom));
}

function followDrag(): void {
  const zoom = Number.parseInt(document.body.style.getPropertyValue('---zoom'), 10);
  if (!(zoom >= 0)) return;
  setZoom(zoom);
  if (zoom >= FULL) removeStored(StorageKey.boardZoom);
  else writeStored(StorageKey.boardZoom, zoom);
  // Chessground measures the board again on a resize.
  window.dispatchEvent(new Event('resize'));
}

let drag: MutationObserver | null = null;

function startDrag(event: Event): void {
  if (drag || !closestTo(event.target, 'cg-resize', Element)) return;
  // In the capture phase, so it runs before Lichess's handler reads the zoom to start from.
  const current = getComputedStyle(document.documentElement).getPropertyValue('--lr-ext-zoom');
  document.body.style.setProperty('---zoom', current === '' ? String(FULL) : current);
  const observer = new MutationObserver(followDrag);
  observer.observe(document.body, { attributes: true, attributeFilter: ['style'] });
  drag = observer;
  // A touch the browser takes over (a scroll, a gesture) ends in touchcancel.
  const ends = event.type === 'touchstart' ? ['touchend', 'touchcancel'] : ['mouseup'];
  const listeners = new AbortController();
  const stop = (): void => {
    observer.disconnect();
    drag = null;
    listeners.abort();
  };
  for (const end of ends) document.addEventListener(end, stop, { signal: listeners.signal });
}

export const boardZoom: Feature = {
  name: 'board zoom',
  start: () => {
    const saved = readStored(StorageKey.boardZoom, StoredZoomSchema);
    if (saved !== null) setZoom(saved);
    document.addEventListener('mousedown', startDrag, true);
    document.addEventListener('touchstart', startDrag, { capture: true, passive: true });
  },
};

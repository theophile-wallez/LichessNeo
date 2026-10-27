import { z } from 'zod/mini';
import { closestTo, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readStored, removeStored, StorageKey, writeStored } from '#shared/storage.ts';

// The board takes all the room the game, analysis or puzzle layout gives it,
// unless the user resizes it (styles/board/pieces.css). Lichess's own zoom pref
// may date from its old layout, so we ignore it: a drag on the board's handle
// starts from our size, and the `---zoom` it sets on <body> is copied to
// `--ln-ext-zoom` and stored under our own key. Dragging back to full size removes the key.
// The user menu's Size slider sets the same `---zoom`, and is followed the same way.

const FULL = 100;

// A missing key means no zoom, not the 0 that coercing null would give.
const StoredZoomSchema = z.pipe(z.string(), z.coerce.number());

function setZoom(zoom: number): void {
  setStyleProperty(document.documentElement, '--ln-ext-zoom', zoom >= FULL ? null : String(zoom));
}

function followZoom(): void {
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
  const current = getComputedStyle(document.documentElement).getPropertyValue('--ln-ext-zoom');
  document.body.style.setProperty('---zoom', current === '' ? String(FULL) : current);
  const observer = new MutationObserver(followZoom);
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

// The menu's slider (lila's ui/dasher/src/board.ts) sets `---zoom` in its own handlers, which
// run before the event reaches the document: the zoom is there to read.
const SIZE_SLIDER = '#dasher_app .sub.board .zoom input';

function followSlider(event: Event): void {
  if (closestTo(event.target, SIZE_SLIDER, HTMLInputElement)) followZoom();
}

export const boardZoom: Feature = {
  name: 'board zoom',
  start: () => {
    const saved = readStored(StorageKey.boardZoom, StoredZoomSchema);
    if (saved !== null) setZoom(saved);
    document.addEventListener('mousedown', startDrag, true);
    document.addEventListener('touchstart', startDrag, { capture: true, passive: true });
    document.addEventListener('input', followSlider);
    document.addEventListener('wheel', followSlider, { passive: true });
  },
};

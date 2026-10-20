import { closestTo } from '#shared/dom.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { postLichessLookPreview } from '#shared/protocol.ts';
import { LICHESS, type Library } from '#content/packs/library.ts';

// The Board & sounds page's board and piece tiles, shown on the preview board
// while the pointer is over one, unsaved: the last one stays across the gaps of
// its grid, and the pick is shown again once the pointer leaves the grid. The
// looks are the whole page's, which has no other board. A touch picks at once:
// it has no hover to preview.

/** Shows each of the card's tiles as it's hovered. */
export function previewOnHover(card: HTMLElement, kind: PartKind, library: Library): void {
  if (kind === 'sound') return;
  let hovered: HTMLElement | null = null;
  const show = (tile: HTMLElement | null): void => {
    if (tile === hovered) return;
    hovered = tile;
    const { lnExtChoice, lnExtLichess } = tile?.dataset ?? {};
    library.preview(kind, lnExtLichess === undefined ? (lnExtChoice ?? null) : LICHESS);
    postLichessLookPreview({ part: kind, id: lnExtLichess ?? null });
  };
  card.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch') return;
    const tile = closestTo(event.target, '.ln-ext-src-item', HTMLElement);
    // Between two tiles, or on a saved board's cross.
    if (tile || !closestTo(event.target, '.ln-ext-looks__grid', HTMLElement)) show(tile);
  });
  card.addEventListener('pointerleave', () => show(null));
}

import type { Feature } from '#shared/features.ts';
import { oncePerFrame } from '#shared/frame.ts';
import { isFrench } from '#shared/lang.ts';
import { mayChangeShapes } from './changes.ts';
import { createShapeDrawer } from './draw.ts';
import { onReviewArrowsChange } from './review-arrows.ts';

// Our shapes on any main board: right-clicked squares filled rather than
// ringed, thick arrows (L-shaped for a knight), the Game Review's arrows and its coach's drawings,
// and checkmate.

function start(): void {
  const mateLabel = isFrench() ? 'Échec et mat' : 'Checkmate';
  // Draw at most once a frame, and only when something asks for it. Drawing on
  // every frame kept Chrome restyling every animation on any page with a board.
  const redraw = oncePerFrame(createShapeDrawer({ mateLabel }));
  new MutationObserver(records => {
    if (records.some(mayChangeShapes)) redraw();
  }).observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });
  onReviewArrowsChange(redraw);
  redraw();
}

export const shapes: Feature = { name: 'board shapes', start };

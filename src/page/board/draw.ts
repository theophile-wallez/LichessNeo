import { checkmate } from '#shared/chess/mate.ts';
import { cellOf } from '#shared/chess/squares.ts';
import { wrapOrientation } from '#shared/chessground.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import { html, setHtml, type SafeHtml } from '#shared/html.ts';
import { mateBadgeMarkup } from '#shared/mate-badge.ts';
import { createSvgElement } from '#shared/svg.ts';
import { currentNode } from '#page/lichess/analysis.ts';
import { ENGINE_COLOR, REVIEW_COLOR, THREAT_COLOR } from './colors.ts';
import { squareCenter } from './geometry.ts';
import { clearOfArrows, drawingMarkup } from './drawing.ts';
import { arrowPolygons, arrowsMarkup, fillsMarkup } from './render.ts';
import { reviewArrows, type ReviewArrow, reviewDrawing } from './review-arrows.ts';
import { readShapes, readVariations, type Arrow } from './svg-shapes.ts';

// Our shapes on the main board: fills, Lichess's variation arrows and the
// coach's drawing under the pieces (.ln-ext-marks), arrows over them
// (#ln-ext-shapes), and checkmate over those (#ln-ext-mate), apart so that an
// arrow drawn doesn't replay its animation, nor the drawing its entrance.
// Chessground's own are hidden by the stylesheet once html.ln-ext-shapes is set.

export interface DrawOptions {
  readonly mateLabel: string;
}

const BRUSH_COLORS: Readonly<Record<ReviewArrow['brush'], string>> = {
  best: REVIEW_COLOR,
  threat: THREAT_COLOR,
  engine: ENGINE_COLOR,
};

function reviewArrow({ orig, dest, brush }: ReviewArrow, whiteAtBottom: boolean): Arrow {
  return {
    from: squareCenter(orig, whiteAtBottom),
    to: squareCenter(dest, whiteAtBottom),
    color: BRUSH_COLORS[brush],
    opacity: brush === 'engine' ? 0.5 : 0.8,
  };
}

const isReviewing = (root: Element): boolean =>
  root.classList.contains('ln-ext-review-moves') ||
  root.classList.contains('ln-ext-review-summary');

/** Sets `element`'s markup if it isn't what it was drawn with last; returns what it is. */
function redrawn(element: Element, markup: SafeHtml, drawn: string | undefined): string {
  if (markup.value !== drawn) setHtml(element, markup);
  return markup.value;
}

/** Returns the draw: cheap when nothing changed, as it runs on most mutations. */
export function createShapeDrawer({ mateLabel }: DrawOptions): () => void {
  const layer = createElement('div', { id: 'ln-ext-shapes' });
  const mateLayer = createElement('div', { id: 'ln-ext-mate' });
  const marks = createSvgElement('svg', { class: 'ln-ext-marks', viewBox: '0 0 8 8' });
  let drawn: Partial<Record<'under' | 'over' | 'mate', string>> = {};

  return () => {
    const container = queryOne(document, 'main .main-board cg-container', Element);
    const svg = container && queryOne(container, 'svg.cg-shapes', Element);
    if (!container || !svg) return;
    for (const element of [marks, layer, mateLayer])
      if (element.parentNode !== container) container.append(element);
    const root = document.documentElement;
    // `add` would write the class even when it's there, and a write on <html>
    // has Chrome check the whole page's styles.
    root.classList.toggle('ln-ext-shapes', true);

    const wrap = container.closest('.cg-wrap');
    const bottom = wrap ? wrapOrientation(wrap) : 'white';
    const whiteAtBottom = bottom === 'white';
    const reviewing = isReviewing(root);
    const { fills, arrows } = readShapes(svg, { reviewing });
    // In the review, its own arrows say where the game goes.
    const below = reviewing ? null : queryOne(container, 'svg.cg-shapes-below', Element);
    const variations = below ? readVariations(below) : [];
    arrows.push(...reviewArrows().map(arrow => reviewArrow(arrow, whiteAtBottom)));
    const mate = checkmate(currentNode());
    root.classList.toggle('ln-ext-mate', mate !== null);
    const badge = mate
      ? mateBadgeMarkup({
          king: cellOf(mate.king, bottom),
          by: mate.by && cellOf(mate.by, bottom),
          label: mateLabel,
        })
      : html``;
    const drawing = clearOfArrows(reviewDrawing(), reviewArrows());
    const under = html`${fillsMarkup(fills)}${arrowPolygons(variations)}${drawingMarkup(drawing, whiteAtBottom)}`;
    drawn = {
      under: redrawn(marks, under, drawn.under),
      over: redrawn(layer, arrowsMarkup(arrows), drawn.over),
      mate: redrawn(mateLayer, badge, drawn.mate),
    };
  };
}

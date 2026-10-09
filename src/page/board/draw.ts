import { wrapOrientation } from '#shared/chessground.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { createSvgElement } from '#shared/svg.ts';
import { currentNode } from '#page/lichess/analysis.ts';
import { ENGINE_COLOR, REVIEW_COLOR, THREAT_COLOR } from './colors.ts';
import { squareCenter } from './geometry.ts';
import { createMateClock, matedKing } from './mate.ts';
import { arrowsMarkup, fillsMarkup, mateMarkup } from './render.ts';
import { reviewArrows, type ReviewArrow } from './review-arrows.ts';
import { readShapes, type Arrow } from './svg-shapes.ts';

// Our shapes on the main board: fills under the pieces (.lr-ext-marks), arrows
// and checkmate over them (#lr-ext-shapes). Chessground's own are hidden by the
// stylesheet once html.lr-ext-shapes is set.

export interface DrawOptions {
  readonly mateLabel: string;
  /** Asks for another draw, for the checkmate label's delay. */
  readonly redraw: () => void;
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
  root.classList.contains('lr-ext-review-moves') ||
  root.classList.contains('lr-ext-review-summary');

/** Returns the draw: cheap when nothing changed, as it runs on most mutations. */
export function createShapeDrawer({ mateLabel, redraw }: DrawOptions): () => void {
  const layer = createElement('div', { id: 'lr-ext-shapes' });
  const marks = createSvgElement('svg', { class: 'lr-ext-marks', viewBox: '0 0 8 8' });
  const matePhase = createMateClock(redraw);
  let drawn: string | null = null;

  return () => {
    const container = queryOne(document, 'main .main-board cg-container', Element);
    const svg = container && queryOne(container, 'svg.cg-shapes', Element);
    if (!container || !svg) return;
    if (marks.parentNode !== container) container.append(marks);
    if (layer.parentNode !== container) container.append(layer);
    const root = document.documentElement;
    // `add` would write the class even when it's there, and a write on <html>
    // has Chrome check the whole page's styles.
    root.classList.toggle('lr-ext-shapes', true);

    const wrap = container.closest('.cg-wrap');
    const whiteAtBottom = !wrap || wrapOrientation(wrap) === 'white';
    const { fills, arrows } = readShapes(svg, { reviewing: isReviewing(root) });
    arrows.push(...reviewArrows().map(arrow => reviewArrow(arrow, whiteAtBottom)));
    const node = currentNode();
    const king = matedKing(node);
    const phase = matePhase(node, king);
    root.classList.toggle('lr-ext-mate', king !== null);

    const mate =
      king && phase !== 'none'
        ? mateMarkup({ king, phase, whiteAtBottom, label: mateLabel })
        : null;
    const under = fillsMarkup(fills);
    const over = html`${arrowsMarkup(arrows)}${mate}`;
    const markup = `${under.value}\n${over.value}`;
    if (markup === drawn) return;
    drawn = markup;
    setHtml(marks, under);
    setHtml(layer, over);
  };
}

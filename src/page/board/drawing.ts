import type { Square } from '#shared/chess/types.ts';
import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { PLAN_COLOR, REVIEW_COLOR, THREAT_COLOR } from './colors.ts';
import { squareCenter, squareOnScreen } from './geometry.ts';
import type { Mark, MarkTone, ReviewArrow } from './review-arrows.ts';

// The coach's drawing, under the pieces, in square units from the board's top
// left corner as shown. Each stroke comes in after the one before it
// (styles/board/shapes-promotion.css); the area, first, stands still.

const TONES: Readonly<Record<MarkTone, string>> = {
  attack: THREAT_COLOR,
  defense: REVIEW_COLOR,
  plan: PLAN_COLOR,
};

type Link = Extract<Mark, { readonly kind: 'link' }>;

// Drawn in this order, the rings over the lines they end on.
const LAYERS: readonly Mark['kind'][] = ['area', 'cells', 'link', 'barred', 'ring'];

const at = (square: Square, whiteAtBottom: boolean): Point => squareOnScreen(square, whiteAtBottom);

function areaMarkup(from: Square, to: Square, whiteAtBottom: boolean): SafeHtml {
  const [fromColumn, fromRow] = at(from, whiteAtBottom);
  const [toColumn, toRow] = at(to, whiteAtBottom);
  const x = Math.min(fromColumn, toColumn);
  const y = Math.min(fromRow, toRow);
  const width = Math.abs(toColumn - fromColumn) + 1;
  const height = Math.abs(toRow - fromRow) + 1;
  return html`<rect class="ln-ext-drawing__area" x="${x + 0.04}" y="${y + 0.04}" width="${width - 0.08}" height="${height - 0.08}" rx="0.12" fill="rgba(${PLAN_COLOR},0.18)" stroke="rgb(${PLAN_COLOR})" stroke-width="0.07" stroke-dasharray="0.22 0.14"/>`;
}

// A dot on each square, which reads on any board where a tint would muddy its colors.
function cellsMarkup(squares: readonly Square[], color: string, whiteAtBottom: boolean): SafeHtml {
  return html`${squares.map((square, i) => {
    const [x, y] = squareCenter(square, whiteAtBottom);
    return html`<circle class="ln-ext-drawing__cell" style="--ln-ext-i:${i}" cx="${x}" cy="${y}" r="0.15" fill="rgba(${color},0.9)" stroke="rgba(0,0,0,0.25)" stroke-width="0.03"/>`;
  })}`;
}

// Dots, as an arrow's solid stroke is a move: a line of attack is no move.
// A solid line under a mask draws them in from the start, its round caps
// keeping the end dots whole.
function linkMarkup(link: Link, id: number, whiteAtBottom: boolean): SafeHtml {
  const [x1, y1] = squareCenter(link.from, whiteAtBottom);
  const [x2, y2] = squareCenter(link.to, whiteAtBottom);
  const mask = `ln-ext-drawing-link-${id}`;
  return html`<g class="ln-ext-drawing__link"><mask id="${mask}" maskUnits="userSpaceOnUse"><line class="ln-ext-drawing__reveal" pathLength="1" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="0.4" stroke-linecap="round"/></mask><line mask="url(#${mask})" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgb(${TONES[link.tone]})" stroke-width="0.14" stroke-linecap="round" stroke-dasharray="0.001 0.24"/></g>`;
}

// Fine diagonal stripes over the square: a zone the king can't enter, which
// leaves the pieces and the lines through it seen. In board units, so the
// stripes of squares side by side run on.
function barredMarkup(square: Square, color: string, whiteAtBottom: boolean, id: number): SafeHtml {
  const [x, y] = at(square, whiteAtBottom);
  const stripes = `ln-ext-drawing-barred-${id}`;
  return html`<g class="ln-ext-drawing__barred"><pattern id="${stripes}" patternUnits="userSpaceOnUse" width="0.16" height="0.16" patternTransform="rotate(45)"><rect width="0.055" height="0.16" fill="rgba(${color},0.8)"/></pattern><rect x="${x}" y="${y}" width="1" height="1" fill="url(#${stripes})"/></g>`;
}

// A square's box, its border on the square's edges: the stroke's half inside them.
const RING_WIDTH = 0.08;

function ringMarkup(square: Square, color: string, whiteAtBottom: boolean): SafeHtml {
  const [x, y] = at(square, whiteAtBottom);
  const inset = RING_WIDTH / 2;
  return html`<rect class="ln-ext-drawing__ring" x="${x + inset}" y="${y + inset}" width="${1 - RING_WIDTH}" height="${1 - RING_WIDTH}" fill="rgba(${color},0.22)" stroke="rgb(${color})" stroke-width="${RING_WIDTH}"/>`;
}

const coords = (square: Square): Point => squareOnScreen(square, true);

/** Whether the line from `from` to `to` runs along the arrow from `orig` to `dest`, from its start. */
function alongArrow([from, to]: readonly [Square, Square], { orig, dest }: ReviewArrow): boolean {
  if (from !== orig) return false;
  const [x, y] = coords(from);
  const [toX, toY] = coords(to);
  const [destX, destY] = coords(dest);
  const [dx, dy, ax, ay] = [toX - x, toY - y, destX - x, destY - y];
  return dx * ay === dy * ax && dx * ax + dy * ay > 0;
}

/** The drawing without the lines an arrow already draws: the move shown twice read as a smudge. */
export const clearOfArrows = (marks: readonly Mark[], arrows: readonly ReviewArrow[]): Mark[] =>
  marks.filter(
    mark => mark.kind !== 'link' || !arrows.some(arrow => alongArrow([mark.from, mark.to], arrow)),
  );

function markMarkup(mark: Mark, whiteAtBottom: boolean, index: number): SafeHtml {
  if (mark.kind === 'area') return areaMarkup(mark.from, mark.to, whiteAtBottom);
  const color = TONES[mark.tone];
  if (mark.kind === 'cells') return cellsMarkup(mark.squares, color, whiteAtBottom);
  if (mark.kind === 'link') return linkMarkup(mark, index, whiteAtBottom);
  if (mark.kind === 'barred') return barredMarkup(mark.square, color, whiteAtBottom, index);
  return ringMarkup(mark.square, color, whiteAtBottom);
}

/** The coach's drawing, its strokes layered by kind, each layer coming in after the last. */
export function drawingMarkup(marks: readonly Mark[], whiteAtBottom: boolean): SafeHtml {
  if (marks.length === 0) return html``;
  const layers = LAYERS.flatMap(kind => {
    const strokes = marks.filter(mark => mark.kind === kind);
    return strokes.length > 0 ? [strokes] : [];
  });
  return html`<g class="ln-ext-drawing">${layers.map(
    (strokes, step) =>
      html`<g class="ln-ext-drawing__layer" style="--ln-ext-step:${step}">${strokes.map((mark, i) => markMarkup(mark, whiteAtBottom, i))}</g>`,
  )}</g>`;
}

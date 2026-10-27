import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { squareOnScreen } from './geometry.ts';
import type { Mark } from './review-arrows.ts';

// A run of the coach's drawing: a pill over the squares on each side of the
// piece, tinted in the mark's color, which stretches out from the piece
// (styles/board/shapes-promotion.css).

type Run = Extract<Mark, { readonly kind: 'run' }>;

// How far the pill stands inside the squares' edges, and its corners: round ends.
const INSET = 0.1;
const RADIUS = 0.5 - INSET;
const SQUARE_SECONDS = 0.04;
const MIN_SECONDS = 0.24;
const MAX_SECONDS = 0.4;

const seconds = (squares: number): string =>
  Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, SQUARE_SECONDS * squares)).toFixed(3);

/** Where the pill grows from, on its edge next to the piece, and the scale it grows from. */
function growth([x, y]: Point, [toX, toY]: Point): string {
  if (toX === x) return `--ln-ext-origin:50% ${toY < y ? '100%' : '0%'};--ln-ext-from:1 0`;
  return `--ln-ext-origin:${toX < x ? '100%' : '0%'} 50%;--ln-ext-from:0 1`;
}

/** One side of the run: a pill from the square next to the piece to the far one. */
function laneMarkup(start: Point, squares: readonly Point[], color: string): SafeHtml {
  const [first] = squares;
  if (!first) return html``;
  const columns = squares.map(([x]) => x);
  const rows = squares.map(([, y]) => y);
  const [left, top] = [Math.min(...columns), Math.min(...rows)];
  const width = Math.max(...columns) - left + 1 - 2 * INSET;
  const height = Math.max(...rows) - top + 1 - 2 * INSET;
  const style = `${growth(start, first)};--ln-ext-run:${seconds(squares.length)}s`;
  return html`<rect class="ln-ext-drawing__lane" style="${style}" x="${left + INSET}" y="${top + INSET}" width="${width}" height="${height}" rx="${RADIUS}" fill="rgba(${color},0.14)" stroke="rgba(${color},0.9)" stroke-width="0.04"/>`;
}

export function runMarkup(run: Run, color: string, whiteAtBottom: boolean): SafeHtml {
  const start = squareOnScreen(run.from, whiteAtBottom);
  const cells = run.squares.map(square => squareOnScreen(square, whiteAtBottom));
  const away = ([x, y]: Point): number => x - start[0] + y - start[1];
  const sides = [cells.filter(cell => away(cell) < 0), cells.filter(cell => away(cell) > 0)];
  const nearest = (side: readonly Point[]): Point[] =>
    side.toSorted((first, second) => Math.abs(away(first)) - Math.abs(away(second)));
  return html`${sides.map(side => laneMarkup(start, nearest(side), color))}`;
}

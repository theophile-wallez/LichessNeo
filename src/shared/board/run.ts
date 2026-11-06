import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { squareOnScreen } from './geometry.ts';
import type { Mark } from './marks.ts';

// A run of the coach's drawing: a pill over the squares on each side of the
// piece, tinted in the mark's color, which stretches out from the piece
// (styles/board/shapes-promotion.css). A diagonal's pill runs along it, not
// over the box around it.

type Run = Extract<Mark, { readonly kind: 'run' }>;

// How far the pill stands inside the squares' edges, and its corners: round ends.
const INSET = 0.1;
const RADIUS = 0.5 - INSET;
// A diagonal's pill crosses each square as wide as a file's.
const DIAGONAL_WIDTH = (1 - 2 * INSET) / Math.SQRT2;
// How far it runs past its end squares' centers, toward their corners.
const DIAGONAL_END = 0.45;
const SQUARE_SECONDS = 0.04;
const MIN_SECONDS = 0.24;
const MAX_SECONDS = 0.4;

const seconds = (squares: number): string =>
  Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, SQUARE_SECONDS * squares)).toFixed(3);

const rounded = (value: number): number => Number(value.toFixed(3));

const directionOf = ([x, y]: Point, [toX, toY]: Point): Point => [
  Math.sign(toX - x),
  Math.sign(toY - y),
];

/** Where the pill grows from, on its edge next to the piece, and the scale it grows from. */
function growth([x, y]: Point, [toX, toY]: Point): string {
  if (toX === x) return `--ln-ext-origin:50% ${toY < y ? '100%' : '0%'};--ln-ext-from:1 0`;
  return `--ln-ext-origin:${toX < x ? '100%' : '0%'} 50%;--ln-ext-from:0 1`;
}

/** A pill along a file or a rank, from the square next to the piece to the far one. */
function straightLane(start: Point, squares: readonly Point[], color: string): SafeHtml {
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

// A pill along a diagonal: drawn flat from the first square's center, then
// turned onto the diagonal, so it still stretches out from its own end.
function diagonalLane(squares: readonly Point[], [dx, dy]: Point, color: string): SafeHtml {
  const [first] = squares;
  if (!first) return html``;
  const [x, y] = [first[0] + 0.5, first[1] + 0.5];
  const length = rounded((squares.length - 1) * Math.SQRT2 + 2 * DIAGONAL_END);
  const half = DIAGONAL_WIDTH / 2;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const style = `--ln-ext-origin:0% 50%;--ln-ext-from:0 1;--ln-ext-run:${seconds(squares.length)}s`;
  return html`<g transform="rotate(${angle} ${x} ${y})"><rect class="ln-ext-drawing__lane" style="${style}" x="${rounded(x - DIAGONAL_END)}" y="${rounded(y - half)}" width="${length}" height="${rounded(DIAGONAL_WIDTH)}" rx="${rounded(half)}" fill="rgba(${color},0.14)" stroke="rgba(${color},0.9)" stroke-width="0.04"/></g>`;
}

export function runMarkup(run: Run, color: string, whiteAtBottom: boolean): SafeHtml {
  const start = squareOnScreen(run.from, whiteAtBottom);
  const sides = new Map<string, { direction: Point; cells: Point[] }>();
  for (const square of run.squares) {
    const cell = squareOnScreen(square, whiteAtBottom);
    const direction = directionOf(start, cell);
    const side = sides.get(String(direction)) ?? { direction, cells: [] };
    sides.set(String(direction), { ...side, cells: [...side.cells, cell] });
  }
  const distance = ([x, y]: Point): number =>
    Math.max(Math.abs(x - start[0]), Math.abs(y - start[1]));
  // Up or left of the piece first.
  const ordered = [...sides.values()].toSorted(
    (one, other) =>
      one.direction[0] + one.direction[1] - (other.direction[0] + other.direction[1]) ||
      one.direction[0] - other.direction[0],
  );
  return html`${ordered.map(({ direction, cells }) => {
    const nearest = cells.toSorted((one, other) => distance(one) - distance(other));
    return direction[0] !== 0 && direction[1] !== 0
      ? diagonalLane(nearest, direction, color)
      : straightLane(start, nearest, color);
  })}`;
}

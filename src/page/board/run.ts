import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { RUN_COLOR, RUN_END_COLOR } from './colors.ts';
import { squareCenter } from './geometry.ts';
import type { Mark } from './review-arrows.ts';

// A run of the coach's drawing, as the computer level slider (styles/pages/
// level-slider.css): a rail through the piece, and on each side a knob that
// runs out from it, filling the rail behind it and lighting a notch on each
// square it passes. The fill and the notches share one gradient along the whole
// line, blue at the piece, purple at the ends. Then the rail and the knobs go;
// the notches stay.

type Run = Extract<Mark, { readonly kind: 'run' }>;

const SQUARE_SECONDS = 0.06;
const MIN_RUN_SECONDS = 0.22;
const MAX_RUN_SECONDS = 0.36;
// A notch lights as the knob's halo reaches it, a little short of its middle.
const HALO_REACH = 0.4;
// The knob's easing, the slider's own (styles/board/shapes-promotion.css).
const EASE = [0.22, 1, 0.36, 1] as const;

const bezier = (along: number, first: number, second: number): number =>
  3 * (1 - along) ** 2 * along * first + 3 * (1 - along) * along ** 2 * second + along ** 3;

/** The share of the run's time by which the knob has gone `share` of the way. */
function timeAt(share: number): number {
  let [low, high] = [0, 1];
  for (let i = 0; i < 20; i++) {
    const middle = (low + high) / 2;
    if (bezier(middle, EASE[1], EASE[3]) < share) low = middle;
    else high = middle;
  }
  return bezier(high, EASE[0], EASE[2]);
}

const runSeconds = (squares: number): number =>
  Math.min(MAX_RUN_SECONDS, Math.max(MIN_RUN_SECONDS, SQUARE_SECONDS * squares));

const shade = (end: boolean): string => `rgb(${end ? RUN_END_COLOR : RUN_COLOR})`;

/** The run's gradient, in board units: blue at the piece, purple at each end the line runs to. */
function gradientMarkup(id: string, start: Point, ends: readonly Point[]): SafeHtml {
  const across = ends.some(([x]) => x !== start[0]);
  const along = (point: Point): number => (across ? point[0] : point[1]);
  const low = Math.min(along(start), ...ends.map(along));
  const high = Math.max(along(start), ...ends.map(along));
  const piece = (along(start) - low) / (high - low);
  const [x1, y1, x2, y2] = across ? [low, 0, high, 0] : [0, low, 0, high];
  return html`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${shade(low < along(start))}"/><stop offset="${piece.toFixed(3)}" stop-color="${shade(false)}"/><stop offset="1" stop-color="${shade(high > along(start))}"/></linearGradient>`;
}

const railMarkup = ([x1, y1]: Point, [x2, y2]: Point): SafeHtml =>
  html`<g class="ln-ext-drawing__rail"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,0.35)" stroke-width="0.32" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(0,0,0,0.35)" stroke-width="0.28" stroke-linecap="round"/></g>`;

/** One side of the run, its squares nearest first: the fill behind its knob, its notches, the knob. */
function sideMarkup(start: Point, squares: readonly Point[], gradient: string): SafeHtml {
  const end = squares.at(-1);
  if (!end) return html``;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const seconds = runSeconds(squares.length);
  const notches = squares.map(([x, y], i) => {
    const lit = (seconds * timeAt((i + 1 - HALO_REACH) / squares.length)).toFixed(3);
    return html`<circle class="ln-ext-drawing__notch" style="--ln-ext-lit:${lit}s" cx="${x}" cy="${y}" r="0.09" fill="url(#${gradient})" stroke="#fff" stroke-width="0.035"/>`;
  });
  const style = `--ln-ext-run:${seconds.toFixed(3)}s;--ln-ext-dx:${x2 - x1}px;--ln-ext-dy:${y2 - y1}px`;
  return html`<g style="${style}"><line class="ln-ext-drawing__fill" pathLength="1" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="url(#${gradient})" stroke-width="0.24" stroke-linecap="round"/>${notches}<g class="ln-ext-drawing__knob"><circle cx="${x1}" cy="${y1}" r="0.3" fill="rgba(${RUN_END_COLOR},0.35)"/><circle cx="${x1}" cy="${y1}" r="0.19" fill="#fff"/></g></g>`;
}

export function runMarkup(run: Run, whiteAtBottom: boolean, id: number): SafeHtml {
  const start = squareCenter(run.from, whiteAtBottom);
  const centers = run.squares.map(square => squareCenter(square, whiteAtBottom));
  const away = ([x, y]: Point): number => x - start[0] + y - start[1];
  const nearest = (first: Point, second: Point): number =>
    Math.abs(away(first)) - Math.abs(away(second));
  const sides = [
    centers.filter(center => away(center) < 0).toSorted(nearest),
    centers.filter(center => away(center) > 0).toSorted(nearest),
  ];
  const ends = sides.flatMap(side => {
    const end = side.at(-1);
    return end ? [end] : [];
  });
  const [first, second = start] = ends;
  if (!first) return html``;
  const gradient = `ln-ext-drawing-run-${id}`;
  // The rail and the fills go together, once the longer side's knob is in.
  const rest = runSeconds(Math.max(...sides.map(side => side.length))) * 0.8 + 0.1;
  return html`<g class="ln-ext-drawing__run" style="--ln-ext-rest:${rest.toFixed(3)}s">${gradientMarkup(gradient, start, ends)}${railMarkup(first, second)}${sides.map(side => sideMarkup(start, side, gradient))}</g>`;
}

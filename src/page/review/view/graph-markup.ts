import { html, type SafeHtml } from '#shared/html.ts';
import { clamp } from '#shared/math.ts';
import { CLASS_COLORS, GRAPH_DOTS } from '#page/review/classes/classes.ts';
import type { Review } from '#page/review/session.ts';
import { NO_PHASES, phaseLinesMarkup, type PhaseMarks } from './phases.ts';
import type { Span } from './graph-corner.ts';

// The evaluation graph: White's winning chances over the game, the known
// positions as white areas, the move classes that matter as dots, the phases
// as dashed lines.

export interface GraphSize {
  readonly width: number;
  readonly height: number;
}

type GraphReview = Pick<Review, 'total' | 'positions' | 'draft'>;

/**
 * The last position's index. `total` (positions in the game) spaces the graph
 * for the whole game while its analysis fills in: an unknown position is a gap.
 */
export const lastIndex = (review: GraphReview): number =>
  (review.total || review.positions.length) - 1;

/** Runs of consecutive known positions, as their indexes. */
export function knownRuns(positions: GraphReview['positions']): number[][] {
  const runs: number[][] = [];
  for (const [i, position] of positions.entries()) {
    if (!position) continue;
    const run = positions[i - 1] ? runs.at(-1) : undefined;
    if (run) run.push(i);
    else runs.push([i]);
  }
  return runs;
}

/** The cursor's color, which finds it again to move it (view/graph.ts). */
export const CURSOR_COLOR = '#81b64c';

const winChanceY = (winChance: number, height: number): number =>
  height - (clamp(winChance, 0, 100) / 100) * height;

/** What the curve covers of the graph, each step from a known position to the next. */
export function curveSpans(review: GraphReview, { width, height }: GraphSize): Span[] {
  const span = lastIndex(review) || 1;
  const yAt = (index: number): number =>
    winChanceY(review.positions[index]?.whiteWinChance ?? 0, height);
  return knownRuns(review.positions).flatMap(run =>
    run.map((index, i) => {
      const next = run[i + 1] ?? index;
      const ys = [yAt(index), yAt(next)];
      return { x: (index / span) * width, top: Math.min(...ys), bottom: Math.max(...ys) };
    }),
  );
}

export function graphMarkup(
  review: GraphReview,
  ply: number,
  { width, height }: GraphSize,
  phases: PhaseMarks = NO_PHASES,
): SafeHtml {
  const span = lastIndex(review) || 1;
  const x = (index: number): string => ((index / span) * width).toFixed(1);
  const y = (winChance: number): string => winChanceY(winChance, height).toFixed(1);
  const winChanceAt = (index: number): number => review.positions[index]?.whiteWinChance ?? 0;
  const area = knownRuns(review.positions)
    .map(run => {
      const points = run.map(index => `${x(index)},${y(winChanceAt(index))}`).join(' L');
      return `M${x(run[0] ?? 0)},${height} L${points} L${x(run.at(-1) ?? 0)},${height} Z`;
    })
    .join(' ');
  const dots = review.draft.flatMap(move =>
    move && GRAPH_DOTS.has(move.moveClass) && review.positions[move.ply]
      ? [
          html`<circle cx="${x(move.ply)}" cy="${y(winChanceAt(move.ply))}" r="3.5" fill="${CLASS_COLORS[move.moveClass]}"/>`,
        ]
      : [],
  );
  const marker =
    ply > 0
      ? html`<line x1="${x(ply)}" x2="${x(ply)}" y1="0" y2="${height}" stroke="${CURSOR_COLOR}" stroke-width="2"/>`
      : '';
  return html`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#403d39"/>
      <path d="${area}" fill="#fff"/>
      <line x1="0" x2="${width}" y1="${height / 2}" y2="${height / 2}" stroke="#8b8987" stroke-width="1" opacity="0.6"/>
      ${phaseLinesMarkup(phases, { width, height }, { x: index => (index / span) * width, areaBelow: true })}${marker}${dots}</svg>`;
}

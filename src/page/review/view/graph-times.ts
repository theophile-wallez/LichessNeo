import { html, type SafeHtml } from '#shared/html.ts';
import { clamp } from '#shared/math.ts';
import { timeShare } from '#page/charts/game/move-times.ts';
import type { MoveTime } from '#page/charts/game/series.ts';
import type { GraphSize } from './graph-markup.ts';

// The move-by-move graph's other view: each move's time as a column, White's
// above the middle line and Black's below, on the advantage's x, so a long
// think lines up with the error it led to.

export interface TimesGraph {
  readonly times: readonly MoveTime[];
  /** The last position's index, as the advantage spaces it. */
  readonly last: number;
  readonly ply: number;
}

export function timesMarkup(
  { times, last, ply }: TimesGraph,
  { width, height }: GraphSize,
): SafeHtml {
  const span = last || 1;
  const middle = height / 2;
  const longest = Math.max(0, ...times.map(time => time.seconds));
  const barWidth = clamp((width / span) * 0.6, 1, 6);
  const bars = times.map(time => {
    const length = Math.max(1, timeShare(time.seconds, longest) * (middle - 2));
    const top = time.color === 'white' ? middle - length : middle;
    const x = (time.ply / span) * width - barWidth / 2;
    const now = time.ply === ply ? ' ln-ext-graph-bar--now' : '';
    return html`<rect class="ln-ext-graph-bar ln-ext-graph-bar--${time.color}${now}" x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${length.toFixed(1)}" rx="${Math.min(2, barWidth / 2).toFixed(1)}"/>`;
  });
  const marker =
    ply > 0
      ? html`<line x1="${((ply / span) * width).toFixed(1)}" x2="${((ply / span) * width).toFixed(1)}" y1="0" y2="${height}" stroke="#81b64c" stroke-width="2"/>`
      : '';
  return html`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#403d39"/>
      <line x1="0" x2="${width}" y1="${middle}" y2="${middle}" stroke="#8b8987" stroke-width="1" opacity="0.6"/>
      ${marker}<g>${bars}</g></svg>`;
}

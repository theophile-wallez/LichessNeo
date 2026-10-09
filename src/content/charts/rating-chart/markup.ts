import { gridLine, hitArea, xAxisLabel } from '#shared/charts/markup.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { RANGE_KEYS } from './dates.ts';
import { HEIGHT, PADDING, type Plot } from './scales.ts';
import type { TimeTick } from './time-ticks.ts';

/** The chart's frame, filled in by each draw. */
export function chartShell(): SafeHtml {
  const ranges = RANGE_KEYS.map(
    key => html`<button type="button" data-lr-ext-range="${key}">${key}</button>`,
  );
  return html`<div class="lr-ext-rchart__top"><div class="lr-ext-rchart__legend"></div><div class="lr-ext-rchart__ranges"><span class="lr-ext-rchart__thumb"></span>${ranges}</div></div><div class="lr-ext-rchart__plot"><svg class="lr-ext-rchart__svg" aria-hidden="true"></svg><div class="lr-ext-rchart__tip"></div></div>`;
}

export const gradientId = (index: number): string => `lr-ext-rg-${index}`;

function dateLabels(plot: Plot, ticks: readonly TimeTick[]): SafeHtml[] {
  // Labels too close to the plot's edges would be clipped.
  return ticks
    .filter(
      ([time]) =>
        plot.x(time) > PADDING.left + 16 && plot.x(time) < plot.width - PADDING.right - 16,
    )
    .map(([time, label]) => xAxisLabel({ x: plot.x(time), y: HEIGHT - 8, text: label }));
}

/** Everything in the SVG but the rating grid and the curves' paths, which `update` sets. */
export function plotMarkup(plot: Plot, ticks: readonly TimeTick[]): SafeHtml {
  const plotWidth = plot.width - PADDING.left - PADDING.right;
  const gradients = plot.rows.map(
    ({ index, color }) =>
      html`<linearGradient id="${gradientId(index)}" gradientUnits="userSpaceOnUse" x1="0" x2="0"><stop offset="0" stop-color="${color}" stop-opacity="0.3"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`,
  );
  const series = plot.rows.map(
    ({ index, color }) =>
      html`<g class="lr-ext-rchart__series" data-lr-ext-series="${index}" style="--lr-ext-series-color:${color}"><path class="lr-ext-rchart__area" fill="url(#${gradientId(index)})"/><path class="lr-ext-rchart__line"/></g>`,
  );
  const dots = plot.rows.map(
    ({ index, color }) =>
      html`<circle class="lr-ext-rchart__dot" data-lr-ext-series="${index}" r="4.5" style="--lr-ext-series-color:${color}"/>`,
  );
  // One clip, wiped open, reveals every line and fill together, left to right.
  const clip = html`<clipPath id="lr-ext-rclip"><rect class="lr-ext-rchart__wipe" x="${PADDING.left - 4}" y="0" width="${plotWidth + 8}" height="${HEIGHT}"/></clipPath>`;
  const hit = hitArea({
    x: PADDING.left,
    y: PADDING.top,
    width: plotWidth,
    height: plot.bottom - PADDING.top,
  });
  return html`<defs>${gradients}${clip}</defs><g class="lr-ext-rchart__axis">${dateLabels(plot, ticks)}</g><g class="lr-ext-rchart__all" clip-path="url(#lr-ext-rclip)">${series}</g><g class="lr-ext-rchart__hover"><line class="lr-ext-rchart__guide" y1="${PADDING.top}" y2="${plot.bottom}"/>${dots}</g>${hit}`;
}

/** The rating grid, which follows the ratings shown. */
export function ratingGrid(plot: Plot): SafeHtml {
  const lines = plot.ratings.ticks.map(rating =>
    gridLine({
      y: plot.y(rating),
      left: PADDING.left,
      right: plot.width - PADDING.right,
      label: rating,
    }),
  );
  return html`${lines}`;
}

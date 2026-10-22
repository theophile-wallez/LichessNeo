import { monotoneCurve } from '#shared/charts/curve.ts';
import { gridLine, hitArea, xAxisLabel } from '#shared/charts/markup.ts';
import { steps } from '#shared/charts/steps.ts';
import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { roundTenth } from '#shared/math.ts';
import type { Formats } from './formats.ts';
import type { ChartModel } from './model.ts';
import { CURVE_PADDING, type CurveGeometry } from './scales.ts';

// The date dimension, over time: a smooth curve per series, the only one of
// them over a gradient. Dates come as one point per batch of games, not evenly
// spaced, so the x axis is the batches in order, as Lichess's own chart has it.

interface Curve {
  readonly model: ChartModel;
  readonly geometry: CurveGeometry;
  readonly formats: Formats;
}

/** Room a date label needs before the next one can show. */
const LABEL_ROOM = 76;

/** An area's gradient, one per series: a stop can't read the series' color. */
const areaGradientId = (serie: number): string => `ln-ext-ins-area-${serie}`;

function axis({ model, geometry, formats }: Curve): SafeHtml {
  const { scale, valueType } = model;
  const grid = steps(scale.min, scale.max + scale.step / 2, scale.step).map(value =>
    gridLine({
      y: geometry.y(value),
      left: CURVE_PADDING.left,
      right: geometry.width - CURVE_PADDING.right,
      label: formats.value(value, valueType),
      extraClass: value === 0 ? ' ln-ext-ins__zero' : '',
    }),
  );
  const every = Math.max(1, Math.ceil(model.rows.length / (geometry.plotWidth / LABEL_ROOM)));
  const marks = model.rows
    .map((row, index) => ({ label: row.label, index }))
    .filter(({ index }) => index % every === 0);
  // Several batches of games fall on one day: the day is written once.
  const dates = marks
    .filter(({ label }, at) => at === 0 || marks[at - 1]?.label !== label)
    .map(({ label, index }) =>
      xAxisLabel({ x: geometry.x(index), y: geometry.height - 9, text: label }),
    );
  return html`<g class="ln-ext-rchart__axis">${grid}${dates}</g>`;
}

const pointsOf = (model: ChartModel, geometry: CurveGeometry, serie: number): Point[] =>
  model.rows.map((row, index): Point => [geometry.x(index), geometry.y(row.values[serie] ?? 0)]);

function serieMarkup({ model, geometry }: Curve, serie: number): SafeHtml {
  const points = pointsOf(model, geometry, serie);
  const line = monotoneCurve(points);
  const color = model.series[serie]?.color ?? '';
  const first = points[0];
  const last = points[points.length - 1];
  // A single series stands on a gradient; several would hide one another.
  const area =
    model.series.length === 1 && first && last
      ? html`<path class="ln-ext-ins__area" fill="url(#${areaGradientId(serie)})" d="${line}L${roundTenth(last[0])},${roundTenth(geometry.bottom)}L${roundTenth(first[0])},${roundTenth(geometry.bottom)}Z"/>`
      : html``;
  const dots = points.map(
    ([x, y]) =>
      html`<circle class="ln-ext-ins__point" cx="${roundTenth(x)}" cy="${roundTenth(y)}" r="2.5"/>`,
  );
  return html`<g class="ln-ext-ins__serie" style="--ln-ext-series-color:${color}">${area}<path class="ln-ext-ins__line" pathLength="1" d="${line}"/>${dots}</g>`;
}

/** The player's own average over the whole period, as in the bars. */
function averageLine({ model, geometry }: Curve): SafeHtml {
  const average = model.series.length === 1 ? model.averages[0] : undefined;
  if (average === undefined) return html``;
  const y = roundTenth(geometry.y(average));
  return html`<line class="ln-ext-ins__avg" x1="${CURVE_PADDING.left}" x2="${geometry.width - CURVE_PADDING.right}" y1="${y}" y2="${y}"/>`;
}

export function curveMarkup(curve: Curve): SafeHtml {
  const { model, geometry } = curve;
  const gradients = model.series.map(
    (serie, index) =>
      html`<linearGradient id="${areaGradientId(index)}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${geometry.top}" y2="${geometry.bottom}"><stop offset="0" style="stop-color:${serie.color};stop-opacity:0.42"/><stop offset="1" style="stop-color:${serie.color};stop-opacity:0"/></linearGradient>`,
  );
  const series = model.series.map((_, serie) => serieMarkup(curve, serie));
  const dots = model.series.map(
    ({ color }, serie) =>
      html`<circle class="ln-ext-ins__dot" data-ln-ext-serie="${serie}" style="--ln-ext-series-color:${color}" r="4.5"/>`,
  );
  const cursor = html`<line class="ln-ext-ins__cursor" y1="${geometry.top}" y2="${geometry.bottom}"/>`;
  const hit = hitArea({
    x: CURVE_PADDING.left,
    y: geometry.top,
    width: geometry.plotWidth,
    height: geometry.bottom - geometry.top,
  });
  return html`<defs>${gradients}</defs>${axis(curve)}${cursor}${series}${averageLine(curve)}${dots}${hit}`;
}

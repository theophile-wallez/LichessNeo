import { xAxisLabel } from '#shared/charts/markup.ts';
import { steps } from '#shared/charts/steps.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { roundTenth } from '#shared/math.ts';
import type { Formats } from './formats.ts';
import type { ChartModel, Row } from './model.ts';
import { BAR_HEIGHT, type BarsGeometry, ROW_HEIGHT, SEGMENT_GAP } from './scales.ts';

// A row per category: one bar from the axis, or a bar cut into a segment per
// series. Each segment keeps its rounded ends, with a gap between them.

interface Bars {
  readonly model: ChartModel;
  readonly geometry: BarsGeometry;
  readonly formats: Formats;
}

const RADIUS = 5;
/** A bar's gradient, one per series: a stop can't read the bar's own color. */
export const barGradientId = (serie: number): string => `ln-ext-ins-bar-${serie}`;

/** Under this, a segment has no room for its share. */
const LABEL_ROOM = 38;
/** Between a bar's end and its value. */
const VALUE_GAP = 10;

function defs(model: ChartModel): SafeHtml {
  // A stack reads as proportions, so its segments stay flat, in colors their
  // shares can be written on; a lone bar lightens toward its foot.
  const foot = model.stacked ? '1' : '0.55';
  const gradients = model.series.map(
    (serie, index) =>
      html`<linearGradient id="${barGradientId(index)}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" style="stop-color:${serie.color};stop-opacity:${foot}"/><stop offset="1" style="stop-color:${serie.color}"/></linearGradient>`,
  );
  return html`<defs>${gradients}</defs>`;
}

function grid({ model, geometry, formats }: Bars): SafeHtml {
  const { scale, valueType } = model;
  const lines = steps(scale.min, scale.max + scale.step / 2, scale.step).map(value => {
    const x = roundTenth(geometry.x(value));
    const zero = value === 0 ? ' ln-ext-ins__zero' : '';
    const label = xAxisLabel({ x, y: geometry.height - 8, text: formats.value(value, valueType) });
    return html`<line class="ln-ext-rchart__grid${zero}" x1="${x}" x2="${x}" y1="0" y2="${geometry.rowsBottom}"/>${label}`;
  });
  return html`<g class="ln-ext-rchart__axis">${lines}</g>`;
}

interface Segment {
  readonly from: number;
  readonly to: number;
  readonly serie: number;
  readonly value: number;
}

/** A row's segments, left to right, in plot coordinates. */
function segmentsOf(row: Row, { model, geometry }: Bars): Segment[] {
  if (!model.stacked) {
    const value = row.values[0] ?? 0;
    const to = geometry.x(value);
    return [
      { from: Math.min(geometry.zero, to), to: Math.max(geometry.zero, to), serie: 0, value },
    ];
  }
  let walked = 0;
  return row.values.map((value, serie) => {
    const from = geometry.x(walked);
    walked += value;
    return { from, to: geometry.x(walked), serie, value };
  });
}

function segmentMarkup(segment: Segment, y: number, { model, formats }: Bars): SafeHtml {
  const width = Math.max(0, segment.to - segment.from - (model.stacked ? SEGMENT_GAP : 0));
  // Nothing to draw for a series with no games in this row.
  if (width <= 0) return html``;
  const serie = model.series[segment.serie];
  const color = serie?.color ?? '';
  const negative = segment.value < 0 ? ' ln-ext-ins__bar--neg' : '';
  const style = `--ln-ext-series-color:${color};--ln-ext-bar-index:${segment.serie}`;
  const fill = `url(#${barGradientId(segment.serie)})`;
  const share =
    model.stacked && width > LABEL_ROOM
      ? html`<text class="ln-ext-ins__share" style="fill:${serie?.textColor ?? ''}" x="${roundTenth(segment.from + width / 2)}" y="${y + BAR_HEIGHT / 2}">${formats.value(segment.value, model.valueType)}</text>`
      : html``;
  return html`<rect class="ln-ext-ins__bar${negative}" fill="${fill}" style="${style}" x="${roundTenth(segment.from)}" y="${y}" width="${roundTenth(width)}" height="${BAR_HEIGHT}" rx="${RADIUS}"/>${share}`;
}

/**
 * The number a row ends with, past its track so they all line up in a column:
 * its value, or what a stacked row stands on, its shares being in its segments.
 */
const endLabel = (row: Row, { model, formats }: Bars): string =>
  model.stacked ? formats.count(row.size) : formats.value(row.values[0] ?? 0, model.valueType);

function rowMarkup(row: Row, index: number, bars: Bars): SafeHtml {
  const { geometry } = bars;
  const top = geometry.rowTop(index);
  const y = top + (ROW_HEIGHT - BAR_HEIGHT) / 2;
  const segments = segmentsOf(row, bars).map(segment => segmentMarkup(segment, y, bars));
  const track = html`<rect class="ln-ext-ins__track" x="${geometry.left}" y="${y}" width="${roundTenth(geometry.right - geometry.left)}" height="${BAR_HEIGHT}" rx="${RADIUS}"/>`;
  const value = html`<text class="ln-ext-ins__value" x="${roundTenth(geometry.right + VALUE_GAP)}" y="${y + BAR_HEIGHT / 2}">${endLabel(row, bars)}</text>`;
  const hit = html`<rect class="ln-ext-rchart__hit" x="0" y="${top}" width="${geometry.width}" height="${ROW_HEIGHT}"/>`;
  return html`<g class="ln-ext-ins__row" data-ln-ext-row="${index}" style="--ln-ext-bar-row:${index}">${track}${segments}${value}${hit}</g>`;
}

/**
 * The player's own average, over the bars so it can be read against them. A
 * stack's shares pile up, so no single line stands for them (their averages
 * are in the legend's chips instead).
 */
function averageLine({ model, geometry }: Bars): SafeHtml {
  const average = model.series.length === 1 ? model.averages[0] : undefined;
  if (average === undefined) return html``;
  const x = roundTenth(geometry.x(average));
  return html`<line class="ln-ext-ins__avg" x1="${x}" x2="${x}" y1="0" y2="${geometry.rowsBottom}"/>`;
}

export function barsMarkup(bars: Bars): SafeHtml {
  const rows = bars.model.rows.map((row, index) => rowMarkup(row, index, bars));
  return html`${defs(bars.model)}${grid(bars)}<g class="ln-ext-ins__rows">${rows}</g>${averageLine(bars)}`;
}

/** The category names, beside the SVG, a row of its height each. */
export function labelsMarkup(model: ChartModel): SafeHtml {
  const labels = model.rows.map(
    (row, index) =>
      html`<span class="ln-ext-ins__label" data-ln-ext-row="${index}" title="${row.label}">${row.label}</span>`,
  );
  return html`${labels}`;
}

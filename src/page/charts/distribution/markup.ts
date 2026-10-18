import { monotoneCurve } from '#shared/charts/curve.ts';
import {
  chipLabel,
  gridLine,
  hitArea,
  tipRow,
  tipTitle,
  xAxisLabel,
} from '#shared/charts/markup.ts';
import { steps } from '#shared/charts/steps.ts';
import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import type { Names, NumberFormats } from './formats.ts';
import { type Marker, onChart, type Players } from './players.ts';
import { BIN_SIZE, columnPath, type Geometry, MARKER_ROW, MIN_RATING, PADDING } from './scales.ts';

// The cumulative curve's color, which no rating uses.
const CUMULATIVE_COLOR = '#f1f1f0';

function chip(color: string, name: string, value: string): SafeHtml {
  const strong = value === '' ? '' : html`<strong>${value}</strong>`;
  return html`<span class="ln-ext-rchart__chip ln-ext-dist__chip" style="--ln-ext-series-color:${color}">${chipLabel(name)}${strong}</span>`;
}

interface Shell {
  readonly color: string;
  readonly names: Names;
  /** The number of players, formatted. */
  readonly total: string;
}

/** The chart's frame, filled in by each draw. */
export function chartShell({ color, names, total }: Shell): SafeHtml {
  const legend = html`${chip(color, names.players, total)}${chip(CUMULATIVE_COLOR, names.cumulative, '')}`;
  return html`<div class="ln-ext-dist__legend">${legend}</div><div class="ln-ext-dist__plot"><svg class="ln-ext-dist__svg" aria-hidden="true"></svg><div class="ln-ext-dist__marks"></div><div class="ln-ext-rchart__tip ln-ext-dist__tip"></div></div>`;
}

function axis(geometry: Geometry, players: Players, formats: NumberFormats): SafeHtml {
  const { x, yCount, yShare, width, height, counts } = geometry;
  // A label every 100 points, or every 200 or 500 when they would overlap.
  const pxPerPoint = geometry.plotWidth / (players.maxRating - MIN_RATING);
  const every = [100, 200, 500].find(points => pxPerPoint * points >= 44) ?? 500;
  const ratings = steps(Math.ceil(MIN_RATING / every) * every, players.maxRating, every).map(
    rating => xAxisLabel({ x: x(rating), y: height - 9, text: rating }),
  );
  const grid = steps(0, counts.max + counts.step / 2, counts.step).map(count =>
    gridLine({
      y: yCount(count),
      left: PADDING.left,
      right: width - PADDING.right,
      label: count === 0 ? 0 : formats.compact.format(count),
      extraClass: count === 0 ? ' ln-ext-dist__base' : '',
    }),
  );
  const shares = [0.25, 0.5, 0.75, 1].map(
    share =>
      html`<text class="ln-ext-dist__slabel" x="${width - PADDING.right + 10}" y="${yShare(share)}">${formats.wholePercent.format(share)}</text>`,
  );
  return html`<g class="ln-ext-rchart__axis">${grid}${ratings}${shares}</g>`;
}

function columns(geometry: Geometry, players: Players, lit: number): SafeHtml {
  const { binWidth, bottom } = geometry;
  const gap = binWidth > 6 ? Math.min(3, binWidth * 0.22) : 0.5;
  const bars = players.counts.map((count, i) => {
    const dim = i > lit ? ' ln-ext-dist__bar--dim' : '';
    const path = columnPath({
      x: PADDING.left + i * binWidth + gap / 2,
      y: geometry.yCount(count),
      width: Math.max(0.5, binWidth - gap),
      bottom,
    });
    return html`<path class="ln-ext-dist__bar${dim}" data-ln-ext-bar="${i}" style="--ln-ext-bar-index:${i}" d="${path}"/>`;
  });
  return html`<g class="ln-ext-dist__bars">${bars}</g>`;
}

function cumulativeCurve(geometry: Geometry, players: Players): string {
  const points: Point[] = [
    [geometry.x(MIN_RATING), geometry.yShare(0)],
    ...players.shares.map((share, i): Point => [
      geometry.x(MIN_RATING + (i + 1) * BIN_SIZE),
      geometry.yShare(share),
    ]),
  ];
  return monotoneCurve(points);
}

interface Chart {
  readonly geometry: Geometry;
  readonly players: Players;
  readonly markers: readonly Marker[];
  /** The last lit column, yours when you have a rating. The columns after it are dimmed. */
  readonly lit: number;
  readonly color: string;
  readonly formats: NumberFormats;
}

export function plotMarkup({ geometry, players, markers, lit, color, formats }: Chart): SafeHtml {
  const { top, bottom } = geometry;
  const gradient = html`<linearGradient id="ln-ext-dist-g" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${top}" y2="${bottom}"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0.35"/></linearGradient>`;
  const lines = markers.map(({ color: markerColor, rating }, k) => {
    const x = geometry.x(onChart(rating, players));
    return html`<line class="ln-ext-dist__mline" style="--ln-ext-marker-color:${markerColor}" x1="${x}" x2="${x}" y1="${k * MARKER_ROW + 24}" y2="${bottom}"/>`;
  });
  const hit = hitArea({ x: PADDING.left, y: top, width: geometry.plotWidth, height: bottom - top });
  return html`<defs>${gradient}</defs>${axis(geometry, players, formats)}${columns(geometry, players, lit)}${lines}<path class="ln-ext-dist__cumul" pathLength="1" d="${cumulativeCurve(geometry, players)}"/><circle class="ln-ext-dist__dot" r="4.5"/>${hit}`;
}

/** The markers' pills, in HTML over the top of their lines. */
export function marksMarkup(markers: readonly Marker[], formats: NumberFormats): SafeHtml {
  const marks = markers.map(
    ({ kind, color, label, rating }) =>
      html`<span class="ln-ext-dist__mark ln-ext-dist__mark--${kind}" style="--ln-ext-marker-color:${color}">${label} <strong>${formats.count.format(rating)}</strong></span>`,
  );
  return html`${marks}`;
}

interface Tip {
  readonly bin: number;
  readonly players: Players;
  readonly color: string;
  readonly names: Names;
  readonly formats: NumberFormats;
}

/** A column's ratings, its players, and the share of players rated below its end. */
export function tipMarkup({ bin, players, color, names, formats }: Tip): SafeHtml {
  const low = MIN_RATING + bin * BIN_SIZE;
  const count = formats.count.format(players.counts[bin] ?? 0);
  const share = formats.percent.format(players.shares[bin] ?? 0);
  const rows = [
    tipRow({ color, name: names.players, value: count }),
    tipRow({ color: CUMULATIVE_COLOR, name: names.cumulative, value: share }),
  ];
  return html`${tipTitle(`${low}–${low + BIN_SIZE - 1}`)}${rows}`;
}

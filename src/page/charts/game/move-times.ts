import { hitArea, tipRow, tipTitle } from '#shared/charts/markup.ts';
import type { Color } from '#shared/chess/types.ts';
import { clockTime } from '#shared/clock-time.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { overlayMarkup, PLOT_TOP, phasesMarkup, type PhaseNames } from './parts.ts';
import { type PlotSize, plyScale } from './scale.ts';
import type { MoveTime, Phases } from './series.ts';

// Each move's time as a rounded column, White's above the middle line and
// Black's below, on the same x as the advantage chart.

export const SIDE_COLORS: Readonly<Record<Color, string>> = {
  white: 'var(--ln-ext-side-white)',
  black: 'var(--ln-ext-side-black)',
};

export interface MoveTimesChart {
  readonly times: readonly MoveTime[];
  readonly lastPly: number;
  readonly phases: Phases;
  readonly names: PhaseNames;
}

/**
 * A column's share of its half, as Lichess scales it: logarithmic, so a
 * second and a minute both show; past twenty minutes, all alike.
 */
export function timeShare(seconds: number, longest: number): number {
  const most = logScaled(longest);
  return most > 0 ? logScaled(seconds) / most : 0;
}

const logScaled = (seconds: number): number =>
  Math.log(0.5 * Math.min(seconds, 1200) + 3) ** 2 - Math.log(3) ** 2;

export function moveTimesMarkup(chart: MoveTimesChart, size: PlotSize): SafeHtml {
  const { times, lastPly, phases, names } = chart;
  const scale = plyScale(lastPly, size.width);
  const middle = PLOT_TOP + (size.height - PLOT_TOP) / 2;
  const half = middle - PLOT_TOP - 1;
  const longest = Math.max(0, ...times.map(time => time.seconds));
  const width = Math.max(1, Math.min(10, scale.step * 0.7));
  const columns = times.map(time => {
    const length = Math.max(1, timeShare(time.seconds, longest) * half);
    const top = time.color === 'white' ? middle - length : middle;
    const x = (scale.x(time.ply) - width / 2).toFixed(1);
    return html`<rect class="ln-ext-gchart__bar ln-ext-gchart__bar--${time.color}" data-ln-ext-ply="${time.ply}" x="${x}" y="${top.toFixed(1)}" width="${width.toFixed(1)}" height="${length.toFixed(1)}" rx="${Math.min(2, width / 2).toFixed(1)}"/>`;
  });
  return html`<line class="ln-ext-rchart__grid" x1="0" x2="${size.width}" y1="${middle}" y2="${middle}"/>
    <g class="ln-ext-rchart__wipe">${columns}</g>
    ${phasesMarkup(phases, names, { scale, size })}
    ${overlayMarkup(size)}
    ${hitArea({ x: 0, y: 0, width: size.width, height: size.height })}`;
}

export interface TimeFormats {
  readonly seconds: Intl.NumberFormat;
  readonly side: Readonly<Record<Color, string>>;
  readonly clockLabel: string;
}

export function moveTimeTip(time: MoveTime, formats: TimeFormats): SafeHtml {
  const color = SIDE_COLORS[time.color];
  const spent = tipRow({
    color,
    name: formats.side[time.color],
    value: formats.seconds.format(time.seconds),
  });
  const clock =
    time.clock === null
      ? ''
      : tipRow({ color, name: formats.clockLabel, value: clockTime(time.clock) });
  return html`${tipTitle(time.san)}${spent}${clock}`;
}

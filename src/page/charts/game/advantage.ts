import { monotoneCurve } from '#shared/charts/curve.ts';
import { gridLine, hitArea, tipRow, tipTitle } from '#shared/charts/markup.ts';
import type { Point } from '#shared/geometry.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { formatEval } from '#page/review/evaluation/format.ts';
import { overlayMarkup, PLOT_TOP, phasesMarkup, type PhaseNames } from './parts.ts';
import { type PlotSize, plyScale } from './scale.ts';
import type { AdvantagePoint, Phases } from './series.ts';

// The server analysis' chart, as the review's graph reads: White's winning
// chances as an area in White's color, rising as White gets ahead.

const WHITE = 'var(--ln-ext-side-white)';

export interface AdvantageChart {
  readonly points: readonly AdvantagePoint[];
  readonly lastPly: number;
  readonly phases: Phases;
  readonly names: PhaseNames;
}

/** The y of White's winning chances, 0 at the bottom. */
export const advantageY =
  ({ height }: PlotSize) =>
  (whiteWin: number): number =>
    PLOT_TOP + (1 - whiteWin / 100) * (height - PLOT_TOP);

export function advantageMarkup(chart: AdvantageChart, size: PlotSize): SafeHtml {
  const { points, lastPly, phases, names } = chart;
  const scale = plyScale(lastPly, size.width);
  const y = advantageY(size);
  const curve = points.map((point): Point => [scale.x(point.ply), y(point.whiteWin)]);
  const line = monotoneCurve(curve);
  const [first] = curve;
  const last = curve.at(-1);
  const area = first && last ? `${line}L${last[0]},${size.height}L${first[0]},${size.height}Z` : '';
  const grid = [25, 50, 75].map(share =>
    gridLine({ y: y(share), left: 0, right: size.width, label: '' }),
  );
  return html`<defs><linearGradient id="ln-ext-gchart-white" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:${WHITE}" stop-opacity="0.95"/><stop offset="1" style="stop-color:${WHITE}" stop-opacity="0.7"/></linearGradient></defs>
    ${grid}
    <g class="ln-ext-rchart__wipe"><path class="ln-ext-gchart__area" d="${area}"/><path class="ln-ext-gchart__line" d="${line}"/></g>
    <line class="ln-ext-gchart__even" x1="0" x2="${size.width}" y1="${y(50)}" y2="${y(50)}"/>
    ${phasesMarkup(phases, names, { scale, size })}
    ${overlayMarkup(size)}
    ${hitArea({ x: 0, y: 0, width: size.width, height: size.height })}`;
}

export interface AdvantageTip {
  readonly point: AdvantagePoint;
  /** The move that led there, as Lichess numbers it. */
  readonly move: string;
  readonly label: string;
}

export const advantageTip = ({ point, move, label }: AdvantageTip): SafeHtml =>
  html`${tipTitle(move)}${tipRow({ color: WHITE, name: label, value: formatEval(point.score) })}`;

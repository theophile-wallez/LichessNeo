import { chipLabel } from '#shared/charts/markup.ts';
import type { Color } from '#shared/chess/types.ts';
import { html } from '#shared/html.ts';
import { pageLocale } from '#shared/lang.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { translate } from '#page/lichess/globals.ts';
import { advantageMarkup, advantageTip, advantageY } from './advantage.ts';
import { moveTimesMarkup, moveTimeTip, SIDE_COLORS, type TimeFormats } from './move-times.ts';
import type { PhaseNames } from './parts.ts';
import type { PlyChartSpec } from './plot.ts';
import { advantagePoints, moveName, moveTimes, phasesOf } from './series.ts';

// The two charts, from the analysis controller's data. Their words are
// Lichess's own (`i18n.site`), with English if a key goes missing.

const SIDES: readonly Color[] = ['white', 'black'];

const phaseNames = (): PhaseNames => ({
  middlegame: translate('middlegame', 'Middlegame'),
  endgame: translate('endgame', 'Endgame'),
});

/** The move that led to each position, as Lichess numbers it. */
function moveNames(analysis: Analysis): Map<number, string> {
  const names = new Map<number, string>();
  for (const node of analysis.mainline)
    if (node.san) names.set(node.ply, moveName(node.ply, node.san));
  return names;
}

/** The server analysis' chart, once some of it is in. */
export function advantageSpec(analysis: Analysis): PlyChartSpec | null {
  const { mainline } = analysis;
  const points = advantagePoints(mainline);
  const course = analysis.course;
  if (points.length === 0 || !course) return null;
  const chart = {
    points,
    lastPly: mainline.at(-1)?.ply ?? 0,
    phases: phasesOf(course),
    names: phaseNames(),
  };
  const byPly = new Map(points.map(point => [point.ply, point]));
  const names = moveNames(analysis);
  const label = translate('advantage', 'Advantage');
  return {
    plies: points.map(point => point.ply),
    lastPly: chart.lastPly,
    legend: null,
    draw: size => advantageMarkup(chart, size),
    tip: ply => {
      const point = byPly.get(ply);
      return point ? advantageTip({ point, move: names.get(ply) ?? '', label }) : null;
    },
    dotY: (ply, size) => {
      const point = byPly.get(ply);
      return point ? advantageY(size)(point.whiteWin) : null;
    },
  };
}

function timeFormats(): TimeFormats {
  return {
    seconds: new Intl.NumberFormat(pageLocale(), {
      style: 'unit',
      unit: 'second',
      maximumFractionDigits: 1,
    }),
    side: { white: translate('white', 'White'), black: translate('black', 'Black') },
    clockLabel: translate('clock', 'Clock'),
  };
}

/** The move times' chart; none for a game without them (an imported one). */
export function moveTimesSpec(analysis: Analysis): PlyChartSpec | null {
  const course = analysis.course;
  const times = course ? moveTimes(analysis.mainline, course) : [];
  if (!course || times.length === 0) return null;
  const chart = {
    times,
    lastPly: analysis.mainline.at(-1)?.ply ?? 0,
    phases: phasesOf(course),
    names: phaseNames(),
  };
  const byPly = new Map(times.map(time => [time.ply, time]));
  const formats = timeFormats();
  const chips = SIDES.map(
    color =>
      html`<span class="ln-ext-gchart__chip" style="--ln-ext-series-color:${SIDE_COLORS[color]}">${chipLabel(formats.side[color])}</span>`,
  );
  return {
    plies: times.map(time => time.ply),
    lastPly: chart.lastPly,
    legend: html`${chips}`,
    draw: size => moveTimesMarkup(chart, size),
    tip: ply => {
      const time = byPly.get(ply);
      return time ? moveTimeTip(time, formats) : null;
    },
    dotY: () => null,
  };
}

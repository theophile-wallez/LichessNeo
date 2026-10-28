import { html, type SafeHtml } from '#shared/html.ts';
import { nameWidth, type PhaseLabel, phaseLabels } from '#page/charts/game/parts.ts';
import { translate } from '#page/lichess/globals.ts';
import type { Division } from '#page/review/rating/phases.ts';
import type { GraphSize } from './graph-markup.ts';

// The game's phases on the review's graphs, as on Lichess's own chart: a dashed
// line where the middlegame and the endgame start, named at the bottom, or at
// the top where the move-by-move graph's views toggle went down
// (view/graph-corner.ts). Their names are Lichess's.

export interface PhaseStart {
  /** The phase's first position. */
  readonly index: number;
  readonly name: string;
}

export const openingName = (): string => translate('opening', 'Opening');

/** Where the middlegame and the endgame start, those the game reaches. */
export function phaseStarts({ middle, end }: Division): PhaseStart[] {
  const starts: PhaseStart[] = [];
  if (middle > 0) starts.push({ index: middle, name: translate('middlegame', 'Middlegame') });
  if (end > 0) starts.push({ index: end, name: translate('endgame', 'Endgame') });
  return starts;
}

export interface PhaseMarks {
  readonly starts: readonly PhaseStart[];
  /** How far from the left the views toggle takes the bottom: a name there goes to the top. */
  readonly toggleBelow: number;
}

export const NO_PHASES: PhaseMarks = { starts: [], toggleBelow: 0 };

export interface PhaseScale {
  readonly x: (index: number) => number;
  /** The graph's bottom is White's area, light, rather than its ground. */
  readonly areaBelow: boolean;
}

const leftOf = ({ x, name, anchor }: PhaseLabel): number =>
  anchor === 'start' ? x : x - nameWidth(name);

export function phaseLinesMarkup(
  { starts, toggleBelow }: PhaseMarks,
  { width, height }: GraphSize,
  { x, areaBelow }: PhaseScale,
): SafeHtml {
  const lines = starts.map(start => ({ x: x(start.index), name: start.name }));
  const marks = lines.map(
    line =>
      html`<line class="ln-ext-graph-phase" x1="${line.x.toFixed(1)}" x2="${line.x.toFixed(1)}" y1="0" y2="${height}"/>`,
  );
  const names = phaseLabels(lines, width).map(label => {
    const top = leftOf(label) < toggleBelow;
    const look = areaBelow && !top ? ' ln-ext-graph-phase-name--area' : '';
    return html`<text class="ln-ext-graph-phase-name${look}" x="${label.x.toFixed(1)}" y="${top ? 11 : height - 5}" text-anchor="${label.anchor}">${label.name}</text>`;
  });
  return html`${marks}${names}`;
}

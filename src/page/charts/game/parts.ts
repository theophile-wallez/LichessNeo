import { html, type SafeHtml } from '#shared/html.ts';
import type { PlotSize, PlyScale } from './scale.ts';
import type { Phases } from './series.ts';

// The parts both charts draw over their plot: the game's phases, the move on
// the board and, under the pointer, a guide.

export interface PhaseNames {
  readonly middlegame: string;
  readonly endgame: string;
}

/** Where the plot starts, under the phases' names. */
export const PLOT_TOP = 18;

// A name's width at the phases' font (10.5px bold), near enough to keep two apart.
export const nameWidth = (name: string): number => name.length * 6.2;
const NAME_GAP = 4;

export interface PhaseLabel {
  readonly x: number;
  readonly name: string;
  readonly anchor: 'start' | 'end';
}

/**
 * Where each phase's name goes: right of its line, or left of it when the next
 * name or the plot's edge would cut it, or nowhere when neither side has room.
 */
export function phaseLabels(
  lines: readonly { x: number; name: string }[],
  plotWidth: number,
): PhaseLabel[] {
  const labels: PhaseLabel[] = [];
  // Where the last name placed ends: one moved left of its line must not cover it.
  let taken = 0;
  for (const [i, line] of lines.entries()) {
    const limit = lines[i + 1]?.x ?? plotWidth;
    const width = nameWidth(line.name);
    if (line.x + NAME_GAP + width + NAME_GAP <= limit) {
      labels.push({ x: line.x + NAME_GAP, name: line.name, anchor: 'start' });
      taken = line.x + NAME_GAP + width;
    } else if (line.x - NAME_GAP - width >= taken + NAME_GAP) {
      labels.push({ x: line.x - NAME_GAP, name: line.name, anchor: 'end' });
      taken = line.x;
    }
  }
  return labels;
}

/** A dashed line where the middlegame and the endgame start, named at the top. */
export function phasesMarkup(
  phases: Phases,
  names: PhaseNames,
  { scale, size }: { readonly scale: PlyScale; readonly size: PlotSize },
): SafeHtml[] {
  const starts: readonly (readonly [number | null, string])[] = [
    [phases.middle, names.middlegame],
    [phases.end, names.endgame],
  ];
  const lines = starts.flatMap(([ply, name]) => (ply === null ? [] : [{ x: scale.x(ply), name }]));
  const marks = lines.map(
    ({ x }) =>
      html`<line class="ln-ext-gchart__phase" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${PLOT_TOP}" y2="${size.height}"/>`,
  );
  const labels = phaseLabels(lines, size.width).map(
    ({ x, name, anchor }) =>
      html`<text class="ln-ext-gchart__phase-name" x="${x.toFixed(1)}" y="12" text-anchor="${anchor}">${name}</text>`,
  );
  return [...marks, ...labels];
}

/** The move on the board, moved by `PlyChart.follow`; the guide and the dot, by the hover. */
export const overlayMarkup = ({ height }: PlotSize): SafeHtml =>
  html`<line class="ln-ext-gchart__ply" x1="0" x2="0" y1="${PLOT_TOP}" y2="${height}"/><g class="ln-ext-rchart__hover"><line class="ln-ext-rchart__guide" x1="0" x2="0" y1="${PLOT_TOP}" y2="${height}"/><circle class="ln-ext-rchart__dot" r="4.5" cx="0" cy="0"/></g>`;

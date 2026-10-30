import { html, type SafeHtml } from '#shared/html.ts';
import { CLASS_COLORS, GRAPH_DOTS } from '#page/review/classes/classes.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { Division } from '#page/review/rating/phases.ts';
import { phaseStarts } from '#page/review/view/phases.ts';

// The advantage graph over the demo's game, as the review draws it: White's
// winning chances rising from the bottom, the key moments dotted in their
// class's color, a dashed line where each phase starts. The curve stretches
// to the box; the dots and the names, laid over it in percents, keep their
// shape.

const WIDTH = 300;
const HEIGHT = 72;
// Each graph's gradient has its own id: a url() finds the first in the page,
// and the hero's is hidden on phones, which leaves the other graphs unfilled.
let drawn = 0;

// Room over a won position, for its dot not to be cut at the top.
const HEADROOM = 7;
const heightOf = (chance: number): number => HEIGHT - (chance / 100) * (HEIGHT - HEADROOM);

const pointOf = (index: number, count: number, record: PositionRecord): [number, number] => [
  (index / (count - 1)) * WIDTH,
  heightOf(record.whiteWinChance),
];

export function graphMarkup(
  records: readonly PositionRecord[],
  moves: readonly MoveVerdict[],
  division: Division,
): SafeHtml {
  const points = records.map((record, i) => pointOf(i, records.length, record));
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const dots = moves.flatMap(move => {
    const point = points[move.ply];
    if (!point || !GRAPH_DOTS.has(move.moveClass)) return [];
    const [x, y] = [(point[0] / WIDTH) * 100, (point[1] / HEIGHT) * 100];
    return [
      html`<i class="demo-graph__dot" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--c:${CLASS_COLORS[move.moveClass]}"></i>`,
    ];
  });
  const phases = phaseStarts(division).map(({ index, name }) => {
    const left = (index / (records.length - 1)) * 100;
    // Near the right edge, the name goes before its line.
    const side = left > 80 ? ' demo-graph__phase--end' : '';
    return html`<i class="demo-graph__phase${side}" style="left:${left.toFixed(2)}%"><span>${name}</span></i>`;
  });
  drawn += 1;
  const fill = `demo-white-${drawn}`;
  return html`<svg class="demo-graph__svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="${fill}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f5fa"/><stop offset="1" stop-color="#c9ccdb"/></linearGradient></defs>
    <polygon points="0,${HEIGHT} ${line} ${WIDTH},${HEIGHT}" fill="url(#${fill})"/>
    <line x1="0" y1="${heightOf(50)}" x2="${WIDTH}" y2="${heightOf(50)}" stroke="#7d8197" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>
  </svg>${phases}${dots}`;
}

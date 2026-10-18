import { tipRow, tipTitle } from '#shared/charts/markup.ts';
import { hideTip, showTip } from '#shared/charts/tooltip.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { html } from '#shared/html.ts';
import { pointerX, setAttributes } from '#shared/svg.ts';
import type { ChartParts } from './parts.ts';
import type { SampledSeries } from './sampling.ts';
import { PADDING, type Plot } from './scales.ts';
import type { DateFormats } from './time-ticks.ts';

interface Hit {
  readonly row: SampledSeries;
  readonly value: number;
}

function nearestSample(plot: Plot, x: number): number {
  let nearest = 0;
  let distance = Infinity;
  for (const [k, time] of plot.times.entries()) {
    const gap = Math.abs(plot.x(time) - x);
    if (gap < distance) {
      nearest = k;
      distance = gap;
    }
  }
  return nearest;
}

function placeDots(svg: SVGSVGElement, hits: readonly Hit[], x: number, plot: Plot): void {
  const guide = queryOne(svg, '.ln-ext-rchart__guide', SVGElement);
  if (guide) setAttributes(guide, { x1: x, x2: x });
  for (const dot of queryAll(svg, '.ln-ext-rchart__dot', SVGElement)) {
    const hit = hits.find(({ row }) => row.index === Number(dot.dataset.lnExtSeries));
    dot.classList.toggle('ln-ext-rchart__dot--on', hit !== undefined);
    if (hit) setAttributes(dot, { cx: x, cy: plot.y(hit.value) });
  }
}

export function hideSample({ svg, tip }: ChartParts): void {
  svg.classList.toggle('ln-ext-rchart__svg--hover', false);
  hideTip(tip);
}

interface Hover {
  readonly event: MouseEvent;
  readonly plot: Plot;
  readonly parts: ChartParts;
  readonly formats: DateFormats;
}

/** Snaps to the sample nearest the pointer: a dot on every curve shown there, and their ratings. */
export function showSample({ event, plot, parts, formats }: Hover): void {
  const j = nearestSample(plot, pointerX(event, parts.svg));
  const time = plot.times[j] ?? 0;
  const hits = plot.shown.flatMap((row): Hit[] => {
    const value = row.values[j];
    return value === null || value === undefined ? [] : [{ row, value }];
  });
  if (hits.length === 0) {
    hideSample(parts);
    return;
  }
  const x = plot.x(time);
  parts.svg.classList.toggle('ln-ext-rchart__svg--hover', true);
  placeDots(parts.svg, hits, x, plot);
  // Highest rating first.
  const rows = hits
    .toSorted((one, other) => other.value - one.value)
    .map(({ row, value }) => tipRow({ color: row.color, name: row.name, value }));
  showTip(parts.tip, html`${tipTitle(formats.full.format(time))}${rows}`, {
    anchor: x,
    gap: 14,
    limit: plot.width - PADDING.right,
    top: PADDING.top,
  });
}

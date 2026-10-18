import {
  closestTo,
  createElement,
  queryAll,
  queryOne,
  setData,
  setStyleProperty,
} from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { pageLocale } from '#shared/lang.ts';
import { readStored, StorageKey, writeStored } from '#shared/storage.ts';
import { prependSvg, setAttributes, sizeSvg } from '#shared/svg.ts';
import {
  type HistorySpan,
  initialRange,
  type RangeKey,
  RangeKeySchema,
  rangeStart,
  todayUtc,
} from './dates.ts';
import { hideSample, showSample } from './hover.ts';
import { legendMarkup } from './legend.ts';
import { chartShell, gradientId, plotMarkup, ratingGrid } from './markup.ts';
import { type ChartParts, findParts } from './parts.ts';
import { seriesPaths } from './paths.ts';
import { sampleRange } from './sampling.ts';
import { HEIGHT, type Layout, PADDING, type Plot, scalePlot } from './scales.ts';
import type { Series } from './series.ts';
import { createThumbPlacer } from './thumb.ts';
import { type DateFormats, dateFormats, timeTicks } from './time-ticks.ts';

function historySpan(series: readonly Series[]): HistorySpan {
  const firsts = series.flatMap(({ points }) => points.slice(0, 1).map(([time]) => time));
  const lasts = series.flatMap(({ points }) => points.slice(-1).map(([time]) => time));
  return { first: Math.min(...firsts), end: Math.max(todayUtc(), ...lasts) };
}

// The CSS animates `d`, so a path's shape goes in its style, not its attribute.
function setPath(path: SVGElement | null, data: string): void {
  if (path) setStyleProperty(path, 'd', `path("${data}")`);
}

interface Setup {
  readonly series: readonly Series[];
  readonly parts: ChartParts;
  readonly span: HistorySpan;
  readonly range: RangeKey;
  readonly formats: DateFormats;
}

/** The chart's state: the range, the ratings hidden, and what's drawn. */
class RatingChart {
  readonly #series: readonly Series[];
  readonly #parts: ChartParts;
  readonly #span: HistorySpan;
  readonly #formats: DateFormats;
  readonly #hidden = new Set<number>();
  readonly #placeThumb: () => void;
  #range: RangeKey;
  #layout: Layout | null = null;
  #plot: Plot | null = null;

  constructor({ series, parts, span, range, formats }: Setup) {
    this.#series = series;
    this.#parts = parts;
    this.#span = span;
    this.#range = range;
    this.#formats = formats;
    this.#placeThumb = createThumbPlacer(parts.root, parts.thumb);
  }

  /** Draws it all again, for a new range or a new width; `animate` wipes the curves in. */
  draw(animate: boolean): void {
    const { root, plot: plotElement, svg } = this.#parts;
    const start = rangeStart(this.#range, this.#span);
    const layout: Layout = {
      ...sampleRange(this.#series, start, this.#span.end),
      width: Math.max(200, Math.round(plotElement.clientWidth)),
      start,
      end: this.#span.end,
    };
    this.#layout = layout;
    const plot = scalePlot(layout, this.#hidden);
    const axis = { start, end: layout.end, width: layout.width - PADDING.left - PADDING.right };
    sizeSvg(svg, layout.width, HEIGHT);
    setHtml(svg, plotMarkup(plot, timeTicks(axis, this.#formats)));
    svg.classList.toggle('ln-ext-rchart__svg--intro', animate);
    this.#update();
    this.#renderLegend();
    for (const button of queryAll(root, '[data-ln-ext-range]', HTMLElement))
      button.classList.toggle('active', button.dataset.lnExtRange === this.#range);
    this.#placeThumb();
  }

  // Showing or hiding a rating keeps the range's samples and only rescales
  // them, so the curves glide to their new place instead of being redrawn.
  #update(): void {
    if (!this.#layout) return;
    const { svg } = this.#parts;
    const plot = scalePlot(this.#layout, this.#hidden);
    this.#plot = plot;
    for (const group of queryAll(svg, '.ln-ext-rchart__series', SVGElement)) {
      const row = plot.rows.find(({ index }) => index === Number(group.dataset.lnExtSeries));
      if (!row) continue;
      group.classList.toggle('ln-ext-rchart__series--hidden', this.#hidden.has(row.index));
      const { line, area, top, low } = seriesPaths(plot, row);
      setPath(queryOne(group, '.ln-ext-rchart__line', SVGElement), line);
      setPath(queryOne(group, '.ln-ext-rchart__area', SVGElement), area);
      // Each fill fades out just under its own curve. If they all faded at the
      // plot's bottom, the higher ratings' fills would cover the lower curves.
      const gradient = queryOne(svg, `#${gradientId(row.index)}`, SVGElement);
      if (gradient) setAttributes(gradient, { y1: top, y2: Math.min(plot.bottom, low + 70) });
    }
    const axis = queryOne(svg, '.ln-ext-rchart__axis', SVGElement);
    if (!axis) return;
    for (const old of queryAll(axis, '.ln-ext-rchart__grid, .ln-ext-rchart__ylabel', Element))
      old.remove();
    prependSvg(axis, ratingGrid(plot));
  }

  #renderLegend(): void {
    if (!this.#plot) return;
    const single = this.#series.length === 1;
    setHtml(
      this.#parts.legend,
      legendMarkup({ rows: this.#plot.rows, hidden: this.#hidden, single }),
    );
  }

  click(event: MouseEvent): void {
    const range = RangeKeySchema.safeParse(
      closestTo(event.target, '[data-ln-ext-range]', HTMLElement)?.dataset.lnExtRange,
    );
    if (range.success && range.data !== this.#range) {
      this.#range = range.data;
      writeStored(StorageKey.ratingChartRange, range.data);
      setData(this.#parts.root, 'lnExtSlide', '1');
      this.leave();
      this.draw(true);
    }
    const chip = closestTo(event.target, '.ln-ext-rchart__chip', HTMLElement);
    if (chip) this.#toggleSeries(Number(chip.dataset.lnExtSeries));
  }

  #toggleSeries(index: number): void {
    const shown = this.#plot?.rows.filter(row => !this.#hidden.has(row.index)).length ?? 0;
    if (this.#hidden.has(index)) this.#hidden.delete(index);
    // Never hide the last rating shown: with none, the chart has no scale.
    else if (shown > 1) this.#hidden.add(index);
    else return;
    this.leave();
    this.#update();
    this.#renderLegend();
  }

  hover(event: MouseEvent): void {
    if (this.#plot)
      showSample({ event, plot: this.#plot, parts: this.#parts, formats: this.#formats });
  }

  leave(): void {
    hideSample(this.#parts);
  }
}

function redrawOnResize(plot: HTMLElement, draw: (animate: boolean) => void): void {
  let lastWidth = 0;
  new ResizeObserver(() => {
    const width = Math.round(plot.clientWidth);
    if (Math.abs(width - lastWidth) < 2) return;
    // Only the first draw wipes the curves in.
    const first = lastWidth === 0;
    lastWidth = width;
    draw(first);
  }).observe(plot);
}

/** Adds our chart to Lichess's rating history card. */
export function mountChart(host: HTMLElement, series: readonly Series[]): void {
  const span = historySpan(series);
  // Read before adding anything, so that Lichess's chart stays if blocked storage throws.
  const range = initialRange(readStored(StorageKey.ratingChartRange, RangeKeySchema), span);
  const formats = dateFormats(pageLocale());
  const root = createElement('div', { className: 'ln-ext-rchart' });
  setHtml(root, chartShell());
  host.append(root);
  const parts = findParts(root);
  if (!parts) {
    root.remove();
    return;
  }
  // Lichess's own chart is hidden from here on (styles/ratingchart.css).
  host.classList.toggle('ln-ext-rchart-on', true);
  const chart = new RatingChart({ series, parts, span, range, formats });
  root.addEventListener('click', event => chart.click(event));
  parts.svg.addEventListener('pointermove', event => chart.hover(event));
  parts.svg.addEventListener('pointerleave', () => chart.leave());
  redrawOnResize(parts.plot, animate => chart.draw(animate));
}

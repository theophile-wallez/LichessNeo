import { gameRatingColor } from '#shared/charts/colors.ts';
import { hideTip, showTip } from '#shared/charts/tooltip.ts';
import { closestTo, createElement, queryAll, queryOne, setStyleProperty } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { pageLocale } from '#shared/lang.ts';
import { clamp } from '#shared/math.ts';
import { pointerX, setAttributes, sizeSvg } from '#shared/svg.ts';
import { type NumberFormats, numberFormats, seriesNames, yourRatingLabel } from './formats.ts';
import { chartShell, marksMarkup, plotMarkup, tipMarkup } from './markup.ts';
import { binOf, countPlayers, type Marker, markersOf, onChart, type Players } from './players.ts';
import { BIN_SIZE, type Geometry, layOut, MARKER_ROW, MIN_RATING, PADDING } from './scales.ts';
import type { DistributionData } from './schema.ts';

interface Parts {
  readonly root: HTMLElement;
  readonly plot: HTMLElement;
  readonly svg: SVGSVGElement;
  readonly marks: HTMLElement;
  readonly tip: HTMLElement;
}

function findParts(root: HTMLElement): Parts | null {
  const plot = queryOne(root, '.lr-ext-dist__plot', HTMLElement);
  const svg = queryOne(root, 'svg', SVGSVGElement);
  const marks = queryOne(root, '.lr-ext-dist__marks', HTMLElement);
  const tip = queryOne(root, '.lr-ext-dist__tip', HTMLElement);
  return plot && svg && marks && tip ? { root, plot, svg, marks, tip } : null;
}

const perfKey = (): string | undefined => /\/distribution\/(\w+)/.exec(location.pathname)?.[1];

interface Setup {
  readonly parts: Parts;
  readonly players: Players;
  readonly markers: readonly Marker[];
  readonly color: string;
  readonly formats: NumberFormats;
}

class DistributionChart {
  readonly #setup: Setup;
  // The columns up to the first marker's rating (yours, when you have one) stay lit.
  readonly #lit: number;
  #geometry: Geometry | null = null;

  constructor(setup: Setup) {
    this.#setup = setup;
    const [lead] = setup.markers;
    this.#lit = lead ? binOf(lead.rating, setup.players) : setup.players.counts.length - 1;
  }

  draw(animate: boolean): void {
    const { parts, players, markers, color, formats } = this.#setup;
    const geometry = layOut({
      width: Math.max(240, Math.round(parts.plot.clientWidth)),
      height: Math.max(200, Math.round(parts.plot.clientHeight)),
      counts: players.counts,
      maxRating: players.maxRating,
      markers: markers.length,
    });
    this.#geometry = geometry;
    sizeSvg(parts.svg, geometry.width, geometry.height);
    setHtml(parts.svg, plotMarkup({ geometry, players, markers, lit: this.#lit, color, formats }));
    setHtml(parts.marks, marksMarkup(markers, formats));
    this.#placeMarks(geometry);
    parts.svg.classList.toggle('lr-ext-dist__svg--intro', animate);
    parts.root.classList.toggle('lr-ext-dist--intro', animate);
  }

  // A pill's width depends on its text, so it can only be centered once filled.
  #placeMarks(geometry: Geometry): void {
    const { parts, players, markers } = this.#setup;
    for (const [k, mark] of [...parts.marks.children].entries()) {
      const marker = markers[k];
      if (!(mark instanceof HTMLElement) || !marker) continue;
      const center = geometry.x(onChart(marker.rating, players));
      const { offsetWidth } = mark;
      const left = clamp(
        center - offsetWidth / 2,
        PADDING.left,
        geometry.width - PADDING.right - offsetWidth,
      );
      setStyleProperty(mark, 'transform', `translate(${Math.round(left)}px, ${k * MARKER_ROW}px)`);
    }
  }

  // Dims the columns after the hovered one, so the lit columns are the players
  // the cumulative curve counts at that point.
  hover(event: MouseEvent): void {
    const geometry = this.#geometry;
    if (!geometry) return;
    const { parts, players, color, formats } = this.#setup;
    const { binWidth } = geometry;
    const last = players.counts.length - 1;
    const bin = clamp(Math.floor((pointerX(event, parts.svg) - PADDING.left) / binWidth), 0, last);
    parts.svg.classList.toggle('lr-ext-dist__svg--hover', true);
    for (const bar of this.#bars()) {
      const index = Number(bar.dataset.lrExtBar);
      bar.classList.toggle('lr-ext-dist__bar--on', index === bin);
      bar.classList.toggle('lr-ext-dist__bar--dim', index > bin);
    }
    const dot = queryOne(parts.svg, '.lr-ext-dist__dot', SVGElement);
    if (dot) {
      const x = geometry.x(MIN_RATING + (bin + 1) * BIN_SIZE);
      setAttributes(dot, { cx: x, cy: geometry.yShare(players.shares[bin] ?? 0) });
    }
    const names = seriesNames();
    showTip(parts.tip, tipMarkup({ bin, players, color, names, formats }), {
      anchor: PADDING.left + (bin + 0.5) * binWidth,
      gap: 16,
      limit: geometry.width - PADDING.right,
      top: geometry.top + 24,
    });
  }

  leave(): void {
    const { parts } = this.#setup;
    parts.svg.classList.toggle('lr-ext-dist__svg--hover', false);
    hideTip(parts.tip);
    for (const bar of this.#bars()) {
      bar.classList.toggle('lr-ext-dist__bar--on', false);
      bar.classList.toggle('lr-ext-dist__bar--dim', Number(bar.dataset.lrExtBar) > this.#lit);
    }
  }

  #bars(): SVGElement[] {
    return queryAll(this.#setup.parts.svg, '.lr-ext-dist__bar', SVGElement);
  }
}

function redrawOnResize(plot: HTMLElement, draw: (animate: boolean) => void): void {
  let lastSize = '';
  new ResizeObserver(() => {
    const size = `${Math.round(plot.clientWidth)}x${Math.round(plot.clientHeight)}`;
    if (size === lastSize) return;
    // Only the first draw animates the columns in.
    const first = lastSize === '';
    lastSize = size;
    draw(first);
  }).observe(plot);
}

/** Adds our chart to Lichess's distribution box. */
export function mountDistribution(host: HTMLElement, data: DistributionData): void {
  const players = countPlayers(data.freq);
  const color = gameRatingColor(perfKey());
  const markers = markersOf(data, yourRatingLabel());
  const formats = numberFormats(pageLocale());
  const root = createElement('div', { className: 'lr-ext-dist' });
  setStyleProperty(root, '--lr-ext-series-color', color);
  const total = formats.count.format(players.total);
  setHtml(root, chartShell({ color, names: seriesNames(), total }));
  host.append(root);
  // Lichess's canvas is hidden from here on (styles/distribution.css).
  host.classList.toggle('lr-ext-dist-on', true);
  const page = closestTo(host, '.rating-stats', HTMLElement);
  if (page) setStyleProperty(page, '--lr-ext-dist-c', color);
  const parts = findParts(root);
  if (!parts) return;
  const chart = new DistributionChart({ parts, players, markers, color, formats });
  parts.svg.addEventListener('pointermove', event => chart.hover(event));
  parts.svg.addEventListener('pointerleave', () => chart.leave());
  redrawOnResize(parts.plot, animate => chart.draw(animate));
}

import { hideTip, type Placement, showTip } from '#shared/charts/tooltip.ts';
import { createElement, queryAll, queryOne, setStyleProperty } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { clamp } from '#shared/math.ts';
import { pointerX, pointerY, setAttributes, sizeSvg } from '#shared/svg.ts';
import { barsMarkup, labelsMarkup } from './bars.ts';
import { curveMarkup } from './curve.ts';
import type { Formats } from './formats.ts';
import { legendMarkup, SHELL, tipMarkup } from './markup.ts';
import type { ChartModel } from './model.ts';
import {
  barsLayout,
  type BarsGeometry,
  CURVE_PADDING,
  curveLayout,
  type CurveGeometry,
  ROW_HEIGHT,
} from './scales.ts';

// Our chart in Lichess's `.chart` box. The frame is built once; every answer
// fills its legend, its category names and its plot, and a draw never reads
// the page but for the plot's size.

export const ROOT = 'ln-ext-ins';
/** The box's class once our chart is in it, which hides Lichess's canvas. */
export const ON = 'ln-ext-ins-on';
const CURVE_HEIGHT = 320;
const TIP_GAP = 16;

interface Parts {
  readonly root: HTMLElement;
  readonly legend: HTMLElement;
  readonly plot: HTMLElement;
  readonly labels: HTMLElement;
  readonly svg: SVGSVGElement;
  readonly tip: HTMLElement;
}

function findParts(root: HTMLElement): Parts | null {
  const legend = queryOne(root, `.${ROOT}__legend`, HTMLElement);
  const plot = queryOne(root, `.${ROOT}__plot`, HTMLElement);
  const labels = queryOne(root, `.${ROOT}__labels`, HTMLElement);
  const svg = queryOne(root, 'svg', SVGSVGElement);
  const tip = queryOne(root, `.${ROOT}__tip`, HTMLElement);
  return legend && plot && labels && svg && tip ? { root, legend, plot, labels, svg, tip } : null;
}

export class InsightsChart {
  readonly #parts: Parts;
  readonly #formats: Formats;
  #model: ChartModel | null = null;
  #bars: BarsGeometry | null = null;
  #curve: CurveGeometry | null = null;

  get root(): HTMLElement {
    return this.#parts.root;
  }

  constructor(parts: Parts, formats: Formats) {
    this.#parts = parts;
    this.#formats = formats;
    parts.svg.addEventListener('pointermove', event => this.#hover(event));
    parts.svg.addEventListener('pointerleave', () => this.#leave());
    this.#redrawOnResize();
  }

  /** Shows an answer, the bars rising or the curve drawing itself in. */
  show(model: ChartModel): void {
    const { root, legend, labels } = this.#parts;
    this.#model = model;
    root.classList.toggle(`${ROOT}--curve`, model.mode === 'curve');
    setStyleProperty(root, '--ln-ext-ins-row', `${ROW_HEIGHT}px`);
    setHtml(legend, legendMarkup(model, this.#formats));
    setHtml(labels, model.mode === 'bars' ? labelsMarkup(model) : html``);
    this.#draw(true);
  }

  #draw(animate: boolean): void {
    const model = this.#model;
    if (!model) return;
    const { svg } = this.#parts;
    const width = Math.max(220, Math.round(this.#plotWidth()));
    if (model.mode === 'bars') this.#drawBars(model, width);
    else this.#drawCurve(model, width);
    svg.classList.toggle(`${ROOT}__svg--intro`, animate);
  }

  #drawBars(model: ChartModel, width: number): void {
    const geometry = barsLayout(width, model.rows.length, model.scale);
    this.#bars = geometry;
    this.#curve = null;
    sizeSvg(this.#parts.svg, geometry.width, geometry.height);
    setHtml(this.#parts.svg, barsMarkup({ model, geometry, formats: this.#formats }));
  }

  #drawCurve(model: ChartModel, width: number): void {
    const height = Math.max(200, Math.round(this.#parts.plot.clientHeight) || CURVE_HEIGHT);
    const geometry = curveLayout(width, height, model.rows.length, model.scale);
    this.#curve = geometry;
    this.#bars = null;
    sizeSvg(this.#parts.svg, width, height);
    setHtml(this.#parts.svg, curveMarkup({ model, geometry, formats: this.#formats }));
  }

  // The category names take the grid's first column; the plot gets the rest.
  #plotWidth(): number {
    const { plot, labels } = this.#parts;
    return plot.clientWidth - labels.offsetWidth;
  }

  #hover(event: MouseEvent): void {
    const model = this.#model;
    if (!model) return;
    const index = this.#indexAt(event, model);
    const row = model.rows[index];
    if (!row) return;
    for (const group of queryAll(this.#parts.svg, `.${ROOT}__row`, SVGElement))
      group.classList.toggle(`${ROOT}__row--on`, Number(group.dataset.lnExtRow) === index);
    this.#followCurve(index, model);
    const placement = this.#tipPlacement(index);
    showTip(this.#parts.tip, tipMarkup(row, model, this.#formats), placement);
  }

  #indexAt(event: MouseEvent, model: ChartModel): number {
    const last = model.rows.length - 1;
    const { svg } = this.#parts;
    if (this.#bars) return clamp(Math.floor(pointerY(event, svg) / ROW_HEIGHT), 0, last);
    const curve = this.#curve;
    if (!curve) return 0;
    const share = (pointerX(event, svg) - CURVE_PADDING.left) / Math.max(1, curve.plotWidth);
    return clamp(Math.round(share * last), 0, last);
  }

  /** A curve's cursor and its series' dots follow the pointer; bars need none. */
  #followCurve(index: number, model: ChartModel): void {
    const curve = this.#curve;
    if (!curve) return;
    const { svg } = this.#parts;
    const x = curve.x(index);
    const cursor = queryOne(svg, `.${ROOT}__cursor`, SVGElement);
    if (cursor) setAttributes(cursor, { x1: x, x2: x });
    for (const dot of queryAll(svg, `.${ROOT}__dot`, SVGElement)) {
      const serie = Number(dot.dataset.lnExtSerie);
      setAttributes(dot, { cx: x, cy: curve.y(model.rows[index]?.values[serie] ?? 0) });
    }
    svg.classList.toggle(`${ROOT}__svg--hover`, true);
  }

  #tipPlacement(index: number): Placement {
    const bars = this.#bars;
    if (bars)
      return {
        // Beside the middle of the track, so it never covers the bar's end.
        anchor: bars.zero + (bars.right - bars.zero) / 2,
        gap: TIP_GAP,
        limit: bars.width,
        top: index * ROW_HEIGHT + ROW_HEIGHT,
      };
    const curve = this.#curve;
    if (!curve) return { anchor: 0, gap: TIP_GAP, limit: 0, top: 0 };
    return { anchor: curve.x(index), gap: TIP_GAP, limit: curve.width, top: curve.top + 8 };
  }

  #leave(): void {
    const { svg, tip } = this.#parts;
    hideTip(tip);
    svg.classList.toggle(`${ROOT}__svg--hover`, false);
    for (const group of queryAll(svg, `.${ROOT}__row`, SVGElement))
      group.classList.toggle(`${ROOT}__row--on`, false);
  }

  #redrawOnResize(): void {
    const { plot } = this.#parts;
    let last = '';
    new ResizeObserver(() => {
      const size = `${Math.round(plot.clientWidth)}x${Math.round(plot.clientHeight)}`;
      if (size === last) return;
      last = size;
      this.#draw(false);
    }).observe(plot);
  }
}

/**
 * Our chart in Lichess's chart box: the one already there, or a new frame.
 * The page patches that box as it answers, which may take ours with it.
 */
export function mountChart(host: HTMLElement, formats: Formats): InsightsChart | null {
  const root = createElement('div', { className: ROOT });
  setHtml(root, SHELL);
  host.append(root);
  // Lichess's canvas is hidden from here on (styles/insights/chart.css).
  host.classList.toggle(ON, true);
  const parts = findParts(root);
  return parts ? new InsightsChart(parts, formats) : null;
}

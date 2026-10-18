import { hideTip, showTip } from '#shared/charts/tooltip.ts';
import { createElement, queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { pointerX, setAttributes, sizeSvg } from '#shared/svg.ts';
import { PLOT_TOP } from './parts.ts';
import { type PlotSize, plyNear, plyScale, type PlyScale } from './scale.ts';

// A chart of the game, ply by ply, in Lichess's chart container: the move on
// the board marked, a tooltip under the pointer, a click to go to a move.

export interface PlyChartSpec {
  /** The plies the pointer can pick, in order. */
  readonly plies: readonly number[];
  readonly lastPly: number;
  readonly legend: SafeHtml | null;
  readonly draw: (size: PlotSize) => SafeHtml;
  readonly tip: (ply: number) => SafeHtml | null;
  /** The hover dot's y at a ply; null for none. */
  readonly dotY: (ply: number, size: PlotSize) => number | null;
}

const HEIGHT = 170;
const ON = 'ln-ext-rchart__dot--on';

const shell = html`<div class="ln-ext-gchart__legend"></div><div class="ln-ext-rchart__plot"><svg class="ln-ext-rchart__svg"></svg><div class="ln-ext-rchart__tip"></div></div>`;

export class PlyChart {
  readonly root = createElement('div', { className: 'ln-ext-gchart' });
  readonly #onPick: (ply: number) => void;
  #spec: PlyChartSpec | null = null;
  #size: PlotSize = { width: 0, height: HEIGHT };
  #scale: PlyScale = plyScale(1, 0);
  #followed: number | null = null;
  #drawn = false;

  constructor(container: HTMLElement, onPick: (ply: number) => void) {
    this.#onPick = onPick;
    setHtml(this.root, shell);
    container.prepend(this.root);
    // Lichess's canvas is hidden from here on (styles/analysis/game-charts.css).
    container.classList.toggle('ln-ext-gchart-on', true);
    const svg = this.#svg();
    svg?.addEventListener('pointermove', event => this.#hover(event));
    svg?.addEventListener('pointerleave', () => this.#leave());
    svg?.addEventListener('click', event => this.#pick(event));
    const plot = queryOne(this.root, '.ln-ext-rchart__plot', HTMLElement);
    if (plot) new ResizeObserver(() => this.#redraw()).observe(plot);
  }

  show(spec: PlyChartSpec): void {
    this.#spec = spec;
    const legend = queryOne(this.root, '.ln-ext-gchart__legend', HTMLElement);
    if (legend) setHtml(legend, spec.legend ?? html``);
    this.#size = { width: 0, height: HEIGHT };
    this.#redraw();
  }

  /** Marks the move on the board, none for the start or off the game. */
  follow(ply: number | null): void {
    if (ply === this.#followed) return;
    this.#followed = ply;
    this.#mark();
  }

  #mark(): void {
    const ply = this.#followed;
    const marker = queryOne(this.root, '.ln-ext-gchart__ply', Element);
    if (!marker) return;
    marker.classList.toggle('ln-ext-gchart__ply--on', ply !== null && ply > 0);
    if (ply !== null) setAttributes(marker, { x1: this.#scale.x(ply), x2: this.#scale.x(ply) });
  }

  #svg(): SVGSVGElement | null {
    return queryOne(this.root, 'svg', SVGSVGElement);
  }

  // Lichess shows the panel only once its tab is picked: drawn hidden, the
  // chart would have no width. Only the first draw comes in animated.
  #redraw(): void {
    const svg = this.#svg();
    const plot = queryOne(this.root, '.ln-ext-rchart__plot', HTMLElement);
    const spec = this.#spec;
    const width = Math.round(plot?.clientWidth ?? 0);
    if (!svg || !spec || width === 0 || width === this.#size.width) return;
    this.#size = { width, height: HEIGHT };
    this.#scale = plyScale(spec.lastPly, width);
    sizeSvg(svg, width, HEIGHT);
    setHtml(svg, spec.draw(this.#size));
    svg.classList.toggle('ln-ext-rchart__svg--intro', !this.#drawn);
    this.#drawn = true;
    this.#mark();
  }

  #plyAt(event: MouseEvent): number | null {
    const svg = this.#svg();
    return svg && this.#spec ? plyNear(this.#spec.plies, this.#scale, pointerX(event, svg)) : null;
  }

  #hover(event: MouseEvent): void {
    const svg = this.#svg();
    const ply = this.#plyAt(event);
    const tip = queryOne(this.root, '.ln-ext-rchart__tip', HTMLElement);
    const markup = ply === null ? null : this.#spec?.tip(ply);
    if (!svg || !tip || ply === null || !markup) return;
    const x = this.#scale.x(ply);
    svg.classList.toggle('ln-ext-rchart__svg--hover', true);
    const guide = queryOne(svg, '.ln-ext-rchart__guide', Element);
    if (guide) setAttributes(guide, { x1: x, x2: x });
    const dot = queryOne(svg, '.ln-ext-rchart__dot', Element);
    const dotY = this.#spec?.dotY(ply, this.#size) ?? null;
    dot?.classList.toggle(ON, dotY !== null);
    if (dot && dotY !== null) setAttributes(dot, { cx: x, cy: dotY });
    showTip(tip, markup, { anchor: x, gap: 14, limit: this.#size.width, top: PLOT_TOP + 4 });
  }

  #leave(): void {
    this.#svg()?.classList.toggle('ln-ext-rchart__svg--hover', false);
    const tip = queryOne(this.root, '.ln-ext-rchart__tip', HTMLElement);
    if (tip) hideTip(tip);
  }

  #pick(event: MouseEvent): void {
    const ply = this.#plyAt(event);
    if (ply !== null) this.#onPick(ply);
  }
}

import { animate } from 'motion';
import { monotoneCurve } from '#shared/charts/curve.ts';
import type { Point } from '#shared/geometry.ts';
import { clamp } from '#shared/math.ts';
import { createSvgElement, setAttributes } from '#shared/svg.ts';
import { SPRING_TRAVEL } from '#shared/ui-motion.ts';
import { buildDefaultMark, type DefaultMark, drawDefaultMark } from './curve-default.ts';
import { CURVE_DEPTH, DEFAULT_REVIEW_ENGINE, MIN_DEPTH, TIERS, type TierId } from './options.ts';

// The time a game takes at each depth, as a curve under the depth's slider:
// the engine picked in full, the other dashed. A change of engine or cores
// morphs it, a depth picked sends its dot along it; dragged, the dot follows.
// The page's version names the levels over it, each with its time; the
// popover's marks the default depth.

/** Log seconds by depth, from MIN_DEPTH. */
export interface CurveValues {
  readonly main: readonly number[];
  readonly other: readonly number[];
}

export interface CurveState extends CurveValues {
  readonly depth: number;
  readonly tier: TierId;
  /** Each level's name and time, for the page's version. */
  readonly stops: readonly { readonly name: string; readonly time: string }[];
}

// The slider's thumb travels 9px in from each edge: the depths line up with it.
const INSET = 9;
const LONGEST = Math.log(7200);
const GRID = [10, 60, 600, 3600] as const;
let curves = 0;

interface Parts {
  readonly area: SVGPathElement;
  readonly other: SVGPathElement;
  readonly line: SVGPathElement;
  readonly drop: SVGLineElement;
  readonly dot: SVGCircleElement;
  readonly grid: readonly { readonly line: SVGLineElement; readonly label: SVGTextElement }[];
  readonly stops: readonly SVGGElement[];
  readonly byDefault: DefaultMark | null;
}

export interface CurveOptions {
  /** The settings page's version, taller, with the levels named. */
  readonly big: boolean;
  readonly locale: string;
  /** The default depth's name, over its mark. */
  readonly defaultName: string;
}

const UNITS = [
  [3600, 'hour'],
  [60, 'minute'],
  [1, 'second'],
] as const;

function gridLabel(seconds: number, locale: string): string {
  const [size, unit] = UNITS.find(([size]) => seconds >= size) ?? [1, 'second'];
  const format = new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow' });
  return format.format(seconds / size);
}

/** Each value `share` of the way from `from` to `to`. */
const between = (from: readonly number[], to: readonly number[], share: number): number[] =>
  from.map((value, i) => value + ((to[i] ?? value) - value) * share);

export class EngineCurve {
  readonly #svg: SVGSVGElement;
  readonly #big: boolean;
  readonly #height: number;
  readonly #top: number;
  readonly #parts: Parts;
  #shown: CurveValues | null = null;
  #depth = 0;
  #target = 0;
  #state: CurveState | null = null;
  #key = '';
  #morph: { stop: () => void } | null = null;
  #ride: { stop: () => void } | null = null;

  constructor(svg: SVGSVGElement, { big, locale, defaultName }: CurveOptions) {
    this.#svg = svg;
    this.#big = big;
    this.#height = big ? 210 : 92;
    this.#top = big ? 44 : 4;
    this.#parts = this.#build(locale, defaultName);
    // Drawn at its own width: again once it shows, and as its panel resizes.
    new ResizeObserver(() => this.#draw()).observe(svg);
  }

  #build(locale: string, defaultName: string): Parts {
    const svg = this.#svg;
    const grid = GRID.filter(seconds => this.#big || seconds < 3600).map(seconds => {
      const line = createSvgElement('line', { class: 'ln-ext-engine-curve__grid' });
      const label = createSvgElement('text', { class: 'ln-ext-engine-curve__label', x: 0 });
      label.textContent = gridLabel(seconds, locale);
      label.dataset.lnExtSeconds = String(seconds);
      svg.append(line, label);
      return { line, label };
    });
    // The area fades out downwards, in the accent the CSS gives its stops.
    const id = `ln-ext-engine-fill-${++curves}`;
    const fade = createSvgElement('linearGradient', { id, x1: 0, x2: 0, y1: 0, y2: 1 });
    fade.append(
      createSvgElement('stop', { class: 'ln-ext-engine-curve__fade', offset: 0 }),
      createSvgElement('stop', {
        class: 'ln-ext-engine-curve__fade',
        offset: 1,
        'stop-opacity': 0,
      }),
    );
    const defs = createSvgElement('defs', {});
    defs.append(fade);
    svg.append(defs);
    const byDefault = this.#big ? null : buildDefaultMark(svg, defaultName);
    const area = createSvgElement('path', {
      class: 'ln-ext-engine-curve__area',
      fill: `url(#${id})`,
    });
    const other = createSvgElement('path', { class: 'ln-ext-engine-curve__other' });
    const line = createSvgElement('path', { class: 'ln-ext-engine-curve__line' });
    svg.append(area, other, line);
    const stops = this.#big ? TIERS.map(tier => this.#buildStop(tier.depth, tier.hue)) : [];
    const drop = createSvgElement('line', { class: 'ln-ext-engine-curve__drop' });
    const dot = createSvgElement('circle', {
      class: 'ln-ext-engine-curve__dot',
      r: this.#big ? 7 : 5.5,
    });
    svg.append(drop, dot);
    return { area, other, line, drop, dot, grid, stops, byDefault };
  }

  #buildStop(depth: number, hue: string): SVGGElement {
    const group = createSvgElement('g', { class: 'ln-ext-engine-curve__stop' });
    group.dataset.lnExtDepth = String(depth);
    group.dataset.lnExtAct = `depth:${depth}`;
    group.dataset.lnExtHue = hue;
    group.append(
      createSvgElement('rect', {
        class: 'ln-ext-engine-curve__hit',
        y: 0,
        width: 88,
        height: this.#height,
      }),
      createSvgElement('line', { class: 'ln-ext-engine-curve__guide', y1: 34 }),
      createSvgElement('text', {
        class: 'ln-ext-engine-curve__name',
        y: 13,
        'text-anchor': 'middle',
      }),
      createSvgElement('text', {
        class: 'ln-ext-engine-curve__time',
        y: 28,
        'text-anchor': 'middle',
      }),
      createSvgElement('circle', { class: 'ln-ext-engine-curve__mark', r: 4 }),
    );
    this.#svg.append(group);
    return group;
  }

  /** Shows `state`: morphing to its values, the dot travelling unless `instant`. */
  show(state: CurveState, instant: boolean): void {
    this.#state = state;
    const key = JSON.stringify([state.main, state.other]);
    if (!this.#shown || instant) {
      this.#morph?.stop();
      this.#shown = state;
    } else if (key !== this.#key) this.#morphTo(this.#shown, state);
    this.#key = key;
    if (instant || this.#target === 0) {
      this.#ride?.stop();
      this.#depth = state.depth;
    } else if (state.depth !== this.#target) {
      this.#ride?.stop();
      this.#ride = animate(this.#depth, state.depth, {
        ...SPRING_TRAVEL,
        onUpdate: depth => {
          this.#depth = depth;
          this.#draw();
        },
      });
    }
    this.#target = state.depth;
    this.#draw();
  }

  #morphTo(from: CurveValues, to: CurveValues): void {
    this.#morph?.stop();
    this.#morph = animate(0, 1, {
      ...SPRING_TRAVEL,
      onUpdate: share => {
        this.#shown = {
          main: between(from.main, to.main, share),
          other: between(from.other, to.other, share),
        };
        this.#draw();
      },
    });
  }

  #x(depth: number, width: number): number {
    const along = (clamp(depth, MIN_DEPTH, CURVE_DEPTH) - MIN_DEPTH) / (CURVE_DEPTH - MIN_DEPTH);
    return INSET + along * (width - 2 * INSET);
  }

  #y(log: number): number {
    return this.#height - 4 - (clamp(log, 0, LONGEST) / LONGEST) * (this.#height - 10 - this.#top);
  }

  #at(values: readonly number[], depth: number): number {
    const i = clamp(Math.floor(depth - MIN_DEPTH), 0, values.length - 2);
    const from = values[i] ?? 0;
    return from + ((values[i + 1] ?? from) - from) * (depth - MIN_DEPTH - i);
  }

  #path(values: readonly number[], width: number): string {
    const points = values.map((value, i): Point => [this.#x(MIN_DEPTH + i, width), this.#y(value)]);
    return monotoneCurve(points);
  }

  #draw(): void {
    const shown = this.#shown;
    const state = this.#state;
    if (!shown || !state) return;
    // Drawn at its own width, so that its depths line up with the slider under it.
    const width = this.#svg.clientWidth || 330;
    this.#svg.setAttribute('viewBox', `0 0 ${width} ${this.#height}`);
    const { area, other, line, drop, dot, grid, byDefault } = this.#parts;
    const path = this.#path(shown.main, width);
    line.setAttribute('d', path);
    other.setAttribute('d', this.#path(shown.other, width));
    const left = this.#x(MIN_DEPTH, width);
    area.setAttribute('d', `${path}L${width - INSET},${this.#height}L${left},${this.#height}Z`);
    for (const mark of grid) {
      const y = this.#y(Math.log(Number(mark.label.dataset.lnExtSeconds)));
      setAttributes(mark.line, { x1: 40, x2: width, y1: y, y2: y });
      mark.label.setAttribute('y', String(y + 3.5));
    }
    if (byDefault)
      drawDefaultMark(byDefault, this.#x(DEFAULT_REVIEW_ENGINE.depth, width), this.#height);
    // Past the curve's end, the dot stays there.
    const depth = clamp(this.#depth, MIN_DEPTH, CURVE_DEPTH);
    const x = this.#x(depth, width);
    const y = this.#y(this.#at(shown.main, depth));
    setAttributes(dot, { cx: x, cy: y });
    setAttributes(drop, { x1: x, x2: x, y1: y, y2: this.#height });
    this.#drawStops(shown.main, width, state);
  }

  #drawStops(main: readonly number[], width: number, state: CurveState): void {
    for (const [i, group] of this.#parts.stops.entries()) {
      const depth = Number(group.dataset.lnExtDepth);
      const x = this.#x(depth, width);
      const y = this.#y(this.#at(main, depth));
      group.classList.toggle('ln-ext-on', state.depth === depth);
      const [hit, guide, name, time, mark] = group.children;
      if (hit) setAttributes(hit, { x: x - 44 });
      if (guide) setAttributes(guide, { x1: x, x2: x, y2: y - 6 });
      for (const label of [name, time]) label?.setAttribute('x', String(x));
      if (name) name.textContent = state.stops[i]?.name ?? '';
      if (time) time.textContent = state.stops[i]?.time ?? '';
      if (mark) setAttributes(mark, { cx: x, cy: y });
    }
  }
}

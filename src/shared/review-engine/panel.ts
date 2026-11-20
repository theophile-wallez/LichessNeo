import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { clamp } from '#shared/math.ts';
import { setSliderFill } from '#shared/slider-fill.ts';
import { reveal, type RevealKind, swapText } from '#shared/ui-motion.ts';
import { EngineCurve } from './curve.ts';
import { coresOf, deviceCores, suggestedCores } from './device.ts';
import {
  DEFAULT_REVIEW_ENGINE,
  type EngineKind,
  isDefault,
  MAX_DEPTH,
  MAX_THREADS,
  MIN_DEPTH,
  type ReviewEngine,
} from './options.ts';
import { popoverLayout, pageLayout } from './panel-layouts.ts';
import { type PanelStatus, panelView, type PanelView } from './panel-view.ts';
import { drawGrid, type PositionState } from './progress-grid.ts';
import type { EngineWords } from './words.ts';

// The Debrief's engine settings, as a panel: the review's popover and the
// settings' page build the same one. It shows the settings it's given and
// hands each change to its owner, which keeps it and gives it back.

export interface PanelOptions {
  readonly page: boolean;
  readonly words: EngineWords;
  /** The game's positions, which the times are given for. */
  readonly positions: number;
  readonly onChange: (options: ReviewEngine) => void;
  readonly onReanalyse?: () => void;
}

const KINDS: readonly EngineKind[] = ['light', 'full'];

export class EnginePanel {
  readonly element: HTMLElement;
  readonly #options: PanelOptions;
  readonly #curve: EngineCurve | null;
  #settings: ReviewEngine = DEFAULT_REVIEW_ENGINE;
  #status: PanelStatus | null = null;
  #toast: string | null = null;
  #advanced = false;
  #drawn = false;
  #depth = 0;

  constructor(options: PanelOptions) {
    this.#options = options;
    this.element = createElement('div');
    setHtml(this.element, options.page ? pageLayout(options.words) : popoverLayout(options.words));
    const svg = queryOne(this.element, 'svg.ln-ext-engine-curve', SVGSVGElement);
    this.#curve = svg
      ? new EngineCurve(svg, {
          big: options.page,
          locale: options.words.locale,
          defaultName: options.words.byDefault,
        })
      : null;
    this.element.addEventListener('click', event => this.#click(event));
    this.element.addEventListener('input', event => this.#input(event));
  }

  /** Shows `settings`, and for the popover where its game stands. */
  show(settings: ReviewEngine, status: PanelStatus | null = this.#status, instant = false): void {
    this.#settings = settings;
    this.#status = status;
    const view = panelView({
      options: settings,
      words: this.#options.words,
      positions: this.#options.positions,
      status,
      toast: this.#toast,
      advanced: this.#advanced,
    });
    // The first drawing, and one of a panel out of sight, shows at once.
    const still = instant || !this.#drawn || this.element.offsetParent === null;
    this.#drawTexts(view, still);
    this.#drawControls(view);
    for (const part of queryAll(this.element, '[data-ln-ext-when]', HTMLElement)) {
      const kind: RevealKind = part.dataset.lnExtReveal === 'fade' ? 'fade' : 'height';
      reveal(part, view.when[part.dataset.lnExtWhen ?? ''] ?? false, kind, still);
    }
    this.#curve?.show(view.curve, still);
    this.#depth = view.depth;
    this.#drawn = true;
  }

  /** The run going on, position by position. */
  fill(states: readonly PositionState[]): void {
    const grid = queryOne(this.element, '[data-ln-ext-grid]', HTMLElement);
    if (grid) drawGrid(grid, states);
  }

  #drawTexts(view: PanelView, still: boolean): void {
    const direction = view.depth >= this.#depth ? 1 : -1;
    for (const element of queryAll(this.element, '[data-ln-ext-bind]', HTMLElement)) {
      const name = element.dataset.lnExtBind ?? '';
      // Only the depth rolls, and its level with it; the other figures change in place.
      const swap = element.dataset.lnExtSwap;
      swapText(element, view.text[name] ?? '', {
        instant: still || swap === undefined,
        direction,
        distance: swap === 'roll' ? Math.round(element.offsetHeight * 0.6) : 3,
      });
    }
    for (const pill of queryAll(this.element, '[data-ln-ext-bind="tier"]', HTMLElement))
      setData(pill, 'lnExtHue', view.hue);
  }

  #drawControls(view: PanelView): void {
    this.#drawStops(view.depth);
    this.#drawPicks(view);
    this.#drawInputs(view.depth);
  }

  #drawStops(depth: number): void {
    const root = this.element;
    for (const button of queryAll(root, '[data-ln-ext-stop]', HTMLElement))
      button.classList.toggle('ln-ext-on', Number(button.dataset.lnExtStop) === depth);
    const stop = queryOne(root, '[data-ln-ext-stop].ln-ext-on', HTMLElement);
    for (const thumb of queryAll(root, '.ln-ext-engine__stops-thumb', HTMLElement)) {
      setData(thumb, 'lnExtOn', stop ? '' : null);
      if (stop) thumb.style.setProperty('--ln-ext-at', stop.style.getPropertyValue('--ln-ext-at'));
      setData(thumb, 'lnExtHue', stop?.dataset.lnExtHue ?? null);
    }
  }

  /** The engine, the limit and the cores picked, and the fields off their default. */
  #drawPicks(view: PanelView): void {
    const root = this.element;
    const { engine, cap } = this.#settings;
    for (const button of queryAll(root, '[data-ln-ext-kind]', HTMLElement))
      button.classList.toggle('ln-ext-on', button.dataset.lnExtKind === engine);
    for (const toggle of queryAll(root, '.ln-ext-engine__switch', HTMLElement))
      toggle.style.setProperty('--ln-ext-index', String(KINDS.indexOf(engine)));
    for (const button of queryAll(root, '[data-ln-ext-cap]', HTMLElement))
      button.classList.toggle('ln-ext-on', Number(button.dataset.lnExtCap) === cap);
    const used = coresOf(this.#settings);
    for (const chip of queryAll(root, '[data-ln-ext-core]', HTMLElement)) {
      const index = Number(chip.dataset.lnExtCore);
      chip.classList.toggle('ln-ext-on', index <= used);
      chip.classList.toggle('ln-ext-suggested', index === suggestedCores(engine));
    }
    for (const mark of queryAll(root, '[data-ln-ext-mod]', HTMLElement))
      mark.classList.toggle('ln-ext-on', view.mods[mark.dataset.lnExtMod ?? ''] ?? false);
  }

  #drawInputs(depth: number): void {
    const root = this.element;
    for (const disclosure of queryAll(root, '[data-ln-ext-act="advanced"]', HTMLElement))
      disclosure.setAttribute('aria-expanded', String(this.#advanced));
    for (const nudge of queryAll(root, '[data-ln-ext-act^="deeper:"]', HTMLButtonElement)) {
      const up = nudge.dataset.lnExtAct === 'deeper:1';
      nudge.disabled = up ? depth >= MAX_DEPTH : depth <= MIN_DEPTH;
    }
    // Always there, so it's found: off at the defaults.
    for (const reset of queryAll(root, '[data-ln-ext-act="reset"]', HTMLButtonElement))
      reset.disabled = isDefault(this.#settings);
    const range = queryOne(root, 'input[data-ln-ext-input="depth"]', HTMLInputElement);
    if (range && range.valueAsNumber !== depth) range.value = String(depth);
    if (range) setSliderFill(range);
    const { hash } = this.#settings;
    const select = queryOne(root, 'select[data-ln-ext-input="hash"]', HTMLSelectElement);
    if (select && select.value !== String(hash)) select.value = String(hash);
  }

  #change(next: ReviewEngine, instant = false): void {
    this.show(next, this.#status, instant);
    this.#options.onChange(next);
  }

  /** The cores picked, or none when they're the suggestion: it follows the engine then. */
  #withCores(count: number): ReviewEngine {
    const cores = clamp(count, 1, deviceCores());
    const settings = this.#settings;
    return { ...settings, cores: cores === suggestedCores(settings.engine) ? null : cores };
  }

  #withEngine(engine: EngineKind): ReviewEngine {
    const settings = this.#settings;
    const before = coresOf(settings);
    const next = { ...settings, engine };
    const after = coresOf(next);
    if (after !== before) this.#toast = this.#options.words.coresMoved(after, engine);
    return next;
  }

  /** The settings a button picks, or null for one that picks none. */
  #picked(verb: string, argument: string): ReviewEngine | null {
    const settings = this.#settings;
    const value = Number(argument);
    if (verb === 'reset') return DEFAULT_REVIEW_ENGINE;
    if (verb === 'depth') return { ...settings, depth: value };
    if (verb === 'deeper')
      return { ...settings, depth: clamp(settings.depth + value, MIN_DEPTH, MAX_DEPTH) };
    if (verb === 'engine' && (argument === 'light' || argument === 'full'))
      return this.#withEngine(argument);
    if (verb === 'cores') return this.#withCores(coresOf(settings) + value);
    if (verb === 'core') return this.#withCores(value);
    if (verb === 'threads')
      return { ...settings, threads: clamp(settings.threads + value, 1, MAX_THREADS) };
    if (verb === 'cap') return { ...settings, cap: value };
    return null;
  }

  #act(action: string): void {
    const [verb = '', argument = ''] = action.split(':');
    this.#toast = null;
    if (verb === 'advanced') {
      this.#advanced = !this.#advanced;
      this.show(this.#settings);
    } else if (verb === 'reanalyse') this.#options.onReanalyse?.();
    else {
      const next = this.#picked(verb, argument);
      if (next) this.#change(next);
    }
  }

  #click(event: MouseEvent): void {
    const target = closestTo(event.target, '[data-ln-ext-act]', Element);
    const action =
      target instanceof HTMLElement || target instanceof SVGElement
        ? target.dataset.lnExtAct
        : null;
    if (action) this.#act(action);
  }

  #input(event: Event): void {
    const target = event.target;
    this.#toast = null;
    if (target instanceof HTMLInputElement && target.dataset.lnExtInput === 'depth')
      // Dragged, the panel follows the thumb without a delay.
      this.#change({ ...this.#settings, depth: target.valueAsNumber }, true);
    else if (target instanceof HTMLSelectElement && target.dataset.lnExtInput === 'hash')
      this.#change({ ...this.#settings, hash: Number(target.value) });
  }
}

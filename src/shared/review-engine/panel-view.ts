import { clamp } from '#shared/math.ts';
import type { CurveState } from './curve.ts';
import { coresOf, deviceCores, deviceMemory, engineCount, suggestedCores } from './device.ts';
import { durationRange, gameSeconds } from './estimate.ts';
import {
  type Analysed,
  covers,
  DEFAULT_REVIEW_ENGINE,
  type EngineKind,
  hueOf,
  CURVE_DEPTH,
  MIN_DEPTH,
  type ReviewEngine,
  TIERS,
  tierOf,
} from './options.ts';
import type { EngineWords } from './words.ts';

// What the engine panel shows for a set of settings: its texts, which parts
// are up, which fields moved off their default, and the curve.

/** Where the popover's game stands: what it was analysed with, or is being analysed with. */
export interface PanelStatus {
  readonly analysed: Analysed | null;
  readonly running: {
    readonly done: number;
    readonly total: number;
    readonly analysed: Analysed;
  } | null;
}

export interface PanelView {
  readonly depth: number;
  readonly hue: string;
  readonly text: Readonly<Record<string, string>>;
  readonly when: Readonly<Record<string, boolean>>;
  readonly mods: Readonly<Record<string, boolean>>;
  readonly curve: CurveState;
}

export interface PanelInput {
  readonly options: ReviewEngine;
  readonly words: EngineWords;
  readonly positions: number;
  readonly status: PanelStatus | null;
  readonly toast: string | null;
  readonly advanced: boolean;
}

// Megabytes an engine takes before its table: its memory, its network.
const ENGINE_MEGABYTES: Record<EngineKind, number> = { light: 96, full: 160 };
const LONGEST = 7200;

function curveValues(options: ReviewEngine, positions: number): CurveState['main'][] {
  const other: ReviewEngine = { ...options, engine: options.engine === 'light' ? 'full' : 'light' };
  return [options, other].map(settings =>
    Array.from({ length: CURVE_DEPTH - MIN_DEPTH + 1 }, (_, i) =>
      Math.log(clamp(gameSeconds(settings, positions, MIN_DEPTH + i), 1, LONGEST)),
    ),
  );
}

/** What the game has, or will have once the run going on ends. */
const aimOf = (status: PanelStatus | null): Analysed | null =>
  status?.running?.analysed ?? status?.analysed ?? null;

/** The re-analysis the settings call for, or why there's none, against what the game has. */
function verdict(options: ReviewEngine, status: PanelStatus | null): Record<string, boolean> {
  const aim = aimOf(status);
  const running = Boolean(status?.running);
  const raise = !running && aim !== null && !covers(aim, options);
  const other = aim ? aim.depth !== options.depth || aim.engine !== options.engine : false;
  // A run going on stays in sight, other settings picked meanwhile under it: it may go on,
  // or switch to them.
  const shift = running && other;
  const lower = !running && !raise && other;
  return { raise, shift, lower, running, same: Boolean(aim) && !running && !raise && !other };
}

const levelName = (words: EngineWords, depth: number): string => {
  const tier = tierOf(depth);
  return tier === 'custom' ? `${words.tiers.custom} · ${depth}` : words.tiers[tier];
};

/** The run going on: how far, how long it has left, and how long switching would take. */
export function runTexts({
  options,
  words,
  status,
}: Pick<PanelInput, 'options' | 'words' | 'status'>): Record<string, string> {
  const running = status?.running;
  if (!running) return { running: '', percent: '', left: '', shiftEstimate: '' };
  const { done, total, analysed } = running;
  // Records as fine as the settings picked are kept: a switch searches the rest only.
  const rest = Math.max(total - done, 0);
  const left = durationRange(gameSeconds({ ...options, ...analysed }, rest), words.locale);
  return {
    running: words.running(analysed.depth),
    percent: String(Math.floor((done / Math.max(total, 1)) * 100)),
    left: words.left(left, engineCount(options)),
    shiftEstimate: durationRange(gameSeconds(options, rest), words.locale),
  };
}

function statusTexts(input: PanelInput): Record<string, string> {
  const { options, words, status } = input;
  const analysed = status?.analysed;
  const aim = aimOf(status);
  const named = options.depth === aim?.depth && options.engine !== aim.engine;
  return {
    analysed: analysed ? words.analysedAs(analysed.depth, words.kinds[analysed.engine]) : '',
    reanalyse: named
      ? words.reanalyseWith(words.kinds[options.engine])
      : words.reanalyse(options.depth),
    shift: named ? words.reanalyseWith(words.kinds[options.engine]) : words.shiftTo(options.depth),
    ...runTexts(input),
  };
}

export function panelView(input: PanelInput): PanelView {
  const { options, words, positions, toast, advanced } = input;
  const tier = tierOf(options.depth);
  const tierName = levelName(words, options.depth);
  const engines = engineCount(options);
  const layout = words.layout(engines, options.threads);
  const suggestion = suggestedCores(options.engine);
  const estimate = durationRange(gameSeconds(options, positions), words.locale);
  const [main = [], other = []] = curveValues(options, positions);
  const megabytes = engines * (ENGINE_MEGABYTES[options.engine] + options.hash);
  return {
    depth: options.depth,
    hue: hueOf(tier),
    text: {
      depth: String(options.depth),
      tier: tierName,
      estimate,
      layout,
      kindName: words.kindNames[options.engine],
      chosenEngine: words.engineNames[options.engine],
      otherEngine: words.engineNames[options.engine === 'light' ? 'full' : 'light'],
      suggested: words.suggested(suggestion, deviceCores()),
      cores: String(coresOf(options)),
      threads: String(options.threads),
      total: words.total(layout, Math.round(megabytes / 10) * 10),
      suggestion: words.suggestion(suggestion),
      device: words.device(deviceCores(), deviceMemory()),
      toast: toast ?? '',
      ...statusTexts(input),
    },
    when: {
      toast: toast !== null,
      warn: coresOf(options) > suggestion,
      advanced,
      light: options.engine === 'light',
      past: options.depth > CURVE_DEPTH,
      full: options.engine === 'full',
      ...verdict(options, input.status),
    },
    mods: {
      depth: options.depth !== DEFAULT_REVIEW_ENGINE.depth,
      engine: options.engine !== DEFAULT_REVIEW_ENGINE.engine,
      cores: options.cores !== null,
      threads: options.threads !== DEFAULT_REVIEW_ENGINE.threads,
      hash: options.hash !== DEFAULT_REVIEW_ENGINE.hash,
      cap: options.cap !== DEFAULT_REVIEW_ENGINE.cap,
    },
    curve: {
      main,
      other,
      depth: options.depth,
      tier,
      stops: TIERS.map(known => ({
        name: words.tiers[known.id],
        time: durationRange(gameSeconds(options, positions, known.depth), words.locale),
      })),
    },
  };
}
